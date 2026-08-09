-- Run this once in your Supabase project's SQL editor, after favorites.sql.
-- Belt-and-braces cap to match FAVORITES_LIMIT in lib/favorites.ts: the app
-- checks this client-side too, but a DB-level trigger enforces it regardless
-- of which client is inserting.

create or replace function public.enforce_favorites_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.favorites where user_id = new.user_id) >= 100 then
    raise exception 'You can only favorite up to 100 coins';
  end if;
  return new;
end;
$$;

create trigger favorites_limit_trigger
  before insert on public.favorites
  for each row
  execute function public.enforce_favorites_limit();
