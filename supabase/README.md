# Supabase - SismovBE

Migrations SQL e seeds para o banco de dados PostgreSQL (Supabase).

## Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado
- [Docker](https://www.docker.com/) (para rodar Supabase localmente)

## Aplicar migrations localmente

### 1. Iniciar o Supabase local

```bash
supabase start
```

Isso sobe os containers (Postgres, Auth, Studio, etc.) e aplica as migrations automaticamente.

### 2. Aplicar apenas as migrations (sem iniciar todos os serviços)

Se o Supabase já estiver rodando e você quiser aplicar novas migrations:

```bash
supabase db push
```

### 3. Reset completo do banco

Para recriar o banco do zero (útil em desenvolvimento):

```bash
supabase db reset
```

Isso aplica todas as migrations em ordem e executa o `seed.sql`.

### 4. Rodar seeds manualmente

Se as migrations já foram aplicadas e você quer apenas executar os seeds:

```bash
supabase db reset
```

Ou conecte ao banco e execute:

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

## Estrutura das migrations

| Ordem | Arquivo                                        | Descrição                                                                                                     |
| ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1     | `20250227000001_create_enums.sql`              | ENUMs: user_role, movement_status, scanned_method                                                             |
| 2     | `20250227000002_create_tables.sql`             | Tabelas: units, profiles, unit_responsibles, assets, movements, movement_items, movement_events, app_settings |
| 3     | `20250227000003_enable_rls.sql`                | Funções auxiliares e habilitação de RLS                                                                       |
| 4     | `20250227000004_rls_units_assets.sql`          | Políticas RLS para units e assets                                                                             |
| 5     | `20250227000005_rls_profiles.sql`              | Políticas RLS para profiles                                                                                   |
| 6     | `20250227000006_rls_unit_responsibles.sql`     | Políticas RLS para unit_responsibles                                                                          |
| 7     | `20250227000007_rls_movements.sql`             | Políticas RLS para movements                                                                                  |
| 8     | `20250227000008_rls_movement_items.sql`        | Políticas RLS para movement_items                                                                             |
| 9     | `20250227000009_rls_movement_events.sql`       | Políticas RLS para movement_events                                                                            |
| 10    | `20250227000010_rls_app_settings.sql`          | Políticas RLS para app_settings                                                                               |
| 11    | `20250227000011_trigger_profile_on_signup.sql` | Trigger: criar profile ao signup                                                                              |

## Seeds

O `seed.sql` cria:

- 1 registro em `app_settings` (seame_group_email, seame_receipts_ul_code)
- 4 unidades de exemplo (ul_code: 000001 a 000004)
- 1 responsável por unidade
- 10 assets distribuídos entre as unidades

## Conexão local

Após `supabase start`, as credenciais são exibidas no terminal. Exemplo:

- **Postgres**: `postgresql://postgres:postgres@localhost:54322/postgres`
- **Studio**: http://localhost:54323

## Deploy em produção (Supabase Cloud)

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Para seeds em produção, execute manualmente via SQL Editor no dashboard do Supabase (cuidado: não sobrescreva dados existentes).

## Edge Functions

As funções Deno ficam em `functions/`. Consulte `functions/README.md` para detalhes.

### sendMovementEmail

Envia e-mails sobre movimentações (PICKED_UP, RECEIVED, etc.) via Resend. Configure as secrets `RESEND_API_KEY`, `APP_URL` e opcionalmente `EMAIL_FROM` no dashboard ou via `supabase secrets set`.

Deploy:

```bash
supabase functions deploy sendMovementEmail
```
