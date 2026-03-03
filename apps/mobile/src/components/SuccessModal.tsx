import { View, StyleSheet } from 'react-native';
import { Modal, Text, Button } from 'react-native-paper';

type Props = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

const TEXT_COLOR = '#585c61';

export function SuccessModal({ visible, message, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text variant="bodyLarge" style={styles.message}>
            {message}
          </Text>
          <Button mode="contained" onPress={onClose} style={styles.button}>
            Fechar
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    minHeight: 180,
  },
  message: {
    marginBottom: 24,
    lineHeight: 24,
    color: TEXT_COLOR,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'center',
  },
});
