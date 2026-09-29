import React from 'react';
import Link from 'next/link';

export default function Products() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-gray-900">← Back to Home</Link>
          <span className="text-sm font-semibold text-[#E57338]">Products & Items Directory</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <input 
            type="text" 
            placeholder="Search lost or found items..." 
            className="w-full md:w-96 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E57338]"
          />
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-initial px-4 py-2 bg-gray-100 text-xs font-bold rounded-xl text-gray-700">All Statuses</button>
            <button className="flex-1 md:flex-initial px-4 py-2 bg-[#E57338] text-white text-xs font-bold rounded-xl">Filter</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Anker 20000mAh Power Bank', location: 'Main Library', date: '20 Sep', status: 'Found', color: 'bg-[#EAF5ED] text-[#48A868]' },
            { title: 'Student ID Card (KMITL)', location: 'Engineering Building', date: '18 Sep', status: 'Found', color: 'bg-[#EAF5ED] text-[#48A868]' },
            { title: 'Wired USB-C Earphones', location: 'Main Gate', date: '19 Sep', status: 'Lost', color: 'bg-[#FDF2F2] text-[#D9534F]' },
            { title: 'Blue Folding Umbrella', location: 'Student Cafeteria', date: '17 Sep', status: 'Lost', color: 'bg-[#FDF2F2] text-[#D9534F]' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between h-44">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.color}`}>{item.status}</span>
                </div>
                <p className="text-xs text-gray-400">{item.location}</p>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-3">
                <span>Date: {item.date}</span>
                <button className="text-[#E57338] font-bold">View Details →</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}