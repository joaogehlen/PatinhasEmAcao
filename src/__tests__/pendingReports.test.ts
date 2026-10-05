import type { Animal } from '@/domain/entities/Animal';
import { ConflictError, ForbiddenError, OfflineError } from '@/domain/errors';

const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
};

const mockNetwork = { isConnected: true, isInternetReachable: true };
const mockCreate = jest.fn<Promise<void>, [Animal]>();
const mockPersistPhoto = jest.fn(async (_uri: string) => 'https://cdn/foto.jpg');

jest.mock('expo-network', () => ({
  getNetworkStateAsync: async () => mockNetwork,
  addNetworkStateListener: () => ({ remove() {} }),
}));
jest.mock('expo-task-manager', () => ({ defineTask: () => {} }));
jest.mock('expo-background-task', () => ({ BackgroundTaskResult: {}, registerTaskAsync: async () => {} }));
jest.mock('@/infrastructure/photoStorage', () => ({
  persistPhoto: (uri: string) => mockPersistPhoto(uri),
  isLocalPhoto: (uri: string) => uri.startsWith('file://'),
  deleteLocalPhoto: () => {},
}));
jest.mock('@/infrastructure/repositories/SupabaseAnimalRepository', () => ({
  SupabaseAnimalRepository: class {
    create(animal: Animal) {
      return mockCreate(animal);
    }
  },
}));
jest.mock('@/infrastructure/supabase/mappers', () => ({ isOffline: (m: string) => m.includes('Network request failed') }));

import { flushPendingReports, isPendingReport, pendingReportsCount, sendOrQueue } from '@/infrastructure/pendingReports';

const animal = (id: string, photoUri: string | null = null) => ({ id, photoUri }) as Animal;

beforeEach(() => {
  storage.clear();
  mockCreate.mockReset().mockResolvedValue();
  mockPersistPhoto.mockClear();
  mockNetwork.isConnected = true;
});

test('sem rede: guarda e envia ao reconectar, subindo a foto local', async () => {
  mockNetwork.isConnected = false;
  expect(await sendOrQueue(animal('a', 'file:///foto.jpg'))).toBe(true);
  expect(mockCreate).not.toHaveBeenCalled();
  expect(isPendingReport('a')).toBe(true);

  mockNetwork.isConnected = true;
  await flushPendingReports();
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', photoUri: 'https://cdn/foto.jpg' }));
  expect(pendingReportsCount()).toBe(0);
});

test('rede cai no meio: fica na fila; reenvio duplicado conta como enviado', async () => {
  mockCreate.mockRejectedValueOnce(new OfflineError('sem rede'));
  expect(await sendOrQueue(animal('b'))).toBe(true);

  mockCreate.mockRejectedValueOnce(new ConflictError('duplicada'));
  await flushPendingReports();
  expect(pendingReportsCount()).toBe(0);
});

test('foto já enviada não sobe de novo na próxima tentativa', async () => {
  mockCreate.mockRejectedValueOnce(new Error('Network request failed'));
  await sendOrQueue(animal('c', 'file:///foto.jpg'));
  await flushPendingReports();
  expect(mockPersistPhoto).toHaveBeenCalledTimes(1);
  expect(pendingReportsCount()).toBe(0);
});

test('erro do servidor sobe para a tela e não fica na fila', async () => {
  mockCreate.mockRejectedValueOnce(new ForbiddenError());
  await expect(sendOrQueue(animal('d'))).rejects.toBeInstanceOf(ForbiddenError);
  expect(pendingReportsCount()).toBe(0);
});
