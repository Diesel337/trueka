-- Public item tags for discovery and interest notifications.
-- Product boundary: these tags describe the published item. They do not add
-- payments, money fields, managed shipping, managed delivery, or escrow.
-- Private interest tags remain visible only to the owner/admin through RLS.

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

  select coalesce(array_agg(distinct interest_slug), '{}'::text[])
  into v_interest_slugs
  from (
    select unnest(public.item_interest_slugs_for_category(v_category_slug)) as interest_slug
    union
    select t.slug as interest_slug
    from public.item_public_tags public_tag
    join public.tags t on t.id = public_tag.tag_id
    where public_tag.item_id = v_item.id
      and t.is_active
  ) matched_slugs
  where interest_slug is not null
    and interest_slug <> '';

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
