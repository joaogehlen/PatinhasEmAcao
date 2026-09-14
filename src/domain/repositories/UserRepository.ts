import type { User, UserRole, UserWithCredentials } from '../entities/User';

export interface UserFilters {
  search?: string;
  role?: UserRole;
}

export interface UserRepository {
  list(filters?: UserFilters): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
  create(user: UserWithCredentials): Promise<void>;
  update(user: User): Promise<void>;
  updateCredentials(id: string, passwordHash: string, passwordSalt: string): Promise<void>;
  delete(id: string): Promise<void>;
  countByRole(role: UserRole): Promise<number>;
}
