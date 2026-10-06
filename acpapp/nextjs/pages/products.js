import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Products() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // ดึงข้อมูลเริ่มต้นทั้งหมด (หรือดึงผ่าน match API เมื่อมีการค้นหา)
  const fetchItems = async (searchQuery = '') => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const res = await fetch(`/api/search/match?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setItems(data.results || []);
      } else {
        setIsSearching(false);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${backendUrl}/api/items`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems(query);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-gray-900">← Back to Home</Link>
          <span className="text-sm font-semibold text-[#E57338]">Products & Items Directory</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSearchSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lost or found items..." 
            className="w-full md:w-96 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E57338]"
          />
          <div className="flex gap-2 w-full md:w-auto">
            {query && (
              <button 
                type="button" 
                onClick={() => { setQuery(''); fetchItems(''); }}
                className="px-4 py-2 bg-gray-100 text-xs font-bold rounded-xl text-gray-600 hover:bg-gray-200"
              >
                Clear
              </button>
            )}
            <button type="submit" className="flex-1 md:flex-initial px-6 py-2 bg-[#E57338] text-white text-xs font-bold rounded-xl hover:opacity-90">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No items found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const isFound = item.type === 'found';
              const statusBg = isFound ? 'bg-[#EAF5ED] text-[#48A868]' : 'bg-[#FDF2F2] text-[#D9534F]';
              const formattedDate = item.date_reported 
                ? new Date(item.date_reported).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'N/A';

              return (
                <div key={item.item_id || item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[11rem]">
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-bold text-gray-900 text-base line-clamp-1">{item.name || item.title}</h3>
                      <div className="flex gap-1 shrink-0">
                        {isSearching && item.match_score !== undefined && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
                            {Math.round(item.match_score)}% Match
                          </span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${statusBg}`}>
                          {item.type || item.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{item.location || 'Unknown Location'}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-3 mt-4">
                    <span>Date: {formattedDate}</span>
                    <button className="text-[#E57338] font-bold">View Details →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}