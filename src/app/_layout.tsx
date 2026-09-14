import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
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
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
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
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ title: '' }} />
        </Stack.Protected>

        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="animals/[id]"
            options={{ title: '', headerTransparent: true, headerTintColor: colors.white }}
          />
          <Stack.Screen name="animals/new" options={{ title: 'Registrar animal', presentation: 'modal' }} />
          <Stack.Screen name="animals/edit/[id]" options={{ title: 'Editar animal' }} />
          <Stack.Screen name="profile/edit" options={{ title: 'Meus dados' }} />
          <Stack.Screen name="profile/password" options={{ title: 'Alterar senha' }} />

          <Stack.Protected guard={can('user:manage')}>
            <Stack.Screen name="users/new" options={{ title: 'Novo usuário', presentation: 'modal' }} />
            <Stack.Screen name="users/[id]" options={{ title: 'Editar usuário' }} />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
    </>
  );
}
