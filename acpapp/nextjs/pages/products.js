import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authFetch, getToken, logout } from '../lib/api';
import AddItemModal from '../components/AddItemModal';
import ItemDetailsModal from '../components/ItemDetailsModal';

const TYPE_BADGE = {
  found: 'bg-[#EAF5ED] text-[#48A868]',
  lost: 'bg-[#FDF2F2] text-[#D9534F]',
};

// Threshold for filtering low score matches
const MIN_MATCH_SCORE = 50;

const cleanText = (text = '') => text.replace(/[^\w\s-]/gi, '').trim();

export default function Products() {
  const router = useRouter();
  const [view, setView] = useState('items'); // 'items' | 'matches'
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState('lost'); // type pre-selected in the report form

  // --- States for Details Modal ---
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // --- Controls for Sorting & Filtering ---
  const [filterType, setFilterType] = useState('all'); // 'all' | 'lost' | 'found'
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'date' | 'location' | 'category'
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchItems = async (searchQuery = '') => {
    setLoading(true);
    setError('');
    try {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const res = await authFetch(`/api/search/match?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Search failed');
        setItems(data.results || []);
      } else {
        setIsSearching(false);
        const res = await authFetch('/api/items?item_status=open');
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to load items');
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/items/grouped');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to load matches');
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError(err.message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Links from the home page: /products?type=lost|found filters the list,
  // /products?report=lost|found opens the report form with that type chosen.
  useEffect(() => {
    if (!router.isReady) return;
    const { type, report } = router.query;
    if (type === 'lost' || type === 'found') setFilterType(type);
    if (report === 'lost' || report === 'found') {
      setReportType(report);
      setIsModalOpen(true);
    }
  }, [router.isReady, router.query]);

  const switchView = (next) => {
    setView(next);
    if (next === 'matches') fetchGroups();
    else fetchItems(query);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems(query);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleOpenDetails = (item) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  // --- Dynamic Option lists for filters ---
  const availableLocations = useMemo(() => {
    const locs = new Set();
    if (view === 'items') {
      items.forEach((i) => i.location && locs.add(cleanText(i.location)));
    } else {
      groups.forEach((g) => {
        if (g.target_item?.location) locs.add(cleanText(g.target_item.location));
      });
    }
    return Array.from(locs).filter(Boolean).sort();
  }, [items, groups, view]);

  const availableCategories = useMemo(() => {
    const cats = new Set();
    if (view === 'items') {
      items.forEach((i) => i.category && cats.add(i.category.trim()));
    } else {
      groups.forEach((g) => {
        if (g.target_item?.category) cats.add(g.target_item.category.trim());
      });
    }
    return Array.from(cats).filter(Boolean).sort();
  }, [items, groups, view]);

  // --- Filtered and Sorted Items / Groups ---
  const processedItems = useMemo(() => {
    let result = [...items];

    // 1. Filter Type (Lost / Found)
    if (filterType !== 'all') {
      result = result.filter((item) => (item.type || '').toLowerCase() === filterType);
    }
    // 2. Filter Location
    if (filterLocation !== 'all') {
      result = result.filter((item) => cleanText(item.location) === filterLocation);
    }
    // 3. Filter Category
    if (filterCategory !== 'all') {
      result = result.filter((item) => (item.category || '').trim() === filterCategory);
    }

    // Sort
    return result.sort((a, b) => {
      if (sortBy === 'score' && isSearching) {
        return (b.match_score || 0) - (a.match_score || 0);
      }
      if (sortBy === 'location') {
        return cleanText(a.location).localeCompare(cleanText(b.location));
      }
      if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '');
      }
      return new Date(b.date_reported || b.created_at || 0) - new Date(a.date_reported || a.created_at || 0);
    });
  }, [items, filterType, filterLocation, filterCategory, sortBy, isSearching]);

  const processedGroups = useMemo(() => {
    return groups
      .map((group) => {
        const validCandidates = (group.matched_candidates || []).filter(
          (c) => (c.match_score || 0) >= MIN_MATCH_SCORE
        );

        const sortedCandidates = [...validCandidates].sort((a, b) => {
          if (sortBy === 'location') return cleanText(a.location).localeCompare(cleanText(b.location));
          if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
          return (b.match_score || 0) - (a.match_score || 0);
        });

        return { ...group, matched_candidates: sortedCandidates };
      })
      .filter((group) => {
        if (filterLocation !== 'all' && cleanText(group.target_item?.location) !== filterLocation) {
          return false;
        }
        if (filterCategory !== 'all' && (group.target_item?.category || '').trim() !== filterCategory) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const targetA = a.target_item || {};
        const targetB = b.target_item || {};
        if (sortBy === 'location') return cleanText(targetA.location).localeCompare(cleanText(targetB.location));
        if (sortBy === 'category') return (targetA.category || '').localeCompare(targetB.category || '');
        return new Date(targetB.date_reported || 0) - new Date(targetA.date_reported || 0);
      });
  }, [groups, MIN_MATCH_SCORE, sortBy, filterLocation, filterCategory]);

  const tabClass = (active) =>
    `px-4 py-2 text-xs font-bold rounded-xl transition ${
      active ? 'bg-[#E57338] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-gray-900">← Back to Home</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#E57338]">Products & Items Directory</span>
            <Link
              href="/profile"
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#E57338] text-[#E57338] hover:bg-[#E57338]/10"
            >
              My Profile
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* View switch */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => switchView('items')} className={tabClass(view === 'items')}>
            All items
          </button>
          <button onClick={() => switchView('matches')} className={tabClass(view === 'matches')}>
            Possible matches
          </button>
        </div>

        {/* Search bar */}
        {view === 'items' && (
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center"
          >
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
              <button
                type="submit"
                className="flex-1 md:flex-initial px-6 py-2 bg-[#E57338] text-white text-xs font-bold rounded-xl hover:opacity-90"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        )}

        {/* --- Sort & Filter Toolbar --- */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-wrap gap-4 justify-between items-center text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-gray-500">Filter By:</span>

            {/* Item Type Filter (Lost / Found) */}
            {view === 'items' && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none font-bold text-gray-800"
              >
                <option value="all">All Types (Lost & Found)</option>
                <option value="lost">Lost Items Only</option>
                <option value="found">Found Items Only</option>
              </select>
            )}

            {/* Location Filter Dropdown */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none font-medium"
            >
              <option value="all">All Locations</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Category Filter Dropdown */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none font-medium"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none font-bold text-[#E57338]"
            >
              <option value="score">Match Score (Highest)</option>
              <option value="date">Date (Newest)</option>
              <option value="location">Location (A-Z)</option>
              <option value="category">Category (A-Z)</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-700">{error}</div>
        )}

        {/* ---------- All items / search results ---------- */}
        {view === 'items' && (
          loading ? (
            <div className="text-center py-12 text-gray-400">Loading items...</div>
          ) : processedItems.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
              <p className="text-gray-400">No items found matching selected filters.</p>
              <button
                onClick={() => { setReportType('lost'); setIsModalOpen(true); }}
                className="px-4 py-2 bg-[#E57338] text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-sm"
              >
                Didn't see your item? Add here!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedItems.map((item) => {
                const formattedDate = item.date_reported
                  ? new Date(item.date_reported).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : 'N/A';

                return (
                  <div
                    key={item.item_id || item.id}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[11rem]"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-bold text-gray-900 text-base line-clamp-1">
                          {item.name || item.title}
                        </h3>
                        <div className="flex gap-1 shrink-0">
                          {isSearching && item.match_score !== undefined && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
                              {Math.round(item.match_score)}% Match
                            </span>
                          )}
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${TYPE_BADGE[item.type] || TYPE_BADGE.lost}`}>
                            {item.type || item.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        {cleanText(item.location) || 'Unknown Location'} • <span className="font-medium text-gray-500">{item.category}</span>
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-3 mt-4">
                      <span>Date: {formattedDate}</span>
                      <button
                        onClick={() => handleOpenDetails(item)}
                        className="text-[#E57338] font-bold hover:underline"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ---------- Possible matches ---------- */}
        {view === 'matches' && (
          loading ? (
            <div className="text-center py-12 text-gray-400">Finding matches...</div>
          ) : processedGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No matching lost items found with the selected filter.</div>
          ) : (
            <div className="space-y-6">
              {processedGroups.map((group) => (
                <div
                  key={group.target_item.item_id}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Lost item</p>
                      <h3 className="font-bold text-gray-900 text-base">{group.target_item.name}</h3>
                      <p className="text-xs text-gray-400">
                        {cleanText(group.target_item.location)} • <span className="font-medium text-gray-500">{group.target_item.category}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDetails(group.target_item)}
                        className="text-xs text-[#E57338] font-bold hover:underline"
                      >
                        View Details →
                      </button>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${TYPE_BADGE.lost}`}>Lost</span>
                    </div>
                  </div>

                  {group.matched_candidates.length === 0 ? (
                    <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                      No likely found items yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100 border-t border-gray-100">
                      {group.matched_candidates.map((candidate) => (
                        <li
                          key={candidate.item_id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{candidate.name}</p>
                            <p className="text-xs text-gray-400">{cleanText(candidate.location)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
                              {Math.round(candidate.match_score)}% Match
                            </span>
                            <button
                              onClick={() => handleOpenDetails(candidate)}
                              className="text-xs text-[#E57338] font-bold hover:underline"
                            >
                              View Details →
                            </button>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${TYPE_BADGE.found}`}>Found</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-200 text-center flex flex-col items-center gap-2 mt-8">
                <p className="text-xs font-semibold text-gray-500">
                  Didn't see your item in the matches above?
                </p>
                <button
                  onClick={() => { setReportType('lost'); setIsModalOpen(true); }}
                  className="px-5 py-2.5 bg-[#E57338] text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-sm"
                >
                  + Add Here!
                </button>
              </div>
            </div>
          )
        )}
      </main>

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onItemAdded={() => {
          if (view === 'matches') fetchGroups();
          else fetchItems(query);
        }}
        initialType={reportType}
      />

      <ItemDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        item={selectedItem}
      />
    </div>
  );
}