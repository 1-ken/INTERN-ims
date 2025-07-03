import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import OnboardingChecklist from './OnboardingChecklist';
import TimesheetForm from './TimesheetForm';
import moment from 'moment';

export default function AttacheeDashboard() {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [mentorInfo, setMentorInfo] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    async function fetchUserProfile() {
      if (currentUser) {
        try {
          // Fetch user profile
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }

          // Fetch mentor and contract information
          await fetchMentorAndContractInfo();
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      setLoading(false);
    }

    fetchUserProfile();
  }, [currentUser]);

  const fetchMentorAndContractInfo = async () => {
    try {
      // Check if attachee has a mentor assigned in attachee_profiles
      const attacheeProfileQuery = query(
        collection(db, 'attachee_profiles'),
        where('attacheeUid', '==', currentUser.uid)
      );
      
      const attacheeProfileSnapshot = await getDocs(attacheeProfileQuery);
      
      if (!attacheeProfileSnapshot.empty) {
        const attacheeProfile = attacheeProfileSnapshot.docs[0].data();
        
        // Set contract information
        if (attacheeProfile.contractType) {
          setContractInfo({
            contractType: attacheeProfile.contractType,
            contractStartDate: attacheeProfile.contractStartDate,
            contractEndDate: attacheeProfile.contractEndDate,
            contractCreatedAt: attacheeProfile.contractCreatedAt
          });
        }
        
        if (attacheeProfile.mentorUid) {
          // Fetch mentor details
          const mentorDoc = await getDoc(doc(db, 'users', attacheeProfile.mentorUid));
          if (mentorDoc.exists()) {
            setMentorInfo({
              ...mentorDoc.data(),
              id: mentorDoc.id,
              assignedAt: attacheeProfile.assignedAt
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching mentor and contract info:', error);
    }
  };

  const getContractStatus = () => {
    if (!contractInfo || !contractInfo.contractStartDate || !contractInfo.contractEndDate) {
      return { status: 'No Contract', color: 'bg-gray-100 text-gray-800', timeRemaining: null };
    }
    
    const now = moment();
    const startDate = moment(contractInfo.contractStartDate.seconds * 1000);
    const endDate = moment(contractInfo.contractEndDate.seconds * 1000);
    
    if (now.isBefore(startDate)) {
      const daysUntilStart = startDate.diff(now, 'days');
      return { 
        status: 'Upcoming', 
        color: 'bg-blue-100 text-blue-800',
        timeRemaining: `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`
      };
    } else if (now.isBetween(startDate, endDate)) {
      const daysRemaining = endDate.diff(now, 'days');
      const hoursRemaining = endDate.diff(now, 'hours') % 24;
      return { 
        status: 'Active', 
        color: 'bg-green-100 text-green-800',
        timeRemaining: daysRemaining > 0 
          ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
          : `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining`
      };
    } else {
      const daysExpired = now.diff(endDate, 'days');
      return { 
        status: 'Expired', 
        color: 'bg-red-100 text-red-800',
        timeRemaining: `Expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago`
      };
    }
  };

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

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return <OnboardingChecklist />;
      case 'timesheet':
        return <TimesheetForm />;
      case 'tasks':
        return (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                My Tasks
              </h3>
              <p className="text-gray-600">Task management functionality coming soon...</p>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Reports
              </h3>
              <p className="text-gray-600">Report submission functionality coming soon...</p>
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Messages
              </h3>
              <p className="text-gray-600">Messaging functionality coming soon...</p>
            </div>
          </div>
        );
      default:
        return (
          <>
            {/* Profile Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Profile Information
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userProfile?.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userProfile?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{userProfile?.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userProfile?.department}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">County Code</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userProfile?.countyCode}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Assigned Mentor</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {mentorInfo ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-medium text-sm">
                                {mentorInfo.fullName?.charAt(0) || 'M'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{mentorInfo.fullName}</div>
                            <div className="text-gray-500 text-xs">{mentorInfo.email}</div>
                            {mentorInfo.assignedAt && (
                              <div className="text-gray-400 text-xs">
                                Assigned: {new Date(mentorInfo.assignedAt.seconds * 1000).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 font-medium text-sm">?</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">No mentor assigned yet</div>
                            <div className="text-gray-400 text-xs">
                              Your mentor will be assigned by HR soon
                            </div>
                          </div>
                        </div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contract Information</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {contractInfo ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="capitalize font-medium">{contractInfo.contractType}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getContractStatus().color}`}>
                              {getContractStatus().status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {moment(contractInfo.contractStartDate.seconds * 1000).format('MMM DD, YYYY')} - {moment(contractInfo.contractEndDate.seconds * 1000).format('MMM DD, YYYY')}
                          </div>
                          {getContractStatus().timeRemaining && (
                            <div className="text-xs font-medium text-indigo-600">
                              {getContractStatus().timeRemaining}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">No contract assigned yet</div>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">✓</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Requirements
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button 
                            onClick={() => setActiveTab('onboarding')}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            View requirements
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">⏰</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Timesheet
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button 
                            onClick={() => setActiveTab('timesheet')}
                            className="text-pink-600 hover:text-pink-800"
                          >
                            Submit hours
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">T</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Tasks
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button 
                            onClick={() => setActiveTab('tasks')}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            View tasks
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">R</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Reports
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button 
                            onClick={() => setActiveTab('reports')}
                            className="text-green-600 hover:text-green-800"
                          >
                            Submit reports
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">M</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Messages
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button 
                            onClick={() => setActiveTab('messages')}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            View messages
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Attachee Dashboard</h1>
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

      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('onboarding')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'onboarding'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Onboarding Requirements
            </button>
            <button
              onClick={() => setActiveTab('timesheet')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'timesheet'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Timesheet
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'reports'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'messages'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Messages
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
