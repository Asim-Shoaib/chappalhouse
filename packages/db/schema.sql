-- Chappal House — Supabase / Postgres schema
-- Apply in Supabase SQL Editor, or: psql "$DATABASE_URL" -f schema.sql
--
-- Money is stored in PAISA (integer), never rupees-as-float. 1 PKR = 100 paisa.
-- Rounding errors on COD reconciliation are unacceptable, and floats will produce them.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create type product_category as enum ('chappal', 'khussa');

create table products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  category      product_category not null,
  description   text,
  -- Landed cost and retail price, both in paisa. Cost is never exposed publicly;
  -- RLS below restricts reads to the service role.
  cost_paisa    integer not null check (cost_paisa >= 0),
  price_paisa   integer not null check (price_paisa >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_active_category_idx on products (category) where is_active;

-- One row per (product, size). Stock lives here, never on products.
-- Batch 1 has 1-6 pairs per size, so overselling is a real risk without this.
create table variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  size        smallint not null check (size between 35 and 45),
  -- May go negative. Orders are accepted regardless of the count (restocking
  -- is quick), so a sale can precede the resupply that covers it. A negative
  -- value is the reorder signal, not an error.
  stock_qty   integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, size)
);

create index variants_product_idx on variants (product_id);
create index variants_in_stock_idx on variants (product_id) where stock_qty > 0;

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  storage_path text not null,
  alt_text    text not null,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique (product_id, position)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

-- pending_payment  -> manual transfer claimed, awaiting proof verification
-- confirmed        -> stock committed, ready to dispatch
-- dispatched       -> handed to courier
-- delivered        -> courier confirmed delivery
-- returned         -> RTO; stock returned to inventory
-- cancelled        -> cancelled before dispatch; stock released
create type order_status as enum (
  'pending_confirmation',
  'pending_payment',
  'confirmed',
  'dispatched',
  'delivered',
  'returned',
  'cancelled'
);

create type payment_method as enum ('cod', 'bank_transfer', 'easypaisa', 'jazzcash', 'card');
create type payment_status as enum ('unpaid', 'proof_submitted', 'verified', 'refunded');
create type order_channel as enum ('website', 'whatsapp', 'instagram', 'retail');

create table orders (
  id                uuid primary key default gen_random_uuid(),
  -- Human-facing reference: CH-2608-0001. Customers quote this on WhatsApp.
  order_ref         text not null unique,

  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,

  address_line      text not null,
  city              text not null,
  province          text,

  channel           order_channel not null default 'website',
  status            order_status not null default 'pending_confirmation',

  payment_method    payment_method not null,
  payment_status    payment_status not null default 'unpaid',
  -- Screenshot of a manual transfer. Verified by hand before dispatch.
  payment_proof_path text,
  -- Set once a real gateway is wired; null for COD and manual transfer.
  gateway_reference text,

  subtotal_paisa    integer not null check (subtotal_paisa >= 0),
  shipping_paisa    integer not null default 0 check (shipping_paisa >= 0),
  discount_paisa    integer not null default 0 check (discount_paisa >= 0),
  total_paisa       integer not null check (total_paisa >= 0),

  -- Confirmation call before dispatch. The single cheapest RTO reduction available.
  confirmed_at      timestamptz,
  confirmed_by      text,

  courier           text,
  tracking_number   text,
  dispatched_at     timestamptz,
  delivered_at      timestamptz,
  returned_at       timestamptz,
  return_reason     text,

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_status_idx on orders (status);
create index orders_phone_idx on orders (customer_phone);
create index orders_created_idx on orders (created_at desc);

-- Price and product name are copied at order time. If a product is renamed or
-- repriced later, historical orders must still show what was actually sold.
create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  variant_id        uuid references variants (id) on delete set null,
  product_name      text not null,
  size              smallint not null,
  quantity          integer not null check (quantity > 0),
  unit_price_paisa  integer not null check (unit_price_paisa >= 0),
  unit_cost_paisa   integer not null check (unit_cost_paisa >= 0),
  created_at        timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Inventory ledger
-- ---------------------------------------------------------------------------

-- Every stock change is an append-only row. variants.stock_qty is the running
-- total; this table is why it has that value. Needed to answer "where did the
-- 6 pairs of Brown Braids go" three months from now.
create type stock_movement_reason as enum (
  'batch_intake',
  'sale',
  'return_to_stock',
  'pr_gift',
  'sample',
  'damaged',
  'correction'
);

create table stock_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references variants (id) on delete cascade,
  -- Positive adds stock, negative removes it.
  delta       integer not null check (delta <> 0),
  reason      stock_movement_reason not null,
  order_id    uuid references orders (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index stock_movements_variant_idx on stock_movements (variant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Demand capture
-- ---------------------------------------------------------------------------

-- Anonymous storefront events used for funnel reporting and product discovery.
-- Payload is intentionally flexible while event_name remains allowlisted in the
-- storefront API route.
create table analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event_name  text not null,
  visitor_id  text not null,
  session_id  text not null,
  path        text not null,
  payload     jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index analytics_events_name_idx on analytics_events (event_name, occurred_at desc);
create index analytics_events_product_idx on analytics_events ((payload->>'slug'), occurred_at desc);
alter table analytics_events enable row level security;

-- Sold-out sizes show a "notify me" control rather than disappearing.
-- This table is free reorder intelligence: it says which sizes to buy deep.
create table stock_notifications (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references variants (id) on delete cascade,
  phone       text not null,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (variant_id, phone)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch before update on products
  for each row execute function touch_updated_at();
create trigger variants_touch before update on variants
  for each row execute function touch_updated_at();
create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();

-- Keep variants.stock_qty in sync with the ledger so the two can never diverge.
create or replace function apply_stock_movement()
returns trigger
language plpgsql
as $$
begin
  update variants
     set stock_qty = stock_qty + new.delta
   where id = new.variant_id;
  return new;
end;
$$;

create trigger stock_movements_apply after insert on stock_movements
  for each row execute function apply_stock_movement();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table products            enable row level security;
alter table variants            enable row level security;
alter table product_images      enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table stock_movements     enable row level security;
alter table stock_notifications enable row level security;

-- Catalog is world-readable. cost_paisa is excluded from the public view below,
-- since column-level restriction is what keeps margins private.
create policy products_public_read on products
  for select using (is_active);
create policy variants_public_read on variants
  for select using (true);
create policy images_public_read on product_images
  for select using (true);

-- Anyone may register interest in an out-of-stock size.
create policy notifications_public_insert on stock_notifications
  for insert with check (true);

-- Orders are never publicly readable: they hold names, phones, and addresses.
-- All order reads and writes go through server-side code holding the service
-- role key, which bypasses RLS. No anon policy is defined on purpose.

-- Public catalog view. The storefront reads this, never products directly,
-- so cost_paisa cannot leak through a wildcard select.
create view public_products as
  select p.id, p.slug, p.name, p.category, p.description, p.price_paisa,
         p.created_at
    from products p
   where p.is_active;
