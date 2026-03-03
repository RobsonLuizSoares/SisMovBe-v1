import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { lightTheme, darkTheme } from '@/theme/theme';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <ProfileProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.onPrimary,
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
          </ProfileProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
