import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Modal, ScrollView } from 'react-native';
import { Text, Card, Button, IconButton, ActivityIndicator, Chip, Snackbar, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import {
  listReceiveMovements,
  getMovementDetail,
  getMovementItems,
  formatUnitDisplay,
  movementDisplayId,
  type MovementListItem,
  type MovementItem,
} from '@/lib/movements';
import { useTextStyles } from '@/lib/textStyles';
import { colors } from '@/theme/colors';
import { ReceiveConfirmModal } from '@/components/ReceiveConfirmModal';
import { SuccessModal } from '@/components/SuccessModal';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReceberScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const { textSecondaryStyle, textHintStyle } = useTextStyles();
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MovementListItem | null>(null);
  const [items, setItems] = useState<MovementItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const loadList = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    listReceiveMovements().then(({ data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (!error) setMovements(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(useCallback(() => loadList(), [loadList]));

  const openDetail = async (movId: string) => {
    setDetailId(movId);
    setDetailLoading(true);
    setDetail(null);
    setItems([]);

    const [detailRes, itemsRes] = await Promise.all([
      getMovementDetail(movId),
      getMovementItems(movId),
    ]);

    setDetailLoading(false);
    if (detailRes.data) setDetail(detailRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setItems([]);
    setReceiveConfirmOpen(false);
  };

  const handleOpenReceiveConfirm = () => {
    if (!detailId || !user?.id) return;
    if (items.length === 0) {
      setSnackbar({ visible: true, message: labels.tech.receiveNoItems });
      return;
    }
    setReceiveConfirmOpen(true);
  };

  const handleReceiveSuccess = useCallback(() => {
    setReceiveConfirmOpen(false);
    closeDetail();
    loadList();
    setSuccessModalVisible(true);
  }, [loadList]);

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    loadList();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Carregando...</Text>
      </View>
    );
  }

  if (movements.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">{labels.resumo.noData}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={movements}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const preview = item.tombamentosPreview ?? [];
          const remaining = item.tombamentosRemaining ?? 0;
          return (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.displayCode}>
                  {movementDisplayId(item)}
                </Text>
                <Text variant="bodySmall" style={textSecondaryStyle}>
                  {formatUnitDisplay(item.origin_ul, item.origin_name)} → {formatUnitDisplay(item.dest_ul, item.dest_name)}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                  style={styles.chipsScroll}
                >
                  {preview.map((t, idx) => (
                    <Chip key={`${t}-${idx}`} compact style={styles.tombChip} textStyle={styles.tombChipText}>
                      {t}
                    </Chip>
                  ))}
                  {remaining > 0 && (
                    <Chip compact style={styles.plusChip} textStyle={styles.tombChipText}>
                      +{remaining}
                    </Chip>
                  )}
                </ScrollView>
                <Text variant="bodySmall" style={[textHintStyle, { marginTop: 4 }]}>
                  {item.requester_name ?? '-'} • {formatDate(item.created_at)}
                </Text>
                <Button mode="outlined" compact style={{ marginTop: 8 }} onPress={() => openDetail(item.id)}>
                  Abrir
                </Button>
              </Card.Content>
            </Card>
          );
        }}
      />

      <Modal visible={!!detailId} animationType="slide" onRequestClose={closeDetail}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <IconButton icon="close" size={24} onPress={closeDetail} />
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Detalhe da movimentação
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {detailLoading ? (
              <ActivityIndicator size="large" style={{ marginTop: 32 }} />
            ) : detail ? (
              <>
                <Card style={styles.detailCard}>
                  <Card.Content>
                    <Text variant="headlineSmall" style={styles.displayCode}>
                      {movementDisplayId(detail)}
                    </Text>
                    <Text variant="bodyLarge" style={[textSecondaryStyle, { marginTop: 8 }]}>
                      {formatUnitDisplay(detail.origin_ul, detail.origin_name)} → {formatUnitDisplay(detail.dest_ul, detail.dest_name)}
                    </Text>
                    <Text variant="bodySmall" style={[textHintStyle, { marginTop: 4 }]}>
                      Solicitante: {detail.requester_name ?? '-'} • Retirado em {detail.pickup_at ? formatDate(detail.pickup_at) : '-'}
                    </Text>
                  </Card.Content>
                </Card>

                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, opacity: 0.85 }]}>
                  Itens ({items.length})
                </Text>
                {items.map((i) => (
                  <Card key={i.id} style={styles.itemCard}>
                    <Card.Content>
                      <Text variant="titleSmall">{i.tombamento_text}</Text>
                      {i.description && (
                        <Text variant="bodySmall" style={[textSecondaryStyle, { marginTop: 2 }]}>
                          {i.description}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                ))}

                <Button
                  mode="contained"
                  onPress={handleOpenReceiveConfirm}
                  disabled={items.length === 0}
                  style={styles.confirmBtn}
                >
                  {labels.tech.confirmReceiveAt} {formatUnitDisplay(detail.dest_ul, detail.dest_name)}
                </Button>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <ReceiveConfirmModal
        visible={receiveConfirmOpen}
        onClose={() => setReceiveConfirmOpen(false)}
        movementId={detailId ?? ''}
        items={items}
        userId={user?.id ?? ''}
        onSuccess={handleReceiveSuccess}
        onError={(msg) => setSnackbar({ visible: true, message: msg })}
      />

      <SuccessModal
        visible={successModalVisible}
        message={labels.tech.receiveSuccess}
        onClose={handleSuccessModalClose}
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        action={{ label: 'OK', onPress: () => setSnackbar((s) => ({ ...s, visible: false })) }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  displayCode: { fontWeight: '700' },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 12 },
  chipsScroll: { marginTop: 6, flexGrow: 0, minHeight: 28 },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tombChip: { marginRight: 0 },
  plusChip: { backgroundColor: colors.divider },
  tombChipText: { fontSize: 11 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 8, paddingHorizontal: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 48 },
  detailCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  itemCard: { marginBottom: 8 },
  confirmBtn: {
    marginTop: 24,
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
});
