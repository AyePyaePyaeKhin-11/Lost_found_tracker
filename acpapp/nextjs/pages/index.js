import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Interactive Draggable Map State ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col select-none">
      {/* Universal Header / Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#E57338] rounded-xl flex-shrink-0"></div>
            <span className="text-base sm:text-xl font-bold tracking-tight text-gray-900">
              Lost & Found Tracker
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-600">
            <Link href="/" className="text-[#E57338] transition">Home</Link>
            <Link href="/products" className="hover:text-[#E57338] transition">Products & Search</Link>
            <Link href="/pricing" className="hover:text-[#E57338] transition">Pricing Plans</Link>
            <Link href="/admin" className="hover:text-[#E57338] transition">Admin Analytics</Link>
          </nav>

          <div className="flex items-center space-x-3">
            <Link 
              href="/login" 
              className="px-4 py-2 bg-[#E57338] hover:bg-[#d66126] text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm"
            >
              KMITL Login
            </Link>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2 text-xl text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2 font-semibold text-sm">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block p-2 rounded-lg bg-[#E57338]/10 text-[#E57338]">Home</Link>
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="block p-2 rounded-lg text-gray-700 hover:bg-gray-50">Products & Search</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block p-2 rounded-lg text-gray-700 hover:bg-gray-50">Pricing Plans</Link>
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block p-2 rounded-lg text-gray-700 hover:bg-gray-50">Admin Analytics</Link>
          </div>
        )}
      </header>

      {/* Main Container */}
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

        {/* Top Grid Section: Stats & Interactive Map */}
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

          {/* Interactive Pan/Drag Map Container */}
          <div className="md:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campus Map</h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">🖐 Click & Drag to Move</span>
              </div>
              <Link href="/admin" className="text-xs text-[#E57338] font-bold hover:underline">
                Full Analytics →
              </Link>
            </div>

            {/* Draggable Viewport Area */}
            <div 
              className={`h-64 sm:h-80 bg-[#e8ece9] rounded-xl relative overflow-hidden border border-slate-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Transform Container */}
              <div 
                className="absolute w-[1200px] h-[700px] transition-transform duration-75 ease-out"
                style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
              >
                <svg className="w-full h-full" viewBox="0 0 1200 700">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d5ded8" strokeWidth="0.8" />
                    </pattern>
                  </defs>

                  {/* Ground Layer */}
                  <rect width="100%" height="100%" fill="#e8ece9" />
                  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6" />

                  {/* 🌿 Campus Parks */}
                  <path d="M 100,60 Q 300,30 450,140 T 200,380 Z" fill="#c3e6cb" opacity="0.85" />
                  <path d="M 750,50 C 950,20 1100,150 1050,320 C 980,450 850,380 780,200 Z" fill="#bce2c7" opacity="0.85" />

                  {/* 💧 Blue Canal & Lakes */}
                  <path d="M -50,300 Q 350,260 550,380 T 1250,320" fill="none" stroke="#7ac1eb" strokeWidth="28" strokeLinecap="round" opacity="0.75" />
                  <path d="M -50,300 Q 350,260 550,380 T 1250,320" fill="none" stroke="#b3e0ff" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
                  <ellipse cx="900" cy="180" rx="90" ry="50" fill="#9bd2f6" opacity="0.85" />

                  {/* 🛣️ Roads */}
                  <path d="M 200,-20 L 200,720" stroke="#ffffff" strokeWidth="22" />
                  <path d="M 200,-20 L 200,720" stroke="#f0c27b" strokeWidth="8" opacity="0.8" />

                  <path d="M -20,200 L 1220,200" stroke="#ffffff" strokeWidth="24" />
                  <path d="M -20,200 L 1220,200" stroke="#f0c27b" strokeWidth="10" opacity="0.8" />

                  <path d="M 700,-20 L 700,720" stroke="#ffffff" strokeWidth="20" />

                  {/* 🏢 Buildings */}
                  <rect x="260" y="80" width="160" height="90" rx="10" fill="#d0d7de" stroke="#b0b9c2" strokeWidth="2" />
                  <text x="340" y="132" fill="#475569" fontSize="13" fontWeight="700" textAnchor="middle">ECC / E12 Building</text>

                  <rect x="450" y="240" width="180" height="100" rx="10" fill="#d0d7de" stroke="#b0b9c2" strokeWidth="2" />
                  <text x="540" y="297" fill="#475569" fontSize="13" fontWeight="700" textAnchor="middle">Central Library</text>

                  <rect x="780" y="400" width="170" height="110" rx="10" fill="#d0d7de" stroke="#b0b9c2" strokeWidth="2" />
                  <text x="865" y="460" fill="#475569" fontSize="13" fontWeight="700" textAnchor="middle">HM Building</text>
                </svg>

                {/* 📍 Pins inside transform container */}
                <div className="absolute top-[18%] left-[28%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                  <span className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping" />
                  <div className="relative bg-[#D9534F] text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div className="absolute top-[41%] left-[45%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                  <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
                  <div className="relative bg-[#48A868] text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div className="absolute top-[65%] left-[72%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                  <span className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping" />
                  <div className="relative bg-[#D9534F] text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Reset Map Position Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); setPosition({ x: 0, y: 0 }); }}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm text-slate-700 transition"
              >
                🎯 Center Map
              </button>

              {/* Map Legend */}
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 flex items-center gap-3 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9534F]" /> Lost
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#48A868]" /> Found
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Activity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#EAF5ED] text-[#48A868] font-bold">Found</span>
              </Link>
              <Link href="/products" className="py-2.5 sm:py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Student ID Card (KMITL)</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">Engineering Building · 18 Sep</p>
                </div>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#EAF5ED] text-[#48A868] font-bold">Found</span>
              </Link>
            </div>
          </div>

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
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FDF2F2] text-[#D9534F] font-bold">Lost</span>
              </Link>
              <Link href="/products" className="py-2.5 sm:py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Blue Folding Umbrella</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">Student Cafeteria · 17 Sep</p>
                </div>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FDF2F2] text-[#D9534F] font-bold">Lost</span>
              </Link>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}