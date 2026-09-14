import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migrações versionadas via PRAGMA user_version. Cada item leva o banco
 * da versão (índice) para a versão (índice + 1). Nunca edite uma migração
 * já distribuída — adicione uma nova ao final da lista.
 */
const MIGRATIONS: readonly string[] = [
  // v1 — Sprint 1: usuários, animais e timeline de status
  `
  CREATE TABLE users (
    id            TEXT PRIMARY KEY NOT NULL,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT,
    role          TEXT NOT NULL CHECK (role IN ('morador', 'voluntario', 'admin')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE animals (
    id           TEXT PRIMARY KEY NOT NULL,
    name         TEXT NOT NULL,
    species      TEXT NOT NULL CHECK (species IN ('cachorro', 'gato', 'outro')),
    size         TEXT NOT NULL CHECK (size IN ('pequeno', 'medio', 'grande')),
    sex          TEXT NOT NULL CHECK (sex IN ('macho', 'femea', 'desconhecido')),
    age_months   INTEGER CHECK (age_months IS NULL OR age_months >= 0),
    temperament  TEXT CHECK (temperament IS NULL OR temperament IN ('docil', 'brincalhao', 'timido', 'agitado', 'protetor')),
    description  TEXT NOT NULL,
    health_notes TEXT,
    status       TEXT NOT NULL CHECK (status IN ('denunciado', 'resgatado', 'em_tratamento', 'disponivel', 'adotado')),
    photo_uri    TEXT,
    latitude     REAL,
    longitude    REAL,
    created_by   TEXT NOT NULL REFERENCES users (id),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE INDEX idx_animals_status ON animals (status);
  CREATE INDEX idx_animals_species_size ON animals (species, size);

  CREATE TABLE animal_status_history (
    id          TEXT PRIMARY KEY NOT NULL,
    animal_id   TEXT NOT NULL REFERENCES animals (id) ON DELETE CASCADE,
    from_status TEXT,
    to_status   TEXT NOT NULL,
    note        TEXT,
    changed_by  TEXT NOT NULL REFERENCES users (id),
    changed_at  TEXT NOT NULL
  );

  CREATE INDEX idx_status_history_animal ON animal_status_history (animal_id, changed_at);
  `,
];

export const DATABASE_NAME = 'patinhas.db';

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const nextVersion = version + 1;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(sql);
      // PRAGMA não aceita parâmetros; o valor é um inteiro controlado por nós.
      await txn.execAsync(`PRAGMA user_version = ${nextVersion}`);
    });
    version = nextVersion;
  }
}
