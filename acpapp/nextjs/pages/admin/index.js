import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

/*
 * Admin Analytics Dashboard (Package 2 - Agga Paing)
 *
 * Loads live data from GET /api/admin/analytics (admin-only).
 * Auth: reads the JWT from localStorage under the key "token".
 * Until the real login page stores the token there, this page shows a
 * small admin sign-in box that calls POST /api/login itself.
 *
 * API base URL: NEXT_PUBLIC_API_URL, defaulting to http://localhost:8000
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

function saveToken(value) {
  try {
    if (value) window.localStorage.setItem(TOKEN_KEY, value);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: token only lives for this page view */
  }
}

function formatBaht(n) {
  return '฿' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ------------------------------------------------------------ small parts */

function Header({ onSignOut }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-sm sm:text-base text-gray-900 hover:text-[#E57338] transition">
          {'←'} Back to Home
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[#E57338]">Admin Analytics</span>
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

/* ----------------------------------------------------------- sign-in box */

function AdminSignIn({ message, onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.token) {
        setError(body.detail && typeof body.detail === 'string' ? body.detail : 'Incorrect email or password.');
        return;
      }
      onSignedIn(body.token);
    } catch {
      setError("Can't reach the server. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin sign-in</h1>
          <p className="text-sm text-gray-500 mt-1">{message || 'Analytics are available to administrators only.'}</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@kmitl.ac.th"
          autoComplete="username"
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#E57338]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#E57338]"
        />
        {error && <p className="text-sm text-[#D9534F]">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-[#E57338] hover:bg-[#d66126] disabled:opacity-60 text-white font-semibold rounded-xl transition"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

const RANGES = [7, 30, 90];

export default function AdminAnalytics() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | forbidden | expired | error
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    setToken(readToken());
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
        saveToken(null);
        setToken(null);
        setStatus('expired');
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

  function signIn(newToken) {
    saveToken(newToken);
    setToken(newToken);
  }

  function signOut() {
    saveToken(null);
    setToken(null);
    setData(null);
    setStatus('idle');
  }

  const shell = (content, showSignOut = false) => (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col">
      <Header onSignOut={showSignOut ? signOut : null} />
      {content}
    </div>
  );

  if (!ready) return shell(null);

  if (!token) {
    return shell(
      <AdminSignIn
        message={status === 'expired' ? 'Your session expired. Please sign in again.' : ''}
        onSignedIn={signIn}
      />
    );
  }

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
          label="Users by Role"
          value={users.users_by_role ? Object.keys(users.users_by_role).length : '—'}
          sub={
            users.users_by_role
              ? Object.entries(users.users_by_role).map(([role, n]) => `${role} ${n}`).join(' · ')
              : 'Roles not available'
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
    </main>,
    true
  );
}
