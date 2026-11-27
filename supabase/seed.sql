-- Demo sheet at /s/demo. Safe to re-run: it deletes and recreates the demo.
delete from public.sheets where slug = 'demo';

with sheet as (
  insert into public.sheets (slug, title, host_name, starts_at, time_zone, location, host_note, partiful_url)
  values ('demo', 'Sunday dinner', 'Jules', '2026-12-06 19:00:00-05', 'America/New_York',
          'Jules''s place · Ridgewood',
          'I''m making a big pot of pasta. Grab anything below or add your own. Plus-ones welcome.',
          'https://partiful.com')
  returning id
),
cats as (
  insert into public.categories (sheet_id, name, sticker, position)
  select sheet.id, v.name, v.sticker, v.position
  from sheet, (values
    ('To start', 'cheese', 1), ('Drinks', 'wine', 2), ('Dessert', 'cake', 3), ('For the table', 'bouquet', 4)
  ) as v(name, sticker, position)
  returning id, name
),
slots as (
  insert into public.slots (category_id, name, quantity, note, sticker, position)
  select cats.id, v.name, v.quantity, v.note, v.sticker, v.position
  from cats join (values
    ('To start', 'The good cheese', 1, null, 'cheese', 1),
    ('To start', 'Tinned fish and crackers', 1, null, 'tin', 2),
    ('To start', 'A baguette', 1, null, 'baguette', 3),
    ('Drinks', 'Natural wine', 3, null, 'wine', 1),
    ('Drinks', 'Martini kit', 1, 'Gin or vodka, vermouth, olives', 'olive', 2),
    ('Drinks', 'Something non-alcoholic', 1, null, 'juice', 3),
    ('Dessert', 'Dessert', 2, null, 'cake', 1),
    ('For the table', 'Flowers', 1, null, 'bouquet', 1),
    ('For the table', 'Candles', 1, null, 'candle', 2)
  ) as v(category, name, quantity, note, sticker, position) on v.category = cats.name
  returning id, name
)
insert into public.claims (slot_id, guest_name, detail, dietary_note)
select slots.id, v.guest, v.detail, v.diet
from slots join (values
  ('The good cheese', 'Maya', 'Comté and something soft', null),
  ('Natural wine', 'Dev', null, null),
  ('Natural wine', 'Ana', 'Orange wine', 'No shellfish'),
  ('Martini kit', 'Rae', null, 'Vegan'),
  ('Flowers', 'Theo', 'Tulips', null)
) as v(slot, guest, detail, diet) on v.slot = slots.name;
