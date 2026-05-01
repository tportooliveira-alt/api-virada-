create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'customer' check (role in ('customer', 'admin')),
  plan text default 'basic' check (plan in ('basic', 'premium')),
  access_status text default 'active' check (access_status in ('active', 'blocked', 'cancelled')),
  created_at timestamp with time zone default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  description text not null,
  amount numeric not null,
  category text,
  payment_method text,
  is_impulse boolean default false,
  expense_date date not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  description text not null,
  amount numeric not null,
  category text,
  income_date date not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  total_amount numeric not null,
  installment_amount numeric,
  due_date date,
  priority text,
  status text default 'aberta',
  created_at timestamp with time zone default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  type text,
  created_at timestamp with time zone default now()
);

create table if not exists public.completed_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mission_day integer not null,
  completed_at timestamp with time zone default now(),
  unique (user_id, mission_day)
);

create table if not exists public.impulse_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_name text,
  amount numeric,
  need_now boolean,
  fits_budget boolean,
  can_wait_24h boolean,
  emotional_purchase boolean,
  decision text,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  points integer not null,
  reason text,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_key text not null,
  badge_name text not null,
  unlocked_at timestamp with time zone default now(),
  unique (user_id, badge_key)
);

create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_streak integer default 0,
  best_streak integer default 0,
  last_active_date date,
  updated_at timestamp with time zone default now()
);

create table if not exists public.user_score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  score integer not null,
  level text,
  created_at timestamp with time zone default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  message text,
  response text,
  created_at timestamp with time zone default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  recommendation text,
  type text,
  created_at timestamp with time zone default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into public.user_streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
      and access_status = 'active'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.debts enable row level security;
alter table public.goals enable row level security;
alter table public.completed_missions enable row level security;
alter table public.impulse_checks enable row level security;
alter table public.user_points enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_streaks enable row level security;
alter table public.user_score_history enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_recommendations enable row level security;

create policy "profiles self select" on public.profiles
for select using (auth.uid() = id);

create policy "profiles self update" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles admin select all" on public.profiles
for select using (public.is_admin(auth.uid()));

create policy "profiles admin update all" on public.profiles
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "expenses own select" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses own insert" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses own update" on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses own delete" on public.expenses for delete using (auth.uid() = user_id);

create policy "incomes own select" on public.incomes for select using (auth.uid() = user_id);
create policy "incomes own insert" on public.incomes for insert with check (auth.uid() = user_id);
create policy "incomes own update" on public.incomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "incomes own delete" on public.incomes for delete using (auth.uid() = user_id);

create policy "debts own select" on public.debts for select using (auth.uid() = user_id);
create policy "debts own insert" on public.debts for insert with check (auth.uid() = user_id);
create policy "debts own update" on public.debts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debts own delete" on public.debts for delete using (auth.uid() = user_id);

create policy "goals own select" on public.goals for select using (auth.uid() = user_id);
create policy "goals own insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals own update" on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals own delete" on public.goals for delete using (auth.uid() = user_id);

create policy "completed_missions own select" on public.completed_missions for select using (auth.uid() = user_id);
create policy "completed_missions own insert" on public.completed_missions for insert with check (auth.uid() = user_id);
create policy "completed_missions own update" on public.completed_missions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "completed_missions own delete" on public.completed_missions for delete using (auth.uid() = user_id);

create policy "impulse_checks own select" on public.impulse_checks for select using (auth.uid() = user_id);
create policy "impulse_checks own insert" on public.impulse_checks for insert with check (auth.uid() = user_id);
create policy "impulse_checks own update" on public.impulse_checks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "impulse_checks own delete" on public.impulse_checks for delete using (auth.uid() = user_id);

create policy "user_points own select" on public.user_points for select using (auth.uid() = user_id);
create policy "user_points own insert" on public.user_points for insert with check (auth.uid() = user_id);
create policy "user_points own update" on public.user_points for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_points own delete" on public.user_points for delete using (auth.uid() = user_id);

create policy "user_badges own select" on public.user_badges for select using (auth.uid() = user_id);
create policy "user_badges own insert" on public.user_badges for insert with check (auth.uid() = user_id);
create policy "user_badges own update" on public.user_badges for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_badges own delete" on public.user_badges for delete using (auth.uid() = user_id);

create policy "user_streaks own select" on public.user_streaks for select using (auth.uid() = user_id);
create policy "user_streaks own insert" on public.user_streaks for insert with check (auth.uid() = user_id);
create policy "user_streaks own update" on public.user_streaks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_streaks own delete" on public.user_streaks for delete using (auth.uid() = user_id);

create policy "user_score_history own select" on public.user_score_history for select using (auth.uid() = user_id);
create policy "user_score_history own insert" on public.user_score_history for insert with check (auth.uid() = user_id);
create policy "user_score_history own update" on public.user_score_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_score_history own delete" on public.user_score_history for delete using (auth.uid() = user_id);

create policy "ai_conversations own select" on public.ai_conversations for select using (auth.uid() = user_id);
create policy "ai_conversations own insert" on public.ai_conversations for insert with check (auth.uid() = user_id);
create policy "ai_conversations own update" on public.ai_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations own delete" on public.ai_conversations for delete using (auth.uid() = user_id);

create policy "ai_recommendations own select" on public.ai_recommendations for select using (auth.uid() = user_id);
create policy "ai_recommendations own insert" on public.ai_recommendations for insert with check (auth.uid() = user_id);
create policy "ai_recommendations own update" on public.ai_recommendations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_recommendations own delete" on public.ai_recommendations for delete using (auth.uid() = user_id);
