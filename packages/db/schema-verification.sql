-- Chappal House — phone verification for COD orders
-- Apply AFTER schema.sql.
--
-- Rationale: national RTO in Pakistan runs 18-20%. OTP verification at checkout
-- is documented to cut fake orders ~40%, and is the cheapest margin protection
-- available to us. Every COD order must clear this gate before dispatch.

-- ---------------------------------------------------------------------------
-- OTP verification
-- ---------------------------------------------------------------------------

create table phone_verifications (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  -- Never store the OTP itself. If the table leaks, hashes are useless to an
  -- attacker within the 10-minute validity window.
  code_hash     text not null,
  expires_at    timestamptz not null,
  consumed_at   timestamptz,
  attempts      smallint not null default 0,
  -- Rate limiting: one row per send, so we can count sends per phone per hour.
  ip_address    inet,
  created_at    timestamptz not null default now()
);

create index phone_verifications_phone_idx on phone_verifications (phone, created_at desc);
create index phone_verifications_expiry_idx on phone_verifications (expires_at)
  where consumed_at is null;

-- Orders carry the verification result so dispatch can require it.
alter table orders
  add column phone_verified_at timestamptz,
  add column verification_id uuid references phone_verifications (id);

-- A COD order that was never phone-verified is the exact profile of an RTO.
-- Flag it rather than block it, so the team can still confirm by hand.
create view orders_needing_confirmation as
  select o.*
    from orders o
   where o.status = 'pending_confirmation'
     and o.phone_verified_at is null
   order by o.created_at;

alter table phone_verifications enable row level security;
-- No public policy: OTP issue and check happen server-side only.

-- ---------------------------------------------------------------------------
-- Repeat-customer trust signal
-- ---------------------------------------------------------------------------

-- A phone that has taken delivery before is low risk. A phone that has refused
-- two parcels is high risk and should be required to prepay.
create view customer_history as
  select
    customer_phone                                             as phone,
    count(*)                                                   as total_orders,
    count(*) filter (where status = 'delivered')               as delivered,
    count(*) filter (where status = 'returned')                as returned,
    max(created_at)                                            as last_order_at
  from orders
  group by customer_phone;
