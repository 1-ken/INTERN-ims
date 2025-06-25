import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, getUserRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (!currentUser) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const userRole = await getUserRole();
      
      // If no specific roles are required or user's role is in allowed roles
      setHasAccess(allowedRoles.length === 0 || allowedRoles.includes(userRole));
      setLoading(false);
    }

    checkAccess();
  }, [currentUser, getUserRole, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!hasAccess) {
    // Redirect to appropriate dashboard based on user role
    return <Navigate to="/" />;
  }

  return children;
}
