-- Розклад: один рядок = одна група (курс + група). Сам розклад лежить у jsonb `data`
-- у тому ж форматі, що й раніше в Group/*.json: { settings, times, template }.

create table if not exists public.schedules (
    id           uuid primary key default gen_random_uuid(),
    course       text not null,              -- '4', 'magistr', ...
    group_code   text not null,              -- 'А', 'В', 'МА', ...
    course_label text not null,              -- '4 курс', 'Магістратура'
    group_label  text not null,              -- 'Група А', 'Підгрупа А'
    sort_order   int  not null default 0,
    is_published boolean not null default true,
    data         jsonb not null default '{}'::jsonb,
    updated_at   timestamptz not null default now(),
    updated_by   uuid references auth.users (id) on delete set null,
    unique (course, group_code)
);

-- Хто може редагувати розклад (додається скриптом `npm run create-editor`).
create table if not exists public.editors (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (select 1 from public.editors where user_id = auth.uid());
$$;

create or replace function public.schedules_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
end;
$$;

drop trigger if exists schedules_touch on public.schedules;
create trigger schedules_touch
    before insert or update on public.schedules
    for each row execute function public.schedules_touch();

alter table public.schedules enable row level security;
alter table public.editors   enable row level security;

drop policy if exists "schedules: read published" on public.schedules;
create policy "schedules: read published" on public.schedules
    for select to anon, authenticated
    using (is_published or public.is_editor());

drop policy if exists "schedules: editors insert" on public.schedules;
create policy "schedules: editors insert" on public.schedules
    for insert to authenticated
    with check (public.is_editor());

drop policy if exists "schedules: editors update" on public.schedules;
create policy "schedules: editors update" on public.schedules
    for update to authenticated
    using (public.is_editor()) with check (public.is_editor());

drop policy if exists "schedules: editors delete" on public.schedules;
create policy "schedules: editors delete" on public.schedules
    for delete to authenticated
    using (public.is_editor());

drop policy if exists "editors: see self" on public.editors;
create policy "editors: see self" on public.editors
    for select to authenticated
    using (user_id = auth.uid());

grant select on public.schedules to anon, authenticated;
grant insert, update, delete on public.schedules to authenticated;
grant select on public.editors to authenticated;
grant execute on function public.is_editor() to anon, authenticated;
