import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function HrTimesheetApproval() {
  const { currentUser } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadTimesheets();
  }, [currentUser, filter]);

  const loadTimesheets = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      let q;
      
      if (filter === 'all') {
        q = query(
          collection(db, 'timesheets'),
          orderBy('submittedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'timesheets'),
          where('status', '==', filter),
          orderBy('submittedAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const timesheetList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()
      }));

      setTimesheets(timesheetList);
    } catch (err) {
      console.error('Error loading timesheets:', err);
      setError('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (timesheetId, approved, reason = '') => {
    try {
      const timesheetRef = doc(db, 'timesheets', timesheetId);
      await updateDoc(timesheetRef, {
        status: approved ? 'approved' : 'rejected',
        approvedAt: approved ? new Date() : null,
        approvedBy: currentUser.uid,
        approvedByRole: 'hr',
        rejectionReason: approved ? null : reason
      });

      // Update local state
      setTimesheets(prev => prev.map(t => 
        t.id === timesheetId 
          ? { 
              ...t, 
              status: approved ? 'approved' : 'rejected',
              approvedAt: approved ? new Date() : null,
              approvedBy: currentUser.uid,
              approvedByRole: 'hr',
              rejectionReason: approved ? null : reason
            }
          : t
      ));

      setSuccess(`Timesheet ${approved ? 'approved' : 'rejected'} successfully by HR`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating timesheet:', err);
      setError('Failed to update timesheet');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">HR Timesheet Approval</h2>
        <div className="flex items-center space-x-4">
          <label htmlFor="filter" className="text-sm font-medium text-gray-700">
            Filter:
          </label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

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

      {timesheets.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No {filter === 'all' ? '' : filter} timesheets found
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Intern Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours & Activities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timesheets.map((timesheet) => (
                <tr key={timesheet.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>
                      <div>{timesheet.internName}</div>
                      <div className="text-xs text-gray-500">{timesheet.department}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {timesheet.week}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="font-medium">
                      {timesheet.totalHours || timesheet.hoursWorked} hours total
                    </div>
                    {timesheet.dailyHours && (
                      <div className="mt-2 space-y-1">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => {
                          const hours = timesheet.dailyHours[day] || 0;
                          const description = timesheet.dailyDescriptions?.[day] || '';
                          if (hours > 0 || description) {
                            return (
                              <div key={day} className="text-xs">
                                <span className="font-medium text-gray-700 capitalize">
                                  {day}: {hours}h
                                </span>
                                {description && (
                                  <div className="text-gray-500 ml-2 italic truncate">
                                    "{description.substring(0, 50)}{description.length > 50 ? '...' : ''}"
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                    {!timesheet.dailyHours && (
                      <div className="text-xs text-gray-400 mt-1">
                        Legacy timesheet format
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                      {timesheet.approvedByRole && (
                        <div className="text-xs text-gray-500">
                          by {timesheet.approvedByRole.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {timesheet.submittedAt?.toLocaleDateString() || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {timesheet.status === 'pending' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproval(timesheet.id, true)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection (optional):');
                            handleApproval(timesheet.id, false, reason || '');
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        {timesheet.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
