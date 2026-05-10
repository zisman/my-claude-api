'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ slug: 'skyclub', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.auth.login(form);
      setToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🪂</div>
          <h1 className="text-3xl font-bold text-white">SkyClub</h1>
          <p className="text-blue-200 mt-1">Paragliding Club Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your club</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Club Slug</label>
              <input className="input" value={form.slug} onChange={set('slug')} placeholder="skyclub" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="admin@skyclub.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">Demo credentials:</p>
            <div className="space-y-1 text-xs text-gray-400">
              <div>Admin: admin@skyclub.com / Admin123!</div>
              <div>Instructor: yael@skyclub.com / Instr123!</div>
              <div>Technician: tech@skyclub.com / Tech123!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
