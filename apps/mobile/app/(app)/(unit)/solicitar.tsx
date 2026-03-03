import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  IconButton,
  ActivityIndicator,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import {
  getUnitUserContext,
  searchAsset,
  createMovement,
  addMovementItem,
  deleteEmptyMovement,
  normalizeTombamento,
  formatUnitDisplay,
  type UnitUserContext,
} from '@/lib/movements';
import { useTextStyles } from '@/lib/textStyles';
import { useTheme } from 'react-native-paper';

type CartItem = {
  id: string;
  tombamento: string;
  description: string | null;
  unitUl: string | null;
  scannedMethod: 'barcode' | 'manual';
  photoUri?: string;
};

export default function SolicitarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { textSecondaryStyle, textHintStyle } = useTextStyles();
  const [ctx, setCtx] = useState<UnitUserContext | null>(null);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    duration?: number;
  }>({ visible: false, message: '' });
  const [ctxError, setCtxError] = useState<string | null>(null);
  const [tombamentoInput, setTombamentoInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [movementId, setMovementId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!profile?.unit_id) return;
    getUnitUserContext(profile.unit_id).then(({ data, error }) => {
      setCtx(data ?? null);
      setCtxError(error ?? null);
    });
  }, [profile?.unit_id]);

  const handleAddItem = async (overrideValue?: string) => {
    const value = typeof overrideValue === 'string' ? overrideValue : tombamentoInput;
    const raw = String(value ?? '').trim();
    if (!raw) return;
    if (!user?.id || !ctx) {
      Alert.alert('Erro', ctxError ?? 'Carregue a página novamente.');
      return;
    }

    const norm = normalizeTombamento(raw);
    setSearching(true);
    const { asset, error } = await searchAsset(raw);
    setSearching(false);

    if (error) {
      Alert.alert('Erro', error);
      return;
    }

    if (asset) {
      await addItemToMovement(norm.display, 'barcode', asset.id, null);
      setTombamentoInput('');
      return;
    }

    Alert.alert(
      labels.unitUser.assetNotFound,
      'Deseja adicionar como item manual? Será necessária uma foto do bem/etiqueta.',
      [
        { text: labels.unitUser.cancel, style: 'cancel' },
        { text: 'Adicionar manual', onPress: () => takePhotoAndAddManual(norm.display) },
      ]
    );
  };

  const takePhotoAndAddManual = async (tombamento: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'É necessária permissão de câmera para itens manuais.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const base64 = result.assets[0].base64;
    const dataUri = base64 ? `data:image/jpeg;base64,${base64}` : uri;

    await addItemToMovement(tombamento, 'manual', null, dataUri);
    setTombamentoInput('');
  };

  const addItemToMovement = async (
    tombamentoText: string,
    scannedMethod: 'barcode' | 'manual',
    assetId: string | null,
    labelPhotoUrl: string | null
  ): Promise<boolean> => {
    if (!user?.id || !ctx) return false;
    if (ctx.originUnitId === ctx.destUnitId) {
      Alert.alert('Erro', 'Origem e destino não podem ser a mesma unidade.');
      return false;
    }
    const norm = normalizeTombamento(tombamentoText);
    if (cart.some((i) => normalizeTombamento(i.tombamento).display === norm.display)) {
      Alert.alert('Erro', 'Este tombamento já está no lote.');
      return false;
    }
    setAdding(true);

    let mid = movementId;
    if (!mid) {
      const { movementId: created, error } = await createMovement(
        user.id,
        ctx.originUnitId,
        ctx.destUnitId
      );
      if (error || !created) {
        setAdding(false);
        Alert.alert('Erro', error ?? 'Não foi possível criar a solicitação.');
        return false;
      }
      mid = created;
      setMovementId(mid);
    }

    const { item, error, emailWarning } = await addMovementItem(
      mid,
      norm.display,
      scannedMethod,
      assetId,
      labelPhotoUrl ?? undefined
    );
    setAdding(false);

    if (error) {
      const { success } = await deleteEmptyMovement(mid);
      if (success) {
        setMovementId(null);
      }
      Alert.alert('Erro', error.includes('movimentação ativa') ? 'Este bem já está em movimentação ativa' : error);
      return false;
    }

    if (emailWarning) {
      setSnackbar({ visible: true, message: `Solicitação criada. ${emailWarning}` });
    }

    const cartItem: CartItem = {
      id: item!.id,
      tombamento: item!.tombamento_text,
      description: null,
      unitUl: null,
      scannedMethod,
    };

    if (assetId) {
      const { asset } = await searchAsset(tombamentoText);
      if (asset) {
        cartItem.description = asset.description;
        cartItem.unitUl = asset.unit_ul;
      }
    }

    setCart((prev) => [...prev, cartItem]);
    setSnackbar({
      visible: true,
      message: labels.unitUser.addedToLot.replace('{tombamento}', norm.display),
      duration: 2000,
    });
    return true;
  };

  const handleIncludeFromScanner = async (params: {
    tombamento: string;
    assetId: string | null;
    description?: string | null;
    unitUl?: string | null;
  }): Promise<{ ok: boolean; duplicate?: boolean }> => {
    if (!user?.id || !ctx) return { ok: false };
    const norm = normalizeTombamento(params.tombamento);
    if (cart.some((i) => normalizeTombamento(i.tombamento).display === norm.display)) {
      return { ok: false, duplicate: true };
    }
    const success = await addItemToMovement(
      params.tombamento,
      params.assetId ? 'barcode' : 'manual',
      params.assetId,
      null
    );
    return { ok: success };
  };

  const handleFinish = () => {
    if (cart.length === 0) {
      Alert.alert(labels.unitUser.cartEmpty, labels.unitUser.noItems);
      return;
    }
    setFinishing(true);
    setCart([]);
    setMovementId(null);
    setTombamentoInput('');
    setFinishing(false);
    router.push('/(app)/(unit)/minhas-solicitacoes');
  };

  if (!profile?.unit_id) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Carregando perfil...</Text>
      </View>
    );
  }

  if (ctxError || !ctx) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginBottom: 8 }}>
          {ctxError ?? 'Configuração não encontrada'}
        </Text>
        <Text variant="bodySmall" style={{ textAlign: 'center' }}>
          Entre em contato com o administrador.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={[textHintStyle, styles.label]}>
              Origem
            </Text>
            <Text variant="bodyLarge" style={textSecondaryStyle}>
              {formatUnitDisplay(ctx.originUl, ctx.originName)}
            </Text>
            <Text variant="labelLarge" style={[textHintStyle, styles.label, { marginTop: 12 }]}>
              Destino
            </Text>
            <Text variant="bodyLarge" style={textSecondaryStyle}>
              {formatUnitDisplay(ctx.destUl, ctx.destName)}
            </Text>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {labels.unitUser.addItem}
        </Text>
        <View style={styles.row}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.outline }]}
              placeholder={labels.unitUser.tombamento}
              value={tombamentoInput}
              onChangeText={setTombamentoInput}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!searching && !adding}
            />
            <IconButton
              icon="camera"
              size={24}
              onPress={() => setScannerOpen(true)}
              disabled={searching || adding}
              style={styles.scanBtn}
            />
          </View>
          <Button
            mode="contained"
            onPress={() => handleAddItem()}
            loading={searching || adding}
            disabled={!tombamentoInput.trim() || searching || adding}
            style={styles.addBtn}
          >
            {labels.unitUser.addItem}
          </Button>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {labels.unitUser.cart} ({cart.length})
        </Text>

        {cart.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium">{labels.unitUser.noItems}</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {cart.map((item) => (
              <Card key={item.id} style={styles.cartItem}>
                <Card.Content style={styles.cartContent}>
                  <View style={styles.cartLeft}>
                    <Text variant="titleSmall">{item.tombamento}</Text>
                    {item.description && (
                      <Text variant="bodySmall" style={textSecondaryStyle}>
                        {item.description}
                      </Text>
                    )}
                    {item.unitUl && (
                      <Text variant="bodySmall" style={textHintStyle}>UL atual: {item.unitUl}</Text>
                    )}
                    <Chip
                      compact
                      style={styles.chip}
                      textStyle={styles.chipText}
                    >
                      {item.scannedMethod === 'manual' ? 'Manual' : 'Cadastrado'}
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
            ))}

            <Button
              mode="contained"
              onPress={handleFinish}
              loading={finishing}
              style={styles.finishBtn}
            >
              {labels.unitUser.finishRequest}
            </Button>
          </>
        )}
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        mode="continuous"
        onInclude={handleIncludeFromScanner}
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        action={{
          label: 'OK',
          onPress: () => setSnackbar((s) => ({ ...s, visible: false })),
        }}
        duration={snackbar.duration ?? 4000}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: { marginBottom: 16 },
  label: { marginBottom: 4 },
  sectionTitle: { marginBottom: 8, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  scanBtn: { margin: 0 },
  addBtn: { minWidth: 100 },
  cartItem: { marginBottom: 8 },
  cartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartLeft: { flex: 1 },
  chip: { alignSelf: 'flex-start', marginTop: 4 },
  chipText: { fontSize: 11 },
  finishBtn: { marginTop: 24 },
});
