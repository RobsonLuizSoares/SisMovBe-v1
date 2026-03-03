# Supabase Edge Functions

## sendMovementEmail

Envia e-mails sobre movimentações quando o status muda (PICKED_UP, RECEIVED).

### Tipos suportados (MVP)

| Tipo       | Destinatários                                                                 | Quando                          |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------- |
| `PICKED_UP` | Responsável principal da UL origem (unit_responsibles is_primary=true, active) | Status muda para `picked_up`     |
| `RECEIVED` | seame_group_email + responsável principal da UL destino*                       | Status muda para `received`      |

\* Responsável da UL destino só é incluído se a unidade não for a UL de Bens Recebidos (seame_receipts_ul_code).

### Variáveis de ambiente (Secrets)

Configurar no Dashboard: **Project Settings > Edge Functions > Secrets**, ou via CLI:

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set DASHBOARD_URL=https://seu-dominio.com
supabase secrets set EMAIL_FROM="MovBens <noreply@seu-dominio.com>"

# Ambiente de teste (MVP) - usa e-mails fixos
supabase secrets set EMAIL_TEST_MODE=true
```

- **RESEND_API_KEY** (obrigatório): API key do Resend para envio de e-mails
- **DASHBOARD_URL** (opcional): URL do dashboard para links nos e-mails; fallback: `APP_URL` ou `http://localhost:3000`
- **EMAIL_FROM** (opcional): Remetente dos e-mails (default: `onboarding@resend.dev`)
- **EMAIL_TEST_MODE** (opcional): Se `true`, envia sempre para robsonptrainer@gmail.com (DEMO sem domínio verificado no Resend). CC vazio. O corpo inclui "Destinatário real (produção): &lt;lista calculada&gt;".

### Deploy

```bash
supabase functions deploy sendMovementEmail
```

### Teste local

1. Crie `.env.local` na raiz do projeto com as variáveis:

```
RESEND_API_KEY=re_xxx
DASHBOARD_URL=http://localhost:3000
EMAIL_FROM="MovBens <noreply@exemplo.com>"
# Para testes: EMAIL_TEST_MODE=true
```

2. Suba a function:

```bash
supabase functions serve sendMovementEmail --env-file .env.local
```

3. Teste com curl:

```bash
curl -X POST http://localhost:54321/functions/v1/sendMovementEmail \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -d '{"type": "PICKED_UP", "movement_id": "UUID_DA_MOVIMENTACAO"}'
```

### Teste em produção

Use o Supabase Dashboard ou curl com a URL do projeto:

```bash
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/sendMovementEmail \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -d '{"type": "RECEIVED", "movement_id": "UUID_DA_MOVIMENTACAO"}'
```

### Invocação

POST com body:

```json
{
  "type": "PICKED_UP",
  "movement_id": "uuid"
}
```

### Idempotência

A function verifica se já existe um `movement_event` com `event_type='EMAIL_SENT'` e `payload.emailType` igual ao `type` para a mesma movimentação. Se existir, não envia novamente e retorna `{ success: true, skipped: true }`.
