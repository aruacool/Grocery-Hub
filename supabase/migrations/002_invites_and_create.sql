-- Onboarding + invites: SECURITY DEFINER functions for atomic operations
-- that bypass RLS where needed (a non-member redeeming an invite, etc).
--
-- Run after 001_multitenancy.sql. Wrapped in a transaction.

begin;

-- ---------- create_instance ----------
-- Atomically creates an instance owned by the caller and seeds default
-- bilingual categories. Caller must not already be in any instance
-- (one-per-user). Owner-membership is added by the existing
-- auto_add_owner_member trigger.

create or replace function create_instance(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_instance_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from instance_members where user_id = v_user_id) then
    raise exception 'Already a member of an instance';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Instance name is required';
  end if;

  insert into instances (name, owner_id)
  values (btrim(p_name), v_user_id)
  returning id into v_instance_id;

  insert into categories (instance_id, name_he, name_en, sort_order, icon) values
    (v_instance_id, 'מחלבה',         'Dairy',    1, '🥛'),
    (v_instance_id, 'ירקות ופירות',   'Produce',  2, '🥦'),
    (v_instance_id, 'בשר ועוף',       'Meat',     3, '🍖'),
    (v_instance_id, 'מאפיה',         'Bakery',   4, '🥖'),
    (v_instance_id, 'חטיפים',         'Snacks',   5, '🍫'),
    (v_instance_id, 'משקאות',         'Drinks',   6, '🥤'),
    (v_instance_id, 'ניקיון',         'Cleaning', 7, '🧴'),
    (v_instance_id, 'אחר',            'Other',    8, '🛒');

  return v_instance_id;
end;
$$;

grant execute on function create_instance(text) to authenticated;

-- ---------- redeem_invite ----------
-- Validates an invite code, atomically increments its uses counter, and
-- inserts the caller into instance_members. Locks the invite row so two
-- concurrent redemptions can't both succeed past max_uses.

create or replace function redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite instance_invites%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from instance_members where user_id = v_user_id) then
    raise exception 'Already a member of an instance';
  end if;

  select * into v_invite
  from instance_invites
  where code = p_code
  for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite has expired';
  end if;

  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'Invite has been used up';
  end if;

  insert into instance_members (instance_id, user_id, role)
  values (v_invite.instance_id, v_user_id, 'editor');

  update instance_invites set uses = uses + 1 where id = v_invite.id;

  return v_invite.instance_id;
end;
$$;

grant execute on function redeem_invite(text) to authenticated;

-- ---------- get_invite_info ----------
-- Public lookup so the join page can show the instance name and invite
-- status before authenticating. Returns no rows for unknown codes.

create or replace function get_invite_info(p_code text)
returns table (
  instance_name text,
  expired boolean,
  used_up boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    i.name,
    (inv.expires_at is not null and inv.expires_at < now()),
    (inv.max_uses is not null and inv.uses >= inv.max_uses)
  from instance_invites inv
  join instances i on i.id = inv.instance_id
  where inv.code = p_code;
$$;

grant execute on function get_invite_info(text) to anon, authenticated;

-- ---------- list_instance_members ----------
-- Owners need to see the email + display name of members. Direct selects
-- on auth.users from the client are blocked by RLS; this function exposes
-- only the fields a member needs to see, and only for instances the
-- caller is a member of.

create or replace function list_instance_members(p_instance_id uuid)
returns table (
  user_id uuid,
  role text,
  joined_at timestamptz,
  display_name text,
  avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    im.user_id,
    im.role,
    im.joined_at,
    coalesce(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      au.email
    ),
    au.raw_user_meta_data->>'avatar_url'
  from instance_members im
  join auth.users au on au.id = im.user_id
  where im.instance_id = p_instance_id
    and exists (
      select 1 from instance_members me
      where me.instance_id = p_instance_id and me.user_id = auth.uid()
    )
  order by im.joined_at asc;
$$;

grant execute on function list_instance_members(uuid) to authenticated;

commit;
