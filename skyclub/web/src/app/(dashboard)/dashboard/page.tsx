'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [studentStats, setStudentStats] = useState<any>(null);
  const [equipmentStats, setEquipmentStats] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.students.stats(),
      api.equipment.stats(),
      api.weather.current(),
      api.courses.list(),
    ]).then(([s, e, w, c]) => {
      setStudentStats(s);
      setEquipmentStats(e);
      setWeather(w);
      setCourses(c);
    }).catch(console.error);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {weather && (
        <div className={`rounded-xl p-4 mb-6 flex items-center gap-4 border ${weather.isFlyable ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <span className="text-4xl">{weather.isFlyable ? '✅' : '⚠️'}</span>
          <div>
            <div className={`font-semibold text-lg ${weather.isFlyable ? 'text-green-800' : 'text-amber-800'}`}>
              {weather.isFlyable ? 'Good flying conditions today' : 'Marginal conditions — check before flying'}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">
              {weather.tempC}°C · Wind {weather.windKmh?.toFixed(0)} km/h · Gusts {weather.gustKmh?.toFixed(0)} km/h · Cloud {weather.cloudPct}%
              {weather.windows && (
                <span className="ml-3">
                  | Beginner: {weather.windows.beginner ? '✓' : '✗'} · Advanced: {weather.windows.advanced ? '✓' : '✗'} · Paramotor: {weather.windows.paramotor ? '✓' : '✗'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={studentStats?.total ?? '—'} icon="👥" color="blue" />
        <StatCard label="Active Students" value={studentStats?.active ?? '—'} icon="✈️" color="green" />
        <StatCard label="Equipment Items" value={equipmentStats?.total ?? '—'} icon="🪂" color="purple" />
        <StatCard label="Open Service Orders" value={equipmentStats?.openServiceOrders ?? '—'} icon="🔧" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Active Courses</h2>
          <div className="space-y-3">
            {courses.filter(c => c.status === 'ACTIVE').slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.level} · {c._count?.enrollments || 0}/{c.maxStudents} students</div>
                </div>
                <span className="badge bg-green-100 text-green-700">Active</span>
              </div>
            ))}
            {courses.filter(c => c.status === 'ACTIVE').length === 0 && (
              <p className="text-sm text-gray-400">No active courses</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Student Overview</h2>
          <div className="space-y-3">
            {[
              { label: 'Prospects', value: studentStats?.prospect, color: 'bg-blue-100 text-blue-700' },
              { label: 'Active', value: studentStats?.active, color: 'bg-green-100 text-green-700' },
              { label: 'Graduated', value: studentStats?.graduated, color: 'bg-purple-100 text-purple-700' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`badge ${item.color}`}>{item.value ?? 0}</span>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="font-bold text-lg">{studentStats?.total ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
