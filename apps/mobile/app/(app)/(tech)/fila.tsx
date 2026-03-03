import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { Text, Card, Button, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import { useQueueNotification } from '@/contexts/QueueNotificationContext';
import {
  listQueueMovements,
  getMovementDetail,
  getMovementItems,
  confirmPickup,
  formatUnitDisplay,
  movementDisplayId,
  type MovementListItem,
  type MovementItem,
} from '@/lib/movements';
import { useTextStyles } from '@/lib/textStyles';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FilaScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const { markAsSeen } = useQueueNotification() ?? {};
  const { textSecondaryStyle, textHintStyle } = useTextStyles();
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MovementListItem | null>(null);
  const [items, setItems] = useState<MovementItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadList = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    listQueueMovements().then(({ data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (!error) setMovements(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
      markAsSeen?.();
    }, [loadList, markAsSeen])
  );

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
  };

  const handleConfirmPickup = async () => {
    if (!detailId || !user?.id) return;
    setConfirming(true);
    const { success, error } = await confirmPickup(detailId, user.id);
    setConfirming(false);
    if (success) {
      closeDetail();
      loadList();
    } else {
      const { Alert } = await import('react-native');
      Alert.alert('Erro', error ?? 'Não foi possível confirmar a retirada.');
    }
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
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.displayCode}>
                {movementDisplayId(item)}
              </Text>
              <Text variant="bodySmall" style={textSecondaryStyle}>
                {formatUnitDisplay(item.origin_ul, item.origin_name)} → {formatUnitDisplay(item.dest_ul, item.dest_name)}
              </Text>
              <Text variant="bodySmall" style={[textHintStyle, { marginTop: 2 }]}>
                {item.requester_name ?? '-'} • {formatDate(item.created_at)} • {item.item_count ?? 0} itens
              </Text>
              <Button mode="outlined" compact style={{ marginTop: 8 }} onPress={() => openDetail(item.id)}>
                Abrir
              </Button>
            </Card.Content>
          </Card>
        )}
      />

      <Modal visible={!!detailId} animationType="slide" onRequestClose={closeDetail}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <IconButton icon="close" size={24} onPress={closeDetail} />
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Detalhe - Fila
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
                      Solicitante: {detail.requester_name ?? '-'} • {formatDate(detail.created_at)}
                    </Text>
                  </Card.Content>
                </Card>

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface, opacity: 0.85 },
                  ]}
                >
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
                  onPress={handleConfirmPickup}
                  loading={confirming}
                  style={styles.confirmBtn}
                >
                  {labels.tech.startPickup}
                </Button>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  displayCode: { fontWeight: '700' },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 12 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 8, paddingHorizontal: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 48 },
  detailCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  itemCard: { marginBottom: 8 },
  confirmBtn: { marginTop: 24 },
});
