-- ===========================================================================
-- Ingestion pipeline schema — spec §6.3
--
-- Postgres holds the whole pipeline: sources, raw fetched listings, normalised
-- listings, classification results and a decision log. High churn, cheap,
-- disposable, queryable. Sanity holds only what a human has looked at.
--
-- Runs unchanged on Neon/Supabase (via `pg`) and on PGlite for local dev.
-- ===========================================================================

create table if not exists employer (
  id                  text primary key,          -- slug
  name                text not null,
  website             text,
  careers_url         text,
  city                text,
  ats                 text,                      -- 'greenhouse' | 'ashby' | ... | null
  ats_token           text,
  cause_areas         text[] not null default '{}',
  leverage_note       text,                      -- durable, employer-level "why this org matters"
  e2g_allowlisted     boolean not null default false,  -- gate for earning to give; §5.3
  e2g_salary_presumed boolean not null default false,  -- known to clear the floor without publishing numbers
  watchlist_tier      int not null default 2,    -- 1 = poll daily, 2 = weekly, 3 = monthly
  active              boolean not null default true,
  notes               text,                      -- verification flags carried from Appendix A
  created_at          timestamptz not null default now()
);

create table if not exists source (
  id                   text primary key,         -- 'greenhouse:mosameat', 'cso-api', 'academictransfer'
  kind                 text not null,            -- 'ats' | 'gov-api' | 'crawl' | 'ea-board' | 'manual'
  adapter              text not null,            -- adapter module name
  config               jsonb not null default '{}',
  employer_id          text references employer(id),
  enabled              boolean not null default true,
  last_run_at          timestamptz,
  last_ok_at           timestamptz,
  consecutive_failures int not null default 0,
  last_error           text,
  -- A source that returns a complete set on every run can drive closure
  -- detection; a partial crawl cannot (§7.8).
  returns_complete_set boolean not null default false
);

create table if not exists raw_listing (
  id           bigserial primary key,
  source_id    text not null references source(id),
  external_id  text not null,                    -- stable id from the source
  fetched_at   timestamptz not null default now(),
  payload      jsonb not null,
  content_hash text not null,
  unique (source_id, external_id, content_hash)
);

create table if not exists listing (
  id               bigserial primary key,
  source_id        text not null references source(id),
  external_id      text not null,
  employer_id      text references employer(id),
  employer_name    text not null,
  title            text not null,
  apply_url        text not null,
  description      text,                         -- plain text, normalised
  description_html text,
  location_raw     text,
  country          text,
  posted_at        timestamptz,
  deadline_at      timestamptz,
  salary_min       numeric,
  salary_max       numeric,
  salary_currency  text,
  salary_period    text,
  mentions_30_percent_ruling boolean not null default false,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  closed_at        timestamptz,                  -- set when it disappears from source
  dedup_key        text not null,                -- §7.7
  unique (source_id, external_id)
);

create index if not exists listing_dedup_key_idx on listing (dedup_key);
create index if not exists listing_open_idx on listing (closed_at) where closed_at is null;
create index if not exists listing_employer_idx on listing (employer_id);

create table if not exists classification (
  listing_id           bigint primary key references listing(id) on delete cascade,
  model                text not null,
  classified_at        timestamptz not null default now(),
  nl_eligible          boolean not null,
  primary_cause        text,
  secondary_causes     text[] not null default '{}',
  leverage             text,
  cause_score          int,                      -- 0-3
  leverage_score       int,                      -- 0-3
  total_score          int generated always as (cause_score + leverage_score) stored,
  language_requirement text,
  work_authorisation   text,
  security_screening   boolean,
  security_note        text,
  seniority            text,
  location_mode        text,
  draft_note           text,                     -- LLM's attempt at the editorial note, in Dutch
  reasoning            text,                     -- why it scored this way; shown to curator
  gate_violations      jsonb not null default '[]',
  raw_response         jsonb
);

create index if not exists classification_score_idx on classification (total_score desc);

create table if not exists decision (
  id            bigserial primary key,
  listing_id    bigint not null references listing(id) on delete cascade,
  action        text not null,                   -- 'auto-rejected' | 'promoted' | 'published' | 'rejected' | 'snoozed'
  actor         text not null,                   -- 'pipeline' or a curator identifier
  reason        text,
  sanity_doc_id text,
  created_at    timestamptz not null default now()
);

create index if not exists decision_listing_idx on decision (listing_id);
create index if not exists decision_action_idx on decision (action, created_at desc);

-- Outbound click log (§9.7). Server-side so it survives ad blockers. No IP
-- addresses — job ads are corporate data, but the click log should not retain
-- more than the metric needs (§10).
create table if not exists apply_click (
  id            bigserial primary key,
  sanity_doc_id text not null,
  listing_id    bigint references listing(id) on delete set null,
  locale        text not null default 'nl',
  referrer_host text,
  clicked_at    timestamptz not null default now()
);

create index if not exists apply_click_doc_idx on apply_click (sanity_doc_id, clicked_at desc);

-- Hand-graded calibration set (§8.3 / M3). 100 classifications are graded by
-- hand before anything is wired into Sanity, so the thresholds are tuned
-- rather than guessed at.
create table if not exists grade (
  listing_id   bigint primary key references listing(id) on delete cascade,
  human_verdict text not null,                   -- 'belongs' | 'borderline' | 'reject'
  human_cause_score int,
  human_leverage_score int,
  note         text,
  graded_by    text,
  graded_at    timestamptz not null default now()
);
