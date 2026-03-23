import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import IosInstallBanner from './components/IosInstallBanner';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminEvents from './pages/admin/Events';
import AdminStaff from './pages/admin/Staff';
import AdminReports from './pages/admin/Reports';
import AdminPayments from './pages/admin/Payments';

import WorkerDashboard from './pages/worker/Dashboard';
import WorkerEvents from './pages/worker/Events';
import WorkerReports from './pages/worker/Reports';
import WorkerPayments from './pages/worker/Payments';

function App() {
  return (
    <AuthProvider>
      <IosInstallBanner />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* Worker Routes */}
          <Route path="/worker" element={
            <ProtectedRoute allowedRoles={['WORKER']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/worker/dashboard" replace />} />
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="events" element={<WorkerEvents />} />
            <Route path="payments" element={<WorkerPayments />} />
            <Route path="reports" element={<WorkerReports />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
