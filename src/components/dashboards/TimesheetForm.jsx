import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const TimesheetForm = () => {
  const { currentUser, userData } = useAuth();
  const [formData, setFormData] = useState({
    week: '',
    hoursWorked: ''
  });
  const [submittedTimesheets, setSubmittedTimesheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
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
  }, [currentUser?.uid]);

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
        where('internUid', '==', currentUser.uid),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const timesheets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSubmittedTimesheets(timesheets);
    } catch (err) {
      console.error('Error loading timesheets:', err);
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
    
    if (!formData.hoursWorked || formData.hoursWorked <= 0) {
      setError('Please enter valid hours worked');
      return false;
    }
    
    if (formData.hoursWorked > 168) { // Max hours in a week
      setError('Hours worked cannot exceed 168 hours per week');
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
        internUid: currentUser.uid,
        mentorUid: mentorUid,
        week: formData.week,
        hoursWorked: parseFloat(formData.hoursWorked),
        status: 'pending',
        submittedAt: new Date(),
        internName: userData?.fullName || 'Unknown',
        department: userData?.department || 'Unknown'
      };

      await addDoc(collection(db, 'timesheets'), timesheetData);
      
      setSuccess('Timesheet submitted successfully!');
      setFormData(prev => ({ ...prev, hoursWorked: '' }));
      
      // Reload timesheets to show the new submission
      loadTimesheets();
      
    } catch (err) {
      console.error('Error submitting timesheet:', err);
      setError('Failed to submit timesheet. Please try again.');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Timesheet Submission Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Submit Weekly Timesheet
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
              Select the week you're submitting hours for
            </p>
          </div>

          <div>
            <label htmlFor="hoursWorked" className="block text-sm font-medium text-gray-700 mb-1">
              Total Hours Worked
            </label>
            <input
              type="number"
              id="hoursWorked"
              name="hoursWorked"
              value={formData.hoursWorked}
              onChange={handleInputChange}
              min="0"
              max="168"
              step="0.5"
              placeholder="e.g., 40"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter total hours worked during the week (maximum 168 hours)
            </p>
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
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submittedTimesheets.map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {timesheet.week}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timesheet.hoursWorked} hours
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timesheet.submittedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </td>
                  </tr>
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
