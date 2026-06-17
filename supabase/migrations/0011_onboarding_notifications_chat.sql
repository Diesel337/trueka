-- Onboarding, notification copy, and chat read state.
-- Product boundary: Trueka remains item-for-item only. No payments, money,
-- managed shipping, managed delivery, or escrow are introduced here.

alter table public.profiles
add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.profile_private_interest_tags (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, tag_id)
);

create index if not exists profile_private_interest_tags_tag_idx
on public.profile_private_interest_tags (tag_id);

alter table public.profile_private_interest_tags enable row level security;

drop policy if exists "profile private interests visible to owner" on public.profile_private_interest_tags;
create policy "profile private interests visible to owner" on public.profile_private_interest_tags
for select using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "profile private interests managed by owner" on public.profile_private_interest_tags;
create policy "profile private interests managed by owner" on public.profile_private_interest_tags
for all using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

create table if not exists public.trade_request_reads (
  trade_request_id uuid not null references public.trade_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (trade_request_id, user_id)
);

create index if not exists trade_request_reads_user_idx
on public.trade_request_reads (user_id, last_read_at desc);

alter table public.trade_request_reads enable row level security;

drop policy if exists "participants see own chat read state" on public.trade_request_reads;
create policy "participants see own chat read state" on public.trade_request_reads
for select using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.trade_requests tr
    where tr.id = trade_request_id
      and auth.uid() in (tr.requester_id, tr.receiver_id)
  )
);

drop policy if exists "participants manage own chat read state" on public.trade_request_reads;
create policy "participants manage own chat read state" on public.trade_request_reads
for all using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.trade_requests tr
    where tr.id = trade_request_id
      and auth.uid() in (tr.requester_id, tr.receiver_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.trade_requests tr
    where tr.id = trade_request_id
      and auth.uid() in (tr.requester_id, tr.receiver_id)
  )
);

create or replace function public.mark_trade_request_read(p_trade_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.trade_requests%rowtype;
begin
  if v_actor_id is null then
    return;
  end if;

  select * into v_request
  from public.trade_requests
  where id = p_trade_request_id;

  if not found then
    return;
  end if;

  if v_actor_id not in (v_request.requester_id, v_request.receiver_id) then
    return;
  end if;

  insert into public.trade_request_reads (trade_request_id, user_id, last_read_at)
  values (p_trade_request_id, v_actor_id, now())
  on conflict (trade_request_id, user_id)
  do update set last_read_at = excluded.last_read_at;
end;
$$;

create or replace function public.notify_message_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.trade_requests%rowtype;
  v_recipient_id uuid;
  v_sender_name text;
  v_item_title text;
begin
  select * into v_request
  from public.trade_requests
  where id = new.trade_request_id;

  if not found then
    return new;
  end if;

  v_recipient_id := case
    when new.sender_id = v_request.requester_id then v_request.receiver_id
    else v_request.requester_id
  end;

  select display_name into v_sender_name
  from public.profiles
  where id = new.sender_id;

  select title into v_item_title
  from public.items
  where id = v_request.requested_item_id;

  perform public.insert_notification(
    v_recipient_id,
    new.sender_id,
    'message_received',
    'Mensaje nuevo de ' || coalesce(nullif(v_sender_name, ''), 'Trueker'),
    'Sobre "' || coalesce(v_item_title, 'una solicitud de trueque') || '".',
    '/requests/' || new.trade_request_id::text,
    new.trade_request_id,
    v_request.requested_item_id
  );

  return new;
end;
$$;

create or replace function public.notify_item_interest_matches(p_item_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_category_slug text;
  v_category_name text;
  v_interest_slugs text[];
  v_notification_count integer := 0;
  v_match record;
begin
  select * into v_item
  from public.items
  where id = p_item_id;

  if not found or v_item.status <> 'active' or v_item.moderation_status <> 'active' then
    return 0;
  end if;

  select c.slug, c.name
  into v_category_slug, v_category_name
  from public.categories c
  where c.id = v_item.category_id;

  v_interest_slugs := public.item_interest_slugs_for_category(v_category_slug);

  for v_match in
    select distinct candidate.recipient_id
    from (
      select interested_item.owner_id as recipient_id
      from public.item_private_interest_tags interest
      join public.tags t on t.id = interest.tag_id
      join public.items interested_item on interested_item.id = interest.item_id
      where t.slug = any(v_interest_slugs)
        and interested_item.owner_id <> v_item.owner_id
        and interested_item.status = 'active'
        and interested_item.moderation_status = 'active'
      union
      select profile_interest.profile_id as recipient_id
      from public.profile_private_interest_tags profile_interest
      join public.tags t on t.id = profile_interest.tag_id
      where t.slug = any(v_interest_slugs)
        and profile_interest.profile_id <> v_item.owner_id
    ) candidate
    where not public.has_user_block_between(candidate.recipient_id, v_item.owner_id)
      and not exists (
        select 1
        from public.notifications n
        where n.recipient_id = candidate.recipient_id
          and n.item_id = v_item.id
          and n.type = 'item_interest_match'
      )
  loop
    perform public.insert_notification(
      v_match.recipient_id,
      v_item.owner_id,
      'item_interest_match',
      'Publicaron algo de tu interes',
      '"' || v_item.title || '" aparece en ' || coalesce(v_category_name, 'una categoria que te interesa') || '.',
      '/items/' || v_item.id::text,
      null,
      v_item.id
    );
    v_notification_count := v_notification_count + 1;
  end loop;

  return v_notification_count;
end;
$$;
