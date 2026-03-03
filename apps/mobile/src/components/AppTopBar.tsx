import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderUserChip } from '@/components/HeaderUserChip';
import { colors } from '@/theme/colors';

const BG = colors.bannerBg;

interface AppTopBarProps {
  title: string;
}

export function AppTopBar({ title }: AppTopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>SisMovBe</Text>
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <View style={styles.chipWrapper}>
          <HeaderUserChip />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
  },
  brandRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  brand: {
    color: colors.bannerText,
    fontSize: 22,
    fontWeight: '700',
  },
  headerRow: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  chipWrapper: {
    flexShrink: 0,
  },
});
