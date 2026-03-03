import { createClient } from '@/lib/supabase/server';

export async function getResumoStats() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [pendingAsiwebRes, newRequestsRes, movementsTodayRes, avgTimeRes] = await Promise.all([
    supabase
      .from('movements')
      .select('id', { count: 'exact', head: true })
      .in('status', ['delivered', 'received'])
      .eq('processed_asiweb', false),
    supabase
      .from('movements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'requested'),
    supabase
      .from('movements')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso),
    supabase.from('movements').select('created_at, processed_at').not('processed_at', 'is', null),
  ]);

  let avgProcessHours: number | null = null;
  if (avgTimeRes.data && avgTimeRes.data.length > 0) {
    const diffs = avgTimeRes.data
      .map((m) => {
        const created = new Date(m.created_at).getTime();
        const processed = new Date(m.processed_at).getTime();
        return (processed - created) / (1000 * 60 * 60);
      })
      .filter((h) => h >= 0);
    avgProcessHours = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
  }

  return {
    pendingAsiweb: pendingAsiwebRes.count ?? 0,
    newRequests: newRequestsRes.count ?? 0,
    movementsToday: movementsTodayRes.count ?? 0,
    avgProcessHours,
  };
}

export async function getPendingAsiwebTop6() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('movements')
    .select(
      `
      id,
      status,
      created_at,
      origin_unit:units!origin_unit_id(ul_code, name),
      destination_unit:units!destination_unit_id(ul_code, name)
    `
    )
    .in('status', ['delivered', 'received'])
    .eq('processed_asiweb', false)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) return [];
  return data ?? [];
}

export async function getRecentActivity(limit = 15) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('movement_events')
    .select('id, actor_user_id, event_type, from_status, to_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  const actorIds = [...new Set((data ?? []).map((e) => e.actor_user_id).filter(Boolean))];
  let profileMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', actorIds);
    profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
  }

  return (data ?? []).map((e) => ({
    ...e,
    actor_name: profileMap.get(e.actor_user_id) ?? 'Sistema',
  }));
}
