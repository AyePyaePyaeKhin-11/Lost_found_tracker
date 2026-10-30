import React, { useEffect, useState } from 'react';
import { authFetch } from '../lib/api';

function readSession() {
  try {
    return { email: localStorage.getItem('email') || '', role: localStorage.getItem('role') || '' };
  } catch {
    return { email: '', role: '' };
  }
}

/**
 * Item details popup.
 * The reporter of an item (or an admin) also gets two actions:
 *   - Mark as returned -> PATCH  /api/items/{id}/claim   (status: open -> claimed)
 *   - Delete report    -> DELETE /api/items/{id}         (status: open -> archived, soft delete)
 * The backend checks the same permission, the buttons are only hidden for other users.
 */
export default function ItemDetailsModal({ isOpen, onClose, item, onChanged }) {
  const [session, setSession] = useState({ email: '', role: '' });
  const [confirming, setConfirming] = useState(null); // null | 'claim' | 'delete'
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setSession(readSession());
  }, []);

  // Reset the action area whenever another item is opened
  useEffect(() => {
    setConfirming(null);
    setActionError('');
    setBusy(false);
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const isOwner = session.email && item.reported_by && session.email.toLowerCase() === item.reported_by.toLowerCase();
  const canManage = item.item_id && item.status === 'open' && (isOwner || session.role === 'admin');
  const claimLabel = item.type === 'found' ? 'Mark as returned to owner' : 'Mark as found';

  async function runAction(kind) {
    setBusy(true);
    setActionError('');
    try {
      const url = kind === 'claim' ? `/api/items/${item.item_id}/claim` : `/api/items/${item.item_id}`;
      const res = await authFetch(url, { method: kind === 'claim' ? 'PATCH' : 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Something went wrong. Please try again.');
      if (onChanged) onChanged(kind === 'claim' ? 'Item marked as returned. It is no longer listed.' : 'Report deleted.');
      onClose();
    } catch (err) {
      setActionError(err.message);
      setBusy(false);
    }
  }

  const formattedDate = item.date_reported
    ? new Date(item.date_reported).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm"
        >
          ✕
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
              item.type === 'found'
                ? 'bg-[#EAF5ED] text-[#48A868]'
                : 'bg-[#FDF2F2] text-[#D9534F]'
            }`}
          >
            {item.type || 'Item'}
          </span>
          <span className="text-xs text-gray-400 font-medium">{formattedDate}</span>
        </div>

        {/* Item Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">{item.name || item.title}</h2>

        {/* Photo Section */}
        <div className="mb-5 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center h-48">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/400x200?text=No+Image+Available';
              }}
            />
          ) : (
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 022-2V6a2 2 0 02-2-2H6a2 2 0 02-2 2v12a2 2 0 022 2z" />
              </svg>
              <p className="text-xs">No image provided</p>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4 bg-gray-50 p-3.5 rounded-xl">
          <div>
            <p className="text-gray-400 font-medium">Category</p>
            <p className="font-semibold text-gray-800">{item.category || '-'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium">Location</p>
            <p className="font-semibold text-gray-800">{item.location || '-'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium">Colour</p>
            <p className="font-semibold text-gray-800">{item.colour || '-'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium">Brand</p>
            <p className="font-semibold text-gray-800">{item.brand || '-'}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-400 mb-1">Description</p>
          <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl min-h-[3rem]">
            {item.description || 'No detailed description provided.'}
          </p>
        </div>

        {/* Contact info */}
        <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
          <span className="text-gray-400">Contact Person:</span>
          <span className="font-bold text-[#E57338]">{item.contact || item.reported_by || 'N/A'}</span>
        </div>

        {/* Owner / admin actions */}
        {canManage && (
          <div className="border-t border-gray-100 mt-3 pt-3">
            {confirming ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 text-center">
                  {confirming === 'claim'
                    ? 'Mark this item as returned? It will be removed from the list.'
                    : 'Delete this report? It will be removed from the list.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => runAction(confirming)}
                    disabled={busy}
                    className={`flex-1 text-xs font-semibold text-white rounded-lg py-2 disabled:opacity-60 ${
                      confirming === 'claim' ? 'bg-[#48A868] hover:bg-[#3d9159]' : 'bg-[#D9534F] hover:bg-[#c64541]'
                    }`}
                  >
                    {busy ? 'Saving...' : confirming === 'claim' ? 'Yes, mark returned' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={busy}
                    className="flex-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming('claim')}
                  className="flex-1 text-xs font-semibold text-white bg-[#48A868] hover:bg-[#3d9159] rounded-lg py-2"
                >
                  {claimLabel}
                </button>
                <button
                  onClick={() => setConfirming('delete')}
                  className="flex-1 text-xs font-semibold text-[#D9534F] bg-[#FDF2F2] hover:bg-[#f9e1e1] rounded-lg py-2"
                >
                  Delete report
                </button>
              </div>
            )}
            {actionError && <p className="text-xs text-[#D9534F] mt-2 text-center">{actionError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}