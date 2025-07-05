import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import MentorAssignment from './MentorAssignment';
import HrTimesheetApproval from './HrTimesheetApproval';
import ChecklistManagement from './ChecklistManagement';
import UserManagement from './UserManagement';
import ContractManagement from './ContractManagement';
import { KENYA_INSTITUTIONS } from '../../data/institutions';
import { KENYA_COUNTIES } from '../../data/constants';
import moment from 'moment';

export default function HrDashboard() {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [interns, setInterns] = useState([]);
  const [attachees, setAttachees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const fetchData = async () => {
    if (currentUser) {
      try {
        setLoading(true);
        // Fetch HR profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }

        // Fetch all interns with their contract information
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const internsList = [];
        const attacheesList = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          if (userData.role === 'intern') {
            // Get contract information from intern_profiles
            const profileDoc = await getDoc(doc(db, 'intern_profiles', userDoc.id));
            let contractInfo = {};
            
            if (profileDoc.exists()) {
              const profileData = profileDoc.data();
              contractInfo = {
                contractType: profileData.contractType || null,
                contractStartDate: profileData.contractStartDate || null,
                contractEndDate: profileData.contractEndDate || null,
                contractDuration: profileData.contractDuration || null,
                mentorUid: profileData.mentorUid || null
              };
            }
            
            internsList.push({ 
              id: userDoc.id, 
              ...userData,
              ...contractInfo,
              // Default to active if isActive field doesn't exist (for existing users)
              isActive: userData.isActive !== undefined ? userData.isActive : true
            });
          } else if (userData.role === 'attachee') {
            // Get contract information from attachee_profiles
            const profileDoc = await getDoc(doc(db, 'attachee_profiles', userDoc.id));
            let contractInfo = {};
            
            if (profileDoc.exists()) {
              const profileData = profileDoc.data();
              contractInfo = {
                contractType: profileData.contractType || null,
                contractStartDate: profileData.contractStartDate || null,
                contractEndDate: profileData.contractEndDate || null,
                contractDuration: profileData.contractDuration || null,
                mentorUid: profileData.mentorUid || null
              };
            }
            
            attacheesList.push({ 
              id: userDoc.id, 
              ...userData,
              ...contractInfo,
              // Default to active if isActive field doesn't exist (for existing users)
              isActive: userData.isActive !== undefined ? userData.isActive : true
            });
          }
        }
        
        setInterns(internsList);
        setAttachees(attacheesList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Function to refresh data - can be called from child components
  const refreshData = () => {
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const filteredInterns = interns.filter(intern => {
    const matchesSearch = (intern.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (intern.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (intern.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return intern.department === filter && matchesSearch;
  });

  const filteredAttachees = attachees.filter(attachee => {
    const matchesSearch = (attachee.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (attachee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (attachee.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return attachee.department === filter && matchesSearch;
  });

  const departments = [...new Set([...interns.map(intern => intern.department), ...attachees.map(attachee => attachee.department)])];

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
              <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
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

      {/* Fixed Subnavigation */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('interns')}
                className={`${
                  activeTab === 'interns'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                Interns List
              </button>
              <button
                onClick={() => setActiveTab('attachees')}
                className={`${
                  activeTab === 'attachees'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                Attachees List
              </button>
              <button
                onClick={() => setActiveTab('mentors')}
                className={`${
                  activeTab === 'mentors'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                Mentor Assignment
              </button>
              <button
                onClick={() => setActiveTab('timesheets')}
                className={`${
                  activeTab === 'timesheets'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                Timesheet Approval
              </button>
              <button
                onClick={() => setActiveTab('checklists')}
                className={`${
                  activeTab === 'checklists'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                Checklist Management
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className={`${
                  activeTab === 'contracts'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}
              >
                Contract Management
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* ... [Stats cards remain the same] ... */}
          </div>

          {/* Filters and Search - Only show for Interns and Attachees tabs */}
          {(activeTab === 'interns' || activeTab === 'attachees') && (
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      {departments.map((dept, index) => (
                        <option key={dept || `dept-${index}`} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <button className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Add New {activeTab === 'interns' ? 'Intern' : 'Attachee'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'mentors' && (
            <div className="mb-6">
              <MentorAssignment onDataChange={refreshData} />
            </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="mb-6">
              <HrTimesheetApproval />
            </div>
          )}

          {activeTab === 'checklists' && (
            <div className="mb-6">
              <ChecklistManagement />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="mb-6">
              <UserManagement />
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="mb-6">
              <ContractManagement />
            </div>
          )}

          {activeTab === 'interns' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Interns List
                </h3>
                <span className="text-sm text-gray-500">
                  Showing {filteredInterns.length} of {interns.length + attachees.length} people
                </span>
              </div>
              <div className="border-t border-gray-200">
                {filteredInterns.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">No interns found</div>
                    <p className="text-gray-400 mb-6">
                      {interns.length === 0 
                        ? "No interns have been registered yet. Create some intern accounts to see them here."
                        : "No interns match your current search criteria."
                      }
                    </p>
                    <button className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Add New Intern
                    </button>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          County
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contract
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInterns.map((intern) => (
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
                                  {intern.fullName || `Unnamed ${intern.role === 'attachee' ? 'Attachee' : 'Intern'}`}
                                  {intern.role === 'attachee' && (
                                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                      Attachee
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {intern.email || 'No email provided'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{intern.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {KENYA_COUNTIES.find(county => county.code === intern.countyCode)?.name || 'Unknown County'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {intern.contractType ? (
                                <div>
                                  <span className="capitalize font-medium">{intern.contractType}</span>
                                  {intern.contractDuration && (
                                    <div className="text-xs text-gray-500">
                                      {intern.contractDuration} {intern.contractType === 'monthly' ? 'month(s)' : 'year(s)'}
                                    </div>
                                  )}
                                  {intern.contractEndDate && (
                                    <div className="text-xs text-gray-500">
                                      Ends: {moment(intern.contractEndDate.seconds * 1000).format('MMM DD, YYYY')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              intern.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {intern.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedIntern(intern)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              View
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attachees' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Attachees List
                </h3>
                <span className="text-sm text-gray-500">
                  Showing {filteredAttachees.length} of {attachees.length} attachees
                </span>
              </div>
              <div className="border-t border-gray-200">
                {filteredAttachees.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">No attachees found</div>
                    <p className="text-gray-400 mb-6">
                      {attachees.length === 0 
                        ? "No attachees have been registered yet. Create some attachee accounts to see them here."
                        : "No attachees match your current search criteria."
                      }
                    </p>
                    <button className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Add New Attachee
                    </button>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attachee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Institution
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contract
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAttachees.map((attachee) => (
                        <tr key={attachee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {(attachee.fullName || 'U').charAt(0)}
                                </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {attachee.fullName || 'Unnamed Attachee'}
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                    Attachee
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {attachee.email || 'No email provided'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{attachee.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {KENYA_INSTITUTIONS.find(inst => inst.id === attachee.institution)?.name || 'Unknown Institution'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {attachee.contractType ? (
                                <div>
                                  <span className="capitalize font-medium">{attachee.contractType}</span>
                                  {attachee.contractDuration && (
                                    <div className="text-xs text-gray-500">
                                      {attachee.contractDuration} {attachee.contractType === 'monthly' ? 'month(s)' : 'year(s)'}
                                    </div>
                                  )}
                                  {attachee.contractEndDate && (
                                    <div className="text-xs text-gray-500">
                                      Ends: {moment(attachee.contractEndDate.seconds * 1000).format('MMM DD, YYYY')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              attachee.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {attachee.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedIntern(attachee)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              View
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Person Details Modal */}
      {selectedIntern && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => setSelectedIntern(null)}
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
                      {selectedIntern.role === 'attachee' ? 'Attachee' : 'Intern'} Details
                    </h3>
                    <div className="mt-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedIntern.fullName || `Unnamed ${selectedIntern.role === 'attachee' ? 'Attachee' : 'Intern'}`}
                          {selectedIntern.role === 'attachee' && (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              Attachee
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedIntern.email || 'No email provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedIntern.role || 'No role assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedIntern.department || 'No department assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">County Code</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedIntern.countyCode || 'No county code assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contract Information</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {selectedIntern.contractType ? (
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">Type:</span> <span className="capitalize">{selectedIntern.contractType}</span>
                              </div>
                              {selectedIntern.contractDuration && (
                                <div>
                                  <span className="font-medium">Duration:</span> {selectedIntern.contractDuration} {selectedIntern.contractType === 'monthly' ? 'month(s)' : 'year(s)'}
                                </div>
                              )}
                              {selectedIntern.contractStartDate && (
                                <div>
                                  <span className="font-medium">Start Date:</span> {moment(selectedIntern.contractStartDate.seconds * 1000).format('MMM DD, YYYY')}
                                </div>
                              )}
                              {selectedIntern.contractEndDate && (
                                <div>
                                  <span className="font-medium">End Date:</span> {moment(selectedIntern.contractEndDate.seconds * 1000).format('MMM DD, YYYY')}
                                </div>
                              )}
                              {selectedIntern.contractStartDate && selectedIntern.contractEndDate && (
                                <div>
                                  <span className="font-medium">Time Remaining:</span> 
                                  <span className="ml-1 text-indigo-600">
                                    {(() => {
                                      const now = moment();
                                      const endDate = moment(selectedIntern.contractEndDate.seconds * 1000);
                                      const daysRemaining = endDate.diff(now, 'days');
                                      
                                      if (daysRemaining > 0) {
                                        return `${daysRemaining} day(s) remaining`;
                                      } else if (daysRemaining === 0) {
                                        return 'Expires today';
                                      } else {
                                        return `Expired ${Math.abs(daysRemaining)} day(s) ago`;
                                      }
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No contract set</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setSelectedIntern(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
