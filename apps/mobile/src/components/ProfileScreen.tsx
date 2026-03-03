import { View, StyleSheet } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { colors } from '@/theme/colors';

function roleLabel(role: string) {
  const map: Record<string, string> = {
    PATRIMONIO_ADMIN: labels.roles.PATRIMONIO_ADMIN,
    SEAME_ADMIN: labels.roles.SEAME_ADMIN,
    TECH: labels.roles.TECH,
    UNIT_USER: labels.roles.UNIT_USER,
  };
  return map[role] ?? role;
}

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (!profile) return null;

  const textStyle = { color: colors.textSecondary };
  const labelStyle = { color: colors.textSecondary, marginBottom: 4 };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="labelMedium" style={[labelStyle]}>
          Nome
        </Text>
        <Text variant="bodyLarge" style={textStyle}>{profile.full_name ?? '-'}</Text>
      </View>
      <Divider />
      <View style={styles.section}>
        <Text variant="labelMedium" style={[labelStyle]}>
          Perfil
        </Text>
        <Text variant="bodyLarge" style={textStyle}>{roleLabel(profile.role)}</Text>
      </View>
      <Divider />
      <View style={styles.section}>
        <Text variant="labelMedium" style={[labelStyle]}>
          UL
        </Text>
        <Text variant="bodyLarge" style={textStyle}>
          {profile.unit_ul_code && profile.unit_name
            ? `${profile.unit_ul_code} - ${profile.unit_name}`
            : labels.users.noUnit}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button mode="outlined" onPress={handleLogout} style={styles.button}>
          {labels.auth.logout}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  section: {
    paddingVertical: 16,
  },
  buttonContainer: {
    marginTop: 32,
  },
  button: {
    marginTop: 8,
  },
});
