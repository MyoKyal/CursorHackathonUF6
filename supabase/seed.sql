-- Yangon-only community stories (English copy).

insert into public.profiles (id, auth_id, display_name, bio, avatar_url, is_org, verified, city, rating_avg, rating_count)
values
  ('11111111-1111-1111-1111-111111111111', null, 'Yangon Green Loop', 'Volunteer crew that hauls recyclables to Yangon recovery workshops.', '/avatars/a2.jpg', true, true, 'Yangon, Myanmar', 4.9, 128),
  ('22222222-2222-2222-2222-222222222222', null, 'Su Su Win', 'Bahan neighbor. I post what our household no longer uses.', '/avatars/a1.jpg', false, true, 'Yangon, Myanmar', 4.8, 42),
  ('33333333-3333-3333-3333-333333333333', null, 'East Yangon Mutual Aid', 'Longyi, school supplies, and sealed-food drives in Thingangyun and Tamwe.', '/avatars/a3.jpg', true, true, 'Yangon, Myanmar', 4.7, 86),
  ('44444444-4444-4444-4444-444444444444', null, 'Ko Aung Min', 'Insein. Furniture and school books, gate pickup.', '/avatars/a4.jpg', false, true, 'Yangon, Myanmar', 4.6, 19),
  ('55555555-5555-5555-5555-555555555555', null, 'Yangon Recyclers', 'Weekend PET and e-waste runs to Insein workshops.', '/avatars/a5.jpg', true, true, 'Yangon, Myanmar', 5.0, 201)
on conflict (id) do update set display_name = excluded.display_name, bio = excluded.bio, city = excluded.city, avatar_url = excluded.avatar_url;

insert into public.listings (id, user_id, title, description, category, listing_type, condition, availability, area_label, lat, lng, collection_notes, status, estimated_kg, is_seed)
values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '22222222-2222-2222-2222-222222222222', 'Bags of rinsed plastic bottles', 'Two rice sacks of rinsed PET bottles from our street festival in Bahan.', 'other', 'donate', 'For parts / recycle', 'now', 'Bahan, Yangon', 16.8142, 96.1542, 'Sacks are under the stair. Call when you reach Golden Valley Road.', 'open', 8.5, true),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '33333333-3333-3333-3333-333333333333', 'Kids'' longyis and school uniforms', 'Gently used uniforms and cotton longyis from Thingangyun.', 'clothes', 'donate', 'Good', 'today', 'Thingangyun, Yangon', 16.8280, 96.1870, 'Side gate of the community hall, Saturday 10–2.', 'open', 6, true),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '44444444-4444-4444-4444-444444444444', 'Box of school books and Myanmar readers', 'About 40 books. Grade 5–9 readers and English workbooks.', 'books', 'donate', 'Good', 'weekend', 'Insein, Yangon', 16.8910, 96.1110, 'Plastic crate by the front gate labeled Loopify.', 'open', 12, true),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '22222222-2222-2222-2222-222222222222', 'Working laptop, battery replaced', '2019 13-inch, 8GB RAM. Donate to a student in Yangon or swap for a bicycle lock.', 'electronics', 'exchange', 'Good', 'tomorrow', 'Kamayut, Yangon', 16.8235, 96.1358, 'Lobby pickup, bring student ID if for school.', 'open', 1.6, true),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '44444444-4444-4444-4444-444444444444', 'Teak dining table, seats four', 'Solid wood. Pickup truck helpful.', 'furniture', 'donate', 'Fair', 'weekend', 'Hlaing, Yangon', 16.8500, 96.1240, 'Side lane. Two people to lift.', 'open', 28, true),
  ('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '33333333-3333-3333-3333-333333333333', 'Sealed rice, beans, and cooking oil', 'Unopened, in-date bags from a teashop closing in Tamwe.', 'food', 'donate', 'Like new', 'today', 'Tamwe, Yangon', 16.8100, 96.1780, 'Shaded stall next to the tea shop.', 'open', 18, true),
  ('17171717-1717-1717-1717-171717171717', '55555555-5555-5555-5555-555555555555', 'Completed: bottles delivered to a Yangon depot', 'Yangon Recyclers dropped four sacks at a recovery workshop instead of the creek.', 'other', 'donate', 'For parts / recycle', 'now', 'Bahan, Yangon', 16.8130, 96.1550, 'Completed.', 'completed', 11, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  area_label = excluded.area_label,
  lat = excluded.lat,
  lng = excluded.lng,
  collection_notes = excluded.collection_notes,
  status = excluded.status;

insert into public.listing_photos (id, listing_id, url, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '/seed/bottles.jpg', 0),
  ('00000000-0000-0000-0000-000000000002', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '/seed/clothes.jpg', 0),
  ('00000000-0000-0000-0000-000000000003', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '/seed/books.jpg', 0),
  ('00000000-0000-0000-0000-000000000004', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '/seed/laptop.jpg', 0),
  ('00000000-0000-0000-0000-000000000005', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '/seed/table.jpg', 0),
  ('00000000-0000-0000-0000-000000000006', 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '/seed/food.jpg', 0),
  ('00000000-0000-0000-0000-000000000007', '17171717-1717-1717-1717-171717171717', '/seed/recycle.jpg', 0)
on conflict (id) do update set url = excluded.url;

insert into public.events (id, host_id, title, description, category, starts_at, area_label, lat, lng, photo_url, is_seed)
values
  ('e1111111-e111-e111-e111-e11111111111', '11111111-1111-1111-1111-111111111111', 'Kandawgyi lakeside cleanup', 'Gloves and bags provided. We haul PET to a Yangon workshop after.', 'cleanup', now() + interval '2 days', 'Kandawgyi, Yangon', 16.7994, 96.1650, '/seed/cleanup.jpg', true),
  ('e2222222-e222-e222-e222-e22222222222', '33333333-3333-3333-3333-333333333333', 'Monastery clothing drive', 'Drop clean longyis and uniforms 10–2 in Thingangyun.', 'clothing-drive', now() + interval '3 days', 'Thingangyun, Yangon', 16.8300, 96.1900, '/seed/drive.jpg', true),
  ('e3333333-e333-e333-e333-e33333333333', '55555555-5555-5555-5555-555555555555', 'Bottle convoy to a recycling depot', 'Bring bagged PET from Insein so nothing ends up in the drain.', 'recycling', now() + interval '26 hours', 'Insein, Yangon', 16.8880, 96.1110, '/seed/convoy.jpg', true),
  ('e4444444-e444-e444-e444-e44444444444', '11111111-1111-1111-1111-111111111111', 'Sealed-food pantry restock', 'Collect in-date sealed rice and oil for township sharing shelves.', 'food-drive', now() + interval '4 days', 'North Okkalapa, Yangon', 16.9100, 96.1600, '/seed/pantry.jpg', true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  area_label = excluded.area_label,
  lat = excluded.lat,
  lng = excluded.lng,
  photo_url = excluded.photo_url;
