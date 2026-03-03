import { View } from 'react-native';
import { Slot } from 'expo-router';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}
