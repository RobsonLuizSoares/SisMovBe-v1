import { supabase } from './supabase';

export type MovementStatus =
  | 'requested'
  | 'picked_up'
  | 'received'
  | 'delivered'
  | 'canceled';

export type ScannedMethod = 'barcode' | 'manual';

export type MovementListItem = {
  id: string;
  display_code: string | null;
  created_at: string;
  requested_by: string;
  origin_unit_id: string;
  destination_unit_id: string;
  status: MovementStatus;
  origin_ul: string | null;
  origin_name: string | null;
  dest_ul: string | null;
  dest_name: string | null;
  requester_name: string | null;
  item_count?: number;
  pickup_at?: string | null;
  received_at?: string | null;
  /** Prévia dos tombamentos (primeiros 4) - usada na lista Receber */
  tombamentosPreview?: string[];
  /** Quantidade de itens além dos 4 exibidos - usada na lista Receber */
  tombamentosRemaining?: number;
};

/** Formato "UL_CODE - NOME" para exibição de unidades */
export function formatUnitDisplay(ul: string | null, name: string | null): string {
  if (ul && name) return `${ul} - ${name}`;
  if (ul) return ul;
  if (name) return name;
  return '-';
}

/** Identificador do movement: display_code ou 8 primeiros do UUID */
export function movementDisplayId(m: { display_code?: string | null; id: string }): string {
  return m.display_code ?? m.id.slice(0, 8);
}

export type MovementItem = {
  id: string;
  movement_id: string;
  asset_id: string | null;
  tombamento_text: string;
  label_photo_url: string | null;
  scanned_method: ScannedMethod;
  description?: string | null;
  unit_ul?: string | null;
};

export type MovementEventItem = {
  id: string;
  event_type: string;
  from_status: MovementStatus | null;
  to_status: MovementStatus | null;
  created_at: string;
  actor_name?: string | null;
};

export type AssetSearchResult = {
  id: string;
  tombamento: string;
  description: string;
  barcode_value: string | null;
  unit_ul: string;
  unit_name: string;
};

export type UnitUserContext = {
  originUnitId: string;
  destUnitId: string;
  originUl: string;
  destUl: string;
  originName: string;
  destName: string;
};

export type UnitOption = {
  id: string;
  ul_code: string;
  name: string;
};

async function enrichMovements(
  rows: { id: string; created_at: string; requested_by: string; origin_unit_id: string; destination_unit_id: string; status: string; [k: string]: unknown }[]
): Promise<MovementListItem[]> {
  if (rows.length === 0) return [];

  const movementIds = rows.map((r) => r.id);
  const unitIds = [...new Set(rows.flatMap((r) => [r.origin_unit_id, r.destination_unit_id]))];
  const userIds = [...new Set(rows.map((r) => r.requested_by))];

  const [unitsRes, profilesRes, itemsRes] = await Promise.all([
    supabase.from('units').select('id, ul_code, name').in('id', unitIds),
    supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
    supabase.from('movement_items').select('movement_id').in('movement_id', movementIds),
  ]);

  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p.full_name]));

  const countMap = new Map<string, number>();
  for (const i of itemsRes.data ?? []) {
    const mid = (i as { movement_id: string }).movement_id;
    countMap.set(mid, (countMap.get(mid) ?? 0) + 1);
  }

  return rows.map((m) => ({
    id: m.id,
    display_code: (m as { display_code?: string | null }).display_code ?? null,
    created_at: m.created_at,
    requested_by: m.requested_by,
    origin_unit_id: m.origin_unit_id,
    destination_unit_id: m.destination_unit_id,
    status: m.status as MovementStatus,
    origin_ul: (unitMap.get(m.origin_unit_id) as { ul_code: string } | undefined)?.ul_code ?? null,
    origin_name: (unitMap.get(m.origin_unit_id) as { name: string } | undefined)?.name ?? null,
    dest_ul: (unitMap.get(m.destination_unit_id) as { ul_code: string } | undefined)?.ul_code ?? null,
    dest_name: (unitMap.get(m.destination_unit_id) as { name: string } | undefined)?.name ?? null,
    requester_name: profileMap.get(m.requested_by) ?? null,
    item_count: countMap.get(m.id) ?? 0,
    pickup_at: (m as { pickup_at?: string }).pickup_at ?? null,
    received_at: (m as { received_at?: string }).received_at ?? null,
  }));
}

const CONFIG_SEAME_ERROR = 'Configuração de recebimento (SEAME) não definida. Contate o administrador.';
const DEST_UNIT_NOT_FOUND_ERROR = 'Unidade destino SEAME não encontrada. Contate o administrador.';

/** Listar unidades ativas para seleção (TECH Movimentar) */
export async function listUnits(): Promise<{
  data: UnitOption[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('units')
    .select('id, ul_code, name')
    .eq('active', true)
    .order('ul_code');

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as UnitOption[], error: null };
}

/** UNIT_USER: contexto para criar movement (origem, destino, ul_codes) */
export async function getUnitUserContext(
  profileUnitId: string
): Promise<{ data: UnitUserContext | null; error: string | null }> {
  const { data: settings, error: settingsErr } = await supabase
    .from('app_settings')
    .select('seame_receipts_ul_code')
    .eq('id', 1)
    .maybeSingle();

  if (settingsErr) {
    console.warn('[getUnitUserContext] app_settings error:', JSON.stringify(settingsErr));
    return { data: null, error: CONFIG_SEAME_ERROR };
  }

  const rawCode = settings?.seame_receipts_ul_code;
  if (!rawCode || String(rawCode).trim() === '') {
    console.warn('[getUnitUserContext] seame_receipts_ul_code vazio ou null');
    return { data: null, error: CONFIG_SEAME_ERROR };
  }

  const ulCode = String(rawCode).trim();
  const padded = ulCode.replace(/\D/g, '').padStart(6, '0');
  if (padded.length !== 6) {
    console.warn('[getUnitUserContext] ul_code inválido:', { ulCode, padded });
    return { data: null, error: CONFIG_SEAME_ERROR };
  }

  const { data: destUnit, error: destErr } = await supabase
    .from('units')
    .select('id, ul_code, name')
    .eq('ul_code', padded)
    .maybeSingle();

  if (destErr) {
    console.warn('[getUnitUserContext] units (dest) error:', JSON.stringify(destErr));
    return { data: null, error: DEST_UNIT_NOT_FOUND_ERROR };
  }
  if (!destUnit) {
    console.warn('[getUnitUserContext] Unidade destino não encontrada para ul_code:', padded);
    return { data: null, error: DEST_UNIT_NOT_FOUND_ERROR };
  }

  const { data: originUnit, error: origErr } = await supabase
    .from('units')
    .select('id, ul_code, name')
    .eq('id', profileUnitId)
    .maybeSingle();

  if (origErr) {
    console.warn('[getUnitUserContext] units (origin) error:', JSON.stringify(origErr));
    return { data: null, error: origErr?.message ?? 'Unidade de origem não encontrada' };
  }
  if (!originUnit) {
    console.warn('[getUnitUserContext] Unidade origem não encontrada:', profileUnitId);
    return { data: null, error: 'Unidade de origem não encontrada' };
  }

  return {
    data: {
      originUnitId: originUnit.id,
      destUnitId: destUnit.id,
      originUl: String(originUnit.ul_code ?? ''),
      destUl: String(destUnit.ul_code ?? ''),
      originName: originUnit.name ?? '',
      destName: destUnit.name ?? '',
    },
    error: null,
  };
}

/** Normalização de tombamento: rawTrim, digitsOnly e display (xxx.xxx) */
export type TombamentoNormalized = { rawTrim: string; digitsOnly: string; display: string };

export function normalizeTombamento(input: unknown): TombamentoNormalized {
  const rawTrim = String(input ?? '').trim();
  const digitsOnly = rawTrim.replace(/\D/g, '');

  let display: string;
  if (/^\d{3}\.\d{3}$/.test(rawTrim)) {
    display = rawTrim;
  } else if (digitsOnly.length === 6) {
    display = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}`;
  } else {
    display = rawTrim;
  }

  return { rawTrim, digitsOnly, display: String(display) };
}

/** Buscar asset por tombamento ou barcode_value (rawTrim e digitsOnly) */
export async function searchAsset(
  tombamentoOrBarcode: string
): Promise<{ asset: AssetSearchResult | null; error: string | null }> {
  const norm = normalizeTombamento(tombamentoOrBarcode);
  if (!norm.rawTrim) return { asset: null, error: 'Informe o tombamento' };

  const values = [...new Set([norm.rawTrim, norm.digitsOnly].filter(Boolean))];
  const conditions: string[] = [];
  for (const v of values) {
    conditions.push(`barcode_value.eq.${v}`, `tombamento.eq.${v}`);
  }

  const { data, error } = await supabase
    .from('assets')
    .select('id, tombamento, description, barcode_value, current_unit_id')
    .or(conditions.join(','))
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (error) return { asset: null, error: error.message };
  if (!data) return { asset: null, error: null };

  const { data: unit, error: unitErr } = await supabase
    .from('units')
    .select('ul_code, name')
    .eq('id', data.current_unit_id)
    .maybeSingle();

  if (unitErr) {
    console.warn('[searchAsset] units error:', JSON.stringify(unitErr));
  }

  return {
    asset: {
      id: data.id,
      tombamento: data.tombamento,
      description: data.description,
      barcode_value: data.barcode_value,
      unit_ul: unit?.ul_code ?? '',
      unit_name: unit?.name ?? '',
    },
    error: null,
  };
}


/** TECH: criar movement já com status picked_up (Movimentar setor→setor) */
export async function createMovementPickedUp(
  userId: string,
  originUnitId: string,
  destUnitId: string,
  items: Array<{
    tombamento: string;
    scannedMethod: ScannedMethod;
    assetId: string | null;
  }>
): Promise<{
  movementId: string | null;
  displayCode: string | null;
  error: string | null;
  emailWarning?: string | null;
}> {
  if (items.length === 0) return { movementId: null, displayCode: null, error: 'Adicione pelo menos um item' };

  const now = new Date().toISOString();

  const { data: mov, error: movErr } = await supabase
    .from('movements')
    .insert({
      requested_by: userId,
      origin_unit_id: originUnitId,
      destination_unit_id: destUnitId,
      status: 'picked_up',
      pickup_technician_id: userId,
      pickup_at: now,
      receiver_user_id: null,
      received_at: null,
      processed_asiweb: false,
    })
    .select('id, display_code')
    .maybeSingle();

  if (movErr) return { movementId: null, displayCode: null, error: movErr.message };
  if (!mov) return { movementId: null, displayCode: null, error: 'Falha ao criar movimentação' };

  const movementId = (mov as { id: string }).id;
  const displayCode = (mov as { display_code?: string | null }).display_code ?? null;

  for (const it of items) {
    const { error: itemErr } = await supabase.from('movement_items').insert({
      movement_id: movementId,
      tombamento_text: normalizeTombamento(it.tombamento).display,
      scanned_method: it.scannedMethod,
      asset_id: it.assetId ?? null,
      label_photo_url: null,
    });

    if (itemErr) {
      console.warn('[createMovementPickedUp] item insert error:', JSON.stringify(itemErr));
      await supabase.from('movements').delete().eq('id', movementId);
      const msg = itemErr.message?.includes('movimentação ativa')
        ? 'Este bem já está em movimentação ativa'
        : `Item "${it.tombamento}": ${itemErr.message}`;
      return { movementId: null, displayCode: null, error: msg };
    }
  }

  await supabase.from('movement_events').insert({
    movement_id: movementId,
    actor_user_id: userId,
    event_type: 'STATUS_CHANGE',
    from_status: null,
    to_status: 'picked_up',
    payload: {
      origin_unit_id: originUnitId,
      destination_unit_id: destUnitId,
      itemsCount: items.length,
    },
  });

  const emailResult = await invokeSendMovementEmail('PICKED_UP', movementId);
  const emailWarning =
    !emailResult.skipped && !emailResult.success
      ? 'Movimentação criada, mas o e-mail não foi enviado.'
      : null;

  return { movementId, displayCode, error: null, emailWarning };
}

/** Excluir movement vazio (rollback) - permitido por RLS apenas quando 0 itens */
export async function deleteEmptyMovement(
  movementId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('movements').delete().eq('id', movementId);
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

/** UNIT_USER: criar movement e retornar id */
export async function createMovement(
  userId: string,
  originUnitId: string,
  destUnitId: string
): Promise<{ movementId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('movements')
    .insert({
      requested_by: userId,
      origin_unit_id: originUnitId,
      destination_unit_id: destUnitId,
      status: 'requested',
    })
    .select('id')
    .single();

  if (error) return { movementId: null, error: error.message };
  return { movementId: data.id, error: null };
}

/** UNIT_USER: adicionar item ao movement (foto opcional para manual no MVP) */
export async function addMovementItem(
  movementId: string,
  tombamentoText: string,
  scannedMethod: ScannedMethod,
  assetId: string | null,
  labelPhotoUrl?: string | null
): Promise<{ item: MovementItem | null; error: string | null; emailWarning?: string | null }> {
  const { data, error } = await supabase
    .from('movement_items')
    .insert({
      movement_id: movementId,
      tombamento_text: normalizeTombamento(tombamentoText).display,
      scanned_method: scannedMethod,
      asset_id: assetId ?? null,
      label_photo_url: labelPhotoUrl ?? null,
    })
    .select('id, movement_id, asset_id, tombamento_text, label_photo_url, scanned_method')
    .single();

  if (error) return { item: null, error: error.message };

  const { count } = await supabase
    .from('movement_items')
    .select('*', { count: 'exact', head: true })
    .eq('movement_id', movementId);
  let emailWarning: string | null = null;
  if (count === 1) {
    const emailResult = await invokeSendMovementEmail('REQUESTED_CREATED', movementId);
    if (!emailResult.skipped && !emailResult.success) {
      emailWarning = 'Notificação por e-mail pendente (erro).';
    }
  }

  return {
    item: data as MovementItem,
    error: null,
    emailWarning,
  };
}

/** Remover item do movement (UNIT_USER, status=requested) */
export async function removeMovementItem(
  itemId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('movement_items').delete().eq('id', itemId);
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

/** Obter detalhe do movement */
export async function getMovementDetail(
  movementId: string
): Promise<{
  data: MovementListItem | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .eq('id', movementId)
    .maybeSingle();

  if (error) {
    console.warn('[getMovementDetail] error:', JSON.stringify(error));
    return { data: null, error: error.message };
  }
  if (!data) return { data: null, error: 'Movimento não encontrado' };
  const [enriched] = await enrichMovements([data as Parameters<typeof enrichMovements>[0][number]]);
  return { data: enriched, error: null };
}

/** Listar itens do movement */
export async function getMovementItems(
  movementId: string
): Promise<{ data: MovementItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('movement_items')
    .select('id, movement_id, asset_id, tombamento_text, label_photo_url, scanned_method')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };

  const items = (data ?? []) as (MovementItem & { asset_id?: string })[];
  const assetIds = items.map((i) => i.asset_id).filter(Boolean) as string[];

  if (assetIds.length === 0) {
    return {
      data: items.map((i) => ({
        ...i,
        description: null,
        unit_ul: null,
      })),
      error: null,
    };
  }

  const { data: assets } = await supabase
    .from('assets')
    .select('id, description, current_unit_id')
    .in('id', assetIds);

  const unitIds = [...new Set((assets ?? []).map((a) => a.current_unit_id))];
  const { data: units } = await supabase
    .from('units')
    .select('id, ul_code')
    .in('id', unitIds);

  const assetMap = new Map((assets ?? []).map((a) => [a.id, a]));
  const unitMap = new Map((units ?? []).map((u) => [u.id, u]));

  const enriched: MovementItem[] = items.map((i) => {
    const asset = i.asset_id ? assetMap.get(i.asset_id) : undefined;
    const unit = asset?.current_unit_id ? unitMap.get(asset.current_unit_id) : undefined;
    return {
      ...i,
      description: asset?.description ?? null,
      unit_ul: unit?.ul_code ?? null,
    };
  });

  return { data: enriched, error: null };
}

/** Listar events do movement */
export async function getMovementEvents(
  movementId: string
): Promise<{ data: MovementEventItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('movement_events')
    .select('id, event_type, from_status, to_status, created_at, actor_user_id')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  const events = data ?? [];
  const userIds = [...new Set(events.map((e) => (e as { actor_user_id: string }).actor_user_id))];

  if (userIds.length === 0) {
    return {
      data: events.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        from_status: e.from_status as MovementStatus | null,
        to_status: e.to_status as MovementStatus | null,
        created_at: e.created_at,
        actor_name: null,
      })),
      error: null,
    };
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

  return {
    data: events.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      from_status: (e as { from_status: MovementStatus | null }).from_status,
      to_status: (e as { to_status: MovementStatus | null }).to_status,
      created_at: e.created_at,
      actor_name: profileMap.get((e as { actor_user_id: string }).actor_user_id) ?? null,
    })),
    error: null,
  };
}

/** Invoca a Edge Function para enviar e-mail da movimentação (fire-and-forget, não reverte a ação) */
async function invokeSendMovementEmail(
  type: 'PICKED_UP' | 'RECEIVED' | 'REQUESTED_CREATED',
  movementId: string
): Promise<{ success: boolean; recipients: string[]; skipped?: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('sendMovementEmail', {
      body: { type, movement_id: movementId },
    });
    if (error) return { success: false, recipients: [] };
    const p = data as { success?: boolean; recipients?: string[]; skipped?: boolean } | null;
    return {
      success: p?.success === true,
      recipients: p?.recipients ?? [],
      skipped: p?.skipped === true,
    };
  } catch {
    return { success: false, recipients: [] };
  }
}

/** TECH: Confirmar pickup (requested -> picked_up) */
export async function confirmPickup(
  movementId: string,
  technicianId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('movements')
    .update({
      status: 'picked_up',
      pickup_technician_id: technicianId,
      pickup_at: new Date().toISOString(),
    })
    .eq('id', movementId);

  if (error) return { success: false, error: error.message };

  await supabase.from('movement_events').insert({
    movement_id: movementId,
    actor_user_id: technicianId,
    event_type: 'STATUS_CHANGE',
    from_status: 'requested',
    to_status: 'picked_up',
    payload: null,
  });

  await invokeSendMovementEmail('PICKED_UP', movementId);

  return { success: true, error: null };
}

/** TECH: Confirmar recebimento (picked_up -> received) */
export async function confirmReceive(
  movementId: string,
  receiverId: string,
  eventPayload?: Record<string, unknown> | null
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('movements')
    .update({
      status: 'received',
      receiver_user_id: receiverId,
      received_at: new Date().toISOString(),
    })
    .eq('id', movementId);

  if (error) return { success: false, error: error.message };

  await supabase.from('movement_events').insert({
    movement_id: movementId,
    actor_user_id: receiverId,
    event_type: 'STATUS_CHANGE',
    from_status: 'picked_up',
    to_status: 'received',
    payload: eventPayload ?? null,
  });

  await invokeSendMovementEmail('RECEIVED', movementId);

  return { success: true, error: null };
}

/** Contar novas solicitações (status=requested) desde lastSeenAt (ISO string) - para badge/notificação */
export async function countNewQueueMovements(
  lastSeenAt: string
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from('movements')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'requested')
    .gt('created_at', lastSeenAt)
    .limit(50);
  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
}

/** TECH: Fila - movements status=requested */
export async function listQueueMovements(
  originUnitId?: string
): Promise<{ data: MovementListItem[]; error: string | null }> {
  let q = supabase
    .from('movements')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: false });

  if (originUnitId) q = q.eq('origin_unit_id', originUnitId);

  const { data, error } = await q;
  if (error) return { data: [], error: error.message };
  const enriched = await enrichMovements((data ?? []) as Parameters<typeof enrichMovements>[0]);
  return { data: enriched, error: null };
}

/** TECH: Receber - movements status=picked_up com preview de tombamentos */
export async function listReceiveMovements(): Promise<{
  data: MovementListItem[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .eq('status', 'picked_up')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { data: [], error: error.message };
  const enriched = await enrichMovements((data ?? []) as Parameters<typeof enrichMovements>[0]);
  const movementIds = enriched.map((m) => m.id);

  if (movementIds.length === 0) return { data: enriched, error: null };

  const { data: items } = await supabase
    .from('movement_items')
    .select('movement_id, tombamento_text, created_at')
    .in('movement_id', movementIds)
    .order('created_at', { ascending: true });

  const byMovement = new Map<string, { tombamentos: string[] }>();
  for (const i of items ?? []) {
    const mid = (i as { movement_id: string }).movement_id;
    const txt = (i as { tombamento_text: string }).tombamento_text;
    if (!byMovement.has(mid)) byMovement.set(mid, { tombamentos: [] });
    byMovement.get(mid)!.tombamentos.push(txt);
  }

  const withPreview = enriched.map((m) => {
    const { tombamentos } = byMovement.get(m.id) ?? { tombamentos: [] };
    const preview = tombamentos.slice(0, 4);
    const remaining = Math.max(0, tombamentos.length - 4);
    return {
      ...m,
      tombamentosPreview: preview,
      tombamentosRemaining: remaining,
    };
  });

  return { data: withPreview, error: null };
}

/** UNIT_USER: Minhas solicitações - movements requested_by=user */
export async function listMyMovements(
  userId: string
): Promise<{ data: MovementListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .eq('requested_by', userId)
    .in('status', ['requested', 'picked_up', 'received', 'canceled'])
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  const enriched = await enrichMovements((data ?? []) as Parameters<typeof enrichMovements>[0]);
  return { data: enriched, error: null };
}
