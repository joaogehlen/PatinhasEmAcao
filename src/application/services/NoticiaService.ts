import type { Noticia } from '@/domain/entities/Noticia';
import type { User } from '@/domain/entities/User';
import { ForbiddenError, NotFoundError } from '@/domain/errors';
import type { NoticiaRepository } from '@/domain/repositories/NoticiaRepository';
import { hasPermission } from '@/domain/rules/permissions';

import type { Clock, IdGenerator } from '../ports';
import { noticiaInputSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

/** Mural da ONG: quem tem conta lê; só o admin publica. Espelho na RLS de noticias (0008). */
export class NoticiaService {
  constructor(
    private readonly noticias: NoticiaRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async list(actor: User): Promise<Noticia[]> {
    if (!hasPermission(actor, 'noticia:view')) throw new ForbiddenError();
    return this.noticias.list();
  }

  async getById(actor: User, id: string): Promise<Noticia> {
    if (!hasPermission(actor, 'noticia:view')) throw new ForbiddenError();
    const noticia = await this.noticias.findById(id);
    if (!noticia) throw new NotFoundError('Notícia', id);
    return noticia;
  }

  async create(actor: User, input: unknown): Promise<Noticia> {
    this.require(actor);
    const data = validate(noticiaInputSchema, input);
    const now = this.clock.nowIso();
    const noticia: Noticia = { ...data, id: this.ids.next(), createdBy: actor.id, createdAt: now, updatedAt: now };
    await this.noticias.create(noticia);
    return noticia;
  }

  async update(actor: User, id: string, input: unknown): Promise<Noticia> {
    this.require(actor);
    const current = await this.getById(actor, id);
    const data = validate(noticiaInputSchema, input);
    const updated: Noticia = { ...current, ...data, updatedAt: this.clock.nowIso() };
    await this.noticias.update(updated);
    return updated;
  }

  /** Fixar desafixa a anterior: quem garante é o banco, num lugar só. */
  async setPinned(actor: User, id: string, pinned: boolean): Promise<Noticia> {
    this.require(actor);
    const current = await this.getById(actor, id);
    const updated: Noticia = { ...current, pinned, updatedAt: this.clock.nowIso() };
    await this.noticias.update(updated);
    return updated;
  }

  async delete(actor: User, id: string): Promise<void> {
    this.require(actor);
    await this.getById(actor, id);
    await this.noticias.delete(id);
  }

  private require(actor: User): void {
    if (!hasPermission(actor, 'noticia:manage')) throw new ForbiddenError();
  }
}
