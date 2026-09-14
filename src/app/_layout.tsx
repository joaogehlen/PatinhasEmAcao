import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { ChivoMono_400Regular, ChivoMono_700Bold } from '@expo-google-fonts/chivo-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders, useAuth } from '@/presentation/providers/AppProviders';
import { colors, fonts } from '@/presentation/theme';

// Mantém a splash até fontes, banco e sessão estarem prontos.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    ChivoMono_400Regular,
    ChivoMono_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { user, isLoading, can } = useAuth();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  const isLoggedIn = user !== null;
  const isGuest = user?.isGuest ?? false;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* O convidado também alcança estas telas: é por elas que ele vira
            uma conta de verdade sem perder as denúncias que já fez. */}
        <Stack.Protected guard={!isLoggedIn || isGuest}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ title: '' }} />
        </Stack.Protected>

        {/* O convidado também tem sessão, então entra aqui: o mapa e a
            denúncia são dele. O que ele não pode fazer some pelas guardas
            de permissão abaixo, não pelo estado de login. */}
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="animals/[id]"
            options={{ title: '', headerTransparent: true, headerTintColor: colors.white }}
          />
          <Stack.Screen name="animals/new" options={{ title: 'Registrar animal', presentation: 'modal' }} />

          <Stack.Protected guard={can('animal:update')}>
            <Stack.Screen name="animals/edit/[id]" options={{ title: 'Editar animal' }} />
          </Stack.Protected>

          <Stack.Protected guard={!isGuest}>
            <Stack.Screen name="profile/edit" options={{ title: 'Meus dados' }} />
            <Stack.Screen name="profile/password" options={{ title: 'Alterar senha' }} />
          </Stack.Protected>

          <Stack.Protected guard={can('vaquinha:manage')}>
            <Stack.Screen name="vaquinhas/new" options={{ title: 'Nova vaquinha', presentation: 'modal' }} />
            <Stack.Screen name="vaquinhas/[id]" options={{ title: 'Editar vaquinha' }} />
          </Stack.Protected>

          <Stack.Protected guard={can('user:manage')}>
            <Stack.Screen name="users/new" options={{ title: 'Novo usuário', presentation: 'modal' }} />
            <Stack.Screen name="users/[id]" options={{ title: 'Editar usuário' }} />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
    </>
  );
}
