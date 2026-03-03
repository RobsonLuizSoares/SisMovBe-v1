import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { Text, Card, Button, Chip, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { labels } from '@sismovbe/labels';
import { useAuth } from '@/contexts/AuthContext';
import {
  listMyMovements,
  getMovementDetail,
  getMovementItems,
  getMovementEvents,
  formatUnitDisplay,
  movementDisplayId,
  type MovementListItem,
  type MovementItem,
  type MovementEventItem,
} from '@/lib/movements';
import { useTextStyles } from '@/lib/textStyles';
import { colors } from '@/theme/colors';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    requested: labels.status.requested,
    picked_up: labels.status.picked_up,
    received: labels.status.received,
    delivered: labels.status.delivered,
    canceled: labels.status.canceled,
  };
  return map[status] ?? status;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    requested: '#ff9800',
    picked_up: '#2196f3',
    received: '#4caf50',
    delivered: '#4caf50',
    canceled: '#f44336',
  };
  return map[status] ?? '#999';
}

export default function MinhasSolicitacoesScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const { textSecondaryStyle, textHintStyle } = useTextStyles();
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MovementListItem | null>(null);
  const [items, setItems] = useState<MovementItem[]>([]);
  const [events, setEvents] = useState<MovementEventItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      setLoading(true);
      listMyMovements(user.id).then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (!error) setMovements(data);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  const openDetail = async (movId: string) => {
    setDetailId(movId);
    setDetailLoading(true);
    setDetail(null);
    setItems([]);
    setEvents([]);

    const [detailRes, itemsRes, eventsRes] = await Promise.all([
      getMovementDetail(movId),
      getMovementItems(movId),
      getMovementEvents(movId),
    ]);

    setDetailLoading(false);
    if (detailRes.data) setDetail(detailRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setItems([]);
    setEvents([]);
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
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.displayCode}>
                  {movementDisplayId(item)}
                </Text>
                <Chip
                  compact
                  style={[styles.statusChip, { backgroundColor: statusColor(item.status) + '22' }]}
                  textStyle={{ color: statusColor(item.status), fontSize: 11 }}
                >
                  {statusLabel(item.status)}
                </Chip>
              </View>
              <Text variant="bodySmall" style={textSecondaryStyle}>
                {formatUnitDisplay(item.origin_ul, item.origin_name)} → {formatUnitDisplay(item.dest_ul, item.dest_name)}
              </Text>
              <Text variant="bodySmall" style={[textHintStyle, { marginTop: 2 }]}>
                {formatDate(item.created_at)} • {item.item_count ?? 0} itens
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
              Detalhe da solicitação
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
                      {formatDate(detail.created_at)}
                    </Text>
                    <Chip
                      style={[
                        styles.statusChip,
                        { backgroundColor: statusColor(detail.status) + '22', marginTop: 8 },
                      ]}
                      textStyle={{ color: statusColor(detail.status) }}
                    >
                      {statusLabel(detail.status)}
                    </Chip>
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
                      <Chip compact style={styles.methodChip} textStyle={styles.methodChipText}>
                        {i.scanned_method === 'manual' ? 'Manual' : 'Cadastrado'}
                      </Chip>
                    </Card.Content>
                  </Card>
                ))}

                {events.length > 0 && (
                  <>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onSurface, opacity: 0.85 },
                      ]}
                    >
                      {labels.movements.timeline}
                    </Text>
                    {events.map((e) => (
                      <View key={e.id} style={styles.eventRow}>
                        <Text variant="bodySmall" style={[textSecondaryStyle, { flex: 1 }]}>
                          {e.event_type}
                          {e.from_status && e.to_status && ` (${e.from_status} → ${e.to_status})`}
                        </Text>
                        <Text variant="bodySmall" style={textHintStyle}>{formatDate(e.created_at)}</Text>
                      </View>
                    ))}
                  </>
                )}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { alignSelf: 'flex-start' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 8, paddingHorizontal: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 48 },
  detailCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  itemCard: { marginBottom: 8 },
  methodChip: { alignSelf: 'flex-start', marginTop: 4 },
  methodChipText: { fontSize: 11 },
  eventRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
});
