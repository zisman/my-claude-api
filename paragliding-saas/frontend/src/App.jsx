import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Equipment from './pages/Equipment.jsx';
import Finance from './pages/Finance.jsx';
import Students from './pages/Students.jsx';
import Courses from './pages/Courses.jsx';
import Flights from './pages/Flights.jsx';
import Marketing from './pages/Marketing.jsx';
import Social from './pages/Social.jsx';
import Weather from './pages/Weather.jsx';
import { Spinner } from './components/ui/index.jsx';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/equipment" element={<PrivateRoute><Equipment /></PrivateRoute>} />
      <Route path="/finance" element={<PrivateRoute roles={['admin','instructor']}><Finance /></PrivateRoute>} />
      <Route path="/students" element={<PrivateRoute roles={['admin','instructor']}><Students /></PrivateRoute>} />
      <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
      <Route path="/flights" element={<PrivateRoute roles={['admin','instructor']}><Flights /></PrivateRoute>} />
      <Route path="/marketing" element={<PrivateRoute roles={['admin','instructor']}><Marketing /></PrivateRoute>} />
      <Route path="/social" element={<PrivateRoute roles={['admin','instructor']}><Social /></PrivateRoute>} />
      <Route path="/weather" element={<PrivateRoute><Weather /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
