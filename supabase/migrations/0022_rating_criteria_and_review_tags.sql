-- Adds guided review criteria and positive preset tags for completed trades.
-- This keeps reputation focused on trust signals, without payments, money, shipping, delivery, or escrow.

alter table public.ratings
add column if not exists item_description_rating integer,
add column if not exists communication_rating integer,
add column if not exists fair_exchange_rating integer,
add column if not exists reliability_rating integer,
add column if not exists review_tags text[] not null default '{}';

update public.ratings
set
  item_description_rating = coalesce(item_description_rating, rating),
  communication_rating = coalesce(communication_rating, rating),
  fair_exchange_rating = coalesce(fair_exchange_rating, rating),
  reliability_rating = coalesce(reliability_rating, rating)
where item_description_rating is null
   or communication_rating is null
   or fair_exchange_rating is null
   or reliability_rating is null;

alter table public.ratings
alter column item_description_rating set not null,
alter column communication_rating set not null,
alter column fair_exchange_rating set not null,
alter column reliability_rating set not null;

alter table public.ratings
drop constraint if exists ratings_item_description_rating_check,
drop constraint if exists ratings_communication_rating_check,
drop constraint if exists ratings_fair_exchange_rating_check,
drop constraint if exists ratings_reliability_rating_check,
drop constraint if exists ratings_review_tags_count_check,
drop constraint if exists ratings_review_tags_allowed_check;

alter table public.ratings
add constraint ratings_item_description_rating_check check (item_description_rating between 1 and 5),
add constraint ratings_communication_rating_check check (communication_rating between 1 and 5),
add constraint ratings_fair_exchange_rating_check check (fair_exchange_rating between 1 and 5),
add constraint ratings_reliability_rating_check check (reliability_rating between 1 and 5),
add constraint ratings_review_tags_count_check check (coalesce(array_length(review_tags, 1), 0) <= 6),
add constraint ratings_review_tags_allowed_check check (
  review_tags <@ array[
    'amable',
    'buena_comunicacion',
    'articulo_como_descrito',
    'buen_negociador',
    'intercambio_justo',
    'puntual',
    'excelente_negociador',
    'recomendado'
  ]::text[]
);
