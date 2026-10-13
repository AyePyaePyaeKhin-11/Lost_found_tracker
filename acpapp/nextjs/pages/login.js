import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { saveSession } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Relative URL: Next.js rewrites /api/* to the FastAPI container.
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      saveSession(data); // stores token, email, role in localStorage
      router.push(data.role === 'admin' ? '/admin' : '/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="w-12 h-12 bg-[#E57338] rounded-2xl mb-8"></div>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lost and Found Tracker</h1>
        <p className="text-sm text-gray-500 mt-1 mb-8">Sign in to report and search items</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#E57338]"
              placeholder="you@kmitl.ac.th"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#E57338]"
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#E57338] hover:bg-[#d66126] text-white font-semibold rounded-xl transition duration-150 shadow-sm disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          No account?{' '}
          <Link href="/register" className="text-[#E57338] font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
