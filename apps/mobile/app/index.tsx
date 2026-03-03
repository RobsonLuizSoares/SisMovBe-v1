import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { useAuth } from '../src/contexts/AuthContext';
import { useProfile } from '../src/contexts/ProfileContext';

export default function Index() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, error } = useProfile();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16 }}>
          Carregando...
        </Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profileLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error === 'no_profile' || error === 'inactive') {
    return (
      <View style={styles.centered}>
        <Text variant="headlineSmall" style={{ textAlign: 'center', marginBottom: 8 }}>
          {error === 'no_profile' ? labels.messages.noProfile : labels.messages.profileInactive}
        </Text>
        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
          {labels.messages.permissionDeniedHint}
        </Text>
      </View>
    );
  }

  if (profile) {
    const isUnitUser = profile.role === 'UNIT_USER';
    return <Redirect href={isUnitUser ? '/(app)/(unit)/solicitar' : '/(app)/(tech)/fila'} />;
  }

  return null;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
