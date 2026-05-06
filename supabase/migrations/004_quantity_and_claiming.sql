-- Item quantity + claiming
-- quantity: how many of the item to buy (default 1, resets on "got it")
-- claim fields: who said they'll buy this, snapshotted at claim time so
-- the UI doesn't need to join auth.users (which is RLS-blocked).

begin;

alter table grocery_items
  add column quantity int not null default 1 check (quantity >= 1),
  add column claimed_by uuid references auth.users(id) on delete set null,
  add column claimed_at timestamptz,
  add column claimed_by_name text,
  add column claimed_by_avatar text;

create index idx_grocery_items_claimed_by on grocery_items(claimed_by);

commit;
