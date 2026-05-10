import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Spinner, PageHeader } from '../components/ui/index.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function WindDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export default function Weather() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [cur, hist] = await Promise.all([api.weatherCurrent(), api.weatherHistory()]);
      setCurrent(cur);
      setHistory(hist.slice(0, 24).reverse().map(r => ({
        time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        wind: r.wind_speed,
        temp: r.temperature,
        gusts: r.wind_gusts,
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const flyableColor = current?.is_flyable ? 'text-green-700' : 'text-red-700';
  const flyableBg = current?.is_flyable ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-orange-50 border-red-200';

  return (
    <div>
      <PageHeader
        title="Weather"
        subtitle="Live conditions and flying forecast"
        action={
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary text-sm flex items-center gap-2">
            {refreshing ? <Spinner size="sm" /> : '🔄'} Refresh
          </button>
        }
      />

      {current && (
        <div className={`rounded-2xl border bg-gradient-to-br p-6 mb-6 ${flyableBg}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">{current.is_flyable ? '✅' : '⛔'}</div>
            <div>
              <div className={`text-2xl font-bold ${flyableColor}`}>
                {current.is_flyable ? 'GO FLY! Conditions are good' : 'STAY GROUNDED — Poor conditions'}
              </div>
              <div className="text-gray-600 mt-1">{current.conditions}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Temperature', value: `${current.temperature}°C`, icon: '🌡️' },
              { label: 'Wind Speed', value: `${current.wind_speed} km/h ${WindDir(current.wind_direction)}`, icon: '💨' },
              { label: 'Wind Gusts', value: `${current.wind_gusts} km/h`, icon: '🌬️' },
              { label: 'Visibility', value: `${current.visibility?.toFixed(0)} km`, icon: '👁️' },
              { label: 'Cloud Cover', value: `${current.cloud_cover}%`, icon: '☁️' },
              { label: 'Precipitation', value: `${current.precipitation || 0} mm`, icon: '🌧️' },
            ].map(item => (
              <div key={item.label} className="bg-white/70 rounded-xl p-3">
                <div className="text-lg mb-1">{item.icon}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="font-semibold text-gray-900">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Flying criteria: Wind 10-35 km/h · Gusts ≤45 km/h · Cloud cover &lt;80% · No precipitation
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Wind Speed History (km/h)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="wind" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Wind" />
                <Line type="monotone" dataKey="gusts" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Gusts" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Temperature History (°C)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Temperature" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
