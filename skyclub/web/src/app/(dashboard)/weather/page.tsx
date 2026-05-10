'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DIRS = ['N','NE','E','SE','S','SW','W','NW'];
const windDir = (deg: number) => DIRS[Math.round(deg / 45) % 8];

export default function WeatherPage() {
  const [weather, setWeather] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const site = sites.find(s => s.id === selectedSite);
      const [w, s] = await Promise.all([
        api.weather.current(site?.lat, site?.lon, selectedSite || undefined),
        api.weather.sites(),
      ]);
      setWeather(w);
      setSites(s);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [selectedSite]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weather</h1>
          <p className="text-sm text-gray-500">Live conditions & flying windows</p>
        </div>
        <div className="flex gap-2">
          {sites.length > 0 && (
            <select className="input w-auto" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
              <option value="">Default location</option>
              {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary">
            {refreshing ? '...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {weather && (
        <>
          <div className={`rounded-2xl border p-6 mb-6 ${weather.isFlyable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-5xl">{weather.isFlyable ? '✅' : '⛔'}</span>
              <div>
                <div className={`text-2xl font-bold ${weather.isFlyable ? 'text-green-800' : 'text-red-800'}`}>
                  {weather.isFlyable ? 'GO FLY! Conditions are good' : 'NOT FLYABLE — Poor conditions'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Temperature', value: `${weather.tempC?.toFixed(1)}°C`, icon: '🌡️' },
                { label: 'Wind', value: `${weather.windKmh?.toFixed(0)} km/h ${windDir(weather.dirDeg)}`, icon: '💨' },
                { label: 'Gusts', value: `${weather.gustKmh?.toFixed(0)} km/h`, icon: '🌬️' },
                { label: 'Cloud Cover', value: `${weather.cloudPct}%`, icon: '☁️' },
              ].map(item => (
                <div key={item.label} className="bg-white/70 rounded-xl p-3 text-center">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="font-semibold text-gray-900 text-sm">{item.value}</div>
                </div>
              ))}
            </div>

            {weather.windows && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Beginner window', ok: weather.windows.beginner },
                  { label: 'Advanced window', ok: weather.windows.advanced },
                  { label: 'Paramotor window', ok: weather.windows.paramotor },
                ].map(w => (
                  <div key={w.label} className={`rounded-lg p-3 text-center text-sm font-medium ${w.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {w.ok ? '✓' : '✗'} {w.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-4">Wind History</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={history.slice().reverse().map((r: any) => ({
                  time: new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  wind: r.windKmh,
                  gusts: r.gustKmh,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wind" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Wind km/h" />
                  <Line type="monotone" dataKey="gusts" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Gusts km/h" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
