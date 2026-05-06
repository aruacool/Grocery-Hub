-- Global email allowlist
-- Gates onboarding (creating an instance OR redeeming an invite) at the
-- DB layer. Existing members and super-admins are auto-whitelisted by
-- this migration so no one currently in the app gets locked out.

begin;

create table allowed_emails (
  email text primary key check (email = lower(email)),
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  notes text
);

alter table allowed_emails enable row level security;

create policy "Super admins manage allowlist" on allowed_emails
  for all
  using (is_super_admin())
  with check (is_super_admin());

-- Lets a client check whether the *current user's* email is allowed
-- without exposing the entire allowlist.
create or replace function is_email_allowed(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from allowed_emails where email = lower(coalesce(p_email, ''))
  );
$$;

grant execute on function is_email_allowed(text) to authenticated;

-- Auto-whitelist anyone already inside the system so this migration is
-- non-disruptive.
insert into allowed_emails (email, added_by, notes)
select distinct lower(au.email), au.id, 'auto-added during allowlist migration'
from auth.users au
where au.email is not null
  and (
    exists (select 1 from instance_members im where im.user_id = au.id)
    or exists (select 1 from super_admins sa where sa.user_id = au.id)
  )
on conflict (email) do nothing;

-- Tighten create_instance and redeem_invite so the gate is enforced
-- server-side. These replace the versions from migration 002.

create or replace function create_instance(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_instance_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email is null or not exists (select 1 from allowed_emails where email = v_email) then
    raise exception 'Email not on allowlist';
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

create or replace function redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite instance_invites%rowtype;
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email is null or not exists (select 1 from allowed_emails where email = v_email) then
    raise exception 'Email not on allowlist';
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

commit;
