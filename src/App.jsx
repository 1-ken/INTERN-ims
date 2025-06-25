import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import InternDashboard from './components/dashboards/InternDashboard';
import HrDashboard from './components/dashboards/HrDashboard';
import MentorDashboard from './components/dashboards/MentorDashboard';
import CountyLiaisonDashboard from './components/dashboards/CountyLiaisonDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />

          {/* Protected Routes */}
          <Route
            path="/intern-dashboard"
            element={
              <ProtectedRoute allowedRoles={['intern']}>
                <InternDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr-dashboard"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HrDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentor-dashboard"
            element={
              <ProtectedRoute allowedRoles={['mentor']}>
                <MentorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/county_liaison-dashboard"
            element={
              <ProtectedRoute allowedRoles={['county_liaison']}>
                <CountyLiaisonDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
