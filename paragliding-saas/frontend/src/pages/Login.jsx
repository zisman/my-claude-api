import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input, Alert } from '../components/ui/index.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', slug: 'skyfly' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password, form.slug);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-sky-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🪂</div>
          <h1 className="text-3xl font-bold text-white">SkyManage</h1>
          <p className="text-brand-200 mt-1">Paragliding Club Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your club</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Club Slug" value={form.slug} onChange={set('slug')} placeholder="skyfly" required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="admin@skyfly.com" required />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            {error && <Alert type="error" message={error} />}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-3">Demo credentials:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div>Admin: admin@skyfly.com / admin123</div>
              <div>Instructor: instructor@skyfly.com / instr123</div>
              <div>Member: member@skyfly.com / member123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
