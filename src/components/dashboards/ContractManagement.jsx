import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import moment from 'moment';

export default function ContractManagement() {
  const { currentUser } = useAuth();
  const [interns, setInterns] = useState([]);
  const [attachees, setAttachees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('interns');
  const [contractData, setContractData] = useState({
    contractType: '',
    contractStartDate: '',
    contractEndDate: '',
    contractDuration: ''
  });
  const [actionType, setActionType] = useState(''); // 'extend', 'terminate', 'edit'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  useEffect(() => {
    fetchInterns();
    fetchAttachees();
  }, []);

  const fetchInterns = async () => {
    try {
      setLoading(true);
      
      // Fetch all interns from users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'intern')
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const internsList = [];
      
      // For each intern, get their profile data including contract info
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Get intern profile data
        const profileDoc = await getDoc(doc(db, 'intern_profiles', userDoc.id));
        let contractInfo = {
          contractType: null,
          contractStartDate: null,
          contractEndDate: null,
          contractTerminated: false
        };
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          contractInfo = {
            contractType: profileData.contractType || null,
            contractStartDate: profileData.contractStartDate || null,
            contractEndDate: profileData.contractEndDate || null,
            contractDuration: profileData.contractDuration || null,
            contractTerminated: profileData.contractTerminated || false,
            terminationReason: profileData.terminationReason || null
          };
        }
        
        internsList.push({
          id: userDoc.id,
          ...userData,
          ...contractInfo
        });
      }
      
      setInterns(internsList);
    } catch (err) {
      console.error('Error fetching interns:', err);
      setError('Failed to load interns');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachees = async () => {
    try {
      setLoading(true);
      
      // Fetch all attachees from users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'attachee')
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const attacheesList = [];
      
      // For each attachee, get their profile data including contract info
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Get attachee profile data
        const profileDoc = await getDoc(doc(db, 'attachee_profiles', userDoc.id));
        let contractInfo = {
          contractType: null,
          contractStartDate: null,
          contractEndDate: null,
          contractTerminated: false
        };
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          contractInfo = {
            contractType: profileData.contractType || null,
            contractStartDate: profileData.contractStartDate || null,
            contractEndDate: profileData.contractEndDate || null,
            contractDuration: profileData.contractDuration || null,
            contractTerminated: profileData.contractTerminated || false,
            terminationReason: profileData.terminationReason || null
          };
        }
        
        attacheesList.push({
          id: userDoc.id,
          ...userData,
          ...contractInfo
        });
      }
      
      setAttachees(attacheesList);
    } catch (err) {
      console.error('Error fetching attachees:', err);
      setError('Failed to load attachees');
    } finally {
      setLoading(false);
    }
  };

  const handleContractUpdate = async (userId, userRole) => {
    try {
      setError('');
      setSuccess('');
      
      if (!contractData.contractType) {
        setError('Please select a contract type');
        return;
      }
      
      if (!contractData.contractStartDate) {
        setError('Please select a start date');
        return;
      }
      
      if (!contractData.contractEndDate) {
        setError('Please select an end date');
        return;
      }
      
      // Check if start date is before end date
      if (new Date(contractData.contractStartDate) >= new Date(contractData.contractEndDate)) {
        setError('End date must be after start date');
        return;
      }
      
      const profileCollection = userRole === 'intern' ? 'intern_profiles' : 'attachee_profiles';
      const profileRef = doc(db, profileCollection, userId);
      
      // Check if profile exists
      const profileDoc = await getDoc(profileRef);
      
      const contractUpdateData = {
        contractType: contractData.contractType,
        contractStartDate: new Date(contractData.contractStartDate),
        contractEndDate: new Date(contractData.contractEndDate),
        contractDuration: contractData.contractDuration,
        contractUpdatedAt: serverTimestamp(),
        contractUpdatedBy: currentUser.uid
      };
      
      if (profileDoc.exists()) {
        // Update existing profile
        await updateDoc(profileRef, contractUpdateData);
      } else {
        // Create new profile with contract data
        await setDoc(profileRef, {
          [`${userRole}Uid`]: userId,
          ...contractUpdateData,
          createdAt: serverTimestamp()
        });
      }
      
      setSuccess('Contract updated successfully');
      setSelectedUser(null);
      resetContractData();
      
      // Refresh the lists
      await fetchInterns();
      await fetchAttachees();
      
    } catch (err) {
      console.error('Error updating contract:', err);
      setError('Failed to update contract');
    }
  };

  const handleExtendContract = async (userId, userRole) => {
    try {
      setError('');
      setSuccess('');
      
      if (!contractData.contractEndDate) {
        setError('Please select a new end date');
        return;
      }
      
      const currentEndDate = selectedUser.contractEndDate ? 
        new Date(selectedUser.contractEndDate.seconds * 1000) : new Date();
      const newEndDate = new Date(contractData.contractEndDate);
      
      if (newEndDate <= currentEndDate) {
        setError('New end date must be after the current end date');
        return;
      }
      
      const profileCollection = userRole === 'intern' ? 'intern_profiles' : 'attachee_profiles';
      const profileRef = doc(db, profileCollection, userId);
      
      const extensionData = {
        contractEndDate: newEndDate,
        contractExtendedAt: serverTimestamp(),
        contractExtendedBy: currentUser.uid,
        contractUpdatedAt: serverTimestamp(),
        contractUpdatedBy: currentUser.uid
      };
      
      await updateDoc(profileRef, extensionData);
      
      setSuccess(`Contract extended successfully until ${newEndDate.toLocaleDateString()}`);
      setSelectedUser(null);
      setShowConfirmModal(false);
      resetContractData();
      
      // Refresh the lists
      await fetchInterns();
      await fetchAttachees();
      
    } catch (err) {
      console.error('Error extending contract:', err);
      setError('Failed to extend contract');
    }
  };

  const handleTerminateContract = async (userId, userRole) => {
    try {
      setError('');
      setSuccess('');
      
      if (!terminationReason.trim()) {
        setError('Please provide a reason for termination');
        return;
      }
      
      const profileCollection = userRole === 'intern' ? 'intern_profiles' : 'attachee_profiles';
      const profileRef = doc(db, profileCollection, userId);
      const userRef = doc(db, 'users', userId);
      
      // Update contract profile with termination info
      const terminationData = {
        contractTerminated: true,
        contractTerminatedAt: serverTimestamp(),
        contractTerminatedBy: currentUser.uid,
        terminationReason: terminationReason,
        contractUpdatedAt: serverTimestamp(),
        contractUpdatedBy: currentUser.uid
      };
      
      await updateDoc(profileRef, terminationData);
      
      // Deactivate the user
      const userDeactivationData = {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: currentUser.uid,
        deactivationReason: `Contract terminated: ${terminationReason}`,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      await updateDoc(userRef, userDeactivationData);
      
      setSuccess(`Contract terminated and user deactivated successfully`);
      setSelectedUser(null);
      setShowConfirmModal(false);
      setTerminationReason('');
      resetContractData();
      
      // Refresh the lists
      await fetchInterns();
      await fetchAttachees();
      
    } catch (err) {
      console.error('Error terminating contract:', err);
      setError('Failed to terminate contract');
    }
  };

  const resetContractData = () => {
    setContractData({
      contractType: '',
      contractStartDate: '',
      contractEndDate: '',
      contractDuration: ''
    });
    setActionType('');
  };

  const openContractModal = (user, action = 'edit') => {
    setSelectedUser(user);
    setActionType(action);
    
    if (action === 'extend') {
      setContractData({
        contractType: user.contractType || '',
        contractStartDate: user.contractStartDate ? 
          new Date(user.contractStartDate.seconds * 1000).toISOString().split('T')[0] : '',
        contractEndDate: user.contractEndDate ? 
          moment(user.contractEndDate.seconds * 1000).add(1, 'month').format('YYYY-MM-DD') : '',
        contractDuration: user.contractDuration || ''
      });
    } else {
      setContractData({
        contractType: user.contractType || '',
        contractStartDate: user.contractStartDate ? 
          new Date(user.contractStartDate.seconds * 1000).toISOString().split('T')[0] : '',
        contractEndDate: user.contractEndDate ? 
          new Date(user.contractEndDate.seconds * 1000).toISOString().split('T')[0] : '',
        contractDuration: user.contractDuration || ''
      });
    }
    
    setError('');
    setSuccess('');
  };

  const openConfirmModal = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setShowConfirmModal(true);
    
    if (action === 'extend') {
      setContractData({
        ...contractData,
        contractEndDate: user.contractEndDate ? 
          moment(user.contractEndDate.seconds * 1000).add(1, 'month').format('YYYY-MM-DD') : ''
      });
    }
  };

  const getContractStatus = (user) => {
    if (user.contractTerminated) {
      return { status: 'Terminated', color: 'bg-red-100 text-red-800' };
    }
    
    if (!user.contractType) {
      return { status: 'No Contract', color: 'bg-gray-100 text-gray-800' };
    }
    
    const now = new Date();
    const startDate = user.contractStartDate ? new Date(user.contractStartDate.seconds * 1000) : null;
    const endDate = user.contractEndDate ? new Date(user.contractEndDate.seconds * 1000) : null;
    
    if (startDate && endDate) {
      if (now < startDate) {
        return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
      } else if (now >= startDate && now <= endDate) {
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7) {
          return { status: 'Expiring Soon', color: 'bg-orange-100 text-orange-800' };
        }
        return { status: 'Active', color: 'bg-green-100 text-green-800' };
      } else {
        return { status: 'Expired', color: 'bg-red-100 text-red-800' };
      }
    }
    
    return { status: user.contractType, color: 'bg-yellow-100 text-yellow-800' };
  };

  const renderUserTable = (users, userType) => {
    if (users.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg mb-2">No {userType}s found</div>
          <p className="text-gray-400 text-sm">
            {userType}s will appear here once they are registered in the system.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {userType}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const contractStatus = getContractStatus(user);
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          user.isActive !== false ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <span className={`font-medium ${
                            user.isActive !== false ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(user.fullName || 'U').charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName || `Unnamed ${userType}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department || 'No department'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.contractType ? (
                      <span className="capitalize">{user.contractType}</span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${contractStatus.color}`}>
                      {contractStatus.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.contractStartDate && user.contractEndDate ? (
                      <div>
                        <div>{new Date(user.contractStartDate.seconds * 1000).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          to {new Date(user.contractEndDate.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openContractModal(user, 'edit')}
                        className="text-indigo-600 hover:text-indigo-900"
                        disabled={user.contractTerminated}
                      >
                        {user.contractType ? 'Edit' : 'Set Contract'}
                      </button>
                      {user.contractType && !user.contractTerminated && (
                        <>
                          <button
                            onClick={() => openConfirmModal(user, 'extend')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Extend
                          </button>
                          <button
                            onClick={() => openConfirmModal(user, 'terminate')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Terminate
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading contract data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Contract Management
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage contracts for interns and attachees. Extend, terminate, or modify contract details.
        </p>
      </div>
      
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mx-4 mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Tabs for Interns and Attachees */}
      <div className="border-t border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('interns')}
            className={`${
              activeTab === 'interns'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Interns ({interns.length})
          </button>
          <button
            onClick={() => setActiveTab('attachees')}
            className={`${
              activeTab === 'attachees'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Attachees ({attachees.length})
          </button>
        </nav>
      </div>

      <div className="border-t border-gray-200">
        {activeTab === 'interns' && renderUserTable(interns, 'intern')}
        {activeTab === 'attachees' && renderUserTable(attachees, 'attachee')}
      </div>

      {/* Contract Modal */}
      {selectedUser && !showConfirmModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => {
                setSelectedUser(null);
                resetContractData();
              }}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {actionType === 'extend' ? 'Extend' : contractData.contractType ? 'Edit' : 'Set'} Contract for {selectedUser.fullName}
                    </h3>
                    
                    <div className="mt-4 space-y-4">
                      {actionType !== 'extend' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contract Type
                            </label>
                            <select
                              value={contractData.contractType}
                              onChange={(e) => setContractData({...contractData, contractType: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="">Select contract type</option>
                              <option value="monthly">Monthly</option>
                              <option value="early">Early</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contract Start Date
                            </label>
                            <input
                              type="date"
                              value={contractData.contractStartDate}
                              onChange={(e) => setContractData({...contractData, contractStartDate: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {actionType === 'extend' ? 'New Contract End Date' : 'Contract End Date'}
                        </label>
                        <input
                          type="date"
                          value={contractData.contractEndDate}
                          onChange={(e) => setContractData({...contractData, contractEndDate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {actionType === 'extend' && selectedUser.contractEndDate && (
                          <p className="text-sm text-gray-500 mt-1">
                            Current end date: {new Date(selectedUser.contractEndDate.seconds * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {actionType !== 'extend' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contract Duration (months)
                          </label>
                          <input
                            type="number"
                            value={contractData.contractDuration}
                            onChange={(e) => setContractData({...contractData, contractDuration: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 6"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (actionType === 'extend') {
                      handleExtendContract(selectedUser.id, selectedUser.role);
                    } else {
                      handleContractUpdate(selectedUser.id, selectedUser.role);
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {actionType === 'extend' ? 'Extend Contract' : contractData.contractType ? 'Update Contract' : 'Set Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    resetContractData();
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Extend/Terminate */}
      {showConfirmModal && selectedUser && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => {
                setShowConfirmModal(false);
                setSelectedUser(null);
                setTerminationReason('');
                resetContractData();
              }}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                    actionType === 'terminate' ? 'bg-red-100' : 'bg-green-100'
                  } sm:mx-0 sm:h-10 sm:w-10`}>
                    {actionType === 'terminate' ? (
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {actionType === 'terminate' ? 'Terminate Contract' : 'Extend Contract'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {actionType === 'terminate' 
                          ? `Are you sure you want to terminate the contract for ${selectedUser.fullName}? This will also deactivate their account.`
                          : `Extend the contract for ${selectedUser.fullName}?`
                        }
                      </p>
                      
                      {actionType === 'terminate' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Termination *
                          </label>
                          <textarea
                            value={terminationReason}
                            onChange={(e) => setTerminationReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                            rows="3"
                            placeholder="Please provide a reason for contract termination..."
                          />
                        </div>
                      )}
                      
                      {actionType === 'extend' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New End Date
                          </label>
                          <input
                            type="date"
                            value={contractData.contractEndDate}
                            onChange={(e) => setContractData({...contractData, contractEndDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                          {selectedUser.contractEndDate && (
                            <p className="text-sm text-gray-500 mt-1">
                              Current end date: {new Date(selectedUser.contractEndDate.seconds * 1000).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (actionType === 'terminate') {
                      handleTerminateContract(selectedUser.id, selectedUser.role);
                    } else {
                      handleExtendContract(selectedUser.id, selectedUser.role);
                    }
                  }}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    actionType === 'terminate'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {actionType === 'terminate' ? 'Terminate Contract' : 'Extend Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedUser(null);
                    setTerminationReason('');
                    resetContractData();
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
