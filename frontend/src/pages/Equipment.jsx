import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import {
  Plus, Package, AlertTriangle, CheckCircle, Clock, Wrench, ArrowLeft,
  Shield, TrendingUp, Calendar, User, DollarSign, RotateCcw, ChevronDown
} from 'lucide-react';

const TYPE_LABELS = {
  wing: 'כנף', harness: 'רתמה', reserve: 'מצנח חירום',
  radio: 'רדיו', helmet: 'קסדה', gps: 'GPS', other: 'אחר'
};
const STATUS_LABELS = { active: 'פעיל', loaned: 'מושאל', repair: 'בתיקון', retired: 'יצא משרות' };
const CONDITION_LABELS = { excellent: 'מצוין', good: 'טוב', fair: 'סביר', poor: 'גרוע' };

function inspectionBadge(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return { color: 'bg-gray-100 text-gray-600', label: 'לא נקבעה' };
  if (daysLeft < 0) return { color: 'bg-red-100 text-red-700', label: `פג תוקף לפני ${Math.abs(daysLeft)} ימים` };
  if (daysLeft <= 7) return { color: 'bg-red-100 text-red-700', label: `בעוד ${daysLeft} ימים` };
  if (daysLeft <= 30) return { color: 'bg-orange-100 text-orange-700', label: `בעוד ${daysLeft} ימים` };
  return { color: 'bg-green-100 text-green-700', label: `בעוד ${daysLeft} ימים` };
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-r-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          <div className="text-sm text-slate-500 mt-0.5">{label}</div>
        </div>
        <Icon size={28} className="text-slate-300" />
      </div>
    </div>
  );
}

function EquipmentList({ equipment, onSelect, activeId }) {
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const types = [...new Set(equipment.map(e => e.type))];
  let filtered = equipment;
  if (filter !== 'all') filtered = filtered.filter(e => e.type === filter);
  if (statusFilter !== 'all') filtered = filtered.filter(e => e.status === statusFilter);

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs ${filter === 'all' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border'}`}>
          הכל ({equipment.length})
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs ${filter === t ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border'}`}>
            {TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {['all', 'active', 'loaned', 'repair'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs ${statusFilter === s ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border'}`}>
            {s === 'all' ? 'כל הסטטוסים' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-slate-600">שם / סוג</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">בעלות</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">בדיקה הבאה</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">טיסות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const badge = inspectionBadge(item.days_to_inspection);
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`border-b cursor-pointer transition-colors ${activeId === item.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500">{TYPE_LABELS[item.type] || item.type} {item.brand && `· ${item.brand}`} {item.model && item.model}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.owner_type === 'club' ? 'bg-blue-100 text-blue-700' : item.owner_type === 'student' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {item.owner_type === 'club' ? 'מועדון' : item.owner_name || item.owner_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${item.status === 'active' ? 'bg-green-100 text-green-700' : item.status === 'loaned' ? 'bg-blue-100 text-blue-700' : item.status === 'repair' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                      {item.open_repairs > 0 && <span className="text-xs text-orange-600">⚠ {item.open_repairs} תיקון פתוח</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.total_flights || 0}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">אין ציוד להצגה</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

function EquipmentProfile({ item, onBack, onRefresh }) {
  const [tab, setTab] = useState('info');
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);

  const [inspForm, setInspForm] = useState({ inspection_date: new Date().toISOString().split('T')[0], inspection_type: 'annual', result: 'pass', findings: '', inspector: '', lab_name: '', cost: '' });
  const [repairForm, setRepairForm] = useState({ description: '', reported_by: '', repaired_by: '', repair_date: '', cost: '', under_warranty: false, result: '', back_in_service: false, notes: '' });
  const [loanForm, setLoanForm] = useState({ borrower_type: 'student', borrower_name: '', borrower_phone: '', expected_return: '', condition_out: 'good', approved_by: '', notes: '' });

  const badge = inspectionBadge(item.days_to_inspection);

  const saveInspection = async (e) => {
    e.preventDefault();
    await api.post(`/equipment/${item.id}/inspections`, inspForm);
    setShowInspectionForm(false);
    onRefresh(item.id);
  };

  const saveRepair = async (e) => {
    e.preventDefault();
    await api.post(`/equipment/${item.id}/repairs`, repairForm);
    setShowRepairForm(false);
    onRefresh(item.id);
  };

  const saveLoan = async (e) => {
    e.preventDefault();
    await api.post(`/equipment/${item.id}/loans`, loanForm);
    setShowLoanForm(false);
    onRefresh(item.id);
  };

  const returnLoan = async (loanId) => {
    await api.post(`/equipment/loans/${loanId}/return`, { condition_in: 'good' });
    onRefresh(item.id);
  };

  const closeRepair = async (repairId) => {
    await api.put(`/equipment/repairs/${repairId}`, { back_in_service: true, repair_date: new Date().toISOString().split('T')[0] });
    onRefresh(item.id);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="mt-1 text-slate-400 hover:text-slate-700"><ArrowLeft size={18} /></button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{item.name}</h2>
              <div className="text-sm text-slate-500 mt-0.5">
                {TYPE_LABELS[item.type] || item.type}
                {item.brand && ` · ${item.brand}`}
                {item.model && ` ${item.model}`}
                {item.serial_number && ` · מס' ${item.serial_number}`}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' : item.status === 'loaned' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
              {STATUS_LABELS[item.status] || item.status}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-bold text-slate-800">{item.total_flights || 0}</div>
            <div className="text-xs text-slate-500">טיסות</div>
          </div>
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-bold text-slate-800">{item.total_hours || 0}</div>
            <div className="text-xs text-slate-500">שעות</div>
          </div>
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-bold text-slate-800">{item.stats?.totalRepairCost ? `₪${item.stats.totalRepairCost.toLocaleString()}` : '—'}</div>
            <div className="text-xs text-slate-500">עלות תיקונים</div>
          </div>
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-bold text-slate-800">{item.stats?.costPerFlight ? `₪${item.stats.costPerFlight}` : '—'}</div>
            <div className="text-xs text-slate-500">עלות לטיסה</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-5">
        <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>פרטים</TabBtn>
        <TabBtn active={tab === 'inspections'} onClick={() => setTab('inspections')}>
          בדיקות {item.inspections?.length > 0 && `(${item.inspections.length})`}
        </TabBtn>
        <TabBtn active={tab === 'repairs'} onClick={() => setTab('repairs')}>
          תיקונים {item.repairs?.length > 0 && `(${item.repairs.length})`}
        </TabBtn>
        <TabBtn active={tab === 'loans'} onClick={() => setTab('loans')}>
          השאלות {item.loans?.length > 0 && `(${item.loans.length})`}
        </TabBtn>
      </div>

      <div className="p-5">
        {/* Info Tab */}
        {tab === 'info' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-700 mb-3">פרטי הציוד</h4>
              <dl className="space-y-2 text-sm">
                {[
                  ['בעלות', item.owner_type === 'club' ? 'מועדון' : item.owner_name],
                  ['מצב', CONDITION_LABELS[item.condition] || item.condition],
                  ['מיקום', item.location],
                  ['שנת ייצור', item.manufacture_year],
                  ['צבע / גודל', [item.color, item.size].filter(Boolean).join(' / ')],
                  ['משקל', item.weight_kg ? `${item.weight_kg} ק"ג` : null],
                  ['משקל טייס מינ-מקס', (item.min_pilot_weight || item.max_pilot_weight) ? `${item.min_pilot_weight || '?'}–${item.max_pilot_weight || '?'} ק"ג` : null],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-slate-500 w-32 shrink-0">{k}:</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-3">מגבלות ורכש</h4>
              <dl className="space-y-2 text-sm">
                {[
                  ['תאריך רכישה', item.purchase_date],
                  ['מחיר רכישה', item.purchase_price ? `₪${Number(item.purchase_price).toLocaleString()}` : null],
                  ['מקס׳ טיסות', item.max_flights],
                  ['מקס׳ שנים', item.max_years],
                  ['תפוגת אחריות', item.warranty_expiry],
                  ['ביטוח', item.insured ? (item.insurance_value ? `₪${Number(item.insurance_value).toLocaleString()} עד ${item.insurance_expiry}` : 'יש ביטוח') : 'אין ביטוח'],
                  ['בדיקה אחרונה', item.last_inspection],
                  ['בדיקה הבאה', item.next_inspection],
                  ['מחזור בדיקה', item.inspection_interval_months ? `${item.inspection_interval_months} חודשים` : null],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-slate-500 w-36 shrink-0">{k}:</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {item.notes && (
              <div className="md:col-span-2 bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                <span className="font-medium">הערות: </span>{item.notes}
              </div>
            )}
            <div className="md:col-span-2">
              <h4 className="font-medium text-slate-700 mb-2">עלות כוללת</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-500">רכישה</div>
                  <div className="font-bold">₪{Number(item.purchase_price || 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-500">תיקונים</div>
                  <div className="font-bold">₪{Number(item.stats?.totalRepairCost || 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-500">בדיקות</div>
                  <div className="font-bold">₪{Number(item.stats?.totalInspectionCost || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-sky-50 rounded-lg p-3 mt-2 text-sm flex justify-between items-center">
                <span className="text-slate-600">עלות כוללת</span>
                <span className="text-xl font-bold text-sky-700">₪{Number(item.stats?.totalCost || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Inspections Tab */}
        {tab === 'inspections' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-slate-700">היסטוריית בדיקות</h4>
              <button onClick={() => setShowInspectionForm(!showInspectionForm)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
                <Plus size={14} /> הוסף בדיקה
              </button>
            </div>

            {showInspectionForm && (
              <form onSubmit={saveInspection} className="bg-slate-50 rounded-lg p-4 mb-4 grid md:grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="block text-slate-600 mb-1">תאריך בדיקה *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2" value={inspForm.inspection_date} onChange={e => setInspForm({...inspForm, inspection_date: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">סוג בדיקה</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={inspForm.inspection_type} onChange={e => setInspForm({...inspForm, inspection_type: e.target.value})}>
                    <option value="annual">שנתית</option>
                    <option value="biannual">חצי שנתית</option>
                    <option value="pre_flight">לפני טיסה</option>
                    <option value="post_repair">לאחר תיקון</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">תוצאה</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={inspForm.result} onChange={e => setInspForm({...inspForm, result: e.target.value})}>
                    <option value="pass">עבר</option>
                    <option value="fail">נכשל</option>
                    <option value="conditional">עבר עם הגבלות</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">בודק</label>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="שם הבודק" value={inspForm.inspector} onChange={e => setInspForm({...inspForm, inspector: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">מעבדה</label>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="שם המעבדה" value={inspForm.lab_name} onChange={e => setInspForm({...inspForm, lab_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">עלות ₪</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" placeholder="0" value={inspForm.cost} onChange={e => setInspForm({...inspForm, cost: e.target.value})} />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-slate-600 mb-1">ממצאים</label>
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={inspForm.findings} onChange={e => setInspForm({...inspForm, findings: e.target.value})} />
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <button type="submit" className="bg-sky-600 text-white px-5 py-2 rounded-lg hover:bg-sky-700">שמור</button>
                  <button type="button" onClick={() => setShowInspectionForm(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
                </div>
              </form>
            )}

            {item.inspections?.length === 0 && <p className="text-slate-400 text-sm text-center py-8">אין היסטוריית בדיקות</p>}
            <div className="space-y-3">
              {item.inspections?.map(insp => (
                <div key={insp.id} className="border rounded-lg p-4 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{insp.inspection_date}</span>
                      <span className="text-slate-500 mr-2">· {insp.inspection_type === 'annual' ? 'שנתית' : insp.inspection_type}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${insp.result === 'pass' ? 'bg-green-100 text-green-700' : insp.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {insp.result === 'pass' ? 'עבר' : insp.result === 'fail' ? 'נכשל' : 'עם הגבלות'}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    {insp.inspector && <span>בודק: {insp.inspector}</span>}
                    {insp.lab_name && <span className="mr-3">מעבדה: {insp.lab_name}</span>}
                    {insp.cost > 0 && <span className="mr-3">₪{insp.cost}</span>}
                  </div>
                  {insp.findings && <p className="mt-1 text-slate-600">{insp.findings}</p>}
                  {insp.next_due && <div className="mt-1 text-xs text-blue-600">בדיקה הבאה: {insp.next_due}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Repairs Tab */}
        {tab === 'repairs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-slate-700">היסטוריית תיקונים</h4>
              <button onClick={() => setShowRepairForm(!showRepairForm)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                <Wrench size={14} /> דווח תיקון
              </button>
            </div>

            {showRepairForm && (
              <form onSubmit={saveRepair} className="bg-slate-50 rounded-lg p-4 mb-4 grid md:grid-cols-2 gap-3 text-sm">
                <div className="md:col-span-2">
                  <label className="block text-slate-600 mb-1">תיאור הבעיה *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={repairForm.description} onChange={e => setRepairForm({...repairForm, description: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">מדווח</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={repairForm.reported_by} onChange={e => setRepairForm({...repairForm, reported_by: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">מתקן</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={repairForm.repaired_by} onChange={e => setRepairForm({...repairForm, repaired_by: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">תאריך תיקון</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2" value={repairForm.repair_date} onChange={e => setRepairForm({...repairForm, repair_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">עלות ₪</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={repairForm.cost} onChange={e => setRepairForm({...repairForm, cost: e.target.value})} />
                </div>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={repairForm.under_warranty} onChange={e => setRepairForm({...repairForm, under_warranty: e.target.checked})} />
                    <span>תחת אחריות</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={repairForm.back_in_service} onChange={e => setRepairForm({...repairForm, back_in_service: e.target.checked})} />
                    <span>חזר לשירות</span>
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" className="bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700">שמור</button>
                  <button type="button" onClick={() => setShowRepairForm(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
                </div>
              </form>
            )}

            {item.repairs?.length === 0 && <p className="text-slate-400 text-sm text-center py-8">אין היסטוריית תיקונים</p>}
            <div className="space-y-3">
              {item.repairs?.map(rep => (
                <div key={rep.id} className={`border rounded-lg p-4 text-sm ${!rep.back_in_service ? 'border-orange-200 bg-orange-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="font-medium">{rep.description}</div>
                    <div className="flex items-center gap-2">
                      {!rep.back_in_service && (
                        <button onClick={() => closeRepair(rep.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                          סגור תיקון
                        </button>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${rep.back_in_service ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {rep.back_in_service ? 'הושלם' : 'פתוח'}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-500 mt-1">
                    {rep.report_date && <span>דווח: {rep.report_date}</span>}
                    {rep.repair_date && <span className="mr-3">תוקן: {rep.repair_date}</span>}
                    {rep.cost > 0 && <span className="mr-3">₪{rep.cost}</span>}
                    {rep.under_warranty ? <span className="mr-3 text-green-600">תחת אחריות</span> : null}
                  </div>
                  {rep.repaired_by && <div className="text-slate-500 mt-0.5">מתקן: {rep.repaired_by}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {tab === 'loans' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-slate-700">השאלות</h4>
              {item.status !== 'loaned' && item.status !== 'repair' && (
                <button onClick={() => setShowLoanForm(!showLoanForm)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus size={14} /> השאל ציוד
                </button>
              )}
            </div>

            {showLoanForm && (
              <form onSubmit={saveLoan} className="bg-slate-50 rounded-lg p-4 mb-4 grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-slate-600 mb-1">סוג שואל</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={loanForm.borrower_type} onChange={e => setLoanForm({...loanForm, borrower_type: e.target.value})}>
                    <option value="student">תלמיד</option>
                    <option value="member">חבר</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">שם השואל *</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={loanForm.borrower_name} onChange={e => setLoanForm({...loanForm, borrower_name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">טלפון</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={loanForm.borrower_phone} onChange={e => setLoanForm({...loanForm, borrower_phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">תאריך החזרה צפוי *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2" value={loanForm.expected_return} onChange={e => setLoanForm({...loanForm, expected_return: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">מאשר</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={loanForm.approved_by} onChange={e => setLoanForm({...loanForm, approved_by: e.target.value})} />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">שמור</button>
                  <button type="button" onClick={() => setShowLoanForm(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
                </div>
              </form>
            )}

            {item.loans?.length === 0 && <p className="text-slate-400 text-sm text-center py-8">אין היסטוריית השאלות</p>}
            <div className="space-y-3">
              {item.loans?.map(loan => {
                const isOverdue = loan.status === 'active' && loan.expected_return < new Date().toISOString().split('T')[0];
                return (
                  <div key={loan.id} className={`border rounded-lg p-4 text-sm ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{loan.borrower_name}</div>
                        <div className="text-slate-500">{loan.borrower_phone}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {loan.status === 'active' && (
                          <button onClick={() => returnLoan(loan.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                            רשום החזרה
                          </button>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${loan.status === 'active' ? (isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700') : 'bg-green-100 text-green-700'}`}>
                          {loan.status === 'active' ? (isOverdue ? 'באיחור!' : 'פעיל') : 'הוחזר'}
                        </span>
                      </div>
                    </div>
                    <div className="text-slate-500 mt-1">
                      <span>הושאל: {loan.loan_date}</span>
                      <span className="mr-3">אמור לחזור: {loan.expected_return}</span>
                      {loan.actual_return && <span className="mr-3">חזר: {loan.actual_return}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'wing', brand: '', model: '', serial_number: '',
    manufacture_year: '', color: '', size: '', purchase_date: '', purchase_price: '',
    owner_type: 'club', owner_name: '', condition: 'good', location: 'מחסן',
    inspection_interval_months: 12, next_inspection: ''
  });

  const loadEquipment = useCallback(() => {
    api.get('/equipment').then(setEquipment);
    api.get('/equipment/stats/summary').then(setStats);
  }, []);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  const selectItem = async (id) => {
    const data = await api.get(`/equipment/${id}`);
    setSelected(data);
  };

  const refreshSelected = async (id) => {
    const data = await api.get(`/equipment/${id}`);
    setSelected(data);
    loadEquipment();
  };

  const addEquipment = async (e) => {
    e.preventDefault();
    await api.post('/equipment', form);
    setShowForm(false);
    loadEquipment();
  };

  return (
    <div className="p-6 animate-fade-in" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול ציוד</h1>
          <p className="text-slate-500 text-sm">{equipment.length} פריטים רשומים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> ציוד חדש
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="ציוד פעיל" value={stats.active} color="border-green-500" icon={CheckCircle} />
          <StatCard label="בדיקה דחופה" value={(stats.overdue_inspection || 0) + (stats.urgent_inspection || 0)} color="border-red-500" icon={AlertTriangle} />
          <StatCard label="בתיקון" value={stats.in_repair || 0} color="border-orange-500" icon={Wrench} />
          <StatCard label="מושאל" value={stats.loaned || 0} color="border-blue-500" icon={Package} />
        </div>
      )}

      {/* Urgent alerts bar */}
      {stats && (stats.overdue_inspection > 0 || stats.overdue_loans > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm">
          <div className="font-medium text-red-800 flex items-center gap-2">
            <AlertTriangle size={16} />
            התראות דחופות:
          </div>
          <div className="mt-1 text-red-700 space-y-0.5">
            {stats.overdue_inspection > 0 && <div>• {stats.overdue_inspection} פריטים עברו תאריך בדיקה</div>}
            {stats.overdue_loans > 0 && <div>• {stats.overdue_loans} פריטים מושאלים ולא הוחזרו בזמן</div>}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-medium text-slate-700 mb-4">הוספת ציוד חדש</h3>
          <form onSubmit={addEquipment} className="grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-slate-600 mb-1">שם הפריט *</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">סוג</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">מותג</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">דגם</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">מספר סידורי</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">בעלות</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.owner_type} onChange={e => setForm({...form, owner_type: e.target.value})}>
                <option value="club">מועדון</option>
                <option value="student">תלמיד</option>
                <option value="member">חבר</option>
              </select>
            </div>
            {form.owner_type !== 'club' && (
              <div>
                <label className="block text-slate-600 mb-1">שם הבעלים</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} />
              </div>
            )}
            <div>
              <label className="block text-slate-600 mb-1">תאריך רכישה</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">מחיר ₪</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">בדיקה הבאה</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.next_inspection} onChange={e => setForm({...form, next_inspection: e.target.value})} />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">מחזור בדיקה (חודשים)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.inspection_interval_months} onChange={e => setForm({...form, inspection_interval_months: e.target.value})} />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
            </div>
          </form>
        </div>
      )}

      {/* Main content */}
      {selected ? (
        <EquipmentProfile item={selected} onBack={() => setSelected(null)} onRefresh={refreshSelected} />
      ) : (
        <EquipmentList equipment={equipment} onSelect={selectItem} activeId={selected?.id} />
      )}
    </div>
  );
}
