import React, { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col">
      {/* Universal Header / Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#E57338] rounded-xl flex-shrink-0"></div>
            <span className="text-base sm:text-xl font-bold tracking-tight text-gray-900">
              Lost & Found Tracker
            </span>
          </Link>

          {/* Desktop Navigation Links (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-600">
            <Link href="/" className="text-[#E57338] transition">Home</Link>
            <Link href="/products" className="hover:text-[#E57338] transition">Products & Search</Link>
            <Link href="/pricing" className="hover:text-[#E57338] transition">Pricing Plans</Link>
            <Link href="/admin" className="hover:text-[#E57338] transition">Admin Analytics</Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            <Link 
              href="/login" 
              className="px-4 py-2 bg-[#E57338] hover:bg-[#d66126] text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm"
            >
              KMITL Login
            </Link>

            {/* Mobile Menu Hamburger Button (Hidden on Desktop) */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2 text-xl text-gray-700 hover:bg-gray-100 rounded-lg transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2 font-semibold text-sm">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block p-2 rounded-lg bg-[#E57338]/10 text-[#E57338]"
            >
              Home
            </Link>
            <Link 
              href="/products" 
              onClick={() => setMobileMenuOpen(false)}
              className="block p-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Products & Search
            </Link>
            <Link 
              href="/pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="block p-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Pricing Plans
            </Link>
            <Link 
              href="/admin" 
              onClick={() => setMobileMenuOpen(false)}
              className="block p-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Admin Analytics
            </Link>
          </div>
        )}
      </header>

      {/* Responsive Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-[#E57338] to-[#f39c12] text-white rounded-2xl p-5 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-1 sm:mb-2">
              Campus Lost & Found Portal
            </h2>
            <p className="text-white/90 text-xs sm:text-sm md:text-base max-w-xl">
              Report lost items, track real-time locations, and view matching records instantly across departments.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-3 pt-2 md:pt-0">
            <Link 
              href="/products" 
              className="flex-1 md:flex-initial text-center px-4 sm:px-6 py-3 bg-white text-[#D9534F] font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:bg-gray-50 transition"
            >
              Report Lost
            </Link>
            <Link 
              href="/products" 
              className="flex-1 md:flex-initial text-center px-4 sm:px-6 py-3 bg-white text-[#48A868] font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:bg-gray-50 transition"
            >
              Report Found
            </Link>
          </div>
        </div>

        {/* Top Grid Section: Stats & Heatmap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Stats Overview */}
          <div className="md:col-span-1 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overview Stats</h3>
            <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5 sm:gap-4">
              
              <Link href="/admin" className="block bg-white p-3 sm:p-5 rounded-2xl border-t-4 md:border-t-0 md:border-l-4 border-[#D9534F] border-x border-b border-gray-100 shadow-sm hover:shadow transition">
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Lost</span>
                <p className="text-lg sm:text-2xl md:text-3xl font-extrabold text-gray-900 mt-0.5 sm:mt-1">128</p>
              </Link>

              <Link href="/admin" className="block bg-white p-3 sm:p-5 rounded-2xl border-t-4 md:border-t-0 md:border-l-4 border-[#48A868] border-x border-b border-gray-100 shadow-sm hover:shadow transition">
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Found</span>
                <p className="text-lg sm:text-2xl md:text-3xl font-extrabold text-gray-900 mt-0.5 sm:mt-1">94</p>
              </Link>

              <Link href="/admin" className="block bg-white p-3 sm:p-5 rounded-2xl border-t-4 md:border-t-0 md:border-l-4 border-[#E57338] border-x border-b border-gray-100 shadow-sm hover:shadow transition">
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Recovered</span>
                <p className="text-lg sm:text-2xl md:text-3xl font-extrabold text-gray-900 mt-0.5 sm:mt-1">61</p>
              </Link>

            </div>
          </div>

          {/* Interactive Map Section */}
          <div className="md:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campus Map</h3>
              <Link href="/admin" className="text-xs text-[#E57338] font-bold hover:underline">
                Full Analytics →
              </Link>
            </div>
            <div className="h-44 sm:h-64 bg-[#F1F3F5] rounded-xl relative overflow-hidden flex items-center justify-center">
              <span className="text-xs text-gray-400 font-medium z-0">Interactive Location Heatmap</span>
              <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-[#D9534F] rounded-full animate-ping"></div>
              <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-[#D9534F] rounded-full"></div>
              <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-[#D9534F] rounded-full"></div>
              <div className="absolute bottom-1/4 left-1/2 w-3 h-3 bg-[#48A868] rounded-full"></div>
            </div>
          </div>

        </div>

        {/* Bottom Activity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Recently Found Column */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Recently Found</h3>
              <Link href="/products" className="text-xs text-[#E57338] font-bold hover:underline">See all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              <Link href="/products" className="py-2.5 sm:py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Anker 20000mAh Power Bank</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">Main Library · 20 Sep</p>
                </div>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#EAF5ED] text-[#48A868] font-bold">
                  Found
                </span>
              </Link>
              <Link href="/products" className="py-2.5 sm:py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Student ID Card (KMITL)</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">Engineering Building · 18 Sep</p>
                </div>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#EAF5ED] text-[#48A868] font-bold">
                  Found
                </span>
              </Link>
            </div>
          </div>

          {/* Recently Lost Column */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Recently Lost</h3>
              <Link href="/products" className="text-xs text-[#E57338] font-bold hover:underline">See all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              <Link href="/products" className="py-2.5 sm:py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Wired USB-C Earphones</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">Main Gate · 19 Sep</p>
                </div>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FDF2F2] text-[#D9534F] font-bold">
                  Lost
                </span>
              </Link>
              <Link href="/products" className="py-2.5 sm:py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Blue Folding Umbrella</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">Student Cafeteria · 17 Sep</p>
                </div>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FDF2F2] text-[#D9534F] font-bold">
                  Lost
                </span>
              </Link>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}