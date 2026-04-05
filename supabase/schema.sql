-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  name_en text not null,
  sort_order int not null default 0,
  icon text not null default '🛒'
);

-- Grocery Items
create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  name_en text,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  is_needed boolean not null default false,
  is_favorite boolean not null default false,
  use_count int not null default 0,
  notes text,
  track_depletion boolean not null default true,
  created_at timestamptz not null default now()
);

-- Purchase Log
create table if not exists purchase_log (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references grocery_items(id) on delete cascade,
  purchased_by uuid references auth.users(id) on delete set null,
  purchased_at timestamptz not null default now()
);

-- Recipes
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  steps text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Recipe Ingredients
create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  grocery_item_id uuid references grocery_items(id) on delete set null,
  quantity text,
  custom_name text
);

-- Dismissed Suggestions
create table if not exists dismissed_suggestions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references grocery_items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  dismissed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Indexes
create index if not exists idx_grocery_items_category on grocery_items(category_id);
create index if not exists idx_grocery_items_needed on grocery_items(is_needed);
create index if not exists idx_purchase_log_item on purchase_log(item_id);
create index if not exists idx_recipe_ingredients_recipe on recipe_ingredients(recipe_id);
create index if not exists idx_dismissed_suggestions_item on dismissed_suggestions(item_id);

-- RLS Policies
alter table categories enable row level security;
alter table grocery_items enable row level security;
alter table purchase_log enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table dismissed_suggestions enable row level security;

-- Shared tables: any authenticated user can read/write
create policy "Authenticated users full access" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on grocery_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on purchase_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on recipes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users full access" on recipe_ingredients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Dismissed suggestions: per-user
create policy "Users manage own dismissed suggestions" on dismissed_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable Realtime on grocery_items
alter publication supabase_realtime add table grocery_items;

-- Storage bucket (run this via Supabase dashboard or use the storage API)
-- insert into storage.buckets (id, name, public) values ('item-images', 'item-images', true);
