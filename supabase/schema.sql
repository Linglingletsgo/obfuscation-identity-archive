-- 混淆小镇 M1 数据库架构
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴全部内容 → Run

create table if not exists residents (
  id text primary key,
  identity_name text not null,
  carried_fragment text not null,
  tags jsonb not null default '{}',
  intro text not null default '',
  memories jsonb not null default '[]',
  is_founder boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists episodes (
  id text primary key,
  type text not null,                -- 'first_encounter' | 后续: 'daily_tick' | 'reflection'
  resident_ids text[] not null,      -- 参与的居民
  location text,
  content jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists episodes_resident_ids_idx on episodes using gin (resident_ids);
create index if not exists episodes_type_created_idx on episodes (type, created_at desc);
create index if not exists residents_created_idx on residents (created_at desc);

-- 增长归因：谁分享了、谁通过分享进来（M1 先建表，前端埋点 M2 接入）
create table if not exists share_events (
  id bigint generated always as identity primary key,
  resident_id text references residents(id),
  kind text not null,                -- 'card_download' | 'link_share' | 'referral_visit'
  referrer text,
  created_at timestamptz not null default now()
);

-- 安全：API 全部走服务端 service role key，因此对匿名角色关闭直接访问
alter table residents enable row level security;
alter table episodes enable row level security;
alter table share_events enable row level security;
