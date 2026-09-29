import React from 'react';
import Link from 'next/link';

export default function AdminAnalytics() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-sm sm:text-base text-gray-900 hover:text-[#E57338] transition">
            ← Back to Home
          </Link>
          <span className="text-xs sm:text-sm font-semibold text-[#E57338]">Admin Analytics</span>
        </div>
      </header>

      {/* Responsive Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Campus operational performance & recovery metrics</p>
        </div>

        {/* 4-Column Stat Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">Recovery Rate</span>
            <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-1">47.6%</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">Avg. Match Time</span>
            <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-1">2.3 Days</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">MRR</span>
            <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-1">฿48,200</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">Active Users</span>
            <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-1">1,284</p>
          </div>
        </div>

        {/* Charts & Graphs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
              Items by Category
            </h3>
            <div className="flex items-end gap-4 h-48 pt-4 border-b border-gray-100 pb-2">
              <div className="flex-1 bg-[#E57338] rounded-t-md h-full relative group flex items-end justify-center">
                <span className="absolute -bottom-6 text-xs text-gray-500 font-medium">Electronics</span>
              </div>
              <div className="flex-1 bg-[#E57338] rounded-t-md h-[65%] relative group flex items-end justify-center">
                <span className="absolute -bottom-6 text-xs text-gray-500 font-medium">Bags</span>
              </div>
              <div className="flex-1 bg-[#E57338] rounded-t-md h-[45%] relative group flex items-end justify-center">
                <span className="absolute -bottom-6 text-xs text-gray-500 font-medium">Documents</span>
              </div>
              <div className="flex-1 bg-[#E57338] rounded-t-md h-[30%] relative group flex items-end justify-center">
                <span className="absolute -bottom-6 text-xs text-gray-500 font-medium">Apparel</span>
              </div>
            </div>
          </div>

          {/* Location Progress Bars */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Lost / Found Activity by Location
            </h3>
            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <div className="flex justify-between font-medium text-gray-700 mb-1.5">
                  <span>Main Library</span>
                  <span className="text-gray-400">75%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D9534F] w-[75%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-medium text-gray-700 mb-1.5">
                  <span>Student Cafeteria</span>
                  <span className="text-gray-400">50%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#48A868] w-[50%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-medium text-gray-700 mb-1.5">
                  <span>Engineering Building</span>
                  <span className="text-gray-400">35%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#48A868] w-[35%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}