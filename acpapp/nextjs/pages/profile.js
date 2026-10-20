import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authFetch, getToken, logout } from '../lib/api';

export default function Profile() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setEmail(localStorage.getItem('email') || '');
    (async () => {
      try {
        const res = await authFetch('/api/billing/status');
        if (!res.ok) throw new Error('Could not load your account.');
        setStatus(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogout() {
    try {
      await authFetch('/api/logout', { method: 'POST' });
    } catch {}
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/products" className="font-bold text-sm hover:text-[#E57338]">
            ← Back to items
          </Link>
          <span className="text-sm font-semibold text-[#E57338]">My Profile</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="w-14 h-14 rounded-full bg-[#E57338] text-white flex items-center justify-center text-xl font-bold mb-4">
            {(email[0] || '?').toUpperCase()}
          </div>

          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {status && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Email</dt>
                <dd className="font-semibold break-all">{email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Role</dt>
                <dd className="font-semibold capitalize">{status.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Organization</dt>
                <dd className="font-semibold">{status.organization}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Plan</dt>
                <dd className="font-semibold capitalize">
                  {status.is_admin ? 'Admin (no subscription)' : status.plan}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Lost reports this month</dt>
                <dd className="font-semibold">
                  {status.lost_reports_limit == null
                    ? `${status.lost_reports_used} (unlimited)`
                    : `${status.lost_reports_used} of ${status.lost_reports_limit}`}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={status && status.is_admin ? '/admin' : '/pricing'}
              className="px-4 py-2.5 bg-[#E57338] hover:bg-[#d66126] text-white rounded-xl text-sm font-semibold"
            >
              {status && status.is_admin
                ? 'Admin dashboard'
                : status && status.plan === 'pro'
                  ? 'Manage subscription'
                  : 'Upgrade to Pro'}
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}