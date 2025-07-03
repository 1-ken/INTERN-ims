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
  where 
} from 'firebase/firestore';
import { db } from '../../firebase';

export default function ContractManagement() {
  const { currentUser } = useAuth();
  const [interns, setInterns] = useState([]);
  const [attachees, setAttachees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [contractData, setContractData] = useState({
    contractType: '',
    contractStartDate: '',
    contractEndDate: ''
  });

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
          contractEndDate: null
        };
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          contractInfo = {
            contractType: profileData.contractType || null,
            contractStartDate: profileData.contractStartDate || null,
            contractEndDate: profileData.contractEndDate || null
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
          contractEndDate: null
        };
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          contractInfo = {
            contractType: profileData.contractType || null,
            contractStartDate: profileData.contractStartDate || null,
            contractEndDate: profileData.contractEndDate || null
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

  const handleContractUpdate = async (internId) => {
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
      
      const profileRef = doc(db, 'intern_profiles', internId);
      
      // Check if profile exists
      const profileDoc = await getDoc(profileRef);
      
      const contractUpdateData = {
        contractType: contractData.contractType,
        contractStartDate: new Date(contractData.contractStartDate),
        contractEndDate: new Date(contractData.contractEndDate),
        contractUpdatedAt: new Date(),
        contractUpdatedBy: currentUser.uid
      };
      
      if (profileDoc.exists()) {
        // Update existing profile
        await updateDoc(profileRef, contractUpdateData);
      } else {
        // Create new profile with contract data
        await setDoc(profileRef, {
          internUid: internId,
          ...contractUpdateData,
          createdAt: new Date()
        });
      }
      
      setSuccess('Contract updated successfully');
      setSelectedIntern(null);
      setContractData({
        contractType: '',
        contractStartDate: '',
        contractEndDate: ''
      });
      
      // Refresh the interns list
      await fetchInterns();
      
    } catch (err) {
      console.error('Error updating contract:', err);
      setError('Failed to update contract');
    }
  };

  const openContractModal = (intern) => {
    setSelectedIntern(intern);
    setContractData({
      contractType: intern.contractType || '',
      contractStartDate: intern.contractStartDate ? 
        new Date(intern.contractStartDate.seconds * 1000).toISOString().split('T')[0] : '',
      contractEndDate: intern.contractEndDate ? 
        new Date(intern.contractEndDate.seconds * 1000).toISOString().split('T')[0] : ''
    });
    setError('');
    setSuccess('');
  };

  const getContractStatus = (intern) => {
    if (!intern.contractType) {
      return { status: 'No Contract', color: 'bg-gray-100 text-gray-800' };
    }
    
    const now = new Date();
    const startDate = intern.contractStartDate ? new Date(intern.contractStartDate.seconds * 1000) : null;
    const endDate = intern.contractEndDate ? new Date(intern.contractEndDate.seconds * 1000) : null;
    
    if (startDate && endDate) {
      if (now < startDate) {
        return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
      } else if (now >= startDate && now <= endDate) {
        return { status: 'Active', color: 'bg-green-100 text-green-800' };
      } else {
        return { status: 'Expired', color: 'bg-red-100 text-red-800' };
      }
    }
    
    return { status: intern.contractType, color: 'bg-yellow-100 text-yellow-800' };
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
          Manage intern contracts and set contract types (Monthly or Early).
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

      <div className="border-t border-gray-200">
        {interns.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg mb-2">No interns found</div>
            <p className="text-gray-400 text-sm">
              Interns will appear here once they are registered in the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intern
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interns.map((intern) => {
                  const contractStatus = getContractStatus(intern);
                  return (
                    <tr key={intern.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {(intern.fullName || 'U').charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {intern.fullName || 'Unnamed Intern'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {intern.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {intern.department || 'No department'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {intern.contractType ? (
                          <span className="capitalize">{intern.contractType}</span>
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
                        {intern.contractStartDate && intern.contractEndDate ? (
                          <div>
                            <div>{new Date(intern.contractStartDate.seconds * 1000).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              to {new Date(intern.contractEndDate.seconds * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openContractModal(intern)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {intern.contractType ? 'Edit Contract' : 'Set Contract'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Modal */}
      {selectedIntern && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {contractData.contractType ? 'Edit' : 'Set'} Contract for {selectedIntern.fullName}
                    </h3>
                    
                    <div className="mt-4 space-y-4">
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
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contract End Date
                        </label>
                        <input
                          type="date"
                          value={contractData.contractEndDate}
                          onChange={(e) => setContractData({...contractData, contractEndDate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleContractUpdate(selectedIntern.id)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {contractData.contractType ? 'Update Contract' : 'Set Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIntern(null)}
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
