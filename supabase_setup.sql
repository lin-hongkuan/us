-- 在 Supabase 的 SQL Editor 中运行此脚本以创建所需的表

-- 1. 创建 memories 表
create table public.memories (
  id uuid not null default gen_random_uuid (),
  content text not null,
  author text not null,
  created_at timestamp with time zone not null default now(),
  tags text[] null,
  image_url text null,
  constraint memories_pkey primary key (id)
);

-- 2. 启用 Row Level Security (RLS)
alter table public.memories enable row level security;

-- 3. 创建允许所有用户（包括未登录用户）读取的策略
create policy "Enable read access for all users"
on public.memories
for select
to public
using (true);

-- 4. 创建允许所有用户（包括未登录用户）插入的策略
create policy "Enable insert access for all users"
on public.memories
for insert
to public
with check (true);

-- 5. 创建允许所有用户删除的策略 (可选，如果你希望用户能删除)
create policy "Enable delete access for all users"
on public.memories
for delete
to public
using (true);

-- 6. 创建允许所有用户更新的策略
create policy "Enable update access for all users"
on public.memories
for update
to public
using (true)
with check (true);
