import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const TimesheetForm = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    week: '',
    mondayDescription: '',
    tuesdayDescription: '',
    wednesdayDescription: '',
    thursdayDescription: '',
    fridayDescription: ''
  });
  const [submittedTimesheets, setSubmittedTimesheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);

  useEffect(() => {
    if (currentUser?.uid) {
      loadUserData();
      // Set current week as default
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const weekNumber = getWeekNumber(currentDate);
      setFormData(prev => ({
        ...prev,
        week: `${year}-W${weekNumber.toString().padStart(2, '0')}`
      }));

      // Load existing timesheets
      loadTimesheets();
    }
  }, [currentUser?.uid]);

  const loadUserData = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const loadTimesheets = async () => {
    if (!currentUser?.uid) return;

    try {
      const q = query(
        collection(db, 'timesheets'),
        where('submitterUid', '==', currentUser.uid),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const timesheets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()
      }));
      
      // Sort timesheets by status priority: pending -> mentor-approved -> approved -> rejected
      const statusPriority = {
        'pending': 0,
        'mentor-approved': 1,
        'approved': 2,
        'rejected': 3
      };

      timesheets.sort((a, b) => {
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        // If status is same, sort by submission date (newest first)
        return b.submittedAt - a.submittedAt;
      });
      
      setSubmittedTimesheets(timesheets);
    } catch (err) {
      console.error('Error loading timesheets:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'mentor-approved': return 'text-blue-600 bg-blue-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Fully Approved';
      case 'mentor-approved': return 'Mentor Approved';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.week) {
      setError('Please select a week');
      return false;
    }
    
    // Check if at least one day has activities
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const hasActivities = days.some(day => formData[`${day}Description`]?.trim());
    
    if (!hasActivities) {
      setError('Please enter activities for at least one day');
      return false;
    }

    // Check if timesheet for this week already exists
    const existingTimesheet = submittedTimesheets.find(
      ts => ts.week === formData.week
    );
    
    if (existingTimesheet) {
      setError('Timesheet for this week has already been submitted');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Get mentor UID from user data or default
      const mentorUid = userData?.mentorUid || 'unassigned';

      const timesheetData = {
        submitterUid: currentUser.uid,
        submitterRole: userData?.role || 'intern',
        mentorUid: mentorUid,
        week: formData.week,
        dailyDescriptions: {
          monday: formData.mondayDescription || '',
          tuesday: formData.tuesdayDescription || '',
          wednesday: formData.wednesdayDescription || '',
          thursday: formData.thursdayDescription || '',
          friday: formData.fridayDescription || ''
        },
        status: 'pending',
        submittedAt: new Date(),
        submitterName: userData?.fullName || 'Unknown',
        internName: userData?.fullName || 'Unknown',
        department: userData?.department || 'Unknown'
      };

      await addDoc(collection(db, 'timesheets'), timesheetData);
      
      setSuccess('Timesheet submitted successfully!');
      setFormData(prev => ({ 
        ...prev, 
        mondayDescription: '', tuesdayDescription: '', wednesdayDescription: '', 
        thursdayDescription: '', fridayDescription: ''
      }));
      
      // Reload timesheets to show the new submission
      loadTimesheets();
      
    } catch (err) {
      console.error('Error submitting timesheet:', err);
      setError('Failed to submit timesheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timesheet Submission Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Submit Weekly Timesheet - {userData?.role === 'attachee' ? 'Attachee' : 'Intern'}
        </h3>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="week" className="block text-sm font-medium text-gray-700 mb-1">
              Week
            </label>
            <input
              type="week"
              id="week"
              name="week"
              value={formData.week}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Select the week you're submitting activities for
            </p>
          </div>

          {/* Daily Activities Input */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Daily Activities</h4>
            <p className="text-sm text-gray-600">
              Record your daily activities and tasks. You can submit activities for any day of the week.
            </p>
            
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
              <div key={day} className="border border-gray-200 rounded-lg p-4">
                <label htmlFor={`${day}Description`} className="block text-sm font-medium text-gray-700 mb-2">
                  {day.charAt(0).toUpperCase() + day.slice(1)} Activities
                </label>
                <div className="text-xs text-gray-500 mb-2">
                  List your activities for this day (e.g., "9:00 AM - Team meeting, 10:30 AM - Code review, 2:00 PM - Project work")
                </div>
                <textarea
                  id={`${day}Description`}
                  name={`${day}Description`}
                  value={formData[`${day}Description`]}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="9:00 AM - Team meeting&#13;10:30 AM - Code review&#13;2:00 PM - Project work&#13;4:00 PM - Documentation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Include time and description for each activity
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Timesheet'}
          </button>
        </form>
      </div>

      {/* Previous Timesheets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Previous Submissions
        </h3>

        {submittedTimesheets.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No timesheets submitted yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved/Rejected By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submittedTimesheets.map((timesheet) => (
                  <>
                    <tr 
                      key={timesheet.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTimesheet(selectedTimesheet?.id === timesheet.id ? null : timesheet)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {timesheet.week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Activities Submitted
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                            {getStatusText(timesheet.status)}
                          </span>
                          {timesheet.status === 'mentor-approved' && (
                            <div className="text-xs text-blue-600">
                              Pending HR Review
                            </div>
                          )}
                          {timesheet.status === 'approved' && (
                            <div className="text-xs text-green-600">
                              Fully Approved
                            </div>
                          )}
                          {timesheet.status === 'rejected' && (
                            <div className="text-xs text-red-600">
                              Rejected by {timesheet.rejectedByRole?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {timesheet.status === 'approved' && (
                          <div className="text-xs">
                            <div className="text-green-600 font-medium">Approved by HR</div>
                            {timesheet.mentorApprovedBy && (
                              <div className="text-blue-600">Previously approved by Mentor</div>
                            )}
                          </div>
                        )}
                        {timesheet.status === 'mentor-approved' && (
                          <div className="text-xs text-blue-600 font-medium">
                            Approved by Mentor
                          </div>
                        )}
                        {timesheet.status === 'rejected' && (
                          <div className="text-xs text-red-600 font-medium">
                            Rejected by {timesheet.rejectedByRole?.toUpperCase() || 'MENTOR'}
                          </div>
                        )}
                        {timesheet.status === 'pending' && (
                          <div className="text-xs text-gray-400">
                            Awaiting Review
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {timesheet.submittedAt?.toLocaleDateString() || 'Unknown'}
                      </td>
                    </tr>
                    {selectedTimesheet?.id === timesheet.id && timesheet.dailyDescriptions && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
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
                            {timesheet.mentorFeedback && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="font-medium text-blue-800 text-sm">Mentor Feedback:</div>
                                <div className="text-blue-700 text-sm mt-1">{timesheet.mentorFeedback}</div>
                              </div>
                            )}
                            {timesheet.hrFeedback && (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="font-medium text-green-800 text-sm">HR Feedback:</div>
                                <div className="text-green-700 text-sm mt-1">{timesheet.hrFeedback}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimesheetForm;
