import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Modal, Pressable, Text, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IconButton, Button, Card, Checkbox, ActivityIndicator } from 'react-native-paper';
import { extractTombamentoFromBarcode } from '@/lib/barcodeScanner';
import { searchAsset, confirmReceive, normalizeTombamento } from '@/lib/movements';
import { labels } from '@sismovbe/labels';
import { colors } from '@/theme/colors';
import type { MovementItem } from '@/lib/movements';

const SCAN_LOCK_MS = 1200;
const BARCODE_TYPES = ['itf14', 'code128', 'code39', 'ean13', 'ean8', 'qr'] as const;

type PendingScan = {
  tombamentoDisplay: string;
  description: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  movementId: string;
  items: MovementItem[];
  userId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function ReceiveConfirmModal({
  visible,
  onClose,
  movementId,
  items,
  userId,
  onSuccess,
  onError,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const [scanLocked, setScanLocked] = useState(false);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [labelMissingChecked, setLabelMissingChecked] = useState(false);
  const [manualTombamentoInput, setManualTombamentoInput] = useState('');
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemTombamentos = items.map((i) => normalizeTombamento(i.tombamento_text).display);

  const completeReceive = useCallback(
    async (
      tombamentoDisplay: string,
      eventPayload?: Record<string, unknown>
    ): Promise<{ ok: boolean; error?: string }> => {
      if (confirming) return { ok: false };
      if (!itemTombamentos.includes(tombamentoDisplay)) {
        return { ok: false, error: labels.tech.tombamentoNotInReceive };
      }
      setConfirming(true);
      setScanError(null);
      const { success, error } = await confirmReceive(movementId, userId, eventPayload);
      setConfirming(false);
      if (success) {
        onSuccess();
        return { ok: true };
      }
      onError(error ?? 'Não foi possível confirmar o recebimento.');
      return { ok: false };
    },
    [movementId, userId, itemTombamentos, confirming, onSuccess, onError]
  );

  const handleBarcodeScanned = useCallback(
    async (result: { type: string; data: string }) => {
      if (scanLocked || !scanningEnabled) return;

      const ext = extractTombamentoFromBarcode(result.type, result.data);
      if (!ext) return;

      setScanLocked(true);
      setPendingScan({ tombamentoDisplay: ext.tombamentoDisplay, description: null });
      setScanningEnabled(false);
      setScanError(null);
      setAssetLoading(true);

      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = setTimeout(() => {
        setScanLocked(false);
        lockTimeoutRef.current = null;
      }, SCAN_LOCK_MS);

      const { asset } = await searchAsset(ext.tombamentoDisplay);
      setPendingScan((prev) =>
        prev ? { ...prev, description: asset?.description ?? null } : null
      );
      setAssetLoading(false);
    },
    [scanLocked, scanningEnabled]
  );

  const handleConfirmScan = useCallback(async () => {
    if (!pendingScan) return;
    const { ok, error } = await completeReceive(pendingScan.tombamentoDisplay);
    if (ok) {
      setPendingScan(null);
      setScanningEnabled(true);
    } else if (error) {
      setScanError(error);
      setTimeout(() => {
        setScanError(null);
        setPendingScan(null);
        setScanningEnabled(true);
      }, 2000);
    }
  }, [pendingScan, completeReceive]);

  const handleCancelScan = useCallback(() => {
    setScanError(null);
    setPendingScan(null);
    setScanningEnabled(true);
  }, []);

  const handleManualReceive = useCallback(async () => {
    if (!labelMissingChecked) {
      onError('Marque a opção Etiqueta ausente/danificada.');
      return;
    }
    const raw = String(manualTombamentoInput ?? '').trim();
    if (!raw) {
      onError(labels.tech.informTombamento);
      return;
    }
    const tombamentoDisplay = normalizeTombamento(raw).display;
    if (!itemTombamentos.includes(tombamentoDisplay)) {
      onError(labels.tech.tombamentoNotInReceive);
      return;
    }
    const { ok } = await completeReceive(tombamentoDisplay, { method: 'manual_no_label' });
    if (ok) {
      // Só resetar ao sair da tela (onSuccess fecha o modal)
    }
  }, [labelMissingChecked, manualTombamentoInput, itemTombamentos, completeReceive, onError]);

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.message}>Verificando permissão da câmera...</Text>
          <IconButton icon="close" size={28} onPress={onClose} />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.message}>O app precisa acessar a câmera para escanear códigos.</Text>
          <Pressable style={styles.permButton} onPress={() => requestPermission()}>
            <Text style={styles.permButtonText}>Permitir câmera</Text>
          </Pressable>
          <IconButton icon="close" size={28} onPress={onClose} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Confirmar recebimento</Text>
          <IconButton icon="close" size={24} onPress={onClose} iconColor={colors.scannerText} />
        </View>

        <View style={styles.cameraSection} pointerEvents="box-none">
          <CameraView
            style={styles.camera}
            facing="back"
            autofocus="on"
            zoom={0.15}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={
              scanningEnabled && !scanLocked ? handleBarcodeScanned : undefined
            }
          />
          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.scanWindow} />
          </View>
        </View>

        <View style={styles.footerSection} pointerEvents="auto" collapsable={false}>
          {pendingScan ? (
            <Card style={styles.footerCard}>
              <Card.Content>
                <Text style={styles.tombamentoText}>
                  Tombamento: {pendingScan.tombamentoDisplay}
                </Text>
                {assetLoading ? (
                  <ActivityIndicator size="small" style={{ marginVertical: 8 }} />
                ) : pendingScan.description ? (
                  <Text style={styles.descText} numberOfLines={2}>
                    {pendingScan.description}
                  </Text>
                ) : null}
                {scanError && (
                  <Text style={styles.errorText}>{scanError}</Text>
                )}
                <View style={styles.footerButtons}>
                  <Button mode="outlined" onPress={handleCancelScan} style={styles.footerBtn} disabled={confirming}>
                    Cancelar
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleConfirmScan}
                    loading={confirming}
                    disabled={confirming}
                    style={styles.footerBtn}
                  >
                    {labels.tech.confirmReceiveButton}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.footerCard}>
              <Card.Content>
                <Checkbox.Item
                  label={labels.tech.labelMissingCheckbox}
                  status={labelMissingChecked ? 'checked' : 'unchecked'}
                  onPress={() => setLabelMissingChecked(!labelMissingChecked)}
                  style={styles.checkboxItem}
                  labelStyle={{ color: colors.textSecondary }}
                />
                <Text variant="bodySmall" style={[styles.hintText, { color: colors.textSecondary }]}>
                  {labels.tech.labelMissingHint}
                </Text>
                {labelMissingChecked && (
                  <View style={styles.manualRow} pointerEvents="auto">
                    <TextInput
                      style={[styles.manualInput, { borderColor: 'rgba(0,0,0,0.2)' }]}
                      placeholder={labels.unitUser.tombamento}
                      placeholderTextColor={colors.textSecondary}
                      value={manualTombamentoInput}
                      onChangeText={setManualTombamentoInput}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!confirming}
                    />
                    <Pressable
                      onPress={() => {
                        console.log('[ManualReceive] pressed');
                        handleManualReceive();
                      }}
                      disabled={!labelMissingChecked || !manualTombamentoInput.trim() || confirming}
                      style={({ pressed }) => [
                        styles.receiveBtnWrap,
                        (!labelMissingChecked || !manualTombamentoInput.trim() || confirming) && styles.receiveBtnDisabled,
                        pressed && !confirming && styles.receiveBtnDisabled,
                      ]}
                    >
                      {confirming ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <Text style={styles.receiveBtnText}>{labels.tech.receiveButton}</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.scannerBackground,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    color: colors.scannerText,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  permButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  permButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.scannerBackground,
  },
  headerTitle: { color: colors.scannerText, fontSize: 18, fontWeight: '600' },
  cameraSection: {
    flex: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  camera: { flex: 1, width: '100%' },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanWindow: {
    width: '75%',
    aspectRatio: 3,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  footerSection: {
    flex: 1,
    minHeight: 140,
    padding: 12,
    backgroundColor: colors.scannerBackground,
    justifyContent: 'center',
  },
  footerCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    margin: 0,
  },
  tombamentoText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  descText: { fontSize: 14, marginBottom: 8 },
  errorText: { fontSize: 13, color: colors.error, marginBottom: 8 },
  footerButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  footerBtn: { flex: 1 },
  checkboxItem: { paddingHorizontal: 0, paddingVertical: 2 },
  hintText: { marginBottom: 8, fontSize: 12 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
  },
  receiveBtnWrap: {
    minWidth: 100,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiveBtnDisabled: {
    opacity: 0.5,
  },
  receiveBtnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
