import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { authFetch } from '../lib/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function Pricing() {
  const [showQrModal, setShowQrModal] = useState(false);
  const [status, setStatus] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);

  async function loadStatus() {
    try {
      const res = await authFetch('/api/billing/status');
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
      const res = await authFetch('/api/billing/checkout', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ plan: 'enterprise' }),
      });
      const data = await res.json().catch(() => ({}));
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
      setMessage({ type: 'success', text: 'Payment confirmed! Your organization is now on Enterprise.' });
      await loadStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setVerifying(false);
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

          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-[#E57338] shadow-sm relative flex flex-col justify-between">
            <span className="absolute -top-3 left-6 bg-[#E57338] text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Recommended
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Enterprise</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Multi-campus universities</p>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                ฿4,800<span className="text-sm font-medium text-gray-500"> / month</span>
              </div>
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
              ฿{Number(checkout.amount).toLocaleString()}
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