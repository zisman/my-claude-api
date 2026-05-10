import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [club, setClub] = useState(() => {
    try { return JSON.parse(localStorage.getItem('club')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.me().then(data => {
        setUser(data.user);
        setClub(data.club);
      }).catch(() => {
        localStorage.removeItem('token');
        setUser(null);
        setClub(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, slug) => {
    const data = await api.login({ email, password, slug });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('club', JSON.stringify(data.club));
    setUser(data.user);
    setClub(data.club);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('club');
    setUser(null);
    setClub(null);
  };

  return (
    <AuthContext.Provider value={{ user, club, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
