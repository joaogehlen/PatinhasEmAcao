import * as BackgroundTask from 'expo-background-task';
import * as Network from 'expo-network';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';

import type { Animal, AnimalStatusChange } from '@/domain/entities/Animal';
import { ConflictError, OfflineError } from '@/domain/errors';
import type { AnimalFilters } from '@/domain/repositories/AnimalRepository';

import { deleteLocalPhoto, isLocalPhoto, persistPhoto } from './photoStorage';
import { SupabaseAnimalRepository } from './repositories/SupabaseAnimalRepository';
import { isOffline } from './supabase/mappers';

/**
 * Denúncia offline.
 *
 * Quem denuncia está na rua, muitas vezes sem sinal. A denúncia já sai do
 * AnimalService validada e com id gerado no aparelho; se não houver rede ela
 * fica numa fila no localStorage (SQLite, sobrevive a fechar o app) e é
 * enviada quando a conexão voltar: na hora, se o app estiver aberto, ou pela
 * tarefa em segundo plano, que o sistema só dispara com rede disponível.
 *
 * O id do cliente torna o reenvio seguro: se o insert chegou ao banco mas a
 * resposta se perdeu, a nova tentativa bate na chave primária e conta como
 * enviada.
 */

const STORAGE_KEY = 'patinhas.pendingReports';
const TASK_NAME = 'patinhas-send-pending-reports';

const remote = new SupabaseAnimalRepository();

function read(): Animal[] {
  try {
    return JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY) ?? '[]') as Animal[];
  } catch {
    return [];
  }
}

function write(items: Animal[]): void {
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function upsert(animal: Animal): void {
  write([...read().filter((item) => item.id !== animal.id), animal]);
}

function remove(id: string): void {
  write(read().filter((item) => item.id !== id));
}

export function pendingReportsCount(): number {
  return read().length;
}

export function isPendingReport(id: string): boolean {
  return read().some((item) => item.id === id);
}

function isOfflineError(error: unknown): boolean {
  return error instanceof OfflineError || (error instanceof Error && isOffline(error.message));
}

async function hasInternet(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync().catch(() => null);
  // Desconhecido conta como "tenta": melhor uma tentativa que falha que uma denúncia parada.
  return state?.isConnected !== false && state?.isInternetReachable !== false;
}

/**
 * Sobe a foto (se ainda for local) e insere. A URL vai para a fila antes do
 * insert, para que uma nova tentativa não suba a foto duas vezes.
 */
async function send(animal: Animal): Promise<void> {
  let current = animal;
  const localUri = current.photoUri && isLocalPhoto(current.photoUri) ? current.photoUri : null;
  if (localUri) {
    current = { ...current, photoUri: await persistPhoto(localUri) };
    upsert(current);
  }
  try {
    await remote.create(current, null as never);
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
  }
  remove(current.id);
  if (localUri) deleteLocalPhoto(localUri);
}

/**
 * Guarda na fila e tenta enviar. Devolve true se ficou para depois.
 * Erro que não é de rede (RLS, trigger) sai da fila e sobe para a tela, como antes.
 */
export async function sendOrQueue(animal: Animal): Promise<boolean> {
  upsert(animal);
  if (!(await hasInternet())) return true;
  try {
    await send(animal);
    return false;
  } catch (error) {
    if (isOfflineError(error)) return true;
    remove(animal.id);
    throw error;
  }
}

let flushing: Promise<void> | null = null;

/** Tenta enviar tudo o que está na fila. Chamadas simultâneas compartilham a mesma rodada. */
export function flushPendingReports(): Promise<void> {
  flushing ??= (async () => {
    try {
      for (const animal of read()) {
        try {
          await send(animal);
        } catch (error) {
          if (isOfflineError(error)) return;
          // ponytail: erro do servidor fica na fila e é tentado de novo para sempre;
          // contar tentativas e avisar o usuário se aparecer denúncia presa.
          console.warn('Denúncia pendente não enviada', animal.id, error);
        }
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

// Precisa estar no escopo do módulo: no Android a tarefa roda sem a UI montada.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await flushPendingReports();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Liga o envio automático: ao abrir, ao voltar ao app, ao reconectar e em segundo plano. */
export function startPendingReportsSync(): () => void {
  void flushPendingReports();

  if (Platform.OS !== 'web') {
    void BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 }).catch((error) =>
      console.warn('Tarefa em segundo plano indisponível', error),
    );
  }

  const network = Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void flushPendingReports();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushPendingReports();
  });
  return () => {
    network.remove();
    appState.remove();
  };
}

/**
 * Repositório do container: igual ao Supabase, mas o cadastro aceita ficar na
 * fila, e as denúncias da fila aparecem na lista e no detalhe como se já
 * estivessem no servidor — a tela marca como pendente por isPendingReport.
 */
export class OfflineFirstAnimalRepository extends SupabaseAnimalRepository {
  override async create(animal: Animal): Promise<void> {
    await sendOrQueue(animal);
  }

  override async list(filters: AnimalFilters = {}): Promise<Animal[]> {
    const pending = read().filter((animal) => matches(animal, filters)).reverse();
    try {
      const sent = await super.list(filters);
      return [...pending, ...sent.filter((animal) => !pending.some((item) => item.id === animal.id))];
    } catch (error) {
      // Sem rede, quem denunciou ainda vê o que registrou.
      if (pending.length > 0 && isOfflineError(error)) return pending;
      throw error;
    }
  }

  override async findById(id: string): Promise<Animal | null> {
    return read().find((animal) => animal.id === id) ?? super.findById(id);
  }

  override async statusHistory(animalId: string): Promise<AnimalStatusChange[]> {
    const pending = read().find((animal) => animal.id === animalId);
    if (!pending) return super.statusHistory(animalId);
    return [
      {
        id: `pending-${pending.id}`,
        animalId: pending.id,
        fromStatus: null,
        toStatus: pending.status,
        note: 'Salva no aparelho. Será enviada assim que houver internet.',
        changedBy: pending.createdBy,
        changedAt: pending.createdAt,
      },
    ];
  }
}

/** Os mesmos filtros que o Supabase aplica, para a fila não furar a busca. */
function matches(animal: Animal, filters: AnimalFilters): boolean {
  const search = filters.search?.trim().toLowerCase();
  if (search && !`${animal.name} ${animal.description}`.toLowerCase().includes(search)) return false;
  if (filters.species && animal.species !== filters.species) return false;
  if (filters.size && animal.size !== filters.size) return false;
  if (filters.status && animal.status !== filters.status) return false;
  if (filters.temperament && animal.temperament !== filters.temperament) return false;
  return true;
}
