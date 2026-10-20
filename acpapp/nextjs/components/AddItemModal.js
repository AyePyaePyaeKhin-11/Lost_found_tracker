import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES } from '../lib/categories';

const EMPTY_FORM = {
  name: '',
  type: 'lost',
  category: '', // chosen from the list (required)
  location: '',
  colour: '',
  brand: '',
  description: ''
  // contact is left out: the backend uses the reporter's email
};

// Phone photos are often 3-10 MB. Shrink to at most 1280 px and save as JPEG
// (about 100-300 KB) before uploading, so it is fast and fits the 5 MB limit.
function shrinkImage(file, maxSide = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // transparent PNGs get a white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('resize failed'))), 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This photo format is not supported. Please choose a JPG or PNG photo.'));
    };
    img.src = url;
  });
}

function errorText(detail, fallback) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join(', ');
  return fallback;
}

const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' };
const labelStyle = { fontSize: '12px', display: 'block', fontWeight: '600' };

export default function AddItemModal({ isOpen, onClose, onItemAdded, initialType = 'lost' }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null); // { file, preview } or null
  const [photoError, setPhotoError] = useState('');
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

  const choosePhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow choosing the same file again later
    setPhotoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file (JPG or PNG).');
      return;
    }
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  };

  const removePhoto = () => {
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto(null);
    setPhotoError('');
  };

  const handleClose = () => {
    removePhoto();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const auth = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Upload the photo first (if there is one) and get its URL.
      let photo_url;
      if (photo) {
        let blob;
        try {
          blob = await shrinkImage(photo.file);
        } catch (err) {
          setPhotoError(err.message);
          return;
        }
        const body = new FormData();
        body.append('file', blob, 'photo.jpg');
        const up = await fetch('/api/uploads', { method: 'POST', headers: auth, body });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          setPhotoError(errorText(upData.detail, 'Photo upload failed'));
          return;
        }
        photo_url = upData.url;
      }

      // 2. Create the report. Empty optional fields are left out.
      const payload = { ...formData, photo_url };
      ['colour', 'brand', 'description'].forEach((k) => {
        if (!payload[k] || !payload[k].trim()) delete payload[k];
      });
      if (!photo_url) delete payload.photo_url;

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Item reported successfully!');
        setFormData({ ...EMPTY_FORM, type: formData.type });
        removePhoto();
        if (onItemAdded) onItemAdded();
        onClose();
      } else {
        const error = await res.json().catch(() => ({}));
        alert(`Error: ${errorText(error.detail, 'Failed to add item')}`);
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
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto', margin: '0 12px' }}>
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
            <select
              required
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              style={{ ...inputStyle, color: formData.category ? '#111' : '#9ca3af' }}
            >
              <option value="" disabled>Choose a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} style={{ color: '#111' }}>{c.label}</option>
              ))}
            </select>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Colour <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Black"
                value={formData.colour}
                onChange={e => setFormData({...formData, colour: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Brand <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Apple"
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                style={inputStyle}
              />
            </div>
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

          <div>
            <label style={labelStyle}>Photo <span style={{ fontWeight: 400, color: '#888' }}>(optional)</span></label>
            {photo ? (
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <img
                  src={photo.preview}
                  alt="Selected photo"
                  style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }}
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  style={{ position: 'absolute', top: '6px', right: '6px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '90px', border: '2px dashed #d1d5db', borderRadius: '8px', color: '#6b7280', fontSize: '12px', cursor: 'pointer', background: '#fafafa' }}
              >
                <span style={{ fontSize: '20px' }}>📷</span>
                <span><b style={{ color: '#E57338' }}>Choose a photo</b> or take one</span>
                <input type="file" accept="image/*" onChange={choosePhoto} style={{ display: 'none' }} />
              </label>
            )}
            {photoError && <p role="alert" style={{ color: '#b8352f', fontSize: '12px', marginTop: '4px' }}>{photoError}</p>}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={handleClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#e5e7eb' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || usedUp}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: usedUp ? '#d1d5db' : '#E57338', color: '#fff', cursor: usedUp ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? (photo ? 'Uploading photo...' : 'Submitting...') : 'Report Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}