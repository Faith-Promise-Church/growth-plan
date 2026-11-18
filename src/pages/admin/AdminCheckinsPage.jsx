import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { listCheckinContent, saveCheckinContent, adminCheckinStats, sendAdminTest } from '../../data/api.js';
import { Button, Card, PageHeader, LoadingBlock, Banner } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { AdminGate } from './AdminPage.jsx';
import { monthYearLabel, periodOf, addMonths } from '../../lib/time.js';
import { isHttpsUrl } from '../../lib/escape.js';

const FIELDS = [
  { key: 'theme', label: 'Theme', max: 120 },
  { key: 'subject', label: 'Subject line', max: 150, hint: 'No all caps, emoji or leading zeroes.' },
  { key: 'preheader', label: 'Preheader', max: 200, hint: 'The short line many mail apps show after the subject.' },
  { key: 'zac_note', label: 'From Pastor Zac', max: 1200, multiline: true, hint: 'First person, 35 to 60 words.' },
  { key: 'article_title', label: 'Article title', max: 300 },
  { key: 'article_source', label: 'Article source', max: 200 },
  { key: 'article_url', label: 'Article link', max: 2000, hint: 'Must start with https://' },
  { key: 'article_blurb', label: 'Article blurb', max: 500, multiline: true },
];

function wordCount(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function EditionEditor({ edition, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(edition);
  const [error, setError] = useState('');
  const dirty = FIELDS.some((f) => (form[f.key] ?? '') !== (edition[f.key] ?? ''));

  async function save() {
    setError('');
    if (!form.subject?.trim()) return setError('Add a subject line.');
    if (/[\r\n]/.test(form.subject) || /[\r\n]/.test(form.preheader ?? '')) return setError('The subject and preheader must be one line.');
    if (form.article_url && !isHttpsUrl(form.article_url)) return setError('The article link must start with https://');
    try {
      const saved = await saveCheckinContent(Object.fromEntries([['period', form.period], ...FIELDS.map((f) => [f.key, (form[f.key] ?? '').trim()])]));
      onSaved(saved);
      toast.show('Saved.', { tone: 'success' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function test() {
    try {
      const res = await sendAdminTest(form.period);
      toast.show(`Test sent to ${res.to}.`, { tone: 'success' });
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }

  return (
    <div className="stack">
      {FIELDS.map((f) => (
        <div className="field" key={f.key}>
          <label className="field__label" htmlFor={`${form.period}-${f.key}`}>
            {f.label}
          </label>
          {f.hint ? <p className="field__hint">{f.hint}</p> : null}
          {f.multiline ? (
            <textarea id={`${form.period}-${f.key}`} className="input textarea" rows={4} maxLength={f.max} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          ) : (
            <input id={`${form.period}-${f.key}`} className="input" maxLength={f.max} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          )}
          {f.key === 'zac_note' ? <p className="field__hint">{`${wordCount(form.zac_note)} words`}</p> : null}
        </div>
      ))}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <div className="button-row">
        <Button onClick={save} disabled={!dirty}>
          Save
        </Button>
        <Button variant="secondary" onClick={test} disabled={dirty}>
          Send me a test
        </Button>
      </div>
    </div>
  );
}

export default function AdminCheckinsPage() {
  const content = useAsync(() => listCheckinContent(), []);
  const stats = useAsync(() => adminCheckinStats(), []);
  const [open, setOpen] = useState(null);
  const thisPeriod = periodOf(new Date());

  const editions = content.data ?? [];
  const counts = Object.fromEntries((stats.data?.periods ?? []).map((p) => [p.period, p]));
  const next = addMonths(editions.length ? editions[editions.length - 1].period : thisPeriod, 1);

  return (
    <AdminGate>
      <div className="page page--wide page--admin">
        <div className="page-main page-main--full">
          <PageHeader
            title="Monthly check-ins"
            back={{ to: '/admin', label: 'Admin' }}
            lead={stats.data ? `${stats.data.opted_in_now} people have opted in.` : undefined}
          />
          {content.loading && !content.data ? <LoadingBlock /> : null}
          {content.error ? <Banner tone="error">{content.error.message}</Banner> : null}
          {stats.error ? <Banner tone="error">{stats.error.message}</Banner> : null}
          <Card>
            <div className="table-scroll">
            <table className="data-table data-table--wide">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Queued</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Failed</th>
                  <th scope="col">Checked in</th>
                  <th scope="col">
                    <span className="visually-hidden">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {editions.map((e) => {
                  const c = counts[e.period] ?? {};
                  return (
                    <tr key={e.period} className={e.period === thisPeriod ? 'is-current' : ''}>
                      <td>{monthYearLabel(e.period)}</td>
                      <td>{e.subject}</td>
                      <td>{c.queued ?? 0}</td>
                      <td>{c.sent ?? 0}</td>
                      <td>{c.failed ?? 0}</td>
                      <td>{c.checked_in ?? 0}</td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => setOpen(open === e.period ? null : e.period)} aria-expanded={open === e.period}>
                          {open === e.period ? 'Close' : 'Edit'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </Card>
          {open ? (
            <Card>
              <h2 className="card__title">{monthYearLabel(open)}</h2>
              <EditionEditor
                key={open}
                edition={editions.find((e) => e.period === open) ?? { period: open }}
                onSaved={(row) => content.setData((list) => (list.some((e) => e.period === row.period) ? list.map((e) => (e.period === row.period ? row : e)) : [...list, row]))}
              />
            </Card>
          ) : null}
          <Button variant="secondary" onClick={() => setOpen(next)}>
            {`Add ${monthYearLabel(next)}`}
          </Button>
        </div>
      </div>
    </AdminGate>
  );
}
