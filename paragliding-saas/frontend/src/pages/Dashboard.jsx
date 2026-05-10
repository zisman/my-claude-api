import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { StatCard, Spinner, PageHeader } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, club } = useAuth();
  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.financeSummary(),
      api.students(),
      api.courses(),
      api.flightStats(),
      api.equipment(),
      api.weatherCurrent(),
    ]).then(([summary, students, courses, flightStats, equipment, weatherData]) => {
      setData({ summary, students, courses, flightStats, equipment });
      setWeather(weatherData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const activeEquipment = data?.equipment?.filter(e => e.status === 'active').length || 0;
  const activeCourses = data?.courses?.filter(c => c.status === 'active').length || 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]} 👋`}
        subtitle={`${club?.name} — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      {weather && (
        <div className={`mb-6 rounded-xl p-4 flex items-center gap-4 ${weather.is_flyable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <span className="text-3xl">{weather.is_flyable ? '✅' : '⛔'}</span>
          <div>
            <div className={`font-semibold ${weather.is_flyable ? 'text-green-800' : 'text-red-800'}`}>
              {weather.is_flyable ? 'Flying conditions are GOOD today' : 'Not ideal flying conditions today'}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">
              {weather.temperature}°C · Wind {weather.wind_speed} km/h · Gusts {weather.wind_gusts} km/h · {weather.conditions}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Monthly Revenue" value={`₪${data?.summary?.income?.toLocaleString() || 0}`} icon="💰" color="green" sub="This month" />
        <StatCard label="Active Students" value={data?.students?.length || 0} icon="👥" color="blue" sub="Total enrolled" />
        <StatCard label="Active Courses" value={activeCourses} icon="🎓" color="purple" sub={`${data?.courses?.length || 0} total`} />
        <StatCard label="Equipment" value={activeEquipment} icon="🪂" color="sky" sub="Active items" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Upcoming Flights</h2>
          <p className="text-sm text-gray-500">
            {data?.flightStats?.upcomingCount || 0} scheduled experience flights
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {data?.flightStats?.byStatus?.map(s => (
              <div key={s.status} className="bg-gray-50 rounded-lg p-3">
                <div className="text-lg font-bold text-gray-900">{s.count}</div>
                <div className="text-xs text-gray-500 capitalize">{s.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Income</span>
              <span className="font-semibold text-green-600">₪{data?.summary?.income?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Expenses</span>
              <span className="font-semibold text-red-600">₪{data?.summary?.expense?.toLocaleString() || 0}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Net</span>
              <span className={`font-bold text-lg ${(data?.summary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₪{data?.summary?.net?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Courses</h2>
          {data?.courses?.length === 0 ? (
            <p className="text-sm text-gray-500">No courses yet</p>
          ) : (
            <div className="space-y-3">
              {data?.courses?.slice(0, 5).map(course => (
                <div key={course.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{course.name}</div>
                    <div className="text-xs text-gray-500">{course.instructor_name} · {course.level}</div>
                  </div>
                  <div className="text-right">
                    <span className={`badge text-xs ${
                      course.status === 'active' ? 'bg-green-100 text-green-700' :
                      course.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                      course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{course.status}</span>
                    <div className="text-xs text-gray-400 mt-1">{course.enrolled_count || 0}/{course.max_students} students</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
