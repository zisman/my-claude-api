import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Marketing from './pages/Marketing.jsx';
import Customers from './pages/Customers.jsx';
import Students from './pages/Students.jsx';
import Flights from './pages/Flights.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Equipment from './pages/Equipment.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Weather from './pages/Weather.jsx';
import Community from './pages/Community.jsx';
import FlightRoutes from './pages/FlightRoutes.jsx';
import Lessons from './pages/Lessons.jsx';
import AIAssistant from './pages/AIAssistant.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="customers" element={<Customers />} />
          <Route path="students" element={<Students />} />
          <Route path="flights" element={<Flights />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="weather" element={<Weather />} />
          <Route path="community" element={<Community />} />
          <Route path="routes" element={<FlightRoutes />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="ai" element={<AIAssistant />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
