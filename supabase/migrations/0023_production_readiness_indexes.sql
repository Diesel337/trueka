-- Production-readiness indexes for the highest-traffic Trueka paths.
-- These only improve lookup speed. They do not add payments, money fields,
-- managed shipping, delivery, mediation, or escrow.

create extension if not exists pg_trgm;

-- Explore/Home: active public listings by date, location, category, text and name.
create index if not exists items_public_active_created_idx
on public.items (created_at desc)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_state_city_created_idx
on public.items (state, city, created_at desc)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_category_created_idx
on public.items (category_id, created_at desc)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_condition_created_idx
on public.items (condition, created_at desc)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_value_created_idx
on public.items (approximate_value_range, created_at desc)
where status = 'active'
  and moderation_status = 'active'
  and approximate_value_range is not null;

create index if not exists items_public_other_cities_created_idx
on public.items (created_at desc)
where status = 'active'
  and moderation_status = 'active'
  and accepts_other_cities = true;

create index if not exists items_public_title_sort_idx
on public.items (title, created_at desc)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_title_trgm_idx
on public.items using gin (title gin_trgm_ops)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_description_trgm_idx
on public.items using gin (description gin_trgm_ops)
where status = 'active' and moderation_status = 'active';

create index if not exists items_public_defects_trgm_idx
on public.items using gin (known_defects gin_trgm_ops)
where status = 'active' and moderation_status = 'active';

-- Owner/admin views: manage publications, hidden items and profile pages.
create index if not exists items_owner_status_created_idx
on public.items (owner_id, status, moderation_status, created_at desc);

create index if not exists items_admin_hidden_updated_idx
on public.items (updated_at desc)
where status = 'hidden_by_admin' or moderation_status = 'hidden_by_admin';

-- Nested resources loaded with item cards/details.
create index if not exists item_photos_item_sort_idx
on public.item_photos (item_id, sort_order, created_at);

create index if not exists item_public_tags_tag_item_idx
on public.item_public_tags (tag_id, item_id);

create index if not exists item_private_interest_tags_tag_item_idx
on public.item_private_interest_tags (tag_id, item_id);

-- Requests/chat: inboxes, item expiration, counteroffers and unread summaries.
create index if not exists trade_requests_requester_created_idx
on public.trade_requests (requester_id, created_at desc);

create index if not exists trade_requests_receiver_created_idx
on public.trade_requests (receiver_id, created_at desc);

create index if not exists trade_requests_requested_item_status_idx
on public.trade_requests (requested_item_id, status, created_at desc);

create index if not exists trade_counteroffers_request_created_idx
on public.trade_counteroffers (trade_request_id, created_at desc);

create index if not exists trade_counteroffer_items_counteroffer_role_idx
on public.trade_counteroffer_items (counteroffer_id, role);

create index if not exists messages_request_live_created_idx
on public.messages (trade_request_id, created_at desc)
where deleted_at is null;

create index if not exists item_views_item_viewer_created_idx
on public.item_views (item_id, viewer_id, created_at desc);

-- Notifications and reputation.
create index if not exists notifications_recipient_created_idx
on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_item_type_idx
on public.notifications (recipient_id, item_id, type);

create index if not exists ratings_reviewed_created_idx
on public.ratings (reviewed_id, created_at desc);

create index if not exists ratings_reviewer_request_idx
on public.ratings (reviewer_id, trade_request_id);

-- Admin/support queues.
create index if not exists reports_created_idx
on public.reports (created_at desc);

create index if not exists profiles_banned_updated_idx
on public.profiles (updated_at desc)
where is_banned = true;

create index if not exists data_deletion_requests_created_idx
on public.data_deletion_requests (created_at desc);

create index if not exists categories_active_name_idx
on public.categories (is_active, name);

create index if not exists tags_active_name_idx
on public.tags (is_active, name);
