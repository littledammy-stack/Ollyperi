create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 120),
  phone       text not null default '' check (char_length(phone) <= 30),
  email       text not null default '' check (char_length(email) <= 200),
  address     text not null default '' check (char_length(address) <= 400),
  city        text not null default '' check (char_length(city) <= 100),
  state       text not null default '' check (char_length(state) <= 40),
  created_at  timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.products (
  id          text primary key check (char_length(id) between 1 and 60),
  category    text not null check (category in ('gadgets','footwear','clothing','appliances')),
  sub         text not null default '' check (char_length(sub) <= 40),
  name        text not null check (char_length(name) between 1 and 150),
  price       numeric not null check (price >= 0 and price < 1000000000),
  badge       text not null default '' check (char_length(badge) <= 30),
  description text not null default '' check (char_length(description) <= 2000),
  specs       jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array' and jsonb_array_length(specs) <= 20),
  opts        jsonb check (opts is null or (jsonb_typeof(opts) = 'array' and jsonb_array_length(opts) <= 40)),
  opt_label   text not null default '' check (char_length(opt_label) <= 30),
  images      jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 8),
  glyph       text not null default '',
  pal         text not null default '',
  featured    boolean not null default false,
  in_stock    boolean not null default true,
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_cat_idx on public.products (category, sort);
alter table public.products add column if not exists compare_price numeric not null default 0 check (compare_price >= 0 and compare_price < 1000000000);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique check (ref ~ '^OLY-[A-Z0-9]{4,12}$'),
  user_id        uuid references auth.users(id) on delete set null,
  customer_name  text not null check (char_length(customer_name) between 1 and 120),
  customer_phone text not null check (char_length(customer_phone) between 6 and 30),
  customer_email text not null default '' check (char_length(customer_email) <= 200),
  address        text not null check (char_length(address) between 1 and 400),
  city           text not null default '' check (char_length(city) <= 100),
  state          text not null check (char_length(state) between 1 and 40),
  note           text not null default '' check (char_length(note) <= 500),
  items          jsonb not null,
  total          numeric not null check (total >= 0),
  status         text not null default 'New'
                 check (status in ('New','Confirmed','Shipped','Delivered','Cancelled')),
  channel        text not null default 'WhatsApp',
  created_at     timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status, created_at desc);
create index if not exists orders_user_idx    on public.orders (user_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, email)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'name',''), 120),
          left(coalesce(new.raw_user_meta_data->>'phone',''), 30),
          left(coalesce(new.email,''), 200))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create or replace function public.check_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it jsonb; p public.products; qty int; fixed jsonb := '[]'::jsonb; tot numeric := 0;
begin
  if new.items is null or jsonb_typeof(new.items) <> 'array'
     or jsonb_array_length(new.items) = 0 or jsonb_array_length(new.items) > 30 then
    raise exception 'invalid order items';
  end if;
  for it in select * from jsonb_array_elements(new.items) loop
    select * into p from public.products where id = it->>'id' and active and in_stock;
    if not found then raise exception 'product unavailable: %', coalesce(it->>'id','?'); end if;
    begin qty := (it->>'qty')::int; exception when others then qty := null; end;
    if qty is null or qty < 1 or qty > 50 then raise exception 'invalid quantity'; end if;
    fixed := fixed || jsonb_build_array(jsonb_build_object(
      'id', p.id, 'name', p.name, 'price', p.price, 'qty', qty, 'opt', left(coalesce(it->>'opt',''), 40)));
    tot := tot + p.price * qty;
  end loop;
  new.items := fixed;
  new.total := tot;
  return new;
end;
$$;
drop trigger if exists orders_check on public.orders;
create trigger orders_check before insert on public.orders
  for each row execute function public.check_new_order();

alter table public.profiles enable row level security;
alter table public.admins   enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;

drop policy if exists "profile: read own or admin" on public.profiles;
create policy "profile: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profile: update own" on public.profiles;
create policy "profile: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admins: see own row" on public.admins;
create policy "admins: see own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select to anon, authenticated using (active or public.is_admin());

drop policy if exists "products: admin insert" on public.products;
create policy "products: admin insert" on public.products
  for insert to authenticated with check (public.is_admin());
drop policy if exists "products: admin update" on public.products;
create policy "products: admin update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "products: admin delete" on public.products;
create policy "products: admin delete" on public.products
  for delete to authenticated using (public.is_admin());

drop policy if exists "orders: anyone can place" on public.orders;
create policy "orders: anyone can place" on public.orders
  for insert to anon, authenticated
  with check (status = 'New' and (user_id is null or user_id = auth.uid()));

drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: admin can update" on public.orders;
create policy "orders: admin can update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images: admin read" on storage.objects;
create policy "product images: admin read" on storage.objects
  for select to authenticated using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images: admin upload" on storage.objects;
create policy "product images: admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images: admin update" on storage.objects;
create policy "product images: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images: admin delete" on storage.objects;
create policy "product images: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

create or replace function public.admin_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'customers', (select count(*) from public.profiles),
    'orders',    (select count(*) from public.orders),
    'revenue',   (select coalesce(sum(total),0) from public.orders where status <> 'Cancelled'),
    'by_status', (select coalesce(jsonb_object_agg(s.status, s.c), '{}'::jsonb)
                  from (select status, count(*) as c from public.orders group by status) s),
    'top_products', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select i->>'name' as name,
               sum((i->>'qty')::int) as units,
               sum((i->>'qty')::int * (i->>'price')::numeric) as revenue
        from public.orders o, jsonb_array_elements(o.items) i
        where o.status <> 'Cancelled'
        group by 1 order by units desc limit 6) t)
  );
end;
$$;

create or replace function public.admin_customers(p_search text default '', p_limit int default 25, p_offset int default 0)
returns table (id uuid, name text, email text, phone text, city text, state text,
               created_at timestamptz, order_count bigint, total_spent numeric, total_rows bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select p.id, p.name, p.email, p.phone, p.city, p.state, p.created_at,
           (select count(*) from public.orders o where o.user_id = p.id),
           (select coalesce(sum(o.total),0) from public.orders o where o.user_id = p.id and o.status <> 'Cancelled'),
           count(*) over ()
    from public.profiles p
    where coalesce(p_search,'') = ''
       or p.name  ilike '%' || p_search || '%'
       or p.email ilike '%' || p_search || '%'
       or p.phone ilike '%' || p_search || '%'
    order by p.created_at desc
    limit least(p_limit, 1000) offset p_offset;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.admins to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon;
grant select, insert, update on public.orders to authenticated;
revoke execute on function public.admin_summary() from public, anon;
revoke execute on function public.admin_customers(text,int,int) from public, anon;
revoke execute on function public.check_new_order() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.admin_summary() to authenticated;
grant execute on function public.admin_customers(text,int,int) to authenticated;

insert into public.products (id, category, sub, name, price, badge, description, specs, opts, opt_label, glyph, pal, featured, sort)
values
('g1', 'gadgets', 'Phones', 'Android Smartphone 8GB / 256GB', 185000, 'New', 'A fast everyday phone with a big display and a camera that holds up in low light.', '["6.6\" display, 120Hz","8GB RAM, 256GB storage","5,000mAh battery with fast charging","Dual SIM"]'::jsonb, '["Black","Blue","Green"]'::jsonb, 'Colour', 'phone', '', true, 0),
('g2', 'gadgets', 'Laptops', 'Slim Laptop 15.6" Core i5', 620000, '', 'Light enough to carry daily, strong enough for work, design and study.', '["Core i5, 8GB RAM","512GB SSD","15.6\" Full HD display","Backlit keyboard"]'::jsonb, null, '', 'laptop', '', false, 1),
('g3', 'gadgets', 'Accessories', 'Wireless Earbuds Pro', 18500, 'Popular', 'Clear calls, deep bass and a charging case that lasts through the week.', '["Bluetooth 5.3","Up to 24 hours with the case","Touch controls","Splash resistant"]'::jsonb, '["Black","White"]'::jsonb, 'Colour', 'buds', '', true, 2),
('g4', 'gadgets', 'Accessories', '20,000mAh Power Bank', 14000, '', 'Keeps your phone alive through long days and NEPA surprises.', '["20,000mAh","Two USB-A and one USB-C port","Fast-charge capable","LED level indicator"]'::jsonb, null, '', 'phone', '', false, 3),
('g5', 'gadgets', 'Accessories', '65W Fast Charger', 9500, '', 'One charger for your phone, tablet and most modern laptops.', '["65W USB-C","Compact folding plug","Over-heat protection"]'::jsonb, null, '', 'laptop', '', false, 4),
('g6', 'gadgets', 'Accessories', 'Smartwatch Series S', 32000, '', 'Track steps, sleep and heart rate, and read your messages at a glance.', '["1.8\" touch display","Heart rate and sleep tracking","7-day battery","Water resistant"]'::jsonb, '["Black","Silver"]'::jsonb, 'Colour', 'buds', '', false, 5),
('f1', 'footwear', 'Palms', 'Handmade Palm Slippers', 6500, 'Signature', 'Cut, stitched and finished by hand. Soft underfoot and built to last for years.', '["Handmade","Genuine leather upper","Cushioned insole","Made to your size"]'::jsonb, '["38","39","40","41","42","43","44","45","46"]'::jsonb, 'Size (EU)', 'shoe', '', true, 6),
('f2', 'footwear', 'Sandals', 'Leather Palm Sandals', 12000, '', 'The classic strap sandal in smooth leather that softens with wear.', '["Handmade","Adjustable strap","Flexible rubber sole"]'::jsonb, '["38","39","40","41","42","43","44","45","46"]'::jsonb, 'Size (EU)', 'shoe', '', false, 7),
('f3', 'footwear', 'Shoes', 'Handcrafted Leather Loafers', 38000, 'New', 'Sharp enough for the office, comfortable enough for the whole day.', '["Handmade","Full leather lining","Non-slip sole"]'::jsonb, '["38","39","40","41","42","43","44","45","46"]'::jsonb, 'Size (EU)', 'shoe', '', true, 8),
('f4', 'footwear', 'Slippers', 'Beaded Slides for Her', 15000, '', 'Hand-beaded slides that dress up any outfit.', '["Handmade beadwork","Padded footbed","Light and flexible"]'::jsonb, '["36","37","38","39","40","41"]'::jsonb, 'Size (EU)', 'shoe', '', false, 9),
('f5', 'footwear', 'Slippers', 'Cushion Home Slippers', 5000, '', 'Soft everyday slippers for around the house.', '["Plush lining","Anti-slip sole","Easy to wash"]'::jsonb, '["38","39","40","41","42","43","44","45","46"]'::jsonb, 'Size (EU)', 'shoe', '', false, 10),
('f6', 'footwear', 'Sandals', 'Everyday Strap Sandals', 9000, '', 'Light, tough and ready for hot days and long walks.', '["Handmade","Water-friendly sole","Adjustable fit"]'::jsonb, '["38","39","40","41","42","43","44","45","46"]'::jsonb, 'Size (EU)', 'shoe', '', false, 11),
('c1', 'clothing', 'Native wear', 'Ankara Print Shirt', 16500, 'Popular', 'Bold Ankara print, clean tailoring, and a fit that works for weddings and weekends.', '["100% cotton","Short sleeve","Tailored fit"]'::jsonb, '["S","M","L","XL","XXL"]'::jsonb, 'Size', 'shirt', '', true, 12),
('c2', 'clothing', 'Tops', 'Classic Cotton Polo', 9800, '', 'A soft, breathable polo that goes with everything you own.', '["Pique cotton","Ribbed collar","Machine washable"]'::jsonb, '["S","M","L","XL","XXL"]'::jsonb, 'Size', 'shirt', '', false, 13),
('c3', 'clothing', 'Outerwear', 'Pullover Hoodie', 22000, '', 'Heavyweight fleece for cool evenings and harmattan mornings.', '["Brushed fleece","Kangaroo pocket","Relaxed fit"]'::jsonb, '["S","M","L","XL","XXL"]'::jsonb, 'Size', 'shirt', '', false, 14),
('c4', 'clothing', 'Native wear', 'Senator Two-Piece', 45000, 'New', 'A sharp senator set with clean embroidery at the neckline.', '["Top and trouser","Embroidered neckline","Breathable fabric"]'::jsonb, '["S","M","L","XL","XXL"]'::jsonb, 'Size', 'shirt', '', true, 15),
('c5', 'clothing', 'Dresses', 'Ladies Wrap Dress', 28000, '', 'A flattering wrap that moves well and dresses up or down.', '["Soft stretch fabric","Adjustable waist tie","Knee length"]'::jsonb, '["S","M","L","XL","XXL"]'::jsonb, 'Size', 'shirt', '', false, 16),
('c6', 'clothing', 'Accessories', 'Cotton Socks, 3-Pack', 4500, '', 'Cushioned, breathable socks that keep their shape.', '["3 pairs","Cotton blend","One size fits 40 to 45"]'::jsonb, null, '', 'shirt', '', false, 17),
('s1', 'appliances', 'Solar', '400W Monocrystalline Solar Panel', 145000, 'Best seller', 'High-efficiency mono panel for homes, shops and small offices.', '["400W, monocrystalline","Aluminium frame","Suitable for 12V and 24V systems","Warranty details confirmed at order"]'::jsonb, null, '', 'solar', 'solar', true, 18),
('s2', 'appliances', 'Solar', '3.5kVA Hybrid Inverter', 480000, '', 'Runs your appliances from solar, battery or the grid and switches automatically.', '["3.5kVA / 24V","Built-in MPPT charge controller","Pure sine wave","Warranty details confirmed at order"]'::jsonb, null, '', 'solar', 'solar', false, 19),
('s3', 'appliances', 'Solar', '200Ah Lithium Battery', 780000, '', 'Long-life lithium storage with a built-in battery management system.', '["200Ah lithium (LiFePO4)","Deep-cycle ready","Built-in BMS","Warranty details confirmed at order"]'::jsonb, null, '', 'solar', 'solar', false, 20),
('s4', 'appliances', 'Solar', 'Solar Street Light 100W', 55000, '', 'Dusk-to-dawn lighting with no wiring and no electricity bill.', '["100W LED","Auto on and off sensor","Weatherproof","Remote included"]'::jsonb, null, '', 'solar', 'solar', false, 21),
('s5', 'appliances', 'Solar', 'Rechargeable Solar Lantern', 12500, 'Popular', 'Light for the room, a charger for your phone, and a backup when power drops.', '["USB phone charging","Three brightness levels","Solar and USB charging"]'::jsonb, null, '', 'solar', 'solar', false, 22),
('s6', 'appliances', 'Solar', '1kVA Home Backup Kit', 650000, '', 'Panels, inverter and battery sized for lights, fans, TV and a fridge.', '["Inverter, battery and panels included","Sized for light home loads","Installation quote on request"]'::jsonb, null, '', 'solar', 'solar', false, 23),
('a1', 'appliances', 'Kitchen', 'High-Speed Blender 1.5L', 38000, 'Popular', 'Smoothies, pepper mix and soups in seconds, with a jar that is easy to clean.', '["1.5L jar","1,000W motor","Stainless steel blades","Two speeds and pulse"]'::jsonb, null, '', 'box', '', false, 24),
('a2', 'appliances', 'Kitchen', '20L Microwave Oven', 95000, '', 'Reheat, defrost and cook quickly with simple dial controls.', '["20L capacity","700W","Six power levels","Defrost function"]'::jsonb, null, '', 'box', '', false, 25),
('a3', 'appliances', 'Kitchen', 'Electric Kettle 2L', 12500, '', 'Boils fast and switches itself off when done.', '["2L capacity","Auto shut-off","Boil-dry protection","Stainless steel body"]'::jsonb, null, '', 'box', '', false, 26),
('a4', 'appliances', 'Cooling', '18" Standing Fan', 42000, 'New', 'Strong, quiet airflow with adjustable height and tilt.', '["18\" blade","Three speeds","Oscillating head","Adjustable height"]'::jsonb, null, '', 'fan', '', true, 27),
('a5', 'appliances', 'Cooling', '1HP Split Air Conditioner', 420000, '', 'Cools a bedroom or small office quickly and quietly.', '["1HP split unit","Cooling and dehumidify modes","Remote control","Installation quote on request"]'::jsonb, null, '', 'box', '', false, 28),
('a6', 'appliances', 'Home care', 'Steam Iron 2400W', 15000, '', 'Heats fast and glides smoothly, with steam for stubborn creases.', '["2400W","Non-stick soleplate","Variable steam","Self-clean function"]'::jsonb, null, '', 'box', '', false, 29)
on conflict (id) do nothing;
