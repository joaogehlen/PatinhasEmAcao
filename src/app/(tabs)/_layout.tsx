import { Tabs } from 'expo-router';

import { Icon } from '@/presentation/components/Icon';
import { useAuth } from '@/presentation/providers/AppProviders';
import { colors, fonts, shadows } from '@/presentation/theme';

export default function TabsLayout() {
  const { can } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 0, ...shadows.floating },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: ({ color }) => <Icon name="paw" size={24} color={color} /> }}
      />
      <Tabs.Protected guard={can('user:list')}>
        <Tabs.Screen
          name="users"
          options={{ title: 'Usuários', tabBarIcon: ({ color }) => <Icon name="people" size={24} color={color} /> }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Icon name="person" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
