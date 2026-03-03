'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { invokeSendMovementEmail } from '@/lib/sendMovementEmail';

export type MovementStatus = 'requested' | 'picked_up' | 'received' | 'delivered' | 'canceled';

export type Movement = {
  id: string;
  display_code: string | null;
  created_at: string;
  requested_by: string;
  origin_unit_id: string;
  destination_unit_id: string;
  status: MovementStatus;
  pickup_technician_id: string | null;
  receiver_user_id: string | null;
  pickup_at: string | null;
  received_at: string | null;
  delivered_at: string | null;
  processed_asiweb: boolean;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
};

export type MovementListItem = Movement & {
  origin_ul: string | null;
  origin_name: string | null;
  dest_ul: string | null;
  dest_name: string | null;
  requester_name: string | null;
  pickup_tech_name: string | null;
  receiver_name: string | null;
  processed_by_name?: string | null;
  processed_by_role?: string | null;
  /** Contagem via movement_items (snapshot); não usa assets.current_unit_id */
  item_count?: number;
};

export type MovementItem = {
  id: string;
  movement_id: string;
  asset_id: string | null;
  tombamento_text: string;
  label_photo_url: string | null;
  scanned_method: string;
  created_at: string;
};

export type MovementEvent = {
  id: string;
  movement_id: string;
  actor_user_id: string;
  event_type: string;
  from_status: MovementStatus | null;
  to_status: MovementStatus | null;
  payload: unknown;
  created_at: string;
  actor_name: string | null;
};

export type ListMovementsFilters = {
  status?: MovementStatus;
  origin_unit_id?: string;
  destination_unit_id?: string;
  requested_by?: string;
  pickup_technician_id?: string;
  date_from?: string;
  date_to?: string;
};

async function enrichMovements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  movements: Movement[]
): Promise<MovementListItem[]> {
  if (!movements.length) return [];
  const movementIds = movements.map((m) => m.id);
  const unitIds = new Set<string>();
  const userIds = new Set<string>();
  movements.forEach((m) => {
    unitIds.add(m.origin_unit_id);
    unitIds.add(m.destination_unit_id);
    userIds.add(m.requested_by);
    if (m.pickup_technician_id) userIds.add(m.pickup_technician_id);
    if (m.receiver_user_id) userIds.add(m.receiver_user_id);
    if (m.processed_by) userIds.add(m.processed_by);
  });

  const [unitsRes, profilesRes, itemsRes] = await Promise.all([
    supabase
      .from('units')
      .select('id, ul_code, name')
      .in('id', [...unitIds]),
    supabase
      .from('profiles')
      .select('user_id, full_name, role')
      .in('user_id', [...userIds]),
    supabase.from('movement_items').select('movement_id').in('movement_id', movementIds),
  ]);

  const unitMap = new Map(
    (unitsRes.data ?? []).map((u: { id: string; ul_code: string; name: string }) => [u.id, u])
  );
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p: { user_id: string; full_name: string; role?: string }) => [
      p.user_id,
      { full_name: p.full_name, role: p.role ?? null },
    ])
  );
  const countMap = new Map<string, number>();
  for (const i of itemsRes.data ?? []) {
    const mid = (i as { movement_id: string }).movement_id;
    countMap.set(mid, (countMap.get(mid) ?? 0) + 1);
  }

  return movements.map((m) => {
    const procBy = m.processed_by ? profileMap.get(m.processed_by) : undefined;
    return {
      ...m,
      display_code: (m as Movement & { display_code?: string | null }).display_code ?? null,
      origin_ul: unitMap.get(m.origin_unit_id)?.ul_code ?? null,
      origin_name: unitMap.get(m.origin_unit_id)?.name ?? null,
      dest_ul: unitMap.get(m.destination_unit_id)?.ul_code ?? null,
      dest_name: unitMap.get(m.destination_unit_id)?.name ?? null,
      requester_name: profileMap.get(m.requested_by)?.full_name ?? null,
      pickup_tech_name: m.pickup_technician_id
        ? (profileMap.get(m.pickup_technician_id)?.full_name ?? null)
        : null,
      receiver_name: m.receiver_user_id
        ? (profileMap.get(m.receiver_user_id)?.full_name ?? null)
        : null,
      processed_by_name: procBy?.full_name ?? null,
      processed_by_role: procBy?.role ?? null,
      item_count: countMap.get(m.id) ?? 0,
    };
  });
}

export async function listMovements(
  filters: ListMovementsFilters,
  statusOnly?: MovementStatus
): Promise<{ data: MovementListItem[] | null; error: string | null }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    return { data: null, error: 'Sem permissão' };
  }

  const supabase = await createClient();
  let q = supabase.from('movements').select('*').order('created_at', { ascending: false });

  if (statusOnly) q = q.eq('status', statusOnly);
  else if (filters.status) q = q.eq('status', filters.status);
  if (filters.origin_unit_id) q = q.eq('origin_unit_id', filters.origin_unit_id);
  if (filters.destination_unit_id) q = q.eq('destination_unit_id', filters.destination_unit_id);
  if (filters.requested_by) q = q.eq('requested_by', filters.requested_by);
  if (filters.pickup_technician_id) q = q.eq('pickup_technician_id', filters.pickup_technician_id);
  if (filters.date_from) q = q.gte('created_at', filters.date_from);
  if (filters.date_to) q = q.lte('created_at', filters.date_to + 'T23:59:59.999Z');

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  const enriched = await enrichMovements(supabase, (data ?? []) as Movement[]);
  return { data: enriched, error: null };
}

export async function getMovementDetail(movementId: string): Promise<{
  movement: MovementListItem | null;
  items: MovementItem[];
  events: MovementEvent[];
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { movement: null, items: [], events: [], error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: mov, error: movErr } = await supabase
    .from('movements')
    .select('*')
    .eq('id', movementId)
    .single();
  if (movErr || !mov)
    return { movement: null, items: [], events: [], error: movErr?.message ?? 'Não encontrado' };

  const [enriched] = await enrichMovements(supabase, [mov as Movement]);
  if (!enriched) return { movement: null, items: [], events: [], error: null };

  const { data: items } = await supabase
    .from('movement_items')
    .select('*')
    .eq('movement_id', movementId)
    .order('created_at');

  const { data: evts } = await supabase
    .from('movement_events')
    .select('*')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: true });

  const actorIds = [
    ...new Set((evts ?? []).map((e: { actor_user_id: string }) => e.actor_user_id)),
  ];
  const { data: actors } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', actorIds);
  const actorMap = new Map(
    (actors ?? []).map((a: { user_id: string; full_name: string }) => [a.user_id, a.full_name])
  );

  const events: MovementEvent[] = (evts ?? []).map(
    (e: { actor_user_id: string; [k: string]: unknown }) => ({
      ...e,
      actor_name: actorMap.get(e.actor_user_id) ?? null,
    })
  ) as MovementEvent[];

  return {
    movement: enriched,
    items: (items ?? []) as MovementItem[],
    events,
    error: null,
  };
}

export async function listMovementsByCurrentUser(): Promise<{
  data: MovementListItem[] | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .eq('requested_by', auth.user.id)
    .in('status', ['requested', 'picked_up', 'received', 'canceled'])
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  const enriched = await enrichMovements(supabase, (data ?? []) as Movement[]);
  return { data: enriched, error: null };
}

/** TECH: listar movements status=requested (fila) */
export async function listQueueMovements(filters: { origin_unit_id?: string }) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { data: null, error: 'Não autorizado' };
  if (auth.profile?.role !== 'TECH') return { data: null, error: 'Apenas técnicos' };

  const supabase = await createClient();
  let q = supabase
    .from('movements')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: false });
  if (filters.origin_unit_id) q = q.eq('origin_unit_id', filters.origin_unit_id);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  const enriched = await enrichMovements(supabase, (data ?? []) as Movement[]);
  return { data: enriched, error: null };
}

/** TECH: listar movements status=picked_up onde pickup_technician_id = auth.uid (receber) */
export async function listReceiveMovements() {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { data: null, error: 'Não autorizado' };
  if (auth.profile?.role !== 'TECH') return { data: null, error: 'Apenas técnicos' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .eq('status', 'picked_up')
    .eq('pickup_technician_id', auth.user!.id)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  const enriched = await enrichMovements(supabase, (data ?? []) as Movement[]);
  return { data: enriched, error: null };
}

/** TECH: iniciar pickup (requested -> picked_up) */
export async function startPickup(movementId: string) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { error: 'Não autorizado' };
  if (auth.profile?.role !== 'TECH') return { error: 'Apenas técnicos' };

  const supabase = await createClient();
  const { data: mov, error: movErr } = await supabase
    .from('movements')
    .select('id, status')
    .eq('id', movementId)
    .single();
  if (movErr || !mov) return { error: 'Movimentação não encontrada' };
  if (mov.status !== 'requested')
    return { error: 'Só é possível iniciar pickup em solicitações pendentes' };

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('movements')
    .update({
      status: 'picked_up',
      pickup_technician_id: auth.user!.id,
      pickup_at: now,
    })
    .eq('id', movementId);
  if (updErr) return { error: updErr.message };

  const { error: evErr } = await supabase.from('movement_events').insert({
    movement_id: movementId,
    actor_user_id: auth.user!.id,
    event_type: 'STATUS_CHANGE',
    from_status: 'requested',
    to_status: 'picked_up',
    payload: {},
  });
  if (evErr) return { error: 'Evento não registrado: ' + evErr.message };

  await invokeSendMovementEmail('PICKED_UP', movementId);

  revalidatePath('/fila');
  revalidatePath('/receber');
  return { success: true };
}

/** TECH: confirmar recebimento (picked_up -> received) */
export async function confirmReceive(movementId: string) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { error: 'Não autorizado' };
  if (auth.profile?.role !== 'TECH') return { error: 'Apenas técnicos' };

  const supabase = await createClient();
  const { data: mov, error: movErr } = await supabase
    .from('movements')
    .select('id, status, pickup_technician_id')
    .eq('id', movementId)
    .single();
  if (movErr || !mov) return { error: 'Movimentação não encontrada' };
  if (mov.status !== 'picked_up') return { error: 'Só é possível receber após o pickup' };
  if ((mov as { pickup_technician_id: string | null }).pickup_technician_id !== auth.user!.id) {
    return { error: 'Somente o técnico que retirou pode confirmar o recebimento' };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('movements')
    .update({
      status: 'received',
      receiver_user_id: auth.user!.id,
      received_at: now,
    })
    .eq('id', movementId);
  if (updErr) return { error: updErr.message };

  const { error: evErr } = await supabase.from('movement_events').insert({
    movement_id: movementId,
    actor_user_id: auth.user!.id,
    event_type: 'STATUS_CHANGE',
    from_status: 'picked_up',
    to_status: 'received',
    payload: {},
  });
  if (evErr) return { error: 'Evento não registrado: ' + evErr.message };

  await invokeSendMovementEmail('RECEIVED', movementId);

  revalidatePath('/receber');
  revalidatePath('/fila');
  return { success: true };
}

/** Admin: excluir movimentação inteira (cascade remove items e events)
 * - Requer PATRIMONIO_ADMIN ou SEAME_ADMIN
 * - Bloqueia se processed_asiweb=true
 */
export async function deleteMovementForAdmin(
  movementId: string
): Promise<{ success: true } | { success: false; error: string; code?: 'FORBIDDEN' | 'CONFLICT' }> {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) {
    return { success: false, error: 'Não autorizado', code: 'FORBIDDEN' };
  }
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    return {
      success: false,
      error: 'Apenas administradores podem excluir movimentações',
      code: 'FORBIDDEN',
    };
  }

  const supabase = await createClient();
  const { data: mov, error: fetchErr } = await supabase
    .from('movements')
    .select('id, processed_asiweb')
    .eq('id', movementId)
    .single();

  if (fetchErr || !mov) {
    return { success: false, error: fetchErr?.message ?? 'Movimentação não encontrada' };
  }
  if ((mov as { processed_asiweb: boolean }).processed_asiweb) {
    return {
      success: false,
      error: 'Não é possível excluir movimentação já processada no ASIWEB',
      code: 'CONFLICT',
    };
  }

  const { error } = await supabase.from('movements').delete().eq('id', movementId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/movements');
  revalidatePath('/fila');
  revalidatePath('/receber');
  revalidatePath('/minhas-solicitacoes');
  revalidatePath('/pending-asiweb');
  revalidatePath('/requests');
  return { success: true };
}

export async function cancelMovementByUnitUser(movementId: string) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { error: 'Não autorizado' };
  if (auth.profile?.role !== 'UNIT_USER')
    return { error: 'Apenas usuário de unidade pode cancelar' };

  const supabase = await createClient();
  const { data: mov } = await supabase
    .from('movements')
    .select('status, requested_by')
    .eq('id', movementId)
    .single();
  if (!mov) return { error: 'Movimentação não encontrada' };
  if (mov.requested_by !== auth.user.id) return { error: 'Sem permissão' };
  if (mov.status !== 'requested') return { error: 'Só é possível cancelar solicitações pendentes' };

  const { error } = await supabase
    .from('movements')
    .update({ status: 'canceled' })
    .eq('id', movementId);
  if (error) return { error: error.message };
  revalidatePath('/minhas-solicitacoes');
  return { success: true };
}

export async function markAsProcessedAsiweb(movementId: string) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { error: 'Não autorizado' };
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    return { error: 'Sem permissão' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('movements')
    .update({
      processed_asiweb: true,
      processed_at: new Date().toISOString(),
      processed_by: auth.user.id,
    })
    .eq('id', movementId);

  if (error) return { error: error.message };
  revalidatePath('/pending-asiweb');
  revalidatePath('/movements');
  return { success: true };
}

export async function listPendingAsiweb(): Promise<{
  data: MovementListItem[] | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .in('status', ['received', 'delivered'])
    .eq('processed_asiweb', false)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  const enriched = await enrichMovements(supabase, (data ?? []) as Movement[]);
  return { data: enriched, error: null };
}

export type FetchAsiwebParams = {
  processed: boolean;
  page?: number;
  pageSize?: number;
};

export async function fetchAsiwebMovements(params: FetchAsiwebParams): Promise<{
  data: MovementListItem[];
  total: number;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: [], total: 0, error: 'Não autorizado' };
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    return { data: [], total: 0, error: 'Sem permissão' };
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const baseQuery = supabase
    .from('movements')
    .select('*', { count: 'exact' })
    .in('status', ['received', 'delivered'])
    .eq('processed_asiweb', params.processed);

  const orderCol = params.processed ? 'processed_at' : 'received_at';
  const { data, error, count } = await baseQuery
    .order(orderCol, { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) return { data: [], total: 0, error: error.message };
  const enriched = await enrichMovements(supabase, (data ?? []) as Movement[]);
  return { data: enriched, total: count ?? 0, error: null };
}

export async function getPendingAsiwebForExport(): Promise<{
  data: Array<{
    movement_id: string;
    created_at: string;
    status: string;
    tombamento_text: string;
    origin_ul: string;
    origin_name: string;
    dest_ul: string;
    dest_name: string;
    requester_name: string;
  }>;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: [], error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: movements } = await supabase
    .from('movements')
    .select('id, created_at, status, origin_unit_id, destination_unit_id, requested_by')
    .in('status', ['received', 'delivered'])
    .eq('processed_asiweb', false)
    .order('created_at');

  if (!movements?.length) return { data: [], error: null };

  const unitIds = new Set<string>();
  const userIds = new Set<string>();
  movements.forEach(
    (m: { origin_unit_id: string; destination_unit_id: string; requested_by: string }) => {
      unitIds.add(m.origin_unit_id);
      unitIds.add(m.destination_unit_id);
      userIds.add(m.requested_by);
    }
  );

  const { data: units } = await supabase
    .from('units')
    .select('id, ul_code, name')
    .in('id', [...unitIds]);
  const unitMap = new Map(
    (units ?? []).map((u: { id: string; ul_code: string; name: string }) => [u.id, u])
  );
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', [...userIds]);
  const profileMap = new Map(
    (profiles ?? []).map((p: { user_id: string; full_name: string }) => [p.user_id, p.full_name])
  );

  const rows: Array<{
    movement_id: string;
    created_at: string;
    status: string;
    tombamento_text: string;
    origin_ul: string;
    origin_name: string;
    dest_ul: string;
    dest_name: string;
    requester_name: string;
  }> = [];

  for (const mov of movements as Array<{
    id: string;
    created_at: string;
    status: string;
    origin_unit_id: string;
    destination_unit_id: string;
    requested_by: string;
  }>) {
    const origUnit = unitMap.get(mov.origin_unit_id) ?? { ul_code: '', name: '' };
    const destUnit = unitMap.get(mov.destination_unit_id) ?? { ul_code: '', name: '' };
    const requesterName = profileMap.get(mov.requested_by) ?? '';

    const { data: items } = await supabase
      .from('movement_items')
      .select('tombamento_text')
      .eq('movement_id', mov.id);

    if (!items?.length) {
      rows.push({
        movement_id: mov.id,
        created_at: mov.created_at,
        status: mov.status,
        tombamento_text: '',
        origin_ul: origUnit.ul_code,
        origin_name: origUnit.name,
        dest_ul: destUnit.ul_code,
        dest_name: destUnit.name,
        requester_name: requesterName,
      });
    } else {
      for (const item of items as { tombamento_text: string }[]) {
        rows.push({
          movement_id: mov.id,
          created_at: mov.created_at,
          status: mov.status,
          tombamento_text: item.tombamento_text,
          origin_ul: origUnit.ul_code,
          origin_name: origUnit.name,
          dest_ul: destUnit.ul_code,
          dest_name: destUnit.name,
          requester_name: requesterName,
        });
      }
    }
  }

  return { data: rows, error: null };
}
