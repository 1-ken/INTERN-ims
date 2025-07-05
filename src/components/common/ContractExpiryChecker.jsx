import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkContractExpiries } from '../../utils/notifications';

export default function ContractExpiryChecker() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'hr') return;

    // Run contract expiry check immediately
    checkContractExpiries();

    // Set up interval to check every 24 hours (86400000 ms)
    const interval = setInterval(() => {
      checkContractExpiries();
    }, 86400000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // This component doesn't render anything visible
  return null;
}
