import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import moment from 'moment';

export default function MentorAssignment({ onDataChange }) {
  const [internsNeedingMentors, setInternsNeedingMentors] = useState([]);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [mentorLoads, setMentorLoads] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMentors, setSelectedMentors] = useState({});
  const [contractData, setContractData] = useState({});
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedInternForContract, setSelectedInternForContract] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchInternsNeedingMentors(),
        fetchAvailableMentors(),
        fetchMentorLoads()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInternsNeedingMentors = async () => {
    try {
      // Get all interns from users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'intern')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const internsWithoutMentors = [];

      // Check each intern for mentor assignment
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Check if intern has a mentor assigned in intern_profiles
        const profileQuery = query(
          collection(db, 'intern_profiles'),
          where('internUid', '==', userDoc.id)
        );
        
        const profileSnapshot = await getDocs(profileQuery);
        let hasMentor = false;
        let profileId = null;
        
        if (!profileSnapshot.empty) {
          const profileData = profileSnapshot.docs[0].data();
          profileId = profileSnapshot.docs[0].id;
          hasMentor = profileData.mentorUid != null;
        }
        
        // If no mentor assigned, add to list
        if (!hasMentor) {
          internsWithoutMentors.push({
            id: userDoc.id,
            profileId: profileId,
            ...userData,
            mentorUid: null
          });
        }
      }

      setInternsNeedingMentors(internsWithoutMentors);
    } catch (err) {
      console.error('Error fetching interns needing mentors:', err);
      setError('Failed to load interns needing mentors');
    }
  };

  const fetchAvailableMentors = async () => {
    try {
      const mentorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'mentor')
      );
      
      const mentorsSnapshot = await getDocs(mentorsQuery);
      const mentorsList = mentorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailableMentors(mentorsList);
    } catch (err) {
      console.error('Error fetching mentors:', err);
    }
  };

  const fetchMentorLoads = async () => {
    try {
      const internProfilesSnapshot = await getDocs(collection(db, 'intern_profiles'));
      const loads = {};
      
      internProfilesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.mentorUid) {
          loads[data.mentorUid] = (loads[data.mentorUid] || 0) + 1;
        }
      });
      
      setMentorLoads(loads);
    } catch (err) {
      console.error('Error fetching mentor loads:', err);
    }
  };

  const getEligibleMentors = (internDepartment) => {
    return availableMentors.filter(mentor => 
      mentor.department === internDepartment && 
      (mentorLoads[mentor.id] || 0) < 5
    );
  };

  const handleMentorSelection = (internId, mentorId) => {
    setSelectedMentors(prev => ({
      ...prev,
      [internId]: mentorId
    }));
  };

  const openContractModal = (intern) => {
    setSelectedInternForContract(intern);
    setContractData({
      contractType: '',
      contractStartDate: moment().format('YYYY-MM-DD'),
      duration: 1
    });
    setShowContractModal(true);
  };

  const assignMentorWithContract = async () => {
    const intern = selectedInternForContract;
    const selectedMentorId = selectedMentors[intern.id];
    
    if (!selectedMentorId) {
      setError('Please select a mentor first');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!contractData.contractType) {
      setError('Please select a contract type');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!contractData.contractStartDate) {
      setError('Please set contract start date');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!contractData.duration || contractData.duration < 1) {
      setError('Please set a valid duration');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setError('');
      
      // Calculate end date based on contract type and duration
      const startDate = moment(contractData.contractStartDate);
      let endDate;
      
      if (contractData.contractType === 'monthly') {
        endDate = startDate.clone().add(contractData.duration, 'months');
      } else if (contractData.contractType === 'yearly') {
        endDate = startDate.clone().add(contractData.duration, 'years');
      }
      
      const profileData = {
        mentorUid: selectedMentorId,
        assignedAt: new Date(),
        contractType: contractData.contractType,
        contractStartDate: startDate.toDate(),
        contractEndDate: endDate.toDate(),
        contractDuration: contractData.duration,
        contractCreatedAt: new Date()
      };

      if (intern.profileId) {
        // Update existing profile
        await updateDoc(doc(db, 'intern_profiles', intern.profileId), profileData);
      } else {
        // Create new profile using setDoc with intern UID as document ID
        await setDoc(doc(db, 'intern_profiles', intern.id), {
          internUid: intern.id,
          department: intern.department,
          createdAt: new Date(),
          checklistProgress: [],
          documents: {},
          ...profileData
        });
      }

      setSuccess(`Mentor and contract assigned successfully to ${intern.fullName}`);
      setShowContractModal(false);
      setSelectedInternForContract(null);
      
      // Clear selection
      setSelectedMentors(prev => {
        const updated = { ...prev };
        delete updated[intern.id];
        return updated;
      });
      
      // Refresh data
      await fetchData();
      // Notify parent component to refresh data
      if (onDataChange) {
        onDataChange();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error assigning mentor and contract:', err);
      setError(`Failed to assign mentor and contract: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const assignMentor = async (intern) => {
    const selectedMentorId = selectedMentors[intern.id];
    if (!selectedMentorId) {
      setError('Please select a mentor first');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Open contract modal for setting contract details
    openContractModal(intern);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mentor Assignment</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {internsNeedingMentors.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg mb-2">All interns have been assigned mentors</div>
          <p className="text-gray-400 text-sm">
            New interns will appear here when they register and need mentor assignment.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {internsNeedingMentors.length} intern{internsNeedingMentors.length !== 1 ? 's' : ''} need{internsNeedingMentors.length === 1 ? 's' : ''} mentor assignment
            </p>
          </div>

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
                    Available Mentors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {internsNeedingMentors.map((intern) => {
                  const eligibleMentors = getEligibleMentors(intern.department);
                  return (
                    <tr key={intern.id}>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {intern.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {eligibleMentors.length > 0 ? (
                          <select
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={selectedMentors[intern.id] || ''}
                            onChange={(e) => handleMentorSelection(intern.id, e.target.value)}
                          >
                            <option value="">Select a mentor</option>
                            {eligibleMentors.map((mentor) => (
                              <option key={mentor.id} value={mentor.id}>
                                {mentor.fullName} ({mentorLoads[mentor.id] || 0}/5 interns)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-red-500">No available mentors in this department</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => assignMentor(intern)}
                          disabled={!selectedMentors[intern.id] || eligibleMentors.length === 0}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1 rounded-md text-sm"
                        >
                          Assign Mentor & Contract
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Contract Modal */}
      {showContractModal && selectedInternForContract && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => {
                setShowContractModal(false);
                setSelectedInternForContract(null);
                setError('');
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
                      Set Contract for {selectedInternForContract.fullName}
                    </h3>
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}
                    
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
                          <option value="yearly">Yearly</option>
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
                          Duration ({contractData.contractType === 'monthly' ? 'Months' : contractData.contractType === 'yearly' ? 'Years' : 'Duration'})
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={contractData.contractType === 'monthly' ? '24' : '5'}
                          value={contractData.duration}
                          onChange={(e) => setContractData({...contractData, duration: parseInt(e.target.value) || 1})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder={contractData.contractType === 'monthly' ? 'Number of months' : contractData.contractType === 'yearly' ? 'Number of years' : 'Duration'}
                        />
                      </div>

                      {contractData.contractStartDate && contractData.contractType && contractData.duration && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-sm text-blue-700">
                            <strong>Contract Period:</strong><br/>
                            Start: {moment(contractData.contractStartDate).format('MMM DD, YYYY')}<br/>
                            End: {contractData.contractType === 'monthly' 
                              ? moment(contractData.contractStartDate).add(contractData.duration, 'months').format('MMM DD, YYYY')
                              : contractData.contractType === 'yearly'
                              ? moment(contractData.contractStartDate).add(contractData.duration, 'years').format('MMM DD, YYYY')
                              : 'N/A'
                            }<br/>
                            Duration: {contractData.duration} {contractData.contractType === 'monthly' ? 'month(s)' : contractData.contractType === 'yearly' ? 'year(s)' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={assignMentorWithContract}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Assign Mentor & Contract
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowContractModal(false);
                    setSelectedInternForContract(null);
                    setError('');
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
