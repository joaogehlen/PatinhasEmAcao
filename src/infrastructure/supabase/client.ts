// Instala globalThis.localStorage sobre o SQLite (SDK 57). Precisa vir antes do
// createClient, porque é ele quem lê o adaptador de storage.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase não configurado. Copie .env.example para .env e preencha ' +
      'EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
      '(Project Settings > API no painel do Supabase). Reinicie o Expo depois: npx expo start -c',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    // A sessão fica no SQLite via localStorage; sobrevive a fechar o app.
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Sem URL de retorno em app nativo.
    detectSessionInUrl: false,
  },
});

// O refresh automático não precisa rodar com o app em segundo plano, onde só
// gastaria bateria e rede. Recomendação do próprio guia do Expo.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});

export const ANIMAL_PHOTOS_BUCKET = 'animal-photos';
