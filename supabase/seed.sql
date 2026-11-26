-- Demo sheet at /s/demo. Safe to re-run: it deletes and recreates the demo.
delete from public.sheets where slug = 'demo';

with sheet as (
  insert into public.sheets (slug, title, host_name, starts_at, time_zone, location, host_note, partiful_url)
  values ('demo', 'Friendsgiving', 'Sam', '2026-11-28 18:00:00-05', 'America/New_York',
          'Sam''s place · Brooklyn',
          'I''ve got the turkey and wine covered! Grab anything below, or add your own.',
          'https://partiful.com')
  returning id
),
cats as (
  insert into public.categories (sheet_id, name, sticker, position)
  select sheet.id, v.name, v.sticker, v.position
  from sheet, (values
    ('Sides', 'potato', 1), ('Desserts', 'pie', 2), ('Drinks', 'glasses', 3),
    ('Supplies', 'chair', 4), ('Help out', 'broom', 5)
  ) as v(name, sticker, position)
  returning id, name
),
slots as (
  insert into public.slots (category_id, name, quantity, note, sticker, position)
  select cats.id, v.name, v.quantity, v.note, v.sticker, v.position
  from cats join (values
    ('Sides', 'Mashed potatoes', 1, null, 'potato', 1),
    ('Sides', 'Stuffing', 1, null, 'bread', 2),
    ('Sides', 'A veggie side', 2, 'Green beans, sprouts, salad…', 'broccoli', 3),
    ('Sides', 'Rolls', 1, null, 'bread', 4),
    ('Desserts', 'A pie', 2, null, 'pie', 1),
    ('Desserts', 'Ice cream', 1, null, 'iceCream', 2),
    ('Drinks', 'Cider or seltzer', 2, null, 'beer', 1),
    ('Drinks', 'Something non-alcoholic', 1, null, 'juice', 2),
    ('Supplies', 'Ice', 2, 'A bag each', 'ice', 1),
    ('Supplies', 'Folding chairs', 1, 'We''re 2 short', 'chair', 2),
    ('Help out', 'Come early to set up', 2, '5:00pm', null, 1),
    ('Help out', 'Dish duty', 2, null, 'sponge', 2)
  ) as v(category, name, quantity, note, sticker, position) on v.category = cats.name
  returning id, name
)
insert into public.claims (slot_id, guest_name, detail, dietary_note)
select slots.id, v.guest, v.detail, v.diet
from slots join (values
  ('Mashed potatoes', 'Maya', 'Garlic mash', null),
  ('A pie', 'Jordan', 'Pumpkin', 'Vegetarian'),
  ('A veggie side', 'Priya', 'Roasted sprouts', null),
  ('Cider or seltzer', 'Alex', null, null),
  ('Ice', 'Chris', null, null),
  ('Ice', 'Taylor', null, null),
  ('Dish duty', 'Rae', null, null)
) as v(slot, guest, detail, diet) on v.slot = slots.name;
