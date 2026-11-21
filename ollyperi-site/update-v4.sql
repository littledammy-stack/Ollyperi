alter table public.products add column if not exists compare_price numeric not null default 0 check (compare_price >= 0 and compare_price < 1000000000);
