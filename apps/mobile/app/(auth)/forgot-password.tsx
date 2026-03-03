import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Button, TextInput, Text } from 'react-native-paper';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Informe o e-mail');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await resetPassword(email.trim().toLowerCase());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.message}>
            {labels.messages.checkEmailForReset}
          </Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.button}>
            {labels.auth.backToLogin}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.instruction}>
          Informe seu e-mail para receber o link de redefinição de senha.
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

        {error ? (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button mode="contained" onPress={handleSend} loading={loading} style={styles.button}>
          {labels.auth.sendResetLink}
        </Button>

        <Button mode="text" onPress={() => router.back()} style={styles.back} disabled={loading}>
          {labels.auth.backToLogin}
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
  instruction: {
    marginBottom: 24,
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
  back: {
    marginTop: 16,
  },
  message: {
    marginBottom: 24,
  },
});
