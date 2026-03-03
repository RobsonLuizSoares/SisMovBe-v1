import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Pressable,
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
  Searchbar,
  useTheme,
} from 'react-native-paper';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { BlockingAlertModal } from '@/components/BlockingAlertModal';
import { useRouter } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  listUnits,
  searchAsset,
  createMovementPickedUp,
  normalizeTombamento,
  formatUnitDisplay,
  type UnitOption,
} from '@/lib/movements';
import { toSafeString } from '@/lib/safeString';

type CartItem = {
  id: string;
  tombamento: string;
  description: string | null;
  unitUl: string | null;
  scannedMethod: 'barcode' | 'manual';
  assetId: string | null;
};

type UnitPickerMode = 'origin' | 'destination' | null;

export default function MovimentarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [origin, setOrigin] = useState<UnitOption | null>(null);
  const [destination, setDestination] = useState<UnitOption | null>(null);
  const [unitPicker, setUnitPicker] = useState<UnitPickerMode>(null);
  const [unitSearch, setUnitSearch] = useState('');

  const [tombamentoInput, setTombamentoInput] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    error?: boolean;
    duration?: number;
  }>({ visible: false, message: '' });
  const [showGoToReceive, setShowGoToReceive] = useState(false);
  const [missingRouteModalVisible, setMissingRouteModalVisible] = useState(false);

  const loadUnits = useCallback(() => {
    setUnitsLoading(true);
    listUnits().then(({ data, error }) => {
      setUnitsLoading(false);
      if (!error) setUnits(data);
    });
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const filteredUnits = unitSearch.trim()
    ? units.filter(
        (u) =>
          u.ul_code.toLowerCase().includes(unitSearch.toLowerCase()) ||
          (u.name?.toLowerCase() ?? '').includes(unitSearch.toLowerCase())
      )
    : units;

  /** Garante tombamento como string não vazia antes de inserir no lote. Lança se inválido. */
  const sanitizeCartItemTombamento = (input: unknown): string => {
    const s = toSafeString(input);
    if (!s || s.length === 0) {
      throw new Error(labels.tech.invalidTombamentoFormat);
    }
    return s;
  };

  const handleAddItem = async (overrideValue?: string) => {
    const raw = toSafeString(overrideValue ?? tombamentoInput);
    if (!raw) return;
    if (!origin || !destination) {
      setMissingRouteModalVisible(true);
      return;
    }
    if (origin.id === destination.id) {
      setSnackbar({ visible: true, message: 'Origem e destino não podem ser a mesma unidade.', error: true });
      return;
    }

    const norm = normalizeTombamento(raw);
    if (cart.some((i) => normalizeTombamento(i.tombamento).display === norm.display)) {
      setSnackbar({ visible: true, message: labels.tech.duplicateInLot, error: true });
      return;
    }
    setSearching(true);
    const { asset, error } = await searchAsset(raw);
    setSearching(false);

    if (error) {
      setSnackbar({ visible: true, message: error, error: true });
      return;
    }

    const scannedMethod = asset ? 'barcode' : 'manual';
    try {
      const tombamento = sanitizeCartItemTombamento(norm.display);
      const cartItem: CartItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        tombamento,
        description: asset?.description ?? null,
        unitUl: asset?.unit_ul ?? null,
        scannedMethod,
        assetId: asset?.id ?? null,
      };
      setCart((prev) => [...prev, cartItem]);
      setTombamentoInput('');
      setSnackbar({
        visible: true,
        message: labels.tech.addedToLot.replace('{tombamento}', tombamento),
        duration: 2000,
      });
    } catch (err) {
      console.warn('[handleAddItem] Item inválido, input:', { raw, norm, asset });
      setSnackbar({ visible: true, message: labels.tech.invalidTombamentoFormat, error: true });
    }
  };

  const handleIncludeFromScanner = async (params: {
    tombamento: string;
    assetId: string | null;
    description?: string | null;
    unitUl?: string | null;
  }): Promise<{ ok: boolean; duplicate?: boolean; missingRoute?: boolean }> => {
    if (!origin || !destination) {
      setMissingRouteModalVisible(true);
      return { ok: false, missingRoute: true };
    }
    if (origin.id === destination.id) {
      setSnackbar({ visible: true, message: 'Origem e destino não podem ser a mesma unidade.', error: true });
      return { ok: false };
    }
    const raw = toSafeString(params.tombamento);
    if (!raw) {
      setSnackbar({ visible: true, message: labels.tech.invalidTombamentoFormat, error: true });
      return { ok: false };
    }
    const norm = normalizeTombamento(raw);
    if (cart.some((i) => normalizeTombamento(i.tombamento).display === norm.display)) {
      return { ok: false, duplicate: true };
    }
    try {
      const tombamento = sanitizeCartItemTombamento(norm.display);
      const scannedMethod = params.assetId ? 'barcode' : 'manual';
      const cartItem: CartItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        tombamento,
        description: params.description ?? null,
        unitUl: params.unitUl ?? null,
        scannedMethod,
        assetId: params.assetId ?? null,
      };
      setCart((prev) => [...prev, cartItem]);
      setSnackbar({
        visible: true,
        message: labels.tech.addedToLot.replace('{tombamento}', tombamento),
        duration: 2000,
      });
      return { ok: true };
    } catch (err) {
      console.warn('[handleIncludeFromScanner] Item inválido, input:', params);
      setSnackbar({ visible: true, message: labels.tech.invalidTombamentoFormat, error: true });
      return { ok: false };
    }
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleFinalize = async () => {
    if (!user?.id || !origin || !destination) return;
    if (cart.length === 0) {
      setSnackbar({ visible: true, message: labels.unitUser.noItems, error: true });
      return;
    }
    if (origin.id === destination.id) {
      setSnackbar({ visible: true, message: 'Origem e destino não podem ser a mesma unidade.', error: true });
      return;
    }

    setFinishing(true);
    const { movementId, displayCode, error, emailWarning } = await createMovementPickedUp(
      user.id,
      origin.id,
      destination.id,
      cart.map((i) => ({
        tombamento: i.tombamento,
        scannedMethod: i.scannedMethod,
        assetId: i.assetId,
      }))
    );
    setFinishing(false);

    if (error) {
      setSnackbar({ visible: true, message: error, error: true });
      return;
    }

    setCart([]);
    setOrigin(null);
    setDestination(null);
    setTombamentoInput('');
    setShowGoToReceive(true);
    const successMsg = displayCode
      ? `Movimentação criada: ${displayCode}`
      : labels.tech.moveSuccess;
    const finalMsg = emailWarning ? `${successMsg} ${emailWarning}` : successMsg;
    setSnackbar({ visible: true, message: finalMsg, error: false });
  };

  const goToReceive = () => {
    setShowGoToReceive(false);
    router.replace('/(app)/(tech)/receber');
  };

  if (unitsLoading) {
  return (
    <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, color: colors.textSecondary }}>Carregando unidades...</Text>
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
            <Text variant="labelLarge" style={[styles.label, { color: colors.textSecondary }]}>
              {labels.tech.origin}
            </Text>
            <Pressable
              onPress={() => setUnitPicker('origin')}
              style={({ pressed }) => [
                styles.unitButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
                {origin ? formatUnitDisplay(origin.ul_code, origin.name) : labels.tech.selectUnit}
              </Text>
            </Pressable>
            <Text variant="labelLarge" style={[styles.label, { marginTop: 12, color: colors.textSecondary }]}>
              {labels.tech.destination}
            </Text>
            <Pressable
              onPress={() => setUnitPicker('destination')}
              style={({ pressed }) => [
                styles.unitButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
                {destination ? formatUnitDisplay(destination.ul_code, destination.name) : labels.tech.selectUnit}
              </Text>
            </Pressable>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {labels.unitUser.addItem}
        </Text>
        <View style={styles.addSection}>
          <View style={styles.row}>
            <View style={styles.inputRow}>
              <View style={styles.tombamentoWrapper}>
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.outline }]}
                  placeholder={labels.unitUser.tombamento}
                  placeholderTextColor={colors.textSecondary}
                  value={tombamentoInput}
                  onChangeText={setTombamentoInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!!origin && !!destination && !searching && !adding}
                />
                {(!origin || !destination) && (
                  <Pressable
                    style={styles.tombamentoOverlay}
                    onPress={() => setMissingRouteModalVisible(true)}
                  />
                )}
              </View>
              <IconButton
                icon="camera"
                size={24}
                onPress={() => {
                  if (!origin || !destination) {
                    setMissingRouteModalVisible(true);
                    return;
                  }
                  setScannerOpen(true);
                }}
                disabled={searching || adding}
                style={styles.scanBtn}
              />
            </View>
            <Button
              mode="contained"
              onPress={() => handleAddItem()}
              loading={searching || adding}
              disabled={!origin || !destination || !tombamentoInput.trim() || searching || adding}
              style={styles.addBtn}
            >
              {labels.unitUser.addItem}
            </Button>
          </View>
          {(!origin || !destination) && (
            <Text variant="bodySmall" style={[styles.routeHint, { color: colors.textSecondary }]}>
              {labels.tech.selectOriginDestToEnable}
            </Text>
          )}
        </View>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {labels.unitUser.cart} ({cart.length})
        </Text>

        {cart.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{labels.unitUser.noItems}</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {cart.map((item) => (
              <Card key={item.id} style={styles.cartItem}>
                <Card.Content style={styles.cartContent}>
                  <View style={styles.cartLeft}>
                    <Text variant="titleSmall">{String(item.tombamento)}</Text>
                    {item.description && (
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                        {item.description}
                      </Text>
                    )}
                    {item.unitUl && (
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>UL atual: {item.unitUl}</Text>
                    )}
                    <Chip compact style={styles.chip} textStyle={styles.chipText}>
                      {item.scannedMethod === 'manual' ? 'Manual' : 'Cadastrado'}
                    </Chip>
                  </View>
                  <IconButton
                    icon="delete-outline"
                    size={22}
                    onPress={() => handleRemoveItem(item.id)}
                  />
                </Card.Content>
              </Card>
            ))}

            <Pressable
              onPress={handleFinalize}
              disabled={finishing}
              style={({ pressed }) => [
                styles.finishBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: finishing ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {finishing ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={[styles.finishBtnLabel, { color: theme.colors.onPrimary }]}>
                  {labels.tech.finalizePickup}
                </Text>
              )}
            </Pressable>

            {showGoToReceive && (
              <Button
                mode="outlined"
                onPress={goToReceive}
                style={styles.goToReceiveBtn}
              >
                {labels.tech.goToReceive}
              </Button>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!unitPicker}
        animationType="slide"
        onRequestClose={() => setUnitPicker(null)}
      >
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <IconButton icon="close" size={24} onPress={() => setUnitPicker(null)} />
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              {unitPicker === 'origin' ? labels.tech.origin : labels.tech.destination}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <Searchbar
            placeholder="Buscar por código ou nome"
            value={unitSearch}
            onChangeText={setUnitSearch}
            style={styles.searchBar}
          />
          <FlatList
            data={filteredUnits}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (unitPicker === 'origin') setOrigin(item);
                  else setDestination(item);
                  setUnitPicker(null);
                  setUnitSearch('');
                }}
                style={({ pressed }) => [
                  styles.unitRow,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Text variant="bodyLarge">{formatUnitDisplay(item.ul_code, item.name)}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        mode="continuous"
        onInclude={handleIncludeFromScanner}
      />

      <BlockingAlertModal
        visible={missingRouteModalVisible}
        title={labels.tech.selectOriginDest}
        message={labels.tech.selectOriginDestBeforeInput}
        onClose={() => setMissingRouteModalVisible(false)}
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        action={{
          label: 'OK',
          onPress: () => setSnackbar((s) => ({ ...s, visible: false })),
        }}
        style={snackbar.error ? { backgroundColor: theme.colors.error } : undefined}
        duration={snackbar.duration ?? (snackbar.error ? 4000 : 2000)}
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
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sectionTitle: { marginBottom: 8, marginTop: 8 },
  addSection: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeHint: { marginTop: 6, marginLeft: 4 },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tombamentoWrapper: { flex: 1, position: 'relative' },
  tombamentoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
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
  finishBtn: {
    marginTop: 24,
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishBtnLabel: { fontSize: 16, fontWeight: '600' },
  goToReceiveBtn: { marginTop: 12 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 8, paddingHorizontal: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  searchBar: { marginHorizontal: 16, marginBottom: 8 },
  unitRow: { padding: 16 },
});
