-- Tabelas do SismovBE (ordem respeitando FKs)

-- 1) units (sem dependências internas)
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ul_code char(6) UNIQUE NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT units_ul_code_format CHECK (ul_code ~ '^\d{6}$')
);

-- 2) profiles (auth.users, units)
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'UNIT_USER',
  unit_id uuid REFERENCES units(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_unit_user_must_have_unit CHECK (
    (role != 'UNIT_USER') OR (unit_id IS NOT NULL)
  )
);

-- 3) unit_responsibles
CREATE TABLE unit_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true
);

-- 4) assets
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tombamento text UNIQUE NOT NULL,
  barcode_value text,
  description text NOT NULL,
  current_unit_id uuid NOT NULL REFERENCES units(id),
  active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz
);

-- 5) movements
CREATE TABLE movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  origin_unit_id uuid NOT NULL REFERENCES units(id),
  destination_unit_id uuid NOT NULL REFERENCES units(id),
  status movement_status NOT NULL DEFAULT 'requested',
  pickup_technician_id uuid REFERENCES auth.users(id),
  receiver_user_id uuid REFERENCES auth.users(id),
  pickup_at timestamptz,
  received_at timestamptz,
  delivered_at timestamptz,
  processed_asiweb boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  notes text
);

-- 6) movement_items
CREATE TABLE movement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id),
  tombamento_text text NOT NULL,
  label_photo_url text,
  scanned_method scanned_method NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT movement_items_manual_requires_photo CHECK (
    (scanned_method != 'manual') OR (label_photo_url IS NOT NULL)
  )
);

-- 7) movement_events (auditoria)
CREATE TABLE movement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL,
  from_status movement_status,
  to_status movement_status,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 8) app_settings (singleton)
CREATE TABLE app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  seame_group_email text NOT NULL,
  seame_receipts_ul_code char(6) NOT NULL,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_settings_ul_code_format CHECK (seame_receipts_ul_code ~ '^\d{6}$')
);

-- Índices úteis
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_unit_id ON profiles(unit_id);
CREATE INDEX idx_movements_requested_by ON movements(requested_by);
CREATE INDEX idx_movements_status ON movements(status);
CREATE INDEX idx_movements_pickup_technician ON movements(pickup_technician_id);
CREATE INDEX idx_movement_items_movement_id ON movement_items(movement_id);
CREATE INDEX idx_movement_events_movement_id ON movement_events(movement_id);
