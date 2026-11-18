// In-memory stand-in for the Supabase client, used when VITE_DEMO=1. It implements the subset
// of supabase-js the app uses, keeps its data in localStorage so reloads keep state, and never
// talks to a network. It is a demo and test tool, not a security boundary.

import { buildDemoDb } from './demoSeed.js';

const DB_KEY = 'gp-demo-db-v1';
const SESSION_KEY = 'gp-demo-session-v1';

const UNIQUE = {
  user_profiles: [['id'], ['phone']],
  assessments: [['id']],
  growth_plans: [['id'], ['user_id', 'year']],
  goals: [['id']],
  email_preferences: [['user_id']],
  checkins: [['id'], ['user_id', 'period']],
  checkin_content: [['period']],
  checkin_sends: [['id'], ['period', 'user_id']],
  plan_shares: [['id']],
};

const PK = { email_preferences: 'user_id', checkin_content: 'period' };

// Columns the real database fills in when a row is created without them.
const DEFAULTS = { growth_plans: { word_of_year: null, verse_of_year: null } };

function hasStorage() {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function load() {
  if (hasStorage()) {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fall through to a fresh seed
      }
    }
  }
  return buildDemoDb();
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function latency() {
  if (!hasStorage()) return 0;
  const v = Number(localStorage.getItem('gp-demo-latency'));
  return Number.isFinite(v) && v >= 0 ? v : 60;
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

export function createDemoClient() {
  const db = load();
  const listeners = new Set();
  let session = null;
  if (hasStorage()) {
    try {
      session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      session = null;
    }
  }

  function persist() {
    if (hasStorage()) {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  if (hasStorage() && !localStorage.getItem(DB_KEY)) persist();

  function emit(event) {
    for (const fn of listeners) fn(event, session);
  }

  function currentUserId() {
    return session?.user?.id ?? null;
  }

  function isAdmin() {
    const id = currentUserId();
    return Boolean(db.user_profiles.find((p) => p.id === id)?.is_admin);
  }

  function makeSession(user) {
    return {
      access_token: `demo-${user.id}`,
      user: { id: user.id, email: user.email, user_metadata: user.user_metadata },
    };
  }

  function violatesUnique(table, row, ignoreIndex = -1) {
    for (const cols of UNIQUE[table] ?? []) {
      if (cols.some((c) => row[c] == null)) continue;
      const hit = db[table].findIndex((r, i) => i !== ignoreIndex && cols.every((c) => r[c] === row[c]));
      if (hit >= 0) return cols;
    }
    return null;
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.op = 'select';
      this.filters = [];
      this.orders = [];
      this.limitN = null;
      this.mode = 'many';
      this.returning = false;
      this.countMode = null;
      this.head = false;
    }
    select(columns, opts = {}) {
      this.columns = columns;
      if (this.op === 'select') {
        this.countMode = opts.count ?? null;
        this.head = Boolean(opts.head);
      } else {
        this.returning = true;
      }
      return this;
    }
    insert(values) {
      this.op = 'insert';
      this.values = Array.isArray(values) ? values : [values];
      return this;
    }
    upsert(values, opts = {}) {
      this.op = 'upsert';
      this.values = Array.isArray(values) ? values : [values];
      this.onConflict = (opts.onConflict ?? PK[this.table] ?? 'id').split(',').map((s) => s.trim());
      this.ignoreDuplicates = Boolean(opts.ignoreDuplicates);
      return this;
    }
    update(patch) {
      this.op = 'update';
      this.patch = patch;
      return this;
    }
    delete() {
      this.op = 'delete';
      return this;
    }
    eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
    neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
    in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
    lt(c, v) { this.filters.push((r) => r[c] < v); return this; }
    lte(c, v) { this.filters.push((r) => r[c] <= v); return this; }
    gt(c, v) { this.filters.push((r) => r[c] > v); return this; }
    gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
    is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
    order(c, opts = {}) { this.orders.push([c, opts.ascending !== false]); return this; }
    limit(n) { this.limitN = n; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }

    async run() {
      await wait(latency());
      if (offline()) return { data: null, error: { message: 'Failed to fetch', code: 'NETWORK' } };
      // A demo database saved before a table existed gets that table now.
      db[this.table] ??= [];
      const rows = db[this.table];
      if (!rows) return { data: null, error: { message: `relation "${this.table}" does not exist` } };
      const match = (r) => this.filters.every((f) => f(r));
      let result = [];
      if (this.op === 'select') {
        result = rows.filter(match);
      } else if (this.op === 'insert') {
        for (const v of this.values) {
          const row = { ...DEFAULTS[this.table], ...v };
          if (!PK[this.table] && !row.id) row.id = uuid();
          row.created_at ??= new Date().toISOString();
          const dup = violatesUnique(this.table, row);
          if (dup) return { data: null, error: { message: `duplicate key value violates unique constraint (${dup.join(',')})`, code: '23505' } };
          rows.push(row);
          result.push(row);
        }
      } else if (this.op === 'upsert') {
        for (const v of this.values) {
          const idx = rows.findIndex((r) => this.onConflict.every((c) => r[c] === v[c]));
          if (idx >= 0) {
            if (this.ignoreDuplicates) continue;
            const merged = { ...rows[idx], ...v };
            const dup = violatesUnique(this.table, merged, idx);
            if (dup) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
            rows[idx] = merged;
            result.push(merged);
          } else {
            const row = { ...DEFAULTS[this.table], ...v };
            if (!PK[this.table] && !row.id) row.id = uuid();
            row.created_at ??= new Date().toISOString();
            const dup = violatesUnique(this.table, row);
            if (dup) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
            rows.push(row);
            result.push(row);
          }
        }
      } else if (this.op === 'update') {
        rows.forEach((r, i) => {
          if (match(r)) {
            rows[i] = { ...r, ...this.patch };
            result.push(rows[i]);
          }
        });
      } else if (this.op === 'delete') {
        result = rows.filter(match);
        db[this.table] = rows.filter((r) => !match(r));
      }
      if (this.table === 'email_preferences' && (this.op === 'upsert' || this.op === 'update' || this.op === 'insert')) {
        for (const r of result) {
          if (r.monthly_checkin && !r.opted_in_at) r.opted_in_at = new Date().toISOString();
          if (!r.monthly_checkin && r.opted_in_at) r.opted_out_at = new Date().toISOString();
        }
      }
      if (this.op !== 'select') {
        persist();
        if (typeof window !== 'undefined') window.__demoWrites = (window.__demoWrites ?? 0) + 1;
      }

      for (const [c, asc] of [...this.orders].reverse()) {
        result = [...result].sort((a, b) => {
          if (a[c] === b[c]) return 0;
          return (a[c] > b[c] ? 1 : -1) * (asc ? 1 : -1);
        });
      }
      const count = result.length;
      if (this.limitN != null) result = result.slice(0, this.limitN);
      if (this.op !== 'select' && !this.returning) return { data: null, error: null, count };
      if (this.head) return { data: null, error: null, count };
      const data = clone(result);
      if (this.mode === 'single') {
        if (data.length !== 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
        return { data: data[0], error: null };
      }
      if (this.mode === 'maybe') {
        if (data.length > 1) return { data: null, error: { message: 'multiple rows returned', code: 'PGRST116' } };
        return { data: data[0] ?? null, error: null };
      }
      return { data, error: null, count: this.countMode ? count : null };
    }
    then(resolve, reject) {
      return this.run().then(resolve, reject);
    }
  }

  const rpcs = {
    login_email_for_phone({ p_phone }) {
      if (!p_phone || String(p_phone).trim().length < 7) return null;
      return db.user_profiles.find((p) => p.phone === p_phone)?.email ?? null;
    },
    phone_is_registered({ p_phone }) {
      if (!p_phone || String(p_phone).trim().length < 7) return false;
      return db.user_profiles.some((p) => p.phone === p_phone);
    },
    admin_stats() {
      if (!isAdmin()) throw Object.assign(new Error('Not authorized'), { code: '42501' });
      const dims = ['faith', 'relationships', 'finances', 'health', 'purpose', 'character', 'contentment'];
      const avg = (vals) => (vals.length ? Math.round((vals.reduce((a, b) => a + Number(b), 0) / vals.length) * 10) / 10 : null);
      const a = db.assessments;
      const v2 = a.filter((x) => x.version === 2 && x.habit_scores);
      const qCols = Object.keys(a[0] ?? {}).filter((k) => /_q\d$/.test(k));
      const habits = db.goals.filter((g) => String(g.goal_text ?? '').trim());
      const byYear = {};
      for (const p of db.growth_plans) byYear[p.year] = (byYear[p.year] ?? 0) + 1;
      const practiceCounts = {};
      for (const g of habits) if (g.practice_key) practiceCounts[g.practice_key] = (practiceCounts[g.practice_key] ?? 0) + 1;
      return {
        generated_at: new Date().toISOString(),
        totals: {
          users: db.user_profiles.length,
          assessments: a.length,
          assessments_v1: a.filter((x) => (x.version ?? 1) === 1).length,
          assessments_v2: a.filter((x) => x.version === 2).length,
          plans: db.growth_plans.length,
          goals: db.goals.length,
          habits: habits.length,
        },
        flourishing: Object.fromEntries(dims.map((d) => [d, avg(a.map((x) => x[`${d}_score`]))])),
        questions: { ...Object.fromEntries(qCols.map((c) => [c, avg(a.map((x) => x[c]))])), responses: a.length },
        habits: { ...Object.fromEntries(dims.map((d) => [d, avg(v2.map((x) => x.habit_scores[d]))])), responses: v2.length },
        plans_by_year: Object.entries(byYear).map(([year, count]) => ({ year: Number(year), count })),
        avg_habits_per_plan: db.growth_plans.length ? Math.round((habits.length / db.growth_plans.length) * 10) / 10 : null,
        top_practices: Object.entries(practiceCounts)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 10)
          .map(([practice_key, count]) => ({ practice_key, count })),
      };
    },
    admin_checkin_stats() {
      if (!isAdmin()) throw Object.assign(new Error('Not authorized'), { code: '42501' });
      const periods = new Set([
        ...db.checkin_content.map((c) => c.period),
        ...db.checkin_sends.map((c) => c.period),
        ...db.checkins.map((c) => c.period),
      ]);
      return {
        opted_in_now: db.email_preferences.filter((p) => p.monthly_checkin).length,
        periods: [...periods].sort().reverse().map((period) => {
          const sends = db.checkin_sends.filter((s) => s.period === period);
          return {
            period,
            queued: sends.length,
            sent: sends.filter((s) => s.status === 'sent').length,
            failed: sends.filter((s) => s.status === 'failed').length,
            skipped: sends.filter((s) => s.status === 'skipped').length,
            checked_in: db.checkins.filter((c) => c.period === period).length,
          };
        }),
      };
    },
  };

  const client = {
    isDemo: true,
    _db: db,
    _persist: persist,
    from(table) {
      return new Query(table);
    },
    async rpc(name, args = {}) {
      await wait(latency());
      if (offline()) return { data: null, error: { message: 'Failed to fetch' } };
      const fn = rpcs[name];
      if (!fn) return { data: null, error: { message: `function ${name} does not exist` } };
      try {
        return { data: clone(fn(args)), error: null };
      } catch (err) {
        return { data: null, error: { message: err.message, code: err.code } };
      }
    },
    auth: {
      async getSession() {
        return { data: { session: clone(session) }, error: null };
      },
      async getUser() {
        return { data: { user: clone(session?.user ?? null) }, error: null };
      },
      onAuthStateChange(fn) {
        listeners.add(fn);
        return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } };
      },
      async signInWithPassword({ email, password }) {
        await wait(latency());
        if (offline()) return { data: {}, error: { message: 'Failed to fetch' } };
        const user = db.auth_users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (!user || user.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
        session = makeSession(user);
        persist();
        emit('SIGNED_IN');
        return { data: { user: clone(session.user), session: clone(session) }, error: null };
      },
      async signUp({ email, password, options }) {
        await wait(latency());
        if (db.auth_users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
          return { data: {}, error: { message: 'User already registered' } };
        }
        const meta = options?.data ?? {};
        const user = { id: uuid(), email, password, user_metadata: meta };
        db.auth_users.push(user);
        // Mirrors the handle_new_user trigger.
        const phoneTaken = meta.phone && db.user_profiles.some((p) => p.phone === meta.phone);
        db.user_profiles.push({
          id: user.id,
          first_name: meta.first_name ?? null,
          last_name: meta.last_name ?? null,
          phone: phoneTaken ? null : meta.phone ?? null,
          email,
          is_admin: false,
          created_at: new Date().toISOString(),
        });
        session = makeSession(user);
        persist();
        emit('SIGNED_IN');
        return { data: { user: clone(session.user), session: clone(session) }, error: null };
      },
      async signOut() {
        session = null;
        persist();
        emit('SIGNED_OUT');
        return { error: null };
      },
      async resetPasswordForEmail() {
        await wait(latency());
        return { data: {}, error: null };
      },
      async updateUser({ password }) {
        const user = db.auth_users.find((u) => u.id === currentUserId());
        if (!user) return { data: {}, error: { message: 'Not signed in' } };
        if (password) user.password = password;
        persist();
        return { data: { user: clone(session.user) }, error: null };
      },
    },
  };
  return client;
}
