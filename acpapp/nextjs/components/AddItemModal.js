import { useEffect, useState } from 'react';

export default function AddItemModal({ isOpen, onClose, onItemAdded, initialType = 'lost' }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'lost',
    category: 'Electronics',
    location: '',
    description: '',
    contact: '0812345678'
  });
  const [loading, setLoading] = useState(false);

  // Opening the form from "Report Lost" / "Report Found" pre-selects the type.
  useEffect(() => {
    if (isOpen) setFormData((f) => ({ ...f, type: initialType === 'found' ? 'found' : 'lost' }));
  }, [isOpen, initialType]);

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
              disabled={loading}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#E57338', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Submitting...' : 'Report Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}