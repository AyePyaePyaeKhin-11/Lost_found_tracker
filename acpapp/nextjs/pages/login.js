import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [studentId, setStudentId] = useState('68011893');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="w-12 h-12 bg-[#E57338] rounded-2xl mb-8"></div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lost and Found Tracker</h1>
        <p className="text-sm text-gray-500 mt-1 mb-8">Sign in with your KMITL account</p>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Student / staff ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#E57338]"
              placeholder="e.g. 68011893"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#E57338] hover:bg-[#d66126] text-white font-semibold rounded-xl transition duration-150 shadow-sm"
          >
            Continue with KMITL SSO
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Read-only search does not require sign-in
        </p>
      </div>
    </div>
  );
}