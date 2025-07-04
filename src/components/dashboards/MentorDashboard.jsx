import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import MentorApproval from './MentorApproval';

export default function MentorDashboard() {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [assignedMentees, setAssignedMentees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (currentUser) {
        try {
          // Fetch mentor profile
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
            
            // Fetch intern profiles assigned to this mentor
            const internProfilesQuery = query(
              collection(db, 'intern_profiles'),
              where('mentorUid', '==', currentUser.uid)
            );
            const internProfilesSnapshot = await getDocs(internProfilesQuery);
            
            // Fetch attachee profiles assigned to this mentor
            const attacheeProfilesQuery = query(
              collection(db, 'attachee_profiles'),
              where('mentorUid', '==', currentUser.uid)
            );
            const attacheeProfilesSnapshot = await getDocs(attacheeProfilesQuery);
            
            // Combine all profile IDs
            const internUids = internProfilesSnapshot.docs.map(doc => doc.data().internUid);
            const attacheeUids = attacheeProfilesSnapshot.docs.map(doc => doc.data().attacheeUid);
            const allUids = [...internUids, ...attacheeUids];
            
            // Fetch user details for all mentees
            const menteesList = [];
            for (const uid of allUids) {
              const userDoc = await getDoc(doc(db, 'users', uid));
              if (userDoc.exists()) {
                menteesList.push({
                  id: userDoc.id,
                  ...userDoc.data(),
                  type: userDoc.data().role // 'intern' or 'attachee'
                });
              }
            }
            
            setAssignedMentees(menteesList);
          }
        } catch (error) {
          console.error('Error fetching mentor data:', error);
        }
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Mentor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {userProfile?.fullName}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Mentor Info */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Mentor Information
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Department: {userProfile?.department}
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userProfile?.fullName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userProfile?.email}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">A</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Assigned Mentees
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                      {assignedMentees.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timesheet Approvals */}
          <div className="mb-6">
            <MentorApproval />
          </div>

          {/* Assigned Mentees */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Assigned Mentees
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Interns and Attachees assigned to you
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {assignedMentees.map((mentee) => (
                  <li key={mentee.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {mentee.fullName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-indigo-600">
                              {mentee.fullName}
                            </div>
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                              {mentee.type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {mentee.email}
                          </div>
                        </div>
                      </div>
                      <div>
                        <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                          View Progress
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
