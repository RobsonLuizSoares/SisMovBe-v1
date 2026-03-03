import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { AppTopBar } from '@/components/AppTopBar';
import { colors } from '@/theme/colors';

export default function UnitLayout() {
  return (
    <Tabs
      screenOptions={{
        header: ({ route, options }) => (
          <AppTopBar title={(options.title as string) ?? route.name} />
        ),
        tabBarActiveTintColor: colors.primary,
      }}
    >
      <Tabs.Screen
        name="solicitar"
        options={{
          title: labels.unitUser.requestShipment,
          tabBarLabel: labels.tabs.request,
          tabBarIcon: ({ color, size }) => <Ionicons name="paper-plane" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="minhas-solicitacoes"
        options={{
          title: labels.unitUser.myRequests,
          tabBarLabel: labels.tabs.myRequests,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: labels.tabs.profile,
          tabBarLabel: labels.tabs.profile,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
