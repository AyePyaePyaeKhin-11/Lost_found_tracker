import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'token'; // change if login.js stores it under another key

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export default function Pricing() {
  const [showQrModal, setShowQrModal] = useState(false);
  const [status, setStatus] = useState(null); // { tier, role, organization }
  const [checkout, setCheckout] = useState(null); // { reference, amount, ... }
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  async function loadStatus() {
    try {
      const res = await fetch(`${API}/api/billing/status`, { headers: authHeaders() });
      if (res.ok) setStatus(await res.json());
      else setStatus(null);
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function startCheckout() {
    setMessage(null);
    setPaid(false);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/billing/checkout`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan: 'enterprise' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Please log in first.');
      if (res.status === 403) throw new Error('Only organization admins can upgrade the plan.');
      if (!res.ok) throw new Error(data.detail || 'Could not start checkout.');
      setCheckout(data);
      setShowQrModal(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function confirmPayment() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/billing/webhook`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reference: checkout.reference }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Payment confirmation failed.');
      setPaid(true);
      setMessage({ type: 'success', text: 'Upgrade complete! Your organization is now on Enterprise.' });
      await loadStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setShowQrModal(false);
    setCheckout(null);
    setPaid(false);
  }

  const isEnterprise = status && status.tier === 'enterprise';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-sm sm:text-base text-gray-900 hover:text-[#E57338] transition">
            ← Back to Home
          </Link>
          <span className="text-xs sm:text-sm font-semibold text-[#E57338]">Subscription Plans</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Plans for Every Department
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Choose a plan to manage campus lost and found operations with institutional verification.
          </p>
          {status && (
            <p className="text-xs text-gray-500 mt-3">
              {status.organization} · current plan:{' '}
              <span className="font-semibold capitalize">{status.tier}</span> · your role:{' '}
              <span className="font-semibold">{status.role}</span>
            </p>
          )}
        </div>

        {message && (
          <div
            role="alert"
            className={`max-w-4xl mx-auto mb-6 rounded-xl px-4 py-3 text-sm ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Standard Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Standard</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Single department or small campus</p>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">Free</div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-[#48A868] font-bold">✓</span> Up to 500 active listings / month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#48A868] font-bold">✓</span> Campus ID verification
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#48A868] font-bold">✓</span> Keyword search and grouping
                </li>
              </ul>
            </div>
            <button
              disabled
              className="w-full py-3 border border-gray-200 text-gray-800 font-semibold rounded-xl bg-white text-sm opacity-70 cursor-default"
            >
              {isEnterprise ? 'Included' : 'Current Plan'}
            </button>
          </div>

          {/* Enterprise Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-[#E57338] shadow-sm relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 bg-[#E57338] text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Recommended
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Enterprise</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Multi-campus universities</p>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">฿4,800<span className="text-sm font-medium text-gray-500"> / month</span></div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-[#E57338] font-bold">✓</span> Unlimited active listings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E57338] font-bold">✓</span> Full institutional SSO integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#E57338] font-bold">✓</span> Score matching, analytics, SLA support
                </li>
              </ul>
            </div>
            <button
              onClick={startCheckout}
              disabled={loading || isEnterprise}
              className="w-full py-3.5 bg-[#E57338] hover:bg-[#d66126] disabled:opacity-60 disabled:cursor-default text-white font-semibold rounded-xl transition duration-150 shadow-sm text-sm"
            >
              {isEnterprise ? 'Current Plan' : loading ? 'Please wait...' : 'Upgrade Now'}
            </button>
          </div>
        </div>
      </main>

      {/* PromptPay Modal */}
      {showQrModal && checkout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xs sm:max-w-sm text-center shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Scan to Pay</h3>
            <p className="text-xs text-gray-500 mt-1">Mock PromptPay QR Checkout</p>
            <div className="w-40 h-40 bg-[#F1F3F5] rounded-xl mx-auto my-5 flex flex-col items-center justify-center text-xs text-gray-500 font-medium px-2 break-all">
              <span className="text-2xl mb-1">▦</span>
              {checkout.reference}
            </div>
            <p className="text-sm font-semibold text-gray-900">
              ฿{Number(checkout.amount).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {paid ? 'Payment confirmed.' : 'Waiting for webhook confirmation...'}
            </p>

            {message && message.type === 'error' && (
              <p className="text-xs text-red-600 mt-3">{message.text}</p>
            )}
            {paid && message && message.type === 'success' && (
              <p className="text-xs text-green-600 mt-3">{message.text}</p>
            )}

            {!paid && (
              <button
                onClick={confirmPayment}
                disabled={loading}
                className="mt-5 w-full py-2.5 bg-[#E57338] hover:bg-[#d66126] disabled:opacity-60 text-white rounded-xl text-xs font-semibold"
              >
                {loading ? 'Confirming...' : "I've paid (simulate scan)"}
              </button>
            )}
            <button
              onClick={closeModal}
              className="mt-3 w-full py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {paid ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}