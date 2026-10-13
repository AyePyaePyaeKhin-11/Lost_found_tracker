import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

/*
 * Admin Analytics Dashboard + User management (Package 2 - Agga Paing)
 *
 *   GET  /api/admin/analytics                     KPIs and charts
 *   GET  /api/admin/users                         account list
 *   PATCH /api/admin/users/{email}                grant/remove Pro, deactivate/reactivate
 *   POST /api/admin/users/deactivate-inactive     clean up inactive accounts
 *   DELETE /api/admin/users/{email}               delete accounts with no history
 *
 * Auth: the JWT saved by the login page in localStorage under "token".
 * Requests use relative /api/... URLs, which Next.js forwards to FastAPI
 * (see next.config.mjs), so this works on any host.
 */

const API = '';
const TOKEN_KEY = 'token';

const ORANGE = '#E57338';
const RED = '#D9534F';
const GREEN = '#4E9F6E';

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    ['token', 'email', 'role'].forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage blocked */
  }
}

function readEmail() {
  try {
    return window.localStorage.getItem('email');
  } catch {
    return null;
  }
}

function goToLogin() {
  window.location.href = '/login';
}

function timeAgo(iso) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatBaht(n) {
  return '฿' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ------------------------------------------------------------ small parts */

function Header({ onSignOut, email }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-sm sm:text-base text-gray-900 hover:text-[#E57338] transition">
          {'←'} Back to Home
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[#E57338]">Admin Analytics</span>
          {email && <span className="hidden sm:inline text-sm text-gray-400">{email}</span>}
          {onSignOut && (
            <button onClick={onSignOut} className="text-sm text-gray-500 hover:text-gray-900 transition">
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-5 ${className}`}>
      {title && <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-4">{title}</h2>}
      {children}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Tooltip({ children }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow">
      {children}
    </span>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RED }} /> Lost
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: GREEN }} /> Found
      </span>
    </div>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-gray-400 py-8 text-center">{children}</p>;
}

/* ---------------------------------------------------------------- charts */

function CategoryChart({ rows }) {
  if (!rows.length) return <Empty>No items reported yet</Empty>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className="flex items-end gap-3 h-48">
      {rows.map((r) => (
        <div key={r.category} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <div
            className="group relative w-full rounded-t-lg transition-opacity hover:opacity-80"
            style={{ height: `${(r.count / max) * 100}%`, background: ORANGE, minHeight: 4 }}
          >
            <Tooltip>
              {r.category}: {r.count} item{r.count === 1 ? '' : 's'}
            </Tooltip>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate w-full text-center" title={r.category}>
            {r.category}
          </p>
        </div>
      ))}
    </div>
  );
}

function LocationChart({ rows }) {
  if (!rows.length) return <Empty>No items reported yet</Empty>;
  const max = Math.max(...rows.map((r) => r.lost + r.found));
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const total = r.lost + r.found;
        return (
          <div key={r.location}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-900 truncate pr-2">{r.location}</span>
              <span className="text-gray-400 text-xs shrink-0">
                {r.lost} lost · {r.found} found
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex" style={{ width: `${(total / max) * 100}%` }}>
              {r.lost > 0 && <div style={{ width: `${(r.lost / total) * 100}%`, background: RED }} />}
              {r.found > 0 && <div style={{ width: `${(r.found / total) * 100}%`, background: GREEN }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.lost + r.found));
  const total = rows.reduce((s, r) => s + r.lost + r.found, 0);
  if (!total) return <Empty>No reports in this period</Empty>;
  return (
    <div>
      <div className="flex items-end gap-[2px] h-40">
        {rows.map((r) => {
          const count = r.lost + r.found;
          return (
            <div key={r.day} className="group relative flex-1 h-full flex flex-col justify-end">
              <div className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden hover:opacity-80"
                   style={{ height: `${(count / max) * 100}%` }}>
                {r.found > 0 && <div style={{ flex: r.found, background: GREEN }} />}
                {r.lost > 0 && <div style={{ flex: r.lost, background: RED }} />}
              </div>
              {count === 0 && <div className="w-full h-[2px] bg-gray-100" />}
              <Tooltip>
                {shortDate(r.day)}: {r.lost} lost, {r.found} found
              </Tooltip>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{shortDate(rows[0].day)}</span>
        <span>{shortDate(rows[rows.length - 1].day)}</span>
      </div>
    </div>
  );
}

function RecentActivity({ rows }) {
  if (!rows.length) return <Empty>No activity yet</Empty>;
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((r) => {
        const claimed = r.status === 'claimed';
        const badge = claimed
          ? { text: 'Returned', cls: 'text-gray-900' }
          : r.type === 'lost'
          ? { text: 'Lost', cls: 'text-[#D9534F]' }
          : { text: 'Found', cls: 'text-[#4E9F6E]' };
        return (
          <li key={r.item_id} className="py-3 flex justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{r.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {r.category} · {r.location} · {shortDate(r.date_reported)}
              </p>
            </div>
            <span className={`text-sm font-semibold shrink-0 ${badge.cls}`}>{badge.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------- user management */

function PlanBadge({ role }) {
  const styles = {
    admin: 'bg-gray-900 text-white',
    pro: 'bg-[#E57338] text-white',
    free: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[role] || styles.free}`}>
      {role}
    </span>
  );
}

function ActionButton({ children, onClick, disabled, tone = 'default' }) {
  const tones = {
    default: 'border-gray-200 text-gray-700 hover:border-[#E57338] hover:text-[#E57338]',
    danger: 'border-red-200 text-[#D9534F] hover:bg-red-50',
    primary: 'border-[#E57338] text-[#E57338] hover:bg-orange-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 text-xs font-semibold border rounded-lg transition disabled:opacity-50 whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function UserManagement({ token, myEmail, onChanged }) {
  const [users, setUsers] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyEmail, setBusyEmail] = useState(null);
  const [notice, setNotice] = useState(null); // {type, text}
  const [cleanupDays, setCleanupDays] = useState(90);
  const [preview, setPreview] = useState(null); // {count, emails}
  const [cleaning, setCleaning] = useState(false);

  const call = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
      if (res.status === 401) {
        clearSession();
        goToLogin();
        throw new Error('Session expired');
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.detail === 'string' ? body.detail : `Error ${res.status}`);
      return body;
    },
    [token]
  );

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ status: filter });
    if (search.trim()) params.set('search', search.trim());
    try {
      setUsers(await call(`/api/admin/users?${params}`));
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  }, [call, filter, search]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 250); // small debounce for the search box
    return () => clearTimeout(t);
  }, [loadUsers]);

  async function act(email, label, request) {
    setBusyEmail(email);
    setNotice(null);
    try {
      await request();
      setNotice({ type: 'success', text: `${label}: ${email}` });
      await loadUsers();
      onChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusyEmail(null);
    }
  }

  const patch = (email, body) =>
    call(`/api/admin/users/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify(body) });

  function setPlan(u, plan) {
    act(u.email, plan === 'pro' ? 'Pro granted' : 'Pro removed', () => patch(u.email, { plan }));
  }

  function setActive(u, isActive) {
    if (!isActive && !window.confirm(`Deactivate ${u.email}? They will be signed out and can't log in.`)) return;
    act(u.email, isActive ? 'Reactivated' : 'Deactivated', () => patch(u.email, { is_active: isActive }));
  }

  function remove(u) {
    if (!window.confirm(`Permanently delete ${u.email}? This can't be undone.`)) return;
    act(u.email, 'Deleted', () => call(`/api/admin/users/${encodeURIComponent(u.email)}`, { method: 'DELETE' }));
  }

  async function previewCleanup() {
    setNotice(null);
    setCleaning(true);
    try {
      setPreview(
        await call('/api/admin/users/deactivate-inactive', {
          method: 'POST',
          body: JSON.stringify({ days: cleanupDays, dry_run: true }),
        })
      );
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setCleaning(false);
    }
  }

  async function runCleanup() {
    setCleaning(true);
    try {
      const done = await call('/api/admin/users/deactivate-inactive', {
        method: 'POST',
        body: JSON.stringify({ days: cleanupDays }),
      });
      setNotice({ type: 'success', text: `Deactivated ${done.count} inactive account${done.count === 1 ? '' : 's'}.` });
      setPreview(null);
      await loadUsers();
      onChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setCleaning(false);
    }
  }

  return (
    <Card title="User Management">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email"
          className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#E57338]"
        />
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 self-start">
          {['all', 'active', 'deactivated'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition ${
                filter === f ? 'bg-[#E57338] text-white font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl text-sm">
        <span className="text-gray-600">Deactivate accounts inactive for</span>
        <select
          value={cleanupDays}
          onChange={(e) => {
            setCleanupDays(Number(e.target.value));
            setPreview(null);
          }}
          className="px-2 py-1 bg-white border border-gray-200 rounded-lg"
        >
          {[30, 90, 180, 365].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        {!preview ? (
          <ActionButton onClick={previewCleanup} disabled={cleaning}>
            {cleaning ? 'Checking…' : 'Find inactive accounts'}
          </ActionButton>
        ) : preview.count === 0 ? (
          <span className="text-gray-500">No accounts inactive for {preview.days}+ days.</span>
        ) : (
          <>
            <span className="text-gray-700">
              {preview.count} account{preview.count === 1 ? '' : 's'}: {preview.emails.slice(0, 3).join(', ')}
              {preview.count > 3 ? ` +${preview.count - 3} more` : ''}
            </span>
            <ActionButton tone="danger" onClick={runCleanup} disabled={cleaning}>
              {cleaning ? 'Deactivating…' : `Deactivate ${preview.count}`}
            </ActionButton>
            <ActionButton onClick={() => setPreview(null)} disabled={cleaning}>
              Cancel
            </ActionButton>
          </>
        )}
      </div>

      {notice && (
        <p className={`text-sm mb-3 ${notice.type === 'error' ? 'text-[#D9534F]' : 'text-[#4E9F6E]'}`}>{notice.text}</p>
      )}

      {users === null ? (
        <Empty>Loading users…</Empty>
      ) : users.length === 0 ? (
        <Empty>No users match.</Empty>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Plan</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Last active</th>
                <th className="py-2 pr-3 font-medium">Reports</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const locked = u.role === 'admin' || u.email === myEmail;
                const busy = busyEmail === u.email;
                return (
                  <tr key={u.email} className={u.is_active ? '' : 'text-gray-400'}>
                    <td className="py-2.5 pr-3 max-w-[220px] truncate" title={u.email}>
                      {u.email}
                      {u.email === myEmail && <span className="text-xs text-gray-400"> (you)</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <PlanBadge role={u.role} />
                    </td>
                    <td className="py-2.5 pr-3">
                      {u.is_active ? (
                        <span className="text-[#4E9F6E] font-medium">Active</span>
                      ) : (
                        <span className="text-gray-400 font-medium">Deactivated</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{timeAgo(u.last_active_at)}</td>
                    <td className="py-2.5 pr-3">{u.items_reported}</td>
                    <td className="py-2.5">
                      {locked ? (
                        <span className="block text-right text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {u.role === 'pro' ? (
                            <ActionButton onClick={() => setPlan(u, 'free')} disabled={busy}>Remove Pro</ActionButton>
                          ) : (
                            <ActionButton tone="primary" onClick={() => setPlan(u, 'pro')} disabled={busy || !u.is_active}>
                              Grant Pro
                            </ActionButton>
                          )}
                          {u.is_active ? (
                            <ActionButton tone="danger" onClick={() => setActive(u, false)} disabled={busy}>Deactivate</ActionButton>
                          ) : (
                            <ActionButton onClick={() => setActive(u, true)} disabled={busy}>Reactivate</ActionButton>
                          )}
                          {u.can_delete && (
                            <ActionButton tone="danger" onClick={() => remove(u)} disabled={busy}>Delete</ActionButton>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">
        Accounts with reports or payments can't be deleted, only deactivated, so item history and revenue stay accurate.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ page */

const RANGES = [7, 30, 90];

export default function AdminAnalytics() {
  const [token, setToken] = useState(null);
  const [myEmail, setMyEmail] = useState(null);
  const [ready, setReady] = useState(false);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | forbidden | expired | error
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const t = readToken();
    if (!t) {
      goToLogin();
      return;
    }
    setToken(t);
    setMyEmail(readEmail());
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    try {
      const res = await fetch(`${API}/api/admin/analytics?days=${days}&recent_limit=6`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        clearSession();
        goToLogin();
        return;
      }
      if (res.status === 403) {
        setStatus('forbidden');
        return;
      }
      if (!res.ok) {
        setErrorText(`The server returned an error (${res.status}).`);
        setStatus('error');
        return;
      }
      setData(await res.json());
      setStatus('ok');
    } catch {
      setErrorText("Can't reach the server. Is the backend running?");
      setStatus('error');
    }
  }, [token, days]);

  useEffect(() => {
    load();
  }, [load]);

  function signOut() {
    clearSession();
    goToLogin();
  }

  const shell = (content, showSignOut = false) => (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col">
      <Header onSignOut={showSignOut ? signOut : null} email={showSignOut ? myEmail : null} />
      {content}
    </div>
  );

  if (!ready) return shell(null);

  if (status === 'forbidden') {
    return shell(
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center bg-white border border-gray-200 rounded-2xl p-6">
          <h1 className="text-xl font-bold">Admins only</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your account doesn't have access to analytics. Sign in with an administrator account.
          </p>
          <button onClick={signOut} className="mt-5 px-5 py-2.5 bg-[#E57338] text-white font-semibold rounded-xl">
            Switch account
          </button>
        </div>
      </div>,
      true
    );
  }

  if (status === 'error' && !data) {
    return shell(
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-gray-700">{errorText}</p>
          <button onClick={load} className="mt-4 px-5 py-2.5 bg-[#E57338] text-white font-semibold rounded-xl">
            Try again
          </button>
        </div>
      </div>,
      true
    );
  }

  if (!data) {
    return shell(<p className="flex-1 flex items-center justify-center text-gray-400">Loading analytics…</p>, true);
  }

  const { summary, items_by_category, by_location, items_over_time, recent_activity, users, billing } = data;
  const nonArchived = summary.total_items;

  return shell(
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Campus operational performance & recovery metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            {RANGES.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  days === d ? 'bg-[#E57338] text-white font-semibold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={status === 'loading'}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:border-[#E57338] disabled:opacity-60 transition"
          >
            {status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <p className="text-sm text-[#D9534F]">{errorText} Showing the last loaded data.</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Recovery Rate"
          value={`${summary.recovery_rate}%`}
          sub={`${summary.recovered} of ${nonArchived} items recovered`}
        />
        <StatCard
          label="Avg. Match Time"
          value={summary.avg_match_time_days === null ? '—' : `${summary.avg_match_time_days} days`}
          sub={summary.avg_match_time_days === null ? 'No items claimed yet' : 'Report to claim'}
        />
        <StatCard
          label="MRR"
          value={billing ? formatBaht(billing.mrr) : 'Pending'}
          sub={billing ? `ARR ${formatBaht(billing.arr)}` : 'Billing not connected yet'}
        />
        <StatCard
          label="Active Users"
          value={users.active_users_30d.toLocaleString('en-US')}
          sub={`of ${users.total_users.toLocaleString('en-US')} registered (30 days)`}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Lost" value={summary.open_lost} />
        <StatCard label="Open Found" value={summary.open_found} />
        <StatCard label="Total Reports" value={nonArchived} sub={`${summary.total_lost} lost · ${summary.total_found} found`} />
        <StatCard
          label="Pro Subscribers"
          value={billing ? billing.pro_users : '—'}
          sub={
            billing
              ? `${billing.conversion_rate}% of users · ${billing.cancellations_30d} cancelled (30d)`
              : 'Billing not connected yet'
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Items by Category">
          <CategoryChart rows={items_by_category} />
        </Card>
        <Card title="Lost / Found Activity by Location">
          <div className="mb-4">
            <Legend />
          </div>
          <LocationChart rows={by_location} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title={`Reports per Day (last ${days} days)`} className="lg:col-span-2">
          <div className="mb-4">
            <Legend />
          </div>
          <TrendChart rows={items_over_time} />
        </Card>
        <Card title="Recent Activity">
          <RecentActivity rows={recent_activity} />
        </Card>
      </div>

      <UserManagement token={token} myEmail={myEmail} onChanged={load} />
    </main>,
    true
  );
}
