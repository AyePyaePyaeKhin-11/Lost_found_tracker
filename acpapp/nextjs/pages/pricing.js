import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { authFetch, getToken } from '../lib/api';

/*
 * Pricing & checkout - per-user plans.
 *   free  -> can upgrade to Pro (mock PromptPay QR checkout)
 *   pro   -> can cancel (back to Free immediately)
 *   admin -> can't subscribe; manages users from the Admin dashboard
 * Visitors who aren't signed in can see the plans and are sent to /login to upgrade.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const DEFAULT_PRO_PRICE = 99;

function Check({ color }) {
  return <span className={`font-bold ${color}`}>✓</span>;
}

export default function Pricing() {
  const [status, setStatus] = useState(null); // {email, role, plan, is_admin, pro_price}
  const [signedIn, setSignedIn] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function loadStatus() {
    if (!getToken()) {
      setSignedIn(false);
      setStatus(null);
      return;
    }
    setSignedIn(true);
    try {
      const res = await authFetch('/api/billing/status');
      setStatus(res.ok ? await res.json() : null);
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const price = status?.pro_price ?? DEFAULT_PRO_PRICE;
  const isAdmin = !!status?.is_admin;
  const plan = status?.plan; // 'free' | 'pro' | null (admin)

  async function startCheckout() {
    if (!signedIn) {
      window.location.href = '/login';
      return;
    }
    setMessage(null);
    setPaid(false);
    setLoading(true);
    try {
      const res = await authFetch('/api/billing/checkout', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ plan: 'pro' }),
      });
      const data = await res.json().catch(() => ({}));
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
    setVerifying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await authFetch('/api/billing/webhook', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ reference: checkout.reference }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Payment confirmation failed.');
      setPaid(true);
      setMessage({ type: 'success', text: 'Payment confirmed! Your account is now on Pro.' });
      await loadStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }

  async function cancelSubscription() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await authFetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not cancel the subscription.');
      setMessage({ type: 'success', text: 'Your Pro subscription has been cancelled. You are now on Free.' });
      setConfirmCancel(false);
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

  /* ---------------------------------------------------------- buttons */

  let freeButton;
  let proButton;
  if (isAdmin) {
    freeButton = proButton = (
      <button disabled className="w-full py-3 border border-gray-200 text-gray-500 font-semibold rounded-xl bg-white text-sm cursor-default">
        Not available for admin accounts
      </button>
    );
  } else if (plan === 'pro') {
    freeButton = (
      <button disabled className="w-full py-3 border border-gray-200 text-gray-500 font-semibold rounded-xl bg-white text-sm cursor-default">
        Included in Pro
      </button>
    );
    proButton = confirmCancel ? (
      <div className="space-y-2">
        <p className="text-xs text-gray-600 text-center">Cancel Pro? You'll move to Free right away.</p>
        <div className="flex gap-2">
          <button
            onClick={cancelSubscription}
            disabled={loading}
            className="flex-1 py-3 bg-[#D9534F] hover:bg-[#c64541] disabled:opacity-60 text-white font-semibold rounded-xl text-sm"
          >
            {loading ? 'Cancelling...' : 'Yes, cancel'}
          </button>
          <button
            onClick={() => setConfirmCancel(false)}
            disabled={loading}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Keep Pro
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        <button disabled className="w-full py-3 bg-[#E57338] text-white font-semibold rounded-xl text-sm opacity-70 cursor-default">
          Current Plan
        </button>
        <button
          onClick={() => setConfirmCancel(true)}
          className="w-full py-2 text-sm text-gray-500 hover:text-[#D9534F] transition"
        >
          Cancel subscription
        </button>
      </div>
    );
  } else {
    freeButton = (
      <button disabled className="w-full py-3 border border-gray-200 text-gray-800 font-semibold rounded-xl bg-white text-sm opacity-70 cursor-default">
        {signedIn ? 'Current Plan' : 'Free forever'}
      </button>
    );
    proButton = (
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full py-3.5 bg-[#E57338] hover:bg-[#d66126] disabled:opacity-60 text-white font-semibold rounded-xl transition duration-150 shadow-sm text-sm"
      >
        {!signedIn ? 'Log in to upgrade' : loading ? 'Please wait...' : 'Upgrade to Pro'}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col">
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
            Find your things faster
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Free for every KMITL student. Upgrade to Pro for smart match suggestions.
          </p>
          {status && (
            <p className="text-xs text-gray-500 mt-3">
              {status.email} · {isAdmin ? (
                <span className="font-semibold">admin account</span>
              ) : (
                <>current plan: <span className="font-semibold capitalize">{plan}</span></>
              )}
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl px-4 py-3 text-sm bg-orange-50 text-gray-700 border border-orange-200">
            Admin accounts don't subscribe. To grant or remove Pro, or deactivate accounts, use{' '}
            <Link href="/admin" className="font-semibold text-[#E57338] hover:underline">
              User management in the Admin dashboard
            </Link>
            .
          </div>
        )}

        {message && !showQrModal && (
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
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Free</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">For every student and staff member</p>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">฿0</div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2"><Check color="text-[#48A868]" /> Report lost and found items</li>
                <li className="flex items-center gap-2"><Check color="text-[#48A868]" /> Search and filter the campus log</li>
                <li className="flex items-center gap-2"><Check color="text-[#48A868]" /> Track your own reports</li>
              </ul>
            </div>
            {freeButton}
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-[#E57338] shadow-sm relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 bg-[#E57338] text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Recommended
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pro</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">For people who want their item back fast</p>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                ฿{price}<span className="text-sm font-medium text-gray-500"> / month</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2"><Check color="text-[#E57338]" /> Everything in Free</li>
                <li className="flex items-center gap-2"><Check color="text-[#E57338]" /> Smart match suggestions with confidence scores</li>
                <li className="flex items-center gap-2"><Check color="text-[#E57338]" /> Cancel anytime</li>
              </ul>
            </div>
            {proButton}
          </div>
        </div>
      </main>

      {showQrModal && checkout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xs sm:max-w-sm text-center shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Scan to Pay</h3>
            <p className="text-xs text-gray-500 mt-1">Mock PromptPay QR Checkout (demo only)</p>

            <div className="mx-auto my-5 flex flex-col items-center">
              <div className={`p-3 bg-white border border-gray-200 rounded-xl ${paid ? 'opacity-40' : ''}`}>
                <QRCodeSVG value={checkout.qr_payload} size={160} />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 break-all">Ref: {checkout.reference}</p>
            </div>

            <p className="text-sm font-semibold text-gray-900">
              ฿{Number(checkout.amount).toLocaleString()} / month
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {paid
                ? 'Payment confirmed.'
                : verifying
                ? 'Verifying payment with webhook...'
                : 'Waiting for payment confirmation...'}
            </p>

            {message && (
              <p className={`text-xs mt-3 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {message.text}
              </p>
            )}

            {!paid && (
              <button
                onClick={confirmPayment}
                disabled={loading}
                className="mt-5 w-full py-2.5 bg-[#E57338] hover:bg-[#d66126] disabled:opacity-60 text-white rounded-xl text-xs font-semibold"
              >
                {verifying ? 'Confirming...' : "I've paid (simulate scan)"}
              </button>
            )}
            <button
              onClick={closeModal}
              disabled={verifying}
              className="mt-3 w-full py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {paid ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
