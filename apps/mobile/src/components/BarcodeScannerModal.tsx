import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Text, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IconButton, Button, Card, Snackbar } from 'react-native-paper';
import { extractTombamentoFromBarcode } from '@/lib/barcodeScanner';
import { searchAsset } from '@/lib/movements';
import { labels } from '@sismovbe/labels';
import { colors } from '@/theme/colors';

const SCAN_LOCK_MS = 1200;

const BARCODE_TYPES = [
  'itf14',
  'code128',
  'code39',
  'ean13',
  'ean8',
  'qr',
] as const;

type PendingScan = {
  tombamentoDisplay: string;
  type: string;
  data: string;
  description: string | null;
  assetId: string | null;
  unitUl: string | null;
};

type IncludeResult = {
  ok: boolean;
  duplicate?: boolean;
  missingRoute?: boolean;
  /** Fechar scanner após sucesso (ex.: confirmação de recebimento) */
  closeScanner?: boolean;
  /** Mensagem de erro customizada quando ok=false */
  error?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Modo contínuo: overlay com Incluir/Cancelar, scanner permanece aberto */
  mode?: 'continuous' | 'single';
  /** Label do botão de confirmação (default: Incluir) */
  confirmButtonLabel?: string;
  /** Adiciona item ao lote / confirma ação. Retorna ok, duplicate, missingRoute, closeScanner */
  onInclude?: (params: {
    tombamento: string;
    assetId: string | null;
    description?: string | null;
    unitUl?: string | null;
  }) => Promise<IncludeResult>;
  /** Callback legado para modo single (fecha após scan) */
  onScan?: (value: string) => void;
};

export function BarcodeScannerModal({
  visible,
  onClose,
  mode = 'continuous',
  confirmButtonLabel = 'Incluir',
  onInclude,
  onScan,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const [scanLocked, setScanLocked] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [includeLoading, setIncludeLoading] = useState(false);
  const [includeError, setIncludeError] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!addedFeedback) return;
    const t = setTimeout(() => setAddedFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [addedFeedback]);

  const isContinuous = mode === 'continuous' && onInclude;

  const handleBarcodeScanned = useCallback(
    async (result: { type: string; data: string }) => {
      if (scanLocked || !scanningEnabled) return;

      const ext = extractTombamentoFromBarcode(result.type, result.data);
      if (!ext) return;

      setScanLocked(true);
      setPendingScan({
        tombamentoDisplay: ext.tombamentoDisplay,
        type: result.type,
        data: result.data,
        description: null,
        assetId: null,
        unitUl: null,
      });
      setScanningEnabled(false);
      setAssetLoading(true);

      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = setTimeout(() => {
        setScanLocked(false);
        lockTimeoutRef.current = null;
      }, SCAN_LOCK_MS);

      const { asset } = await searchAsset(ext.tombamentoDisplay);
      setPendingScan((prev) =>
        prev
          ? {
              ...prev,
              description: asset?.description ?? null,
              assetId: asset?.id ?? null,
              unitUl: asset?.unit_ul ?? null,
            }
          : null
      );
      setAssetLoading(false);

      if (!isContinuous && onScan) {
        onScan(ext.tombamentoDisplay);
        onClose();
      }
    },
    [scanLocked, scanningEnabled, isContinuous, onScan, onClose]
  );

  const handleInclude = useCallback(async () => {
    if (!pendingScan || !onInclude || includeLoading) return;
    setIncludeError(null);
    setIncludeLoading(true);
    const { tombamentoDisplay, assetId, description, unitUl } = pendingScan;
    try {
      const result = await onInclude({
        tombamento: tombamentoDisplay,
        assetId,
        description,
        unitUl,
      });
      if (result.ok) {
        setPendingScan(null);
        setScanningEnabled(true);
        setAddedFeedback(labels.tech.addedToLot.replace('{tombamento}', tombamentoDisplay));
        if (result.closeScanner) onClose();
      } else if (result.missingRoute) {
        setPendingScan(null);
        setScanningEnabled(true);
      } else if (result.duplicate) {
        setIncludeError('Já adicionado ao lote');
        setTimeout(() => {
          setIncludeError(null);
          setPendingScan(null);
          setScanningEnabled(true);
        }, 1500);
      } else {
        setIncludeError(result.error ?? 'Erro ao adicionar');
      }
    } finally {
      setIncludeLoading(false);
    }
  }, [pendingScan, onInclude, onClose, includeLoading]);

  const handleCancel = useCallback(() => {
    setIncludeError(null);
    setPendingScan(null);
    setScanningEnabled(true);
  }, []);

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
          <Text style={styles.message}>
            O app precisa acessar a câmera para escanear códigos de barras.
          </Text>
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
          <Text style={styles.headerTitle}>Escanear código</Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 16, bottom: 16, left: 24, right: 24 }}
            style={({ pressed }) => [styles.concluirBtn, pressed && styles.concluirBtnPressed]}
          >
            <Text style={styles.concluirBtnText}>Concluir</Text>
          </Pressable>
        </View>

        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            facing="back"
            autofocus="on"
            enableTorch={flashOn}
            zoom={0.15}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={
              scanningEnabled && !scanLocked ? handleBarcodeScanned : undefined
            }
          />
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanWindow} />
          </View>
        </View>

        <View style={styles.footer}>
          {!pendingScan ? (
            <>
              <Text style={styles.footerHint}>
                Aponte para o código de barras da etiqueta patrimonial
              </Text>
              <View style={styles.flashRow}>
                <Text style={styles.footerHint}>Flash: </Text>
                <IconButton
                  icon={flashOn ? 'flash' : 'flash-off'}
                  size={24}
                  iconColor={colors.scannerText}
                  onPress={() => setFlashOn(!flashOn)}
                />
              </View>
              {scanLocked && (
                <Text style={styles.lockHint}>
                  Aguarde... ({Math.ceil(SCAN_LOCK_MS / 1000)}s)
                </Text>
              )}
            </>
          ) : (
            <Card style={styles.confirmCard}>
              <Card.Content>
                <Text style={styles.confirmTombamento}>
                  Tombamento: {pendingScan.tombamentoDisplay}
                </Text>
                {assetLoading ? (
                  <ActivityIndicator size="small" style={{ marginVertical: 8 }} />
                ) : pendingScan.description ? (
                  <Text style={styles.confirmDesc} numberOfLines={2}>
                    {pendingScan.description}
                  </Text>
                ) : (
                  <Text style={styles.confirmDescMuted}>Sem descrição no cadastro</Text>
                )}
                {includeError && (
                  <Text style={styles.confirmError}>{includeError}</Text>
                )}
                <View style={styles.confirmButtons}>
                  <Button mode="outlined" onPress={handleCancel} style={styles.confirmBtn} disabled={includeLoading}>
                    Cancelar
                  </Button>
                  <Button mode="contained" onPress={handleInclude} style={styles.confirmBtn} loading={includeLoading} disabled={includeLoading}>
                    {confirmButtonLabel}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

        <Snackbar
          visible={!!addedFeedback}
          onDismiss={() => setAddedFeedback(null)}
          duration={2000}
          style={styles.addedSnackbar}
        >
          {addedFeedback}
        </Snackbar>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.scannerBackground },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
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
    paddingHorizontal: 12,
    backgroundColor: colors.scannerBackground,
  },
  headerTitle: { color: colors.scannerText, fontSize: 18, fontWeight: '600' },
  concluirBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  concluirBtnPressed: { opacity: 0.8 },
  concluirBtnText: {
    color: colors.scannerText,
    fontSize: 18,
    fontWeight: '700',
  },
  addedSnackbar: {
    marginBottom: 24,
    backgroundColor: '#2e7d32',
  },
  cameraWrapper: { flex: 2, position: 'relative' },
  camera: { flex: 1, width: '100%' },
  overlay: {
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
  footer: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.scannerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHint: {
    color: colors.scannerTextMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  flashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockHint: { color: colors.scannerTextMuted, fontSize: 12 },
  confirmCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  confirmTombamento: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmDesc: { fontSize: 14, marginBottom: 8 },
  confirmDescMuted: {
    fontSize: 14,
    color: colors.scannerTextMuted,
    marginBottom: 8,
  },
  confirmError: { fontSize: 13, color: colors.error, marginBottom: 8 },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmBtn: { flex: 1 },
});
