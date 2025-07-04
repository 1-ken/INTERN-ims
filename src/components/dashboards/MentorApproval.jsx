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
  const [filter, setFilter] = useState('pending');
  const [feedbackInputs, setFeedbackInputs] = useState({});

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
          where('mentorUid', '==', currentUser.uid),
          orderBy('submittedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'timesheets'),
          where('mentorUid', '==', currentUser.uid),
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

  const handleFeedbackChange = (timesheetId, feedback) => {
    setFeedbackInputs(prev => ({
      ...prev,
      [timesheetId]: feedback
    }));
  };

  const handleApproval = async (timesheetId, approved) => {
    try {
      const feedback = feedbackInputs[timesheetId] || '';
      const timesheetRef = doc(db, 'timesheets', timesheetId);
      
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        mentorApprovedAt: approved ? new Date() : null,
        mentorApprovedBy: currentUser.uid,
        mentorFeedback: feedback || null,
        rejectedAt: !approved ? new Date() : null,
        rejectedBy: !approved ? currentUser.uid : null,
        rejectedByRole: !approved ? 'mentor' : null
      };

      await updateDoc(timesheetRef, updateData);

      // Update local state
      setTimesheets(prev => prev.map(t => 
        t.id === timesheetId 
          ? { 
              ...t, 
              status: approved ? 'approved' : 'rejected',
              mentorApprovedAt: approved ? new Date() : null,
              mentorApprovedBy: currentUser.uid,
              mentorFeedback: feedback || null,
              rejectedAt: !approved ? new Date() : null,
              rejectedBy: !approved ? currentUser.uid : null,
              rejectedByRole: !approved ? 'mentor' : null
            }
          : t
      ));

      // Clear feedback input
      setFeedbackInputs(prev => ({
        ...prev,
        [timesheetId]: ''
      }));

      setSuccess(`Timesheet ${approved ? 'approved by mentor' : 'rejected'} successfully`);

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

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      default: return status;
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
        <h2 className="text-2xl font-bold text-gray-900">Timesheet Approvals</h2>
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
                  Mentee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activities
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
                <>
                  <tr key={timesheet.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>
                        <div>{timesheet.internName || timesheet.submitterName}</div>
                        <div className="text-xs text-gray-500">
                          {timesheet.department} • {timesheet.submitterRole === 'attachee' ? 'Attachee' : 'Intern'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {timesheet.date ? (
                          <div>
                            <div className="font-medium">{new Date(timesheet.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</div>
                            <div className="text-xs text-gray-400 capitalize">{timesheet.dayOfWeek || 'Unknown'}</div>
                          </div>
                        ) : (
                          <div className="font-medium">{timesheet.week}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs">
                        {timesheet.description ? (
                          <div className="text-xs">
                            <div className="text-gray-500 truncate">
                              {timesheet.description.substring(0, 80)}{timesheet.description.length > 80 ? '...' : ''}
                            </div>
                          </div>
                        ) : timesheet.dailyDescriptions ? (
                          <div className="space-y-1">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => {
                              const description = timesheet.dailyDescriptions?.[day] || '';
                              if (description.trim()) {
                                return (
                                  <div key={day} className="text-xs">
                                    <span className="font-medium text-gray-700 capitalize">
                                      {day}:
                                    </span>
                                    <div className="text-gray-500 ml-2 truncate">
                                      {description.substring(0, 60)}{description.length > 60 ? '...' : ''}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            No activities recorded
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                          {getStatusText(timesheet.status)}
                        </span>
                        {timesheet.status === 'approved' && (
                          <div className="text-xs text-green-600">
                            Approved by {timesheet.mentorApprovedBy ? 'Mentor' : 'HR'}
                          </div>
                        )}
                        {timesheet.status === 'rejected' && (
                          <div className="text-xs text-red-600">
                            Rejected by {timesheet.rejectedByRole?.toUpperCase() || 'MENTOR'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timesheet.submittedAt?.toLocaleDateString() || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timesheet.status === 'pending' ? (
                        <div className="space-y-2">
                          <textarea
                            placeholder="Add feedback (optional)"
                            value={feedbackInputs[timesheet.id] || ''}
                            onChange={(e) => handleFeedbackChange(timesheet.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows="2"
                          />
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
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          {timesheet.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                  {/* Expanded view for activities and feedback */}
                  <tr>
                    <td colSpan="6" className="px-6 py-4 bg-gray-50">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-2">
                            Activities for {timesheet.date ? new Date(timesheet.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : `Week ${timesheet.week}`}:
                          </h4>
                          {timesheet.description ? (
                            <div className="text-sm text-gray-600 whitespace-pre-line">
                              {timesheet.description}
                            </div>
                          ) : timesheet.dailyDescriptions ? (
                            <div className="space-y-2">
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => {
                                const description = timesheet.dailyDescriptions?.[day];
                                if (description?.trim()) {
                                  return (
                                    <div key={day} className="text-sm">
                                      <div className="font-medium text-gray-700 capitalize mb-1">
                                        {day}:
                                      </div>
                                      <div className="text-gray-600 ml-4 whitespace-pre-line">
                                        {description}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">No activities recorded</div>
                          )}
                        </div>
                        {timesheet.mentorFeedback && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="font-medium text-blue-800 text-sm">Mentor Feedback:</div>
                            <div className="text-blue-700 text-sm mt-1">{timesheet.mentorFeedback}</div>
                          </div>
                        )}
                        {timesheet.hrFeedback && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="font-medium text-green-800 text-sm">HR Feedback:</div>
                            <div className="text-green-700 text-sm mt-1">{timesheet.hrFeedback}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
