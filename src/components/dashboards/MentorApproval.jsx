import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function MentorApproval() {
  const { currentUser } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPendingTimesheets();
  }, [currentUser]);

  const loadPendingTimesheets = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'timesheets'),
        where('mentorUid', '==', currentUser.uid),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
      );

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

  const handleApproval = async (timesheetId, approved) => {
    try {
      const timesheetRef = doc(db, 'timesheets', timesheetId);
      await updateDoc(timesheetRef, {
        status: approved ? 'approved' : 'rejected',
        approvedAt: approved ? new Date() : null,
        approvedBy: approved ? currentUser.uid : null
      });

      // Update local state
      setTimesheets(prev => prev.filter(t => t.id !== timesheetId));
      setSuccess(`Timesheet ${approved ? 'approved' : 'rejected'} successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating timesheet:', err);
      setError('Failed to update timesheet');
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Timesheet Approvals</h2>

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
        <p className="text-gray-500 text-center py-4">No pending timesheets to approve</p>
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
                  Hours
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
                    {timesheet.internName}
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
                                    <div className="text-gray-500 ml-2 italic">
                                      "{description}"
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {timesheet.submittedAt?.toLocaleDateString() || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproval(timesheet.id, true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(timesheet.id, false)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Reject
                      </button>
                    </div>
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
