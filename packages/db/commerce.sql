-- Apply after schema.sql and schema-verification.sql. Storefront commerce security.

alter type payment_method add value if not exists 'safepay';
-- Manual Easypaisa/JazzCash/bank transfer: the buyer pays out of band and
-- uploads proof, so the order waits on a human check rather than a gateway.
alter type payment_method add value if not exists 'bank_transfer';
alter type payment_status add value if not exists 'pending';
alter type payment_status add value if not exists 'paid';
alter type payment_status add value if not exists 'failed';

do $$ begin create type reservation_status as enum ('reserved', 'committed', 'released'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_attempt_status as enum ('creating', 'pending', 'succeeded', 'failed'); exception when duplicate_object then null; end $$;

create sequence if not exists storefront_order_ref_seq;

alter table orders
  add column if not exists idempotency_key text,
  add column if not exists request_hash bytea,
  add column if not exists access_token_hash bytea,
  add column if not exists currency text not null default 'PKR',
  add column if not exists policy_accepted_at timestamptz;

create unique index if not exists orders_idempotency_unique on orders (idempotency_key) where idempotency_key is not null;
drop index if exists orders_access_token_unique;
alter table orders add column if not exists receipt_access_expires_at timestamptz;
create index if not exists orders_receipt_session_idx on orders (access_token_hash, created_at desc) where access_token_hash is not null;

alter table stock_movements add column if not exists intake_key text;
create unique index if not exists stock_movements_intake_unique on stock_movements (variant_id, intake_key) where intake_key is not null;

create table if not exists inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  order_item_id uuid not null unique references order_items (id) on delete cascade,
  variant_id uuid not null references variants (id),
  quantity integer not null check (quantity between 1 and 5),
  status reservation_status not null,
  expires_at timestamptz,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists inventory_reservations_expiry_idx on inventory_reservations (expires_at) where status = 'reserved';

create table if not exists payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null check (provider = 'safepay'),
  status payment_attempt_status not null,
  provider_tracker text unique,
  amount_paisa integer not null check (amount_paisa > 0),
  currency text not null check (currency = 'PKR'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_attempts_active_unique on payment_attempts (order_id, provider) where status in ('creating', 'pending');

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'safepay'),
  provider_event_id text not null,
  order_id uuid references orders (id) on delete set null,
  payment_attempt_id uuid references payment_attempts (id) on delete set null,
  payload jsonb not null,
  applied_at timestamptz,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists storefront_rate_limits (
  key_hash bytea primary key,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table inventory_reservations enable row level security;
alter table payment_attempts enable row level security;
alter table payment_events enable row level security;
alter table storefront_rate_limits enable row level security;

create or replace function consume_storefront_rate_limit(p_key_hash text,p_limit integer,p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_count integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$' or p_limit not between 1 and 1000 or p_window_seconds not between 10 and 86400 then raise exception 'invalid rate limit'; end if;
  insert into storefront_rate_limits(key_hash,window_start,request_count) values(decode(p_key_hash,'hex'),now(),1)
  on conflict(key_hash) do update set
    request_count=case when storefront_rate_limits.window_start<=now()-make_interval(secs=>p_window_seconds) then 1 else storefront_rate_limits.request_count+1 end,
    window_start=case when storefront_rate_limits.window_start<=now()-make_interval(secs=>p_window_seconds) then now() else storefront_rate_limits.window_start end
  returning request_count into v_count;
  return v_count<=p_limit;
end $$;

create or replace function release_expired_storefront_reservations(p_limit integer default 100) returns integer
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_order record; v_reservation record; v_released integer := 0;
begin
  if p_limit not between 1 and 1000 then raise exception 'invalid release limit'; end if;
  for v_order in
    select o.id as order_id from orders o
    where exists(select 1 from inventory_reservations r where r.order_id=o.id and r.status='reserved' and r.expires_at<=now())
    order by (select min(r.expires_at) from inventory_reservations r where r.order_id=o.id and r.status='reserved')
    limit p_limit for update of o skip locked
  loop
    for v_reservation in
      select id,variant_id,quantity from inventory_reservations
      where order_id=v_order.order_id and status='reserved' for update
    loop
      insert into stock_movements(variant_id,delta,reason,order_id,note) values(v_reservation.variant_id,v_reservation.quantity,'return_to_stock',v_order.order_id,'Expired storefront reservation');
      update inventory_reservations set status='released',released_at=now() where id=v_reservation.id;
      v_released := v_released+1;
    end loop;
    update orders set status='cancelled',payment_status=case when payment_method='safepay' then 'failed'::payment_status else payment_status end where id=v_order.order_id and payment_status<>'paid';
    update payment_attempts set status='failed',updated_at=now() where order_id=v_order.order_id and status in ('creating','pending');
  end loop;
  return v_released;
end $$;

create or replace function import_storefront_stock(p_intake_key text,p_lines jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_line record; v_product_id uuid; v_variant_id uuid; v_inserted integer := 0;
begin
  if p_intake_key is null or length(p_intake_key) not between 1 and 128 or p_intake_key !~ '^[A-Za-z0-9._-]+$' then raise exception 'invalid intake key'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 1000 then raise exception 'invalid stock intake'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) x(slug text,size integer) group by x.slug,x.size having count(*)>1) then raise exception 'duplicate stock line'; end if;

  for v_line in
    select * from jsonb_to_recordset(p_lines) x(slug text,name text,category text,size integer,quantity integer)
    order by x.slug,x.size
  loop
    if v_line.slug is null or v_line.name is null or v_line.category is null or v_line.size is null or v_line.quantity is null or v_line.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_line.slug)>120 or length(trim(v_line.name)) not between 1 and 160 or v_line.category not in ('chappal','khussa') or v_line.size not between 35 and 45 or v_line.quantity not between 1 and 10000 then raise exception 'invalid stock line'; end if;
    insert into products(slug,name,category,cost_paisa,price_paisa) values(v_line.slug,trim(v_line.name),v_line.category::product_category,0,0)
    on conflict(slug) do update set name=excluded.name,category=excluded.category
    returning id into v_product_id;
    insert into variants(product_id,size,stock_qty) values(v_product_id,v_line.size,0)
    on conflict(product_id,size) do nothing;
    select id into v_variant_id from variants where product_id=v_product_id and size=v_line.size for update;
    insert into stock_movements(variant_id,delta,reason,note,intake_key) values(v_variant_id,v_line.quantity,'batch_intake','batch '||p_intake_key,p_intake_key)
    on conflict(variant_id,intake_key) where intake_key is not null do nothing;
    if found then v_inserted := v_inserted+1; end if;
  end loop;
  return jsonb_build_object('inserted_lines',v_inserted,'total_lines',jsonb_array_length(p_lines),'existing',v_inserted=0);
end $$;

create or replace function create_storefront_order(
  p_idempotency_key text,
  p_request_hash text,
  p_access_token_hash text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method text,
  p_expected_subtotal_paisa integer,
  p_shipping_paisa integer
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_order orders%rowtype;
  v_line record;
  v_order_id uuid := gen_random_uuid();
  v_item_id uuid;
  v_ref text;
  v_subtotal integer := 0;
  v_count integer := 0;
  v_request bytea;
  v_access bytea;
begin
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then raise exception 'invalid idempotency key'; end if;
  if p_request_hash !~ '^[a-f0-9]{64}$' or p_access_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid checkout hash'; end if;
  if p_payment_method not in ('cod', 'safepay', 'bank_transfer') then raise exception 'invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 8 then raise exception 'invalid cart'; end if;
  if (p_customer->>'phone') !~ '^\+923[0-9]{9}$' then raise exception 'invalid phone'; end if;

  v_request := decode(p_request_hash, 'hex');
  v_access := decode(p_access_token_hash, 'hex');
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  perform release_expired_storefront_reservations(100);
  select * into v_order from orders where idempotency_key = p_idempotency_key for update;
  if found then
    if v_order.request_hash is distinct from v_request or v_order.access_token_hash is distinct from v_access then raise exception 'idempotency key already used'; end if;
    return jsonb_build_object('order_ref', v_order.order_ref, 'status', v_order.status, 'payment_status', v_order.payment_status, 'subtotal_paisa', v_order.subtotal_paisa, 'shipping_paisa', v_order.shipping_paisa, 'total_paisa', v_order.total_paisa, 'existing', true);
  end if;

  for v_line in
    select p.name, p.cost_paisa, p.price_paisa, v.id variant_id, v.stock_qty, x.slug, x.size, x.quantity
    from jsonb_to_recordset(p_items) x(slug text, size integer, quantity integer)
    join products p on p.slug = x.slug and p.is_active
    join variants v on v.product_id = p.id and v.size = x.size
    order by p.slug, v.size for update of v
  loop
    v_count := v_count + 1;
    if v_line.quantity not between 1 and 5 or v_line.stock_qty < v_line.quantity then raise exception 'out of stock: %, size %', v_line.slug, v_line.size; end if;
    v_subtotal := v_subtotal + v_line.price_paisa * v_line.quantity;
  end loop;
  if v_count <> jsonb_array_length(p_items) then raise exception 'product or size unavailable'; end if;
  if v_subtotal <> p_expected_subtotal_paisa then raise exception 'catalog price changed; refresh checkout'; end if;

  v_ref := format('CH-%s-%s', to_char(clock_timestamp(), 'YYMM'), lpad(nextval('storefront_order_ref_seq')::text, 6, '0'));
  insert into orders (id, order_ref, customer_name, customer_phone, customer_email, address_line, city, province, channel, status, payment_method, payment_status, subtotal_paisa, shipping_paisa, discount_paisa, total_paisa, idempotency_key, request_hash, access_token_hash, receipt_access_expires_at, currency, policy_accepted_at)
  values (v_order_id, v_ref, p_customer->>'name', p_customer->>'phone', nullif(p_customer->>'email',''), p_customer->>'addressLine', p_customer->>'city', nullif(p_customer->>'province',''), 'website', case when p_payment_method in ('safepay','bank_transfer') then 'pending_payment'::order_status else 'pending_confirmation'::order_status end, p_payment_method::payment_method, case when p_payment_method in ('safepay','bank_transfer') then 'pending'::payment_status else 'unpaid'::payment_status end, v_subtotal, p_shipping_paisa, 0, v_subtotal + p_shipping_paisa, p_idempotency_key, v_request, v_access, now()+interval '30 days', 'PKR', now());

  for v_line in
    select p.name, p.cost_paisa, p.price_paisa, v.id variant_id, x.size, x.quantity
    from jsonb_to_recordset(p_items) x(slug text, size integer, quantity integer)
    join products p on p.slug=x.slug and p.is_active join variants v on v.product_id=p.id and v.size=x.size order by p.slug, v.size
  loop
    insert into order_items (order_id, variant_id, product_name, size, quantity, unit_price_paisa, unit_cost_paisa) values (v_order_id, v_line.variant_id, v_line.name, v_line.size, v_line.quantity, v_line.price_paisa, v_line.cost_paisa) returning id into v_item_id;
    insert into stock_movements (variant_id, delta, reason, order_id, note) values (v_line.variant_id, -v_line.quantity, 'sale', v_order_id, 'Storefront order');
    insert into inventory_reservations (order_id, order_item_id, variant_id, quantity, status, expires_at) values (v_order_id, v_item_id, v_line.variant_id, v_line.quantity, 'reserved', case when p_payment_method='safepay' then now()+interval '70 minutes' else now()+interval '24 hours' end);
  end loop;
  return jsonb_build_object('order_ref', v_ref, 'status', case when p_payment_method in ('safepay','bank_transfer') then 'pending_payment' else 'pending_confirmation' end, 'payment_status', case when p_payment_method in ('safepay','bank_transfer') then 'pending' else 'unpaid' end, 'subtotal_paisa', v_subtotal, 'shipping_paisa', p_shipping_paisa, 'total_paisa', v_subtotal+p_shipping_paisa, 'existing', false);
end $$;

create or replace function begin_storefront_payment_attempt(p_access_token_hash text,p_order_ref text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_order orders%rowtype; v_attempt payment_attempts%rowtype;
begin
  perform release_expired_storefront_reservations(100);
  select * into v_order from orders where access_token_hash=decode(p_access_token_hash,'hex') and order_ref=p_order_ref and receipt_access_expires_at>now() for update;
  if not found or v_order.payment_method <> 'safepay' or v_order.payment_status<>'pending' or v_order.status<>'pending_payment' then raise exception 'payment attempt unavailable'; end if;
  if exists(select 1 from order_items oi where oi.order_id=v_order.id and not exists(select 1 from inventory_reservations r where r.order_item_id=oi.id and r.status='reserved' and r.expires_at>now())) then raise exception 'payment attempt unavailable'; end if;
  select * into v_attempt from payment_attempts where order_id=v_order.id and status in ('creating','pending') limit 1 for update;
  if not found then insert into payment_attempts(order_id,provider,status,amount_paisa,currency,expires_at) values(v_order.id,'safepay','creating',v_order.total_paisa,'PKR',now()+interval '1 hour') returning * into v_attempt; end if;
  return jsonb_build_object('attempt_id',v_attempt.id,'order_ref',v_order.order_ref,'amount_paisa',v_attempt.amount_paisa,'tracker_token',v_attempt.provider_tracker);
end $$;

create or replace function get_storefront_receipts(p_access_token_hash text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_result jsonb;
begin
  if p_access_token_hash !~ '^[a-f0-9]{64}$' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.receipt order by x.created_at desc),'[]'::jsonb) into v_result
  from (
    select o.created_at, jsonb_build_object(
      'orderRef',o.order_ref,'placedAt',o.created_at,'customerName',o.customer_name,
      'deliveryAddress',jsonb_build_object('addressLine',o.address_line,'city',o.city,'province',o.province),
      'orderStatus',o.status,'paymentMethod',o.payment_method,
      'paymentState',case when o.payment_status='paid' then 'paid' when o.payment_status='refunded' then 'refunded' when o.status='cancelled' then 'failed' when o.payment_method='cod' and o.payment_status='unpaid' then 'cod_unpaid' when o.payment_status='pending' then 'pending' else 'failed' end,
      'currency',o.currency,'subtotalPaisa',o.subtotal_paisa,'shippingPaisa',o.shipping_paisa,'discountPaisa',o.discount_paisa,'totalPaisa',o.total_paisa,
      'items',(select coalesce(jsonb_agg(jsonb_build_object('name',oi.product_name,'size',oi.size,'quantity',oi.quantity,'unitPricePaisa',oi.unit_price_paisa,'lineTotalPaisa',oi.unit_price_paisa*oi.quantity) order by oi.created_at),'[]'::jsonb) from order_items oi where oi.order_id=o.id)
    ) receipt
    from orders o where o.access_token_hash=decode(p_access_token_hash,'hex') and o.receipt_access_expires_at>now()
    order by o.created_at desc limit 10
  ) x;
  return v_result;
end $$;

create or replace function complete_storefront_payment_attempt(p_attempt_id uuid,p_tracker_token text) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$ begin update payment_attempts set provider_tracker=p_tracker_token,status='pending',updated_at=now() where id=p_attempt_id and status='creating'; if not found then raise exception 'payment attempt unavailable'; end if; end $$;

create or replace function confirm_storefront_cod_order(p_order_ref text,p_confirmed_by text) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_order orders%rowtype;
begin
  if length(trim(p_confirmed_by)) not between 1 and 100 then raise exception 'invalid confirmation'; end if;
  select * into v_order from orders where order_ref=p_order_ref for update;
  if not found or v_order.payment_method<>'cod' or v_order.status<>'pending_confirmation' then raise exception 'order cannot be confirmed'; end if;
  if exists(select 1 from order_items oi where oi.order_id=v_order.id and not exists(select 1 from inventory_reservations r where r.order_item_id=oi.id and r.status='reserved' and r.expires_at>now())) then raise exception 'order reservation expired'; end if;
  update inventory_reservations set status='committed',committed_at=now(),expires_at=null where order_id=v_order.id and status='reserved';
  update orders set status='confirmed',confirmed_at=now(),confirmed_by=trim(p_confirmed_by) where id=v_order.id;
end $$;

create or replace function apply_safepay_payment_succeeded(p_event_id text,p_order_ref text,p_tracker_token text,p_amount_paisa integer,p_currency text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_order orders%rowtype; v_attempt payment_attempts%rowtype; v_event uuid; v_reserved integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('safepay:'||p_event_id,0));
  if exists(select 1 from payment_events where provider='safepay' and provider_event_id=p_event_id) then return jsonb_build_object('applied',false,'duplicate',true); end if;
  select * into v_order from orders where order_ref=p_order_ref for update;
  if not found or v_order.status<>'pending_payment' or v_order.payment_status<>'pending' then raise exception 'payment event does not match order'; end if;
  select * into v_attempt from payment_attempts where order_id=v_order.id and provider_tracker=p_tracker_token and status='pending' and expires_at>now() for update;
  if not found then raise exception 'payment event does not match order'; end if;
  insert into payment_events(provider,provider_event_id,order_id,payment_attempt_id,payload) values('safepay',p_event_id,v_order.id,v_attempt.id,p_payload) on conflict do nothing returning id into v_event;
  if v_event is null then return jsonb_build_object('applied',false,'duplicate',true); end if;
  if v_order.id is null or v_attempt.id is null or p_currency<>'PKR' or p_amount_paisa<>v_order.total_paisa then raise exception 'payment event does not match order'; end if;
  select count(*) into v_reserved from inventory_reservations where order_id=v_order.id and status='reserved' and expires_at>now();
  if v_reserved=0 or v_reserved<>(select count(*) from order_items where order_id=v_order.id) or exists(select 1 from inventory_reservations where order_id=v_order.id and status<>'reserved') then raise exception 'order inventory reservation expired'; end if;
  update inventory_reservations set status='committed',committed_at=now(),expires_at=null where order_id=v_order.id and status='reserved';
  update payment_attempts set status='succeeded',updated_at=now() where id=v_attempt.id;
  update orders set payment_status='paid',status='confirmed',gateway_reference=p_tracker_token,confirmed_at=now(),confirmed_by='safepay' where id=v_order.id;
  update payment_events set applied_at=now() where id=v_event;
  return jsonb_build_object('applied',true,'duplicate',false);
end $$;

create or replace function confirm_storefront_bank_transfer(p_order_ref text,p_confirmed_by text,p_reference text) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_order orders%rowtype;
begin
  -- Manual transfers are confirmed by a human who has checked the wallet or
  -- bank app against the buyer's proof. Stock is only committed here, so an
  -- unpaid order releases its reservation on the normal 24h sweep.
  if length(trim(p_confirmed_by)) not between 1 and 100 then raise exception 'invalid confirmation'; end if;
  if p_reference is not null and length(trim(p_reference)) > 120 then raise exception 'invalid reference'; end if;
  select * into v_order from orders where order_ref=p_order_ref for update;
  if not found or v_order.payment_method<>'bank_transfer' or v_order.status<>'pending_payment' or v_order.payment_status<>'pending' then raise exception 'order cannot be confirmed'; end if;
  if exists(select 1 from order_items oi where oi.order_id=v_order.id and not exists(select 1 from inventory_reservations r where r.order_item_id=oi.id and r.status='reserved' and r.expires_at>now())) then raise exception 'order reservation expired'; end if;
  update inventory_reservations set status='committed',committed_at=now(),expires_at=null where order_id=v_order.id and status='reserved';
  update orders set payment_status='paid',status='confirmed',gateway_reference=nullif(trim(coalesce(p_reference,'')),''),confirmed_at=now(),confirmed_by=trim(p_confirmed_by) where id=v_order.id;
end $$;

create or replace view public_products with (security_barrier=true) as select id,slug,name,category,description,price_paisa,created_at from products where is_active;
revoke all on products,variants,product_images,orders,order_items,stock_movements,stock_notifications,analytics_events,inventory_reservations,payment_attempts,payment_events,storefront_rate_limits from public,anon,authenticated;
grant select on public_products to anon,authenticated;
revoke all on function create_storefront_order(text,text,text,jsonb,jsonb,text,integer,integer), begin_storefront_payment_attempt(text,text), complete_storefront_payment_attempt(uuid,text), confirm_storefront_cod_order(text,text), confirm_storefront_bank_transfer(text,text,text), apply_safepay_payment_succeeded(text,text,text,integer,text,jsonb), release_expired_storefront_reservations(integer), consume_storefront_rate_limit(text,integer,integer), get_storefront_receipts(text), import_storefront_stock(text,jsonb) from public,anon,authenticated;
grant execute on function create_storefront_order(text,text,text,jsonb,jsonb,text,integer,integer), begin_storefront_payment_attempt(text,text), complete_storefront_payment_attempt(uuid,text), confirm_storefront_cod_order(text,text), confirm_storefront_bank_transfer(text,text,text), apply_safepay_payment_succeeded(text,text,text,integer,text,jsonb), release_expired_storefront_reservations(integer), consume_storefront_rate_limit(text,integer,integer), get_storefront_receipts(text), import_storefront_stock(text,jsonb) to service_role;
revoke all on orders_needing_confirmation,customer_history from public,anon,authenticated;
