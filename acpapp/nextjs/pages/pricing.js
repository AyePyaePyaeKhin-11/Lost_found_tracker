import React, { useState } from 'react';
import Link from 'next/link';

export default function Pricing() {
  const [showQrModal, setShowQrModal] = useState(false);

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

      {/* Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Plans for Every Department
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Choose a plan to manage campus lost and found operations with institutional verification.
          </p>
        </div>

        {/* Responsive Cards Grid */}
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
            <button className="w-full py-3 border border-gray-200 text-gray-800 font-semibold rounded-xl bg-white hover:bg-gray-50 transition text-sm">
              Current Plan
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
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">Custom</div>
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
              onClick={() => setShowQrModal(true)}
              className="w-full py-3.5 bg-[#E57338] hover:bg-[#d66126] text-white font-semibold rounded-xl transition duration-150 shadow-sm text-sm"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </main>

      {/* PromptPay Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xs sm:max-w-sm text-center shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Scan to Pay</h3>
            <p className="text-xs text-gray-500 mt-1">PromptPay QR Code Checkout</p>
            <div className="w-40 h-40 bg-[#F1F3F5] rounded-xl mx-auto my-5 flex items-center justify-center text-xs text-gray-400 font-medium">
              [QR Code]
            </div>
            <p className="text-xs text-gray-400">Waiting for webhook confirmation...</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}