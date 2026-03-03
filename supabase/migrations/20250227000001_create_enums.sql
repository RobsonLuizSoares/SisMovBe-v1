-- ENUMs para o SismovBE
CREATE TYPE user_role AS ENUM (
  'PATRIMONIO_ADMIN',
  'SEAME_ADMIN',
  'TECH',
  'UNIT_USER'
);

CREATE TYPE movement_status AS ENUM (
  'requested',
  'picked_up',
  'received',
  'delivered',
  'canceled'
);

CREATE TYPE scanned_method AS ENUM (
  'barcode',
  'manual'
);
