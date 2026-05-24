-- AResto Supabase PostgreSQL schema
-- Run this in the Supabase SQL editor before using the migrated app.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  kitchen_user_id uuid,
  menu_user_id uuid,
  kitchen_credentials jsonb,
  menu_credentials jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('superadmin', 'kitchen', 'menu')),
  branch_id uuid references public.branches(id) on delete set null,
  branch_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text not null,
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  icon text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (branch_id, id)
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  category_id text not null,
  category_name text,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  image_url text not null default '',
  model_3d_url text,
  ar_enabled boolean not null default false,
  preparation_time integer not null default 10,
  available boolean not null default true,
  ingredients text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, name),
  foreign key (branch_id, category_id) references public.categories(branch_id, id) on update cascade on delete restrict
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  number integer not null,
  name text,
  status text not null default 'available' check (status in ('available', 'occupied', 'reserved', 'inactive')),
  current_order_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, number)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  opened_by text not null,
  closed_by text,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  total_orders integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  payment_summary jsonb not null default '{"cash":0,"card":0,"nfc":0,"click":0,"payme":0,"uzum":0}'::jsonb,
  sold_items_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_open_shift_per_branch
on public.shifts(branch_id)
where status = 'open';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  menu_user_id uuid references public.profiles(id) on delete set null,
  order_number integer not null,
  subtotal numeric(12,2) not null default 0,
  service_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  service_type text not null default 'self-service' check (service_type in ('self-service', 'waiter-service')),
  order_type text not null check (order_type in ('dine-in', 'take-out')),
  table_number integer,
  payment_method text check (payment_method in ('card', 'nfc', 'cash', 'click', 'payme', 'uzum')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  status text not null default 'new' check (status in ('new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, order_number)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null,
  price numeric(12,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  image_url text not null default '',
  category_id text not null default '',
  description text,
  ingredients text[],
  model_3d_url text,
  ar_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_branch_idx on public.profiles(branch_id);
create index if not exists foods_branch_idx on public.foods(branch_id);
create index if not exists categories_branch_idx on public.categories(branch_id);
create index if not exists restaurant_tables_branch_idx on public.restaurant_tables(branch_id);
create index if not exists shifts_branch_idx on public.shifts(branch_id);
create index if not exists orders_branch_idx on public.orders(branch_id);
create index if not exists orders_shift_idx on public.orders(shift_id);
create index if not exists order_items_order_idx on public.order_items(order_id);

drop trigger if exists set_updated_at_branches on public.branches;
create trigger set_updated_at_branches before update on public.branches for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_categories on public.categories;
create trigger set_updated_at_categories before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_foods on public.foods;
create trigger set_updated_at_foods before update on public.foods for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_tables on public.restaurant_tables;
create trigger set_updated_at_tables before update on public.restaurant_tables for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_shifts on public.shifts;
create trigger set_updated_at_shifts before update on public.shifts for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_orders on public.orders;
create trigger set_updated_at_orders before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.current_profile_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'superadmin'
$$;

create or replace function public.can_access_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
    or (public.current_profile_role() in ('kitchen', 'menu') and public.current_profile_branch_id() = p_branch_id)
$$;

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.categories enable row level security;
alter table public.foods enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.shifts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
using (id = auth.uid() or public.is_superadmin());
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches for select
using (public.can_access_branch(id));
drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select
using (public.can_access_branch(branch_id));
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all
using (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id))
with check (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id));

drop policy if exists foods_select on public.foods;
create policy foods_select on public.foods for select
using (public.can_access_branch(branch_id));
drop policy if exists foods_write on public.foods;
create policy foods_write on public.foods for all
using (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id))
with check (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id));

drop policy if exists tables_select on public.restaurant_tables;
create policy tables_select on public.restaurant_tables for select
using (public.can_access_branch(branch_id));
drop policy if exists tables_write on public.restaurant_tables;
create policy tables_write on public.restaurant_tables for all
using (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id))
with check (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id));

drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts for select
using (public.can_access_branch(branch_id));
drop policy if exists shifts_insert on public.shifts;
create policy shifts_insert on public.shifts for insert
with check (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id));
drop policy if exists shifts_update on public.shifts;
create policy shifts_update on public.shifts for update
using (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id))
with check (public.is_superadmin() or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id));

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
using (
  public.is_superadmin()
  or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id)
  or (public.current_profile_role() = 'menu' and public.current_profile_branch_id() = branch_id and menu_user_id = auth.uid())
);
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
using (
  public.is_superadmin()
  or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id)
  or (public.current_profile_role() = 'menu' and public.current_profile_branch_id() = branch_id and menu_user_id = auth.uid())
)
with check (
  public.is_superadmin()
  or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = branch_id)
  or (public.current_profile_role() = 'menu' and public.current_profile_branch_id() = branch_id and menu_user_id = auth.uid())
);

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        public.is_superadmin()
        or (public.current_profile_role() = 'kitchen' and public.current_profile_branch_id() = o.branch_id)
        or (public.current_profile_role() = 'menu' and public.current_profile_branch_id() = o.branch_id and o.menu_user_id = auth.uid())
      )
  )
);

create or replace function public.apply_shift_order_summary(
  p_shift_id uuid,
  p_order_total numeric,
  p_payment_method text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts%rowtype;
  v_payment_summary jsonb;
  v_sold_summary jsonb;
  v_item jsonb;
  v_name text;
  v_quantity integer;
begin
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then
    raise exception 'Smena topilmadi';
  end if;

  if not public.can_access_branch(v_shift.branch_id) then
    raise exception 'Ruxsat yo''q';
  end if;

  v_payment_summary := coalesce(v_shift.payment_summary, '{}'::jsonb);
  v_sold_summary := coalesce(v_shift.sold_items_summary, '{}'::jsonb);

  v_payment_summary := jsonb_set(
    v_payment_summary,
    array[p_payment_method],
    to_jsonb(coalesce((v_payment_summary ->> p_payment_method)::numeric, 0) + p_order_total),
    true
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_name := regexp_replace(coalesce(v_item ->> 'name', 'Unknown'), '[\.\[\]\*/~]', '_', 'g');
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);
    v_sold_summary := jsonb_set(
      v_sold_summary,
      array[v_name],
      to_jsonb(coalesce((v_sold_summary ->> v_name)::integer, 0) + v_quantity),
      true
    );
  end loop;

  update public.shifts
  set
    total_orders = total_orders + 1,
    total_revenue = total_revenue + p_order_total,
    payment_summary = v_payment_summary,
    sold_items_summary = v_sold_summary
  where id = p_shift_id;
end;
$$;

create or replace function public.create_order_with_items(
  p_branch_id uuid,
  p_items jsonb,
  p_subtotal numeric,
  p_service_fee numeric,
  p_total numeric,
  p_service_type text,
  p_order_type text,
  p_table_number integer,
  p_payment_method text,
  p_payment_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts%rowtype;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_order_number integer;
begin
  if public.current_profile_role() <> 'menu' or public.current_profile_branch_id() <> p_branch_id then
    raise exception 'Faqat menu foydalanuvchisi o''z filialiga buyurtma yaratishi mumkin';
  end if;

  select * into v_shift
  from public.shifts
  where branch_id = p_branch_id and status = 'open'
  order by opened_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Smena ochilmagan. Oshxona hozir buyurtma qabul qilmaydi.';
  end if;

  v_order_number := v_shift.total_orders + 1;

  insert into public.orders (
    branch_id,
    shift_id,
    menu_user_id,
    order_number,
    subtotal,
    service_fee,
    total,
    service_type,
    order_type,
    table_number,
    payment_method,
    payment_status,
    status
  )
  values (
    p_branch_id,
    v_shift.id,
    auth.uid(),
    v_order_number,
    p_subtotal,
    p_service_fee,
    p_total,
    p_service_type,
    p_order_type,
    p_table_number,
    p_payment_method,
    p_payment_status,
    'new'
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.order_items (
      order_id,
      food_id,
      name,
      price,
      quantity,
      image_url,
      category_id,
      description,
      ingredients,
      model_3d_url,
      ar_enabled
    )
    values (
      v_order.id,
      nullif(v_item ->> 'food_id', '')::uuid,
      coalesce(v_item ->> 'name', ''),
      coalesce((v_item ->> 'price')::numeric, 0),
      coalesce((v_item ->> 'quantity')::integer, 1),
      coalesce(v_item ->> 'image_url', ''),
      coalesce(v_item ->> 'category_id', ''),
      v_item ->> 'description',
      case
        when jsonb_typeof(v_item -> 'ingredients') = 'array'
        then array(select jsonb_array_elements_text(v_item -> 'ingredients'))
        else null
      end,
      v_item ->> 'model_3d_url',
      coalesce((v_item ->> 'ar_enabled')::boolean, false)
    );
  end loop;

  perform public.apply_shift_order_summary(
    v_shift.id,
    p_total,
    coalesce(p_payment_method, 'cash'),
    p_items
  );

  return v_order;
end;
$$;

revoke execute on function public.apply_shift_order_summary(uuid, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_order_with_items(uuid, jsonb, numeric, numeric, numeric, text, text, integer, text, text) to authenticated;

create or replace function public.mark_table_occupied(
  p_branch_id uuid,
  p_table_number integer,
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_access_branch(p_branch_id) then
    raise exception 'Ruxsat yo''q';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = p_order_id and branch_id = p_branch_id
  ) then
    raise exception 'Buyurtma topilmadi';
  end if;

  update public.restaurant_tables
  set
    status = 'occupied',
    current_order_id = p_order_id
  where branch_id = p_branch_id
    and number = p_table_number
    and active = true;
end;
$$;

grant execute on function public.mark_table_occupied(uuid, integer, uuid) to authenticated;

-- Enable Supabase Realtime for these tables in Dashboard > Database > Replication,
-- or run the statements below if the tables are not already in the publication.
-- alter publication supabase_realtime add table public.branches;
-- alter publication supabase_realtime add table public.categories;
-- alter publication supabase_realtime add table public.foods;
-- alter publication supabase_realtime add table public.restaurant_tables;
-- alter publication supabase_realtime add table public.shifts;
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.order_items;
