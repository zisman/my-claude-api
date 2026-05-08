import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';

const LEVEL_COLORS = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-blue-100 text-blue-700', advanced: 'bg-purple-100 text-purple-700' };
const LEVEL_LABELS = { beginner: 'מתחילים', intermediate: 'בינוני', advanced: 'מתקדם' };

export default function Lessons() {
  const [modules, setModules] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [progress, setProgress] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [activeTab, setActiveTab] = useState('modules');

  useEffect(() => {
    api.get('/lessons/modules').then(setModules);
    api.get('/students').then(setStudents);
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      api.get(`/lessons/progress/${selectedStudent}`).then(setProgress);
    }
  }, [selectedStudent]);

  const openModule = async (id) => {
    const data = await api.get(`/lessons/modules/${id}`);
    setSelectedModule(data);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const getModuleProgress = (moduleId) => progress.find(p => p.module_id === moduleId);

  const submitQuiz = async () => {
    if (!selectedModule || !selectedStudent) return;
    const quizzes = selectedModule.quizzes || [];
    let correct = 0;
    quizzes.forEach(q => {
      if (parseInt(quizAnswers[q.id]) === q.correct_answer) correct++;
    });
    const score = quizzes.length > 0 ? Math.round((correct / quizzes.length) * 100) : 100;
    const passed = score >= 60;
    setQuizResult({ score, passed, correct, total: quizzes.length });

    await api.post('/lessons/progress', {
      student_id: parseInt(selectedStudent),
      module_id: selectedModule.id,
      completed: passed ? 1 : 0,
      quiz_score: score
    });
    api.get(`/lessons/progress/${selectedStudent}`).then(setProgress);
  };

  const groupedModules = modules.reduce((acc, m) => {
    const key = m.course_name || 'כללי';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">שיעורים אונליין</h1>
          <p className="text-slate-500 text-sm">לומדה דיגיטלית למצנחאים</p>
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
          <option value="">בחר תלמיד למעקב</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {['modules', 'progress'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'modules' ? 'מודולי לימוד' : 'התקדמות'}
          </button>
        ))}
      </div>

      {activeTab === 'modules' && (
        <div className="flex gap-4">
          <div className="flex-1 space-y-6">
            {Object.entries(groupedModules).map(([courseName, courseModules]) => (
              <div key={courseName}>
                <h3 className="font-bold text-slate-700 mb-3">{courseName}</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {courseModules.map(m => {
                    const prog = getModuleProgress(m.id);
                    return (
                      <div key={m.id} onClick={() => openModule(m.id)}
                        className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:border-sky-300 border border-transparent transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-slate-800 text-sm">{m.title}</h4>
                          {prog?.completed ? (
                            <CheckCircle size={18} className="text-green-500 shrink-0" />
                          ) : prog ? (
                            <Clock size={18} className="text-yellow-500 shrink-0" />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_COLORS[m.level] || 'bg-gray-100'}`}>
                            {LEVEL_LABELS[m.level] || m.level}
                          </span>
                          {m.duration_minutes && (
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> {m.duration_minutes} דק'</span>
                          )}
                        </div>
                        {prog?.quiz_score !== null && prog?.quiz_score !== undefined && (
                          <div className="text-xs text-slate-500 mt-1">ציון: {prog.quiz_score}%</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedModule && (
            <div className="w-96 bg-white rounded-xl shadow-sm p-5 self-start sticky top-4">
              <div className="flex justify-between mb-3">
                <h3 className="font-bold text-slate-800">{selectedModule.title}</h3>
                <button onClick={() => setSelectedModule(null)} className="text-slate-400">×</button>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_COLORS[selectedModule.level]}`}>
                {LEVEL_LABELS[selectedModule.level]}
              </span>

              {selectedModule.description && (
                <p className="text-sm text-slate-600 mt-3">{selectedModule.description}</p>
              )}

              {selectedModule.content && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 max-h-32 overflow-y-auto">
                  {selectedModule.content}
                </div>
              )}

              {selectedModule.quizzes?.length > 0 && (
                <div className="mt-4">
                  <div className="font-medium text-sm text-slate-700 mb-3">חידון ({selectedModule.quizzes.length} שאלות)</div>
                  {selectedModule.quizzes.map((q, qi) => {
                    const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                    return (
                      <div key={q.id} className="mb-3">
                        <div className="text-xs font-medium text-slate-700 mb-1">{qi + 1}. {q.question}</div>
                        {opts.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                            <input type="radio" name={`q-${q.id}`} value={i} checked={parseInt(quizAnswers[q.id]) === i} onChange={() => setQuizAnswers({...quizAnswers, [q.id]: i})} />
                            {opt}
                          </label>
                        ))}
                      </div>
                    );
                  })}

                  {!quizResult ? (
                    <button onClick={submitQuiz} disabled={!selectedStudent}
                      className="w-full bg-sky-600 text-white py-2 rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50">
                      {selectedStudent ? 'הגש חידון' : 'בחר תלמיד תחילה'}
                    </button>
                  ) : (
                    <div className={`rounded-lg p-3 text-sm text-center ${quizResult.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {quizResult.passed ? <CheckCircle className="mx-auto mb-1 text-green-500" /> : <XCircle className="mx-auto mb-1 text-red-500" />}
                      <div className="font-bold">{quizResult.score}% ({quizResult.correct}/{quizResult.total})</div>
                      <div className={quizResult.passed ? 'text-green-700' : 'text-red-700'}>{quizResult.passed ? '✓ עברת בהצלחה!' : '✗ לא עברת. נסה שוב.'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div>
          {!selectedStudent ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>בחר תלמיד לצפייה בהתקדמות</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b"><tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">מודול</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">ציון</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">ניסיונות</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">הושלם</th>
                </tr></thead>
                <tbody>
                  {progress.map(p => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{p.title}</td>
                      <td className="px-4 py-3">
                        {p.completed ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={14} /> הושלם</span> : <span className="flex items-center gap-1 text-yellow-600 text-xs"><Clock size={14} /> בתהליך</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.quiz_score !== null ? `${p.quiz_score}%` : '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.quiz_attempts}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{p.completed_at?.split('T')[0] || '-'}</td>
                    </tr>
                  ))}
                  {progress.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">אין נתוני התקדמות עדיין</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
