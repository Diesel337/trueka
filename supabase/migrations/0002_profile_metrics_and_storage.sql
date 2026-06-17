alter table public.profiles
add column if not exists published_items_count integer not null default 0
check (published_items_count >= 0);

update public.profiles p
set published_items_count = stats.item_count
from (
  select owner_id, count(*)::integer as item_count
  from public.items
  where status <> 'deleted'
  group by owner_id
) stats
where p.id = stats.owner_id;

create or replace function public.increment_published_items_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set published_items_count = published_items_count + 1
  where id = new.owner_id;

  return new;
end;
$$;

drop trigger if exists items_increment_published_count on public.items;

create trigger items_increment_published_count
after insert on public.items
for each row execute function public.increment_published_items_count();

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do update set public = excluded.public;

create policy "item photos are publicly readable"
on storage.objects for select
using (bucket_id = 'item-photos');

create policy "authenticated users upload item photos"
on storage.objects for insert
with check (bucket_id = 'item-photos' and auth.role() = 'authenticated');

create policy "owners update item photos"
on storage.objects for update
using (bucket_id = 'item-photos' and owner = auth.uid())
with check (bucket_id = 'item-photos' and owner = auth.uid());

create policy "owners delete item photos"
on storage.objects for delete
using (bucket_id = 'item-photos' and owner = auth.uid());
