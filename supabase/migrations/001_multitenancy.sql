-- Multi-tenancy migration
-- Wraps in a transaction so the whole thing rolls back on error.
-- Run this in Supabase SQL editor (or `supabase db push`).
--
-- What it does:
--   1. Creates instances, instance_members, super_admins, instance_invites tables
--   2. Adds instance_id columns to all shared tables (nullable)
--   3. Backfills: creates one default instance ("הרשימה של נדב ועדי"), maps it
--      to the existing admin from allowed_users, attaches all current data + members
--   4. Marks instance_id NOT NULL after backfill
--   5. Replaces "any authenticated user" RLS policies with instance-membership policies
--   6. Drops the allowed_users table

begin;

-- ---------- 1. NEW TABLES ----------

create table instances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table instance_members (
  instance_id uuid not null references instances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (instance_id, user_id),
  unique (user_id)  -- enforces "one instance per user"
);

create index idx_instance_members_user on instance_members(user_id);

create table super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table instance_invites (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references instances(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete set null,
  expires_at timestamptz,
  max_uses int,
  uses int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_instance_invites_code on instance_invites(code);

-- ---------- 2. ADD instance_id COLUMNS (nullable for now) ----------

alter table grocery_items add column instance_id uuid references instances(id) on delete cascade;
alter table categories add column instance_id uuid references instances(id) on delete cascade;
alter table recipes add column instance_id uuid references instances(id) on delete cascade;
alter table recipe_ingredients add column instance_id uuid references instances(id) on delete cascade;
alter table purchase_log add column instance_id uuid references instances(id) on delete cascade;
-- dismissed_suggestions stays user-scoped (each user belongs to one instance anyway)

-- ---------- 3. BACKFILL ----------

do $$
declare
  v_owner_id uuid;
  v_instance_id uuid;
begin
  -- Find the admin from allowed_users matched to auth.users via Discord ID.
  -- The auth.tsx code keys on raw_user_meta_data->>'provider_id' or 'sub'.
  select au.id into v_owner_id
  from auth.users au
  join allowed_users aua
    on aua.discord_id = coalesce(
      au.raw_user_meta_data->>'provider_id',
      au.raw_user_meta_data->>'sub'
    )
  where aua.role = 'admin'
  order by au.created_at asc
  limit 1;

  if v_owner_id is null then
    raise exception 'Migration aborted: no auth.users row matched an admin in allowed_users. Make sure the admin has logged in via Discord at least once before running this migration.';
  end if;

  raise notice 'Owner user_id resolved: %', v_owner_id;

  -- Create the default instance.
  insert into instances (name, owner_id)
  values ('הרשימה של נדב ועדי', v_owner_id)
  returning id into v_instance_id;

  raise notice 'Created instance: %', v_instance_id;

  -- Add all matched allowed_users as members of this instance.
  -- Admin role -> 'owner', viewer role -> 'editor' (viewers in old schema can still
  -- see but not write; the new model treats household members as editors. Adjust
  -- manually after if you want stricter roles.)
  insert into instance_members (instance_id, user_id, role)
  select
    v_instance_id,
    au.id,
    case when aua.role = 'admin' then 'owner' else 'editor' end
  from auth.users au
  join allowed_users aua
    on aua.discord_id = coalesce(
      au.raw_user_meta_data->>'provider_id',
      au.raw_user_meta_data->>'sub'
    )
  on conflict do nothing;

  raise notice 'Added % members', (select count(*) from instance_members where instance_id = v_instance_id);

  -- Mark the owner as super-admin (for future management pages).
  insert into super_admins (user_id) values (v_owner_id) on conflict do nothing;

  -- Backfill instance_id everywhere.
  update grocery_items set instance_id = v_instance_id where instance_id is null;
  update categories set instance_id = v_instance_id where instance_id is null;
  update recipes set instance_id = v_instance_id where instance_id is null;
  update recipe_ingredients set instance_id = v_instance_id where instance_id is null;
  update purchase_log set instance_id = v_instance_id where instance_id is null;

  raise notice 'Backfill complete';
end $$;

-- ---------- 4. ENFORCE NOT NULL ----------

alter table grocery_items alter column instance_id set not null;
alter table categories alter column instance_id set not null;
alter table recipes alter column instance_id set not null;
alter table recipe_ingredients alter column instance_id set not null;
alter table purchase_log alter column instance_id set not null;

-- ---------- 5. RLS REWRITE ----------

-- Helper: is the calling user a member of this instance?
create or replace function is_instance_member(p_instance_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from instance_members
    where instance_id = p_instance_id and user_id = auth.uid()
  );
$$;

-- Helper: get the calling user's instance (one per user constraint).
create or replace function current_user_instance()
returns uuid
language sql
security definer
stable
as $$
  select instance_id from instance_members where user_id = auth.uid() limit 1;
$$;

-- Helper: is the calling user a super-admin?
create or replace function is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;

-- Drop old "any authenticated user" policies.
drop policy if exists "Authenticated users full access" on categories;
drop policy if exists "Authenticated users full access" on grocery_items;
drop policy if exists "Authenticated users full access" on purchase_log;
drop policy if exists "Authenticated users full access" on recipes;
drop policy if exists "Authenticated users full access" on recipe_ingredients;

-- Per-instance policies.
create policy "Members read" on grocery_items
  for select using (is_instance_member(instance_id));
create policy "Members write" on grocery_items
  for insert with check (is_instance_member(instance_id));
create policy "Members update" on grocery_items
  for update using (is_instance_member(instance_id)) with check (is_instance_member(instance_id));
create policy "Members delete" on grocery_items
  for delete using (is_instance_member(instance_id));

create policy "Members read" on categories
  for select using (is_instance_member(instance_id));
create policy "Members write" on categories
  for insert with check (is_instance_member(instance_id));
create policy "Members update" on categories
  for update using (is_instance_member(instance_id)) with check (is_instance_member(instance_id));
create policy "Members delete" on categories
  for delete using (is_instance_member(instance_id));

create policy "Members read" on recipes
  for select using (is_instance_member(instance_id));
create policy "Members write" on recipes
  for insert with check (is_instance_member(instance_id));
create policy "Members update" on recipes
  for update using (is_instance_member(instance_id)) with check (is_instance_member(instance_id));
create policy "Members delete" on recipes
  for delete using (is_instance_member(instance_id));

create policy "Members read" on recipe_ingredients
  for select using (is_instance_member(instance_id));
create policy "Members write" on recipe_ingredients
  for insert with check (is_instance_member(instance_id));
create policy "Members update" on recipe_ingredients
  for update using (is_instance_member(instance_id)) with check (is_instance_member(instance_id));
create policy "Members delete" on recipe_ingredients
  for delete using (is_instance_member(instance_id));

create policy "Members read" on purchase_log
  for select using (is_instance_member(instance_id));
create policy "Members write" on purchase_log
  for insert with check (is_instance_member(instance_id));
-- (no update/delete on purchase_log — it's an append-only log)

-- ---------- 6. RLS FOR NEW TABLES ----------

alter table instances enable row level security;
alter table instance_members enable row level security;
alter table super_admins enable row level security;
alter table instance_invites enable row level security;

-- instances: members can read theirs; authenticated can create new (with themselves as owner); owners can update/delete.
create policy "Members read instance" on instances
  for select using (is_instance_member(id));
create policy "Authenticated create instance" on instances
  for insert with check (auth.uid() = owner_id);
create policy "Owners update instance" on instances
  for update using (owner_id = auth.uid());
create policy "Owners delete instance" on instances
  for delete using (owner_id = auth.uid());

-- Auto-add the creator as an owner-role member on instance insert.
create or replace function auto_add_owner_member()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into instance_members (instance_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger instance_auto_owner
  after insert on instances
  for each row execute function auto_add_owner_member();

-- instance_members: members can see other members of their instance; owners can manage.
create policy "Members see members" on instance_members
  for select using (is_instance_member(instance_id));
create policy "Owners manage members" on instance_members
  for all using (
    exists (select 1 from instances where id = instance_id and owner_id = auth.uid())
  ) with check (
    exists (select 1 from instances where id = instance_id and owner_id = auth.uid())
  );
-- Allow user to remove self from an instance (leave).
create policy "Self leave" on instance_members
  for delete using (user_id = auth.uid());

-- super_admins: only super-admins can see the table.
create policy "Super admins see super_admins" on super_admins
  for select using (is_super_admin());

-- instance_invites: members can read invites for their instance; owners can manage.
-- Public read for code lookup happens via a SECURITY DEFINER function (created later in invite phase).
create policy "Members read invites" on instance_invites
  for select using (is_instance_member(instance_id));
create policy "Owners manage invites" on instance_invites
  for all using (
    exists (select 1 from instances where id = instance_id and owner_id = auth.uid())
  ) with check (
    exists (select 1 from instances where id = instance_id and owner_id = auth.uid())
  );

-- ---------- 7. DROP allowed_users ----------

drop table allowed_users;

commit;
