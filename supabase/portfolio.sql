create table if not exists public.portfolio_holdings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coin_id integer not null,
  symbol text not null,
  name text not null,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, coin_id)
);

alter table public.portfolio_holdings enable row level security;

create policy "Users can view their own holdings"
  on public.portfolio_holdings for select
  using (auth.uid() = user_id);

create policy "Users can add their own holdings"
  on public.portfolio_holdings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own holdings"
  on public.portfolio_holdings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own holdings"
  on public.portfolio_holdings for delete
  using (auth.uid() = user_id);
