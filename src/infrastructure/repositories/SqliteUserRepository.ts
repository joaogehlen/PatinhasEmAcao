import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type { User, UserRole, UserWithCredentials } from '@/domain/entities/User';
import type { UserFilters, UserRepository } from '@/domain/repositories/UserRepository';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

const PUBLIC_COLUMNS = 'id, name, email, phone, role, created_at, updated_at';

function toUser(row: Omit<UserRow, 'password_hash' | 'password_salt'>): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(filters: UserFilters = {}): Promise<User[]> {
    const where: string[] = [];
    const params: SQLiteBindValue[] = [];

    if (filters.search?.trim()) {
      where.push('(name LIKE ? OR email LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      params.push(term, term);
    }
    if (filters.role) {
      where.push('role = ?');
      params.push(filters.role);
    }

    const sql = `SELECT ${PUBLIC_COLUMNS} FROM users
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY name COLLATE NOCASE`;
    const rows = await this.db.getAllAsync<UserRow>(sql, params);
    return rows.map(toUser);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.getFirstAsync<UserRow>(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
    return row ? toUser(row) : null;
  }

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    const row = await this.db.getFirstAsync<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    return row ? { ...toUser(row), passwordHash: row.password_hash, passwordSalt: row.password_salt } : null;
  }

  async create(user: UserWithCredentials): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO users (id, name, email, phone, role, password_hash, password_salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.phone, user.role, user.passwordHash, user.passwordSalt, user.createdAt, user.updatedAt],
    );
  }

  async update(user: User): Promise<void> {
    await this.db.runAsync(
      'UPDATE users SET name = ?, email = ?, phone = ?, role = ?, updated_at = ? WHERE id = ?',
      [user.name, user.email, user.phone, user.role, user.updatedAt, user.id],
    );
  }

  async updateCredentials(id: string, passwordHash: string, passwordSalt: string): Promise<void> {
    await this.db.runAsync('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [
      passwordHash,
      passwordSalt,
      id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM users WHERE id = ?', [id]);
  }

  async countByRole(role: UserRole): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM users WHERE role = ?', [role]);
    return row?.total ?? 0;
  }
}
