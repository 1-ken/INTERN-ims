import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function MentorAssignment() {
  const [internsNeedingMentors, setInternsNeedingMentors] = useState([]);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [mentorLoads, setMentorLoads] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMentors, setSelectedMentors] = useState({});

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

  const assignMentor = async (intern) => {
    const selectedMentorId = selectedMentors[intern.id];
    if (!selectedMentorId) {
      setError('Please select a mentor first');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setError('');
      
      if (intern.profileId) {
        // Update existing profile
        await updateDoc(doc(db, 'intern_profiles', intern.profileId), {
          mentorUid: selectedMentorId,
          assignedAt: new Date()
        });
      } else {
        // Create new profile using setDoc with intern UID as document ID
        await setDoc(doc(db, 'intern_profiles', intern.id), {
          internUid: intern.id,
          mentorUid: selectedMentorId,
          department: intern.department,
          assignedAt: new Date(),
          createdAt: new Date(),
          checklistProgress: [],
          documents: {}
        });
      }

      setSuccess(`Mentor assigned successfully to ${intern.fullName}`);
      
      // Clear selection
      setSelectedMentors(prev => {
        const updated = { ...prev };
        delete updated[intern.id];
        return updated;
      });
      
      // Refresh data
      await fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error assigning mentor:', err);
      setError(`Failed to assign mentor: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    }
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
                          Assign Mentor
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
    </div>
  );
}
