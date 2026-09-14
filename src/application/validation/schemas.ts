import { z } from 'zod';

import {
  ANIMAL_SEXES,
  ANIMAL_SIZES,
  ANIMAL_SPECIES,
  ANIMAL_TEMPERAMENTS,
} from '@/domain/entities/Animal';
import { USER_ROLES } from '@/domain/entities/User';

/** Converte string vazia em null, útil para campos opcionais de formulário. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .nullable()
    .transform((value) => (value ? value : null));

export const animalInputSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome (mínimo 2 letras).').max(60, 'Máximo de 60 caracteres.'),
  species: z.enum(ANIMAL_SPECIES, { message: 'Selecione a espécie.' }),
  size: z.enum(ANIMAL_SIZES, { message: 'Selecione o porte.' }),
  sex: z.enum(ANIMAL_SEXES, { message: 'Selecione o sexo.' }),
  ageMonths: z
    .number({ message: 'Idade inválida.' })
    .int('Use um número inteiro de meses.')
    .min(0, 'Idade inválida.')
    .max(360, 'Idade acima do esperado.')
    .nullable(),
  temperament: z.enum(ANIMAL_TEMPERAMENTS).nullable(),
  description: z.string().trim().min(10, 'Descreva o animal (mínimo 10 caracteres).').max(1000, 'Máximo de 1000 caracteres.'),
  healthNotes: optionalText(500),
  photoUri: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

const email = z.string().trim().toLowerCase().email('E-mail inválido.');
const password = z
  .string()
  .min(6, 'A senha deve ter pelo menos 6 caracteres.')
  .max(72, 'Máximo de 72 caracteres.');
const phone = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? value.replace(/\D/g, '') : null))
  .refine((value) => value === null || value.length === 10 || value.length === 11, 'Telefone deve ter DDD + número.');

export const userProfileSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo.').max(80, 'Máximo de 80 caracteres.'),
  email,
  phone,
  role: z.enum(USER_ROLES, { message: 'Selecione o perfil.' }),
});

export const registerSchema = userProfileSchema.omit({ role: true }).extend({ password });

export const createUserSchema = userProfileSchema.extend({ password });

/**
 * Edição de perfil. Sem e-mail: ele é espelho de auth.users e só muda pelo
 * fluxo de autenticação (com reconfirmação), nunca por update no perfil.
 */
export const userUpdateSchema = userProfileSchema.omit({ email: true });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.'),
});

/**
 * Vaquinha. Valores chegam em centavos, como inteiro — a tela converte de
 * reais na entrada e de volta na exibição. Dinheiro em ponto flutuante
 * acumula erro de arredondamento.
 */
export const vaquinhaInputSchema = z.object({
  title: z.string().trim().min(3, 'Informe o título (mínimo 3 letras).').max(80, 'Máximo de 80 caracteres.'),
  description: z
    .string()
    .trim()
    .min(10, 'Explique a campanha (mínimo 10 caracteres).')
    .max(1000, 'Máximo de 1000 caracteres.'),
  goalCents: z
    .number({ message: 'Informe a meta.' })
    .int('Valor inválido.')
    .positive('A meta precisa ser maior que zero.')
    .max(100_000_000, 'Meta acima do esperado.'),
  raisedCents: z
    .number({ message: 'Valor arrecadado inválido.' })
    .int('Valor inválido.')
    .min(0, 'O arrecadado não pode ser negativo.')
    .max(100_000_000, 'Valor acima do esperado.'),
  pixKey: optionalText(140),
  animalId: z.string().uuid().nullable(),
  active: z.boolean(),
});

export type AnimalInputData = z.infer<typeof animalInputSchema>;
export type UserProfileData = z.infer<typeof userProfileSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
