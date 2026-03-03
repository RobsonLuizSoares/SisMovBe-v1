import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { AppTopBar } from '@/components/AppTopBar';
import { QueueNotificationProvider, useQueueNotification } from '@/contexts/QueueNotificationContext';
import { colors } from '@/theme/colors';

function TechTabs() {
  const queue = useQueueNotification();
  const badgeCount = queue?.badgeCount ?? 0;
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
        name="fila"
        options={{
          title: labels.tabs.queue,
          tabBarLabel: labels.tabs.queue,
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="movimentar"
        options={{
          title: labels.tabs.move,
          tabBarLabel: labels.tabs.move,
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="receber"
        options={{
          title: labels.tabs.receive,
          tabBarLabel: labels.tabs.receive,
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} />,
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

export default function TechLayout() {
  return (
    <QueueNotificationProvider>
      <TechTabs />
    </QueueNotificationProvider>
  );
}
