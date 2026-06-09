-- Magic Memo: 초기 스키마
-- Supabase Dashboard → SQL Editor 에서 그대로 실행하거나
-- Supabase CLI (`supabase db push`)로 적용한다.

create extension if not exists vector;
create extension if not exists pg_trgm;

-- 카테고리는 앱 레이어에서 강제하지만, DB에서도 안전망을 둔다.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'memo_category') then
    create type memo_category as enum (
      '업무', '개인', '아이디어', '지출', '일정', '정보', '할일', '일반'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'memo_source') then
    create type memo_source as enum ('text', 'voice', 'photo');
  end if;
end$$;

create table if not exists memos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_type memo_source not null default 'text',
  raw_input text not null,
  title text not null,
  summary text not null,
  category memo_category not null default '일반',
  tags text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  action_items text[] not null default '{}',
  standardized_content text not null,
  photo_path text,
  audio_path text,
  embedding vector(1536),
  search_text text generated always as (
    title || ' ' || summary || ' ' || standardized_content || ' ' ||
    array_to_string(tags, ' ') || ' ' || array_to_string(action_items, ' ')
  ) stored
);

create index if not exists memos_created_at_idx on memos (created_at desc);
create index if not exists memos_category_idx on memos (category);
create index if not exists memos_tags_idx on memos using gin (tags);
create index if not exists memos_search_trgm_idx on memos using gin (search_text gin_trgm_ops);
create index if not exists memos_embedding_idx
  on memos using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- updated_at 자동 갱신
create or replace function set_memo_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_memos_updated_at on memos;
create trigger trg_memos_updated_at
before update on memos
for each row execute function set_memo_updated_at();

-- 하이브리드 검색: 키워드(trgm) + 벡터(cosine) 점수 결합
create or replace function search_memos(
  query_text text,
  query_embedding vector(1536),
  match_count int default 20,
  keyword_weight float default 0.4,
  vector_weight float default 0.6
)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  source_type memo_source,
  raw_input text,
  title text,
  summary text,
  category memo_category,
  tags text[],
  importance smallint,
  action_items text[],
  standardized_content text,
  photo_path text,
  audio_path text,
  score float
)
language plpgsql as $$
begin
  return query
  select
    m.id, m.created_at, m.updated_at, m.source_type, m.raw_input,
    m.title, m.summary, m.category, m.tags, m.importance, m.action_items,
    m.standardized_content, m.photo_path, m.audio_path,
    (keyword_weight * similarity(m.search_text, query_text)
     + vector_weight * (1 - (m.embedding <=> query_embedding)))::float as score
  from memos m
  where m.embedding is not null
  order by score desc
  limit match_count;
end;
$$;

-- RLS: 단일 사용자 MVP. 서비스 롤로만 접근하므로 활성화는 하되 정책은 비워둔다.
alter table memos enable row level security;

-- Storage buckets (private). Dashboard에서 만들거나 아래 SQL로 생성.
insert into storage.buckets (id, name, public)
values ('memo-photos', 'memo-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('memo-audio', 'memo-audio', false)
on conflict (id) do nothing;
