import { Tabs } from 'expo-router';

import { Icon } from '@/presentation/components/Icon';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, fonts, rules } from '@/presentation/theme';

/**
 * O mapa é a primeira aba porque é a primeira coisa que qualquer pessoa
 * precisa: ver onde está e avisar sobre um animal.
 *
 * As demais aparecem conforme a permissão. O convidado fica só com Mapa e
 * Perfil — e é no Perfil que ele encontra o caminho para criar conta.
 */
export default function TabsLayout() {
  const { can } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.1 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: rules.hair,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mapa', tabBarIcon: ({ color }) => <Icon name="map" size={23} color={color} /> }}
      />

      <Tabs.Protected guard={can('animal:viewAll')}>
        <Tabs.Screen
          name="catalog"
          options={{ title: 'Animais', tabBarIcon: ({ color }) => <Icon name="paw" size={23} color={color} /> }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={can('vaquinha:view')}>
        <Tabs.Screen
          name="vaquinhas"
          options={{ title: 'Vaquinhas', tabBarIcon: ({ color }) => <Icon name="donate" size={23} color={color} /> }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={can('user:list')}>
        <Tabs.Screen
          name="users"
          options={{ title: 'Usuários', tabBarIcon: ({ color }) => <Icon name="people" size={23} color={color} /> }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Icon name="person" size={23} color={color} /> }}
      />
    </Tabs>
  );
}
