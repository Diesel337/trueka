-- Expand Trueka categories and private interest tags.
-- Product boundary: this only improves discovery and matching. It does not add
-- payments, money adjustments, managed shipping, managed delivery, or escrow.

insert into public.categories (name, slug) values
  ('Electrodomesticos', 'electrodomesticos'),
  ('Cocina', 'cocina'),
  ('Bebes y ninos', 'bebes-ninos'),
  ('Articulos para mascotas', 'articulos-mascotas'),
  ('Arte y manualidades', 'arte-manualidades'),
  ('Juegos de mesa', 'juegos-de-mesa'),
  ('Autos y motos', 'autos-motos'),
  ('Belleza y cuidado', 'belleza-cuidado'),
  ('Viaje y maletas', 'viaje-maletas'),
  ('Plantas y jardin', 'plantas-jardin')
on conflict (slug) do nothing;

insert into public.tags (name, slug) values
  ('Tablets', 'tablets'),
  ('Monitores', 'monitores'),
  ('Teclados y mouse', 'teclados-mouse'),
  ('Accesorios de computo', 'accesorios-computo'),
  ('Videojuegos', 'videojuegos'),
  ('Herramientas electricas', 'herramientas-electricas'),
  ('Refacciones', 'refacciones'),
  ('Scooters', 'scooters'),
  ('Audifonos', 'audifonos'),
  ('Smartwatches', 'smartwatches'),
  ('Hogar', 'hogar'),
  ('Decoracion', 'decoracion'),
  ('Electrodomesticos', 'electrodomesticos'),
  ('Cocina', 'cocina'),
  ('Accesorios', 'accesorios'),
  ('Belleza y cuidado', 'belleza-cuidado'),
  ('Camaras', 'camaras'),
  ('Drones', 'drones'),
  ('Deportes', 'deportes'),
  ('Fitness', 'fitness'),
  ('Juegos de mesa', 'juegos-de-mesa'),
  ('Bebes y ninos', 'bebes-ninos'),
  ('Comics y manga', 'comics-manga'),
  ('Vinilos y musica', 'vinilos-musica'),
  ('Arte y manualidades', 'arte-manualidades'),
  ('Papeleria', 'papeleria'),
  ('Mochilas', 'mochilas'),
  ('Maletas', 'maletas'),
  ('Articulos para mascotas', 'articulos-mascotas'),
  ('Plantas y jardin', 'plantas-jardin'),
  ('Otros', 'otros')
on conflict (slug) do nothing;

create or replace function public.item_interest_slugs_for_category(p_category_slug text)
returns text[]
language sql
immutable
as $$
  select case p_category_slug
    when 'electronicos' then array['celulares', 'tablets', 'smartwatches', 'audio', 'audifonos']
    when 'celulares' then array['celulares', 'tablets', 'smartwatches']
    when 'computadoras-laptops' then array['laptops', 'monitores', 'teclados-mouse', 'accesorios-computo']
    when 'videojuegos-consolas' then array['consolas', 'videojuegos']
    when 'herramientas' then array['herramientas', 'herramientas-electricas', 'refacciones']
    when 'bicicletas' then array['bicicletas', 'scooters', 'deportes']
    when 'audio' then array['audio', 'audifonos', 'vinilos-musica']
    when 'instrumentos-musicales' then array['instrumentos', 'audio']
    when 'muebles-pequenos' then array['muebles', 'decoracion', 'hogar']
    when 'ropa-sneakers' then array['sneakers', 'ropa-de-marca', 'accesorios']
    when 'libros' then array['libros', 'comics-manga']
    when 'juguetes' then array['juguetes', 'juegos-de-mesa', 'bebes-ninos']
    when 'coleccionables' then array['coleccionables', 'comics-manga', 'vinilos-musica']
    when 'fotografia' then array['fotografia', 'camaras', 'drones']
    when 'deportes' then array['deportes', 'fitness', 'camping', 'bicicletas']
    when 'hogar' then array['hogar', 'muebles', 'decoracion', 'electrodomesticos', 'cocina', 'plantas-jardin', 'articulos-mascotas']
    when 'electrodomesticos' then array['electrodomesticos', 'cocina', 'hogar']
    when 'cocina' then array['cocina', 'electrodomesticos', 'hogar']
    when 'bebes-ninos' then array['bebes-ninos', 'juguetes']
    when 'articulos-mascotas' then array['articulos-mascotas']
    when 'arte-manualidades' then array['arte-manualidades', 'papeleria']
    when 'juegos-de-mesa' then array['juegos-de-mesa', 'juguetes']
    when 'autos-motos' then array['refacciones', 'herramientas']
    when 'belleza-cuidado' then array['belleza-cuidado', 'accesorios']
    when 'viaje-maletas' then array['maletas', 'mochilas', 'camping']
    when 'plantas-jardin' then array['plantas-jardin', 'hogar']
    when 'otros' then array['otros']
    else array[p_category_slug]
  end;
$$;
