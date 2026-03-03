import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Button, TextInput, Text } from 'react-native-paper';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) {
      setError(err === 'Invalid login credentials' ? labels.messages.loginError : err);
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {labels.appName}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          MovBens
        </Text>

        <TextInput
          label={labels.auth.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          mode="outlined"
          style={styles.input}
          disabled={loading}
        />

        <TextInput
          label={labels.auth.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          mode="outlined"
          style={styles.input}
          disabled={loading}
        />

        {error ? (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.button}>
          {labels.auth.login}
        </Button>

        <Button
          mode="text"
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgot}
          disabled={loading}
        >
          {labels.auth.forgotPassword}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    marginBottom: 12,
  },
  error: {
    color: colors.error,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  forgot: {
    marginTop: 16,
  },
});
