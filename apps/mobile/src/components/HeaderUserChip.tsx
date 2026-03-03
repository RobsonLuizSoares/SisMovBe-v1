import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { labels } from '@sismovbe/labels';
import { colors } from '@/theme/colors';

const ROLE_ABBREV: Record<string, string> = {
  TECH: 'TECH',
  UNIT_USER: 'UNID',
  PATRIMONIO_ADMIN: 'ADM',
  SEAME_ADMIN: 'ADM',
};

export function HeaderUserChip() {
  const { user } = useAuth();
  const { profile, loading } = useProfile();

  if (!user) return null;

  const displayName =
    profile?.full_name?.trim() || user.email?.split('@')[0] || labels.users.userFallback;
  const roleAbbrev = profile?.role ? ROLE_ABBREV[profile.role] : null;
  const loadingText = loading ? '...' : null;

  return (
    <View style={styles.chip}>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {loadingText ?? (roleAbbrev ? `${displayName} (${roleAbbrev})` : displayName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    maxWidth: 180,
    marginRight: 8,
  },
  text: {
    color: colors.bannerText,
    fontSize: 12,
    fontWeight: '500',
  },
});
