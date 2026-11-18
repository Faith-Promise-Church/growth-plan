# Schema baseline (production, before v2)

There is no schema dump of the live project in this repo. This file is the reference for what the
live database looks like before the v2 migrations, as described in the v2 brief on 2026-11-17.
`supabase/tests/baseline.sql` rebuilds this schema in a local database so the migrations can be
rehearsed against it. Where the brief did not say something, the assumption is marked **(assumed)**.

## Tables

### `user_profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, references `auth.users(id)` |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `phone` | `text` | `unique`. Stored as `xxx-xxx-xxxx` by the signup form |
| `email` | `text` | Used by login: phone is turned into this email, then `signInWithPassword` |
| `is_admin` | `bool` | `default false` |
| `created_at` | `timestamptz` | `default now()` **(assumed)** |

### `assessments`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `default gen_random_uuid()` **(assumed)** |
| `user_id` | `uuid` | References `auth.users(id)` |
| `assessment_date` | `timestamptz` | |
| `created_at` | `timestamptz` | |
| `{dimension}_score` x7 | `numeric not null` | Checked 1.0 to 10.0 |
| `{dimension}_q{n}` x20 | `int not null` | Checked 1 to 10. Health has `q1` and `q2`; every other dimension has `q1` to `q3` |

Dimensions: `faith`, `relationships`, `finances`, `health`, `purpose`, `character`, `contentment`.

### `growth_plans`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users(id)` |
| `year` | `int` | Checked 2026 to 2045 |
| `created_at`, `updated_at` | `timestamptz` | |
| | | `unique (user_id, year)` |

### `goals`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `default gen_random_uuid()` **(assumed)** |
| `growth_plan_id` | `uuid` | References `growth_plans(id)` (`on delete cascade` **assumed**) |
| `dimension` | `text` | Checked against the seven keys |
| `discipline` | `text` | Nullable. Set for the required ("mandatory") goals |
| `goal_name` | `text` | |
| `goal_text` | `text not null` | Often an empty string |
| `is_mandatory` | `bool` | |
| `sort_order` | `int` | |
| `created_at`, `updated_at` | `timestamptz` | |

## Functions

- `is_current_user_admin()`: `SECURITY DEFINER`, reads `user_profiles.is_admin` for `auth.uid()`.
  No `search_path` set. Admin read policies on `assessments`, `growth_plans` and `goals` depend on it.

## Row level security (from the live pg_policies output, 2026-11-17)

| Table | Policy | Command | Roles | Rule |
|---|---|---|---|---|
| user_profiles | Allow phone lookup for login | SELECT | anon, authenticated | `true` (**everyone reads every row**) |
| user_profiles | Users can insert own profile | INSERT | anon, authenticated | check `true` (**anyone inserts any row**) |
| user_profiles | Users can update own profile | UPDATE | authenticated | `auth.uid() = id` (**any column, including is_admin**) |
| user_profiles | Admins can view all user profiles | SELECT | public | `id = auth.uid() OR is_current_user_admin()` |
| assessments | Users can view / insert / update / delete own assessments | each | authenticated | `auth.uid() = user_id` |
| assessments | Admins can view all assessments | SELECT | public | `user_id = auth.uid() OR is_current_user_admin()` |
| growth_plans | Users can view / insert / update / delete own growth plans | each | authenticated | `auth.uid() = user_id` |
| growth_plans | Admins can view all growth plans | SELECT | public | `user_id = auth.uid() OR is_current_user_admin()` |
| goals | Users can view / insert / update / delete own goals | each | authenticated | the goal's plan belongs to `auth.uid()` |
| goals | Admins can view all goals | SELECT | public | owner check `OR is_current_user_admin()` |

`supabase/tests/baseline.sql` recreates exactly these policies for the rehearsal.

## Data volume (November 2026)

About 1,200 profiles, 930 assessments, 730 plans and 11,200 goals.

## What the live (v1) frontend does against this schema

- Login: `select email from user_profiles where phone = ?` as `anon`, then `signInWithPassword`.
- Signup: `select id from user_profiles where phone = ?` as `anon`, `auth.signUp` with
  `first_name`, `last_name`, `phone` metadata, then upserts its own `user_profiles` row.
- Save goals: deletes every goal for a plan and dimension, then inserts the new list.
- Load plan: `growth_plans` by `user_id` and `year`, then `goals` by `growth_plan_id`.
- Admin: selects every assessment row in the browser (capped at 1,000 rows by PostgREST).
