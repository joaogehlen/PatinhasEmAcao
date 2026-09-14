import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type {
  Animal,
  AnimalSex,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
  AnimalStatusChange,
  AnimalTemperament,
} from '@/domain/entities/Animal';
import type { AnimalFilters, AnimalRepository } from '@/domain/repositories/AnimalRepository';

interface AnimalRow {
  id: string;
  name: string;
  species: AnimalSpecies;
  size: AnimalSize;
  sex: AnimalSex;
  age_months: number | null;
  temperament: AnimalTemperament | null;
  description: string;
  health_notes: string | null;
  status: AnimalStatus;
  photo_uri: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface StatusChangeRow {
  id: string;
  animal_id: string;
  from_status: AnimalStatus | null;
  to_status: AnimalStatus;
  note: string | null;
  changed_by: string;
  changed_at: string;
}

function toAnimal(row: AnimalRow): Animal {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    size: row.size,
    sex: row.sex,
    ageMonths: row.age_months,
    temperament: row.temperament,
    description: row.description,
    healthNotes: row.health_notes,
    status: row.status,
    photoUri: row.photo_uri,
    latitude: row.latitude,
    longitude: row.longitude,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStatusChange(row: StatusChangeRow): AnimalStatusChange {
  return {
    id: row.id,
    animalId: row.animal_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  };
}

export class SqliteAnimalRepository implements AnimalRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(filters: AnimalFilters = {}): Promise<Animal[]> {
    const where: string[] = [];
    const params: SQLiteBindValue[] = [];

    if (filters.search?.trim()) {
      where.push('(name LIKE ? OR description LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      params.push(term, term);
    }
    // Filtros de igualdade: nome da coluna vem de uma lista fixa, nunca do usuário.
    const equals: [string, string | undefined][] = [
      ['species', filters.species],
      ['size', filters.size],
      ['status', filters.status],
      ['temperament', filters.temperament],
    ];
    for (const [column, value] of equals) {
      if (value) {
        where.push(`${column} = ?`);
        params.push(value);
      }
    }

    const sql = `SELECT * FROM animals
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY created_at DESC`;
    const rows = await this.db.getAllAsync<AnimalRow>(sql, params);
    return rows.map(toAnimal);
  }

  async findById(id: string): Promise<Animal | null> {
    const row = await this.db.getFirstAsync<AnimalRow>('SELECT * FROM animals WHERE id = ?', [id]);
    return row ? toAnimal(row) : null;
  }

  async create(animal: Animal, initialStatus: AnimalStatusChange): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync(
        `INSERT INTO animals (id, name, species, size, sex, age_months, temperament, description, health_notes,
           status, photo_uri, latitude, longitude, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          animal.id,
          animal.name,
          animal.species,
          animal.size,
          animal.sex,
          animal.ageMonths,
          animal.temperament,
          animal.description,
          animal.healthNotes,
          animal.status,
          animal.photoUri,
          animal.latitude,
          animal.longitude,
          animal.createdBy,
          animal.createdAt,
          animal.updatedAt,
        ],
      );
      await txn.runAsync(
        `INSERT INTO animal_status_history (id, animal_id, from_status, to_status, note, changed_by, changed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          initialStatus.id,
          initialStatus.animalId,
          initialStatus.fromStatus,
          initialStatus.toStatus,
          initialStatus.note,
          initialStatus.changedBy,
          initialStatus.changedAt,
        ],
      );
    });
  }

  async update(animal: Animal): Promise<void> {
    await this.db.runAsync(
      `UPDATE animals SET name = ?, species = ?, size = ?, sex = ?, age_months = ?, temperament = ?,
         description = ?, health_notes = ?, photo_uri = ?, latitude = ?, longitude = ?, updated_at = ?
       WHERE id = ?`,
      [
        animal.name,
        animal.species,
        animal.size,
        animal.sex,
        animal.ageMonths,
        animal.temperament,
        animal.description,
        animal.healthNotes,
        animal.photoUri,
        animal.latitude,
        animal.longitude,
        animal.updatedAt,
        animal.id,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    // O histórico é removido via ON DELETE CASCADE.
    await this.db.runAsync('DELETE FROM animals WHERE id = ?', [id]);
  }

  async statusHistory(animalId: string): Promise<AnimalStatusChange[]> {
    const rows = await this.db.getAllAsync<StatusChangeRow>(
      'SELECT * FROM animal_status_history WHERE animal_id = ? ORDER BY changed_at ASC',
      [animalId],
    );
    return rows.map(toStatusChange);
  }
}
