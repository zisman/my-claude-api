import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Bot, CheckCircle, XCircle } from 'lucide-react';

const LEVEL_LABELS = { beginner: 'מתחיל', P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4' };
const LEVEL_COLORS = { beginner: 'bg-gray-100 text-gray-700', P1: 'bg-green-100 text-green-700', P2: 'bg-blue-100 text-blue-700', P3: 'bg-purple-100 text-purple-700', P4: 'bg-orange-100 text-orange-700' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', instructor: '', medical_clearance: false });

  useEffect(() => {
    api.get('/students').then(setStudents);
    api.get('/students/courses').then(setCourses);
  }, []);

  const selectStudent = async (id) => {
    const data = await api.get(`/students/${id}`);
    setSelected(data);
    setAnalysis(null);
  };

  const addStudent = async (e) => {
    e.preventDefault();
    await api.post('/students', form);
    setShowForm(false);
    api.get('/students').then(setStudents);
  };

  const analyzeStudent = async () => {
    if (!selected) return;
    setLoadingAnalysis(true);
    try {
      const data = await api.post('/ai/student-analysis', { student_id: selected.id });
      setAnalysis(data);
    } catch (err) { console.error(err); }
    setLoadingAnalysis(false);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">תלמידים</h1>
          <p className="text-slate-500 text-sm">{students.length} תלמידים רשומים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> תלמיד חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <form onSubmit={addStudent} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם מלא *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="טלפון" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="אימייל" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="מדריך" value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})} />
            <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={form.medical_clearance} onChange={e => setForm({...form, medical_clearance: e.target.checked})} />
              אישור רפואי
            </label>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-sky-600 text-white py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b"><tr>
                <th className="text-right px-4 py-3 font-medium text-slate-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">מדריך</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">רמה</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">אישור רפואי</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
              </tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} onClick={() => selectStudent(s.id)} className="border-b hover:bg-sky-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.instructor}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${LEVEL_COLORS[s.current_level] || 'bg-gray-100'}`}>
                        {LEVEL_LABELS[s.current_level] || s.current_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.medical_clearance ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-400" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="w-80 space-y-4 self-start">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between mb-3">
                <h3 className="font-bold text-slate-800">{selected.name}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div><span className="text-slate-500">מדריך: </span>{selected.instructor}</div>
                <div><span className="text-slate-500">רמה: </span>{LEVEL_LABELS[selected.current_level]}</div>
                <div><span className="text-slate-500">טלפון: </span>{selected.phone}</div>
              </div>

              {selected.enrollments?.length > 0 && (
                <div className="mb-3">
                  <div className="font-medium text-slate-600 text-xs mb-2">קורסים</div>
                  {selected.enrollments.map(e => (
                    <div key={e.id} className="text-xs border rounded p-2 mb-1">
                      <div className="font-medium">{e.course_name}</div>
                      <div className="text-slate-500">{e.status === 'active' ? 'פעיל' : 'הושלם'} • {e.flight_hours} שעות</div>
                    </div>
                  ))}
                </div>
              )}

              {selected.tests?.length > 0 && (
                <div className="mb-3">
                  <div className="font-medium text-slate-600 text-xs mb-2">מבחנים</div>
                  {selected.tests.slice(0, 3).map(t => (
                    <div key={t.id} className="text-xs flex justify-between items-center border rounded p-2 mb-1">
                      <span>{t.test_name}</span>
                      <span className={`font-bold ${t.passed ? 'text-green-600' : 'text-red-500'}`}>{t.score}/{t.max_score}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={analyzeStudent} disabled={loadingAnalysis}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                <Bot size={16} />
                {loadingAnalysis ? 'מנתח...' : 'ניתוח AI'}
              </button>
            </div>

            {analysis && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="font-bold text-purple-800 text-sm mb-3 flex items-center gap-2"><Bot size={16} /> ניתוח התלמיד</div>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="font-medium text-purple-700 mb-1">חוזקות</div>
                    <ul>{analysis.strengths?.map((s, i) => <li key={i} className="text-slate-700">• {s}</li>)}</ul>
                  </div>
                  <div>
                    <div className="font-medium text-purple-700 mb-1">לשיפור</div>
                    <ul>{analysis.areas_for_improvement?.map((a, i) => <li key={i} className="text-slate-700">• {a}</li>)}</ul>
                  </div>
                  <div>
                    <div className="font-medium text-purple-700 mb-1">המלצות</div>
                    <ul>{analysis.recommended_actions?.map((r, i) => <li key={i} className="text-slate-700">• {r}</li>)}</ul>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${analysis.theory_readiness === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      תיאוריה: {analysis.theory_readiness === 'ready' ? 'מוכן' : 'בהכנה'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${analysis.practical_readiness === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      פרקטי: {analysis.practical_readiness === 'ready' ? 'מוכן' : 'בהכנה'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
