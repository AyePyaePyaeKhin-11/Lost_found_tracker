import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AddItemModal({ isOpen, onClose, onItemAdded, initialType = 'lost' }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'lost',
    category: 'Electronics',
    location: '',
    description: ''
    // contact is left out: the backend uses the reporter's email
  });
  const [loading, setLoading] = useState(false);
  // Free plan: lost reports used / allowed this month. limit null = unlimited (Pro, admin).
  const [quota, setQuota] = useState(null);

  // Opening the form from "Report Lost" / "Report Found" pre-selects the type.
  useEffect(() => {
    if (isOpen) setFormData((f) => ({ ...f, type: initialType === 'found' ? 'found' : 'lost' }));
  }, [isOpen, initialType]);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('token');
    fetch('/api/billing/status', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => s && setQuota({ used: s.lost_reports_used, limit: s.lost_reports_limit }))
      .catch(() => setQuota(null));
  }, [isOpen]);

  const isLost = formData.type === 'lost';
  const limited = isLost && quota && quota.limit != null;
  const usedUp = limited && quota.used >= quota.limit;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Item reported successfully!');
        if (onItemAdded) onItemAdded();
        onClose();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || 'Failed to add item'}`);
      }
    } catch (err) {
      alert('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>Report New Item</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '600' }}>Type</label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="lost">Lost Item (ของหาย)</option>
              <option value="found">Found Item (เจอของ)</option>
            </select>
          </div>

          {limited && !usedUp && (
            <div style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '8px', background: '#FFF4EC', color: '#7a3e1d' }}>
              Lost reports this month: <b>{quota.used} of {quota.limit}</b> used (Free plan).{' '}
              <Link href="/pricing" style={{ color: '#E57338', fontWeight: 700 }}>Go unlimited with Pro</Link>
            </div>
          )}
          {usedUp && (
            <div role="alert" style={{ fontSize: '12px', padding: '10px 12px', borderRadius: '8px', background: '#FDF2F2', color: '#a12a26', border: '1px solid #f3c7c5' }}>
              <b>You've used all {quota.limit} lost reports for this month.</b> Upgrade to Pro for unlimited lost reports.
              Found reports are always free.
              <div style={{ marginTop: '8px' }}>
                <Link href="/pricing" style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '6px', background: '#E57338', color: '#fff', fontWeight: 700 }}>
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '600' }}>Item Name</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Wireless Mouse"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '600' }}>Category</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Electronics, Apparel"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '600' }}>Location</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Main Library"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '600' }}>Description</label>
            <textarea 
              rows={2}
              placeholder="Optional description..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#e5e7eb' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || usedUp}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: usedUp ? '#d1d5db' : '#E57338', color: '#fff', cursor: usedUp ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Submitting...' : 'Report Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}