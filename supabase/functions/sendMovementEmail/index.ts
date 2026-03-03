// Supabase Edge Function: sendMovementEmail
// Envia e-mails sobre movimentações conforme o tipo (PICKED_UP, RECEIVED)

/** Deno global - disponível no runtime Supabase Edge Functions */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

// @ts-expect-error - Import via URL válido no Deno (Supabase Edge Functions runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') ?? Deno.env.get('DASHBOARD_URL') ?? 'http://localhost:3000';

/** Modo teste: usa e-mails fixos em vez de unit_responsibles/app_settings */
const EMAIL_TEST_MODE = Deno.env.get('EMAIL_TEST_MODE') === 'true';

/** DEMO sem domínio verificado: Resend restringe envio ao e-mail do dono da conta */
const TEST_EMAIL_ADMIN = 'robsonptrainer@gmail.com';
const TEST_EMAIL_SEAME = 'robsonptrainer@gmail.com';
const TEST_EMAIL_UNIT = 'robsonptrainer@gmail.com';

type EmailType = 'REQUESTED_CREATED' | 'PICKED_UP' | 'RECEIVED' | 'DELIVERED';

interface RequestBody {
  type: EmailType;
  movement_id: string;
}

interface MovementRow {
  id: string;
  display_code: string | null;
  created_at: string;
  status: string;
  origin_unit_id: string;
  destination_unit_id: string;
  requested_by: string;
  pickup_technician_id: string | null;
  receiver_user_id: string | null;
  pickup_at: string | null;
  received_at: string | null;
  delivered_at: string | null;
}

interface UnitRow {
  id: string;
  ul_code: string;
  name: string;
}

interface MovementItemRow {
  id: string;
  tombamento_text: string;
  asset_id: string | null;
}

interface UnitResponsibleRow {
  email: string;
  is_primary: boolean;
}

interface AppSettingsRow {
  seame_group_email: string;
  seame_receipts_ul_code: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${title}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto;">
<div style="padding: 20px;">
<h2 style="color: #1a1a1a;">${title}</h2>
${body}
<p style="margin-top: 24px; font-size: 12px; color: #666;">MovBens - Sistema de Movimentação de Bens</p>
</div>
</body>
</html>`;
}

function buildItemsTable(items: { tombamento_text: string; description?: string }[]): string {
  if (items.length === 0) return '<p>Nenhum item.</p>';
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding: 6px 12px; border: 1px solid #ddd;">${i.tombamento_text}</td><td style="padding: 6px 12px; border: 1px solid #ddd;">${i.description ?? '-'}</td></tr>`
    )
    .join('');
  return `
<table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
<thead><tr><th style="padding: 8px 12px; border: 1px solid #ddd; background: #f5f5f5;">Tombamento</th><th style="padding: 8px 12px; border: 1px solid #ddd; background: #f5f5f5;">Descrição</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { type, movement_id } = body;
  if (!type || !movement_id) {
    return new Response(JSON.stringify({ error: 'type e movement_id são obrigatórios' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validTypes: EmailType[] = ['REQUESTED_CREATED', 'PICKED_UP', 'RECEIVED', 'DELIVERED'];
  if (!validTypes.includes(type)) {
    return new Response(JSON.stringify({ error: `type inválido: ${type}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Idempotência: não reenviar se já existir EMAIL_SENT do mesmo tipo
  const { data: existingEvents } = await supabase
    .from('movement_events')
    .select('id, payload')
    .eq('movement_id', movement_id)
    .eq('event_type', 'EMAIL_SENT');
  const alreadySent = (existingEvents ?? []).some(
    (e: { payload?: { emailType?: string } }) => e?.payload?.emailType === type
  );
  if (alreadySent) {
    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        message: 'E-mail já enviado para esta transição',
        recipients: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: mov, error: movErr } = await supabase
    .from('movements')
    .select(
      'id, display_code, created_at, status, origin_unit_id, destination_unit_id, requested_by, pickup_technician_id, receiver_user_id, pickup_at, received_at, delivered_at'
    )
    .eq('id', movement_id)
    .single();

  if (movErr || !mov) {
    return new Response(JSON.stringify({ error: 'Movimentação não encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const m = mov as MovementRow;

  const { data: originUnit } = await supabase
    .from('units')
    .select('ul_code, name')
    .eq('id', m.origin_unit_id)
    .single();
  const { data: destUnit } = await supabase
    .from('units')
    .select('ul_code, name')
    .eq('id', m.destination_unit_id)
    .single();

  const { data: items } = await supabase
    .from('movement_items')
    .select('id, tombamento_text, asset_id')
    .eq('movement_id', movement_id)
    .order('created_at');

  const itemsWithDesc: { tombamento_text: string; description?: string }[] = [];
  if (items?.length) {
    const assetIds = items
      .filter((i) => i.asset_id)
      .map((i) => (i as MovementItemRow).asset_id) as string[];
    let assetMap = new Map<string, string>();
    if (assetIds.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, description')
        .in('id', assetIds);
      assetMap = new Map(
        (assets ?? []).map((a: { id: string; description: string }) => [a.id, a.description])
      );
    }
    for (const i of items as MovementItemRow[]) {
      itemsWithDesc.push({
        tombamento_text: i.tombamento_text,
        description: i.asset_id ? assetMap.get(i.asset_id) : undefined,
      });
    }
  }

  const { data: settings } = await supabase
    .from('app_settings')
    .select('seame_group_email, seame_receipts_ul_code')
    .eq('id', 1)
    .single();

  const seameEmail = (settings as AppSettingsRow | null)?.seame_group_email;
  const seameReceiptsUlCode = (settings as AppSettingsRow | null)?.seame_receipts_ul_code ?? '';

  // "Por quem": full_name dos profiles; fallback para email do auth
  const mRow = m as MovementRow;
  const userIdsForName = [
    mRow.pickup_technician_id,
    mRow.receiver_user_id,
    mRow.requested_by,
  ].filter(Boolean) as string[];
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', [...new Set(userIdsForName)]);
  const profileNameMap = new Map(
    (profilesData ?? []).map((p: { user_id: string; full_name: string }) => [p.user_id, p.full_name])
  );

  async function getUserDisplayName(userId: string): Promise<string> {
    const name = profileNameMap.get(userId);
    if (name?.trim()) return name;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return (data?.user?.email as string) ?? '-';
    } catch {
      return '-';
    }
  }

  const displayCode = (m as MovementRow).display_code ?? (m as MovementRow).id.slice(0, 8);
  const dashboardLink = `${APP_URL}/movements?detail=${movement_id}`;
  const linkHtml = `<p><a href="${dashboardLink}" style="color: #2563eb;">Ver movimentação no dashboard</a></p>`;

  let to: string[] = [];
  let cc: string[] = [];
  let realRecipients: string[] = [];
  let subject = '';
  let htmlBody = '';

  function realRecipientsLine(): string {
    if (!EMAIL_TEST_MODE) return '';
    const list = realRecipients.length > 0 ? realRecipients.join(', ') : 'nenhum';
    return `<p style="font-size: 12px; color: #888;"><em>Destinatário real (produção): ${list}</em></p>`;
  }

  switch (type) {
    case 'REQUESTED_CREATED': {
      realRecipients = seameEmail ? [seameEmail] : [];
      if (EMAIL_TEST_MODE) {
        to = [TEST_EMAIL_SEAME];
        cc = [];
      } else if (!seameEmail) {
        break;
      } else {
        to = [seameEmail];
      }
      subject = `[MovBens] Nova solicitação de envio - ${displayCode}`;
      htmlBody = baseHtml(
        'Nova solicitação de envio',
        `
<p><strong>Código:</strong> ${displayCode}</p>
<p><strong>Origem:</strong> ${(originUnit as UnitRow)?.ul_code ?? '-'} - ${(originUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Destino:</strong> ${(destUnit as UnitRow)?.ul_code ?? '-'} - ${(destUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Data:</strong> ${formatDate(m.created_at)}</p>
${realRecipientsLine()}
${buildItemsTable(itemsWithDesc)}
${linkHtml}
`
      );
      break;
    }
    case 'PICKED_UP': {
      const { data: resps } = await supabase
        .from('unit_responsibles')
        .select('email, is_primary')
        .eq('unit_id', m.origin_unit_id)
        .eq('active', true)
        .eq('is_primary', true);
      const emails: string[] = (resps ?? ([] as UnitResponsibleRow[]))
        .filter((r) => r.email)
        .map((r) => r.email) as string[];
      realRecipients = [...new Set(emails)];
      if (EMAIL_TEST_MODE) {
        to = [TEST_EMAIL_UNIT];
        cc = [];
      } else {
        to = realRecipients;
      }
      if (to.length === 0) break;
      const pickedUpBy =
        mRow.pickup_technician_id ? await getUserDisplayName(mRow.pickup_technician_id) : '-';
      subject = `[MovBens] Recolhimento iniciado - ${displayCode}`;
      htmlBody = baseHtml(
        'Recolhimento iniciado',
        `
<p>Os bens abaixo foram recolhidos na unidade de origem e estão em trânsito para o destino.</p>
<p><strong>Código:</strong> ${displayCode}</p>
<p><strong>Origem:</strong> ${(originUnit as UnitRow)?.ul_code ?? '-'} - ${(originUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Destino:</strong> ${(destUnit as UnitRow)?.ul_code ?? '-'} - ${(destUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Recolhido por:</strong> ${pickedUpBy}</p>
<p><strong>Status:</strong> Recolhido em ${m.pickup_at ? formatDate(m.pickup_at) : '-'}</p>
${realRecipientsLine()}
${buildItemsTable(itemsWithDesc)}
${linkHtml}
`
      );
      break;
    }
    case 'RECEIVED': {
      realRecipients = [];
      if (seameEmail) realRecipients.push(seameEmail);
      const destUlCode = (destUnit as UnitRow)?.ul_code ?? '';
      if (destUlCode && destUlCode !== seameReceiptsUlCode) {
        const { data: destResps } = await supabase
          .from('unit_responsibles')
          .select('email')
          .eq('unit_id', m.destination_unit_id)
          .eq('active', true)
          .eq('is_primary', true);
        const destEmails: string[] = (destResps ?? ([] as { email: string }[]))
          .filter((r) => r.email)
          .map((r) => r.email);
        realRecipients = [...new Set([...realRecipients, ...destEmails])];
      }
      if (EMAIL_TEST_MODE) {
        to = [TEST_EMAIL_SEAME];
        cc = [];
      } else {
        to = realRecipients;
      }
      if (to.length === 0) break;
      const receivedBy =
        mRow.receiver_user_id ? await getUserDisplayName(mRow.receiver_user_id) : '-';
      subject = `[MovBens] Recebido no destino - ${displayCode}`;
      htmlBody = baseHtml(
        'Recebido no destino',
        `
<p>Os bens abaixo foram recebidos no destino e devem ser lançados no ASIWEB.</p>
<p><strong>Código:</strong> ${displayCode}</p>
<p><strong>Origem:</strong> ${(originUnit as UnitRow)?.ul_code ?? '-'} - ${(originUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Destino:</strong> ${(destUnit as UnitRow)?.ul_code ?? '-'} - ${(destUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Recebido por:</strong> ${receivedBy}</p>
<p><strong>Status:</strong> Recebido em ${m.received_at ? formatDate(m.received_at) : '-'}</p>
${realRecipientsLine()}
${buildItemsTable(itemsWithDesc)}
${linkHtml}
`
      );
      break;
    }
    case 'DELIVERED': {
      const { data: delResps } = await supabase
        .from('unit_responsibles')
        .select('email')
        .eq('unit_id', m.destination_unit_id)
        .eq('active', true)
        .eq('is_primary', true);
      const delEmails: string[] = (delResps ?? ([] as UnitResponsibleRow[]))
        .filter((r) => r.email)
        .map((r) => r.email) as string[];
      realRecipients = [...new Set(delEmails)];
      if (EMAIL_TEST_MODE) {
        to = [TEST_EMAIL_UNIT];
        cc = [];
      } else {
        to = realRecipients;
      }
      if (to.length === 0) break;
      subject = `[MovBens] Bens entregues - ${displayCode}`;
      htmlBody = baseHtml(
        'Bens entregues',
        `
<p>Os bens abaixo foram entregues na unidade destino.</p>
<p><strong>Código:</strong> ${displayCode}</p>
<p><strong>Origem:</strong> ${(originUnit as UnitRow)?.ul_code ?? '-'} - ${(originUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Destino:</strong> ${(destUnit as UnitRow)?.ul_code ?? '-'} - ${(destUnit as UnitRow)?.name ?? '-'}</p>
<p><strong>Data da entrega:</strong> ${m.delivered_at ? formatDate(m.delivered_at) : '-'}</p>
${realRecipientsLine()}
${buildItemsTable(itemsWithDesc)}
${linkHtml}
`
      );
      break;
    }
  }

  if (to.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Nenhum destinatário configurado',
        recipients: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // actor_user_id: requested_by quando não houver auth; ou pickup_technician_id/receiver_user_id conforme type
  let actorUserId = mRow.requested_by;
  if (type === 'PICKED_UP' && mRow.pickup_technician_id) actorUserId = mRow.pickup_technician_id;
  else if (type === 'RECEIVED' && mRow.receiver_user_id) actorUserId = mRow.receiver_user_id;
  else if (type === 'RECEIVED' && mRow.pickup_technician_id) actorUserId = mRow.pickup_technician_id;

  const fromEmail = Deno.env.get('EMAIL_FROM') ?? 'MovBens <onboarding@resend.dev>';
  const emailPayload: Record<string, unknown> = {
    from: fromEmail,
    to,
    subject,
    html: htmlBody,
  };
  if (cc.length > 0) emailPayload.cc = cc;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailPayload),
  });

  const resData = (await res.json()) as { id?: string; message?: string };
  const allRecipients = [...new Set([...to, ...cc])];

  const eventPayload = {
    emailType: type,
    recipients: { to, cc },
    provider: 'resend' as const,
    resendId: res.ok ? resData?.id ?? null : null,
    status: res.ok ? 'sent' : 'failed',
    errorMessage: res.ok ? null : (resData?.message ?? 'Erro ao enviar e-mail'),
  };

  const eventType = res.ok ? 'EMAIL_SENT' : 'EMAIL_FAILED';
  await supabase.from('movement_events').insert({
    movement_id,
    actor_user_id: actorUserId,
    event_type: eventType,
    from_status: null,
    to_status: null,
    payload: eventPayload,
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({
        success: false,
        error: resData?.message ?? 'Erro ao enviar e-mail',
        recipients: allRecipients,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      recipients: allRecipients,
      emailType: type,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
