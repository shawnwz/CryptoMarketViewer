create table if not exists public.favorite_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.favorite_lists enable row level security;

create policy "Users can view their own lists"
  on public.favorite_lists for select
  using (auth.uid() = user_id);

create policy "Users can create their own lists"
  on public.favorite_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can rename their own lists"
  on public.favorite_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own lists"
  on public.favorite_lists for delete
  using (auth.uid() = user_id);

create table if not exists public.favorite_list_coins (
  list_id uuid not null references public.favorite_lists (id) on delete cascade,
  coin_id integer not null,
  symbol text not null,
  name text not null,
  added_at timestamptz not null default now(),
  primary key (list_id, coin_id)
);

alter table public.favorite_list_coins enable row level security;

create policy "Users can view coins in their own lists"
  on public.favorite_list_coins for select
  using (exists (
    select 1 from public.favorite_lists l where l.id = list_id and l.user_id = auth.uid()
  ));

create policy "Users can add coins to their own lists"
  on public.favorite_list_coins for insert
  with check (exists (
    select 1 from public.favorite_lists l where l.id = list_id and l.user_id = auth.uid()
  ));

create policy "Users can remove coins from their own lists"
  on public.favorite_list_coins for delete
  using (exists (
    select 1 from public.favorite_lists l where l.id = list_id and l.user_id = auth.uid()
  ));

-- Cap each individual list at 100 coins (same reasoning as the old
-- favorites_limit.sql: keeps well under CoinMarketCap's 400-id batch cap).
create or replace function public.enforce_favorite_list_coin_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.favorite_list_coins where list_id = new.list_id) >= 100 then
    raise exception 'You can only add up to 100 coins to a list';
  end if;
  return new;
end;
$$;

create trigger favorite_list_coins_limit_trigger
  before insert on public.favorite_list_coins
  for each row
  execute function public.enforce_favorite_list_coin_limit();

-- Migrate any existing flat favorites into a "My Favorites" list per user,
-- then drop the old table.
insert into public.favorite_lists (user_id, name)
select distinct user_id, 'My Favorites'
from public.favorites;

insert into public.favorite_list_coins (list_id, coin_id, symbol, name, added_at)
select l.id, f.coin_id, f.symbol, f.name, f.created_at
from public.favorites f
join public.favorite_lists l on l.user_id = f.user_id and l.name = 'My Favorites';

drop table if exists public.favorites;
