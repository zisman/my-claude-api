import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { CloudSun, Wind, Droplets, Eye, Bot, RefreshCw } from 'lucide-react';

const SITES = [
  { id: 'gilboa', name: 'הגלבוע' },
  { id: 'carmel', name: 'הכרמל' },
  { id: 'hermon', name: 'חרמון' },
  { id: 'deadsea', name: 'ים המלח' },
];

const WMO_CODES = {
  0: 'שמיים בהירים', 1: 'בהיר בעיקר', 2: 'מעונן חלקית', 3: 'מעונן',
  45: 'ערפל', 48: 'ערפל', 51: 'גשם קל', 53: 'גשם', 55: 'גשם כבד',
  61: 'גשם', 63: 'גשם', 65: 'גשם כבד', 80: 'מקלחות', 95: 'סערה',
};

const SAFETY_COLORS = { safe: 'bg-green-50 border-green-200', caution: 'bg-yellow-50 border-yellow-200', dangerous: 'bg-red-50 border-red-200' };
const SAFETY_LABELS = { safe: '✅ מומלץ לטוס', caution: '⚠️ זהירות', dangerous: '🚫 אסור לטוס' };

export default function Weather() {
  const [site, setSite] = useState('gilboa');
  const [weather, setWeather] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const loadWeather = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const data = await api.get(`/weather/forecast?site=${site}`);
      setWeather(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadWeather(); }, [site]);

  const analyzeWeather = async () => {
    if (!weather?.current) return;
    setLoadingAnalysis(true);
    try {
      const data = await api.post('/weather/analyze', { weatherData: weather.current, site });
      setAnalysis(data);
    } catch (err) { console.error(err); }
    setLoadingAnalysis(false);
  };

  const current = weather?.current;

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">תחזית מזג אוויר</h1>
          <p className="text-slate-500 text-sm">נתונים מ-Open-Meteo בזמן אמת</p>
        </div>
        <button onClick={loadWeather} disabled={loading} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> רענן
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {SITES.map(s => (
          <button key={s.id} onClick={() => setSite(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${site === s.id ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
            {s.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      )}

      {current && !loading && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-4xl font-bold">{Math.round(current.temperature_2m)}°C</div>
                <div className="text-sky-200 mt-1">{WMO_CODES[current.weathercode] || 'מזג אוויר'}</div>
                <div className="text-sky-200 text-sm mt-1">{SITES.find(s => s.id === site)?.name}</div>
              </div>
              <CloudSun size={48} className="text-sky-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sky-100 text-xs mb-1"><Wind size={14} /> רוח</div>
                <div className="font-bold">{Math.round(current.windspeed_10m)} קמ"ש</div>
                <div className="text-sky-200 text-xs">כיוון: {current.winddirection_10m}°</div>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sky-100 text-xs mb-1"><Droplets size={14} /> משקעים</div>
                <div className="font-bold">{current.precipitation} מ"מ</div>
                <div className="text-sky-200 text-xs">עננות: {current.cloudcover}%</div>
              </div>
              {current.windgusts_10m && (
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sky-100 text-xs mb-1"><Wind size={14} /> מנשבים</div>
                  <div className="font-bold">{Math.round(current.windgusts_10m)} קמ"ש</div>
                </div>
              )}
              {current.visibility && (
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sky-100 text-xs mb-1"><Eye size={14} /> נראות</div>
                  <div className="font-bold">{(current.visibility / 1000).toFixed(1)} ק"מ</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {analysis ? (
              <div className={`rounded-xl border p-5 ${SAFETY_COLORS[analysis.safety_rating] || 'bg-gray-50'}`}>
                <div className="text-lg font-bold mb-2">{SAFETY_LABELS[analysis.safety_rating]}</div>
                <div className="text-sm font-medium mb-3">ציון: {analysis.overall_score}/100</div>
                <div className="text-sm text-slate-700 mb-3">{analysis.summary}</div>
                {analysis.warnings?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                    {analysis.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                  </div>
                )}
                {analysis.best_flight_window && (
                  <div className="mt-2 text-xs text-slate-600">
                    <span className="font-medium">חלון טיסה מומלץ: </span>{analysis.best_flight_window}
                  </div>
                )}
                {analysis.thermal_conditions && (
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="font-medium">תרמיקה: </span>{analysis.thermal_conditions}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Bot size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm mb-4">קבל ניתוח בטיחות מבוסס AI</p>
                <button onClick={analyzeWeather} disabled={loadingAnalysis}
                  className="flex items-center gap-2 mx-auto px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50">
                  <Bot size={16} />
                  {loadingAnalysis ? 'מנתח...' : 'ניתוח AI'}
                </button>
              </div>
            )}

            {weather?.hourly && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="font-medium text-slate-700 mb-3 text-sm">תחזית שעתית</div>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 pb-2">
                    {weather.hourly.time?.slice(0, 12).map((t, i) => (
                      <div key={i} className="text-center min-w-12 text-xs">
                        <div className="text-slate-500">{t.split('T')[1]?.slice(0, 5)}</div>
                        <div className="font-bold text-slate-800 my-1">{Math.round(weather.hourly.temperature_2m?.[i])}°</div>
                        <div className="text-sky-600">{Math.round(weather.hourly.windspeed_10m?.[i])}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1">טמפ°C / רוח קמ"ש</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
