import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const TimesheetForm = () => {
  const { currentUser, userData } = useAuth();
  const [formData, setFormData] = useState({
    week: '',
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
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
        where('submitterUid', '==', currentUser.uid),
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
    
    // Check if user is trying to fill a day that hasn't occurred yet or is restricted
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(name)) {
      if (!isDayAllowed(name)) {
        setError(`You can only fill ${name.charAt(0).toUpperCase() + name.slice(1)}'s timesheet on ${name.charAt(0).toUpperCase() + name.slice(1)} from 8 AM to 11:59 PM`);
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const isDayAllowed = (day) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Map day names to day numbers
    const dayMap = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5
    };
    
    const targetDay = dayMap[day];
    
    // If it's the same day, check if it's between working hours (8 AM) and 11:59 PM
    if (currentDay === targetDay) {
      // Allow from 8 AM (08:00) to 11:59 PM (23:59)
      return currentHour >= 8 && (currentHour < 23 || (currentHour === 23 && currentMinute <= 59));
    }
    
    // If it's a past day in the same week, allow it (but only if it's after 8 AM on the current day)
    if (currentDay > targetDay) {
      return currentHour >= 8;
    }
    
    // If it's a future day, don't allow it
    return false;
  };

  const getDayStatus = (day) => {
    if (isDayAllowed(day)) {
      return 'allowed';
    }
    return 'restricted';
  };

  const getTotalHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    return days.reduce((total, day) => {
      const hours = parseFloat(formData[day]) || 0;
      return total + hours;
    }, 0);
  };

  const validateForm = () => {
    if (!formData.week) {
      setError('Please select a week');
      return false;
    }
    
    const totalHours = getTotalHours();
    
    if (totalHours <= 0) {
      setError('Please enter hours for at least one day');
      return false;
    }
    
    // Validate individual day hours (max 9 hours per day: 8 AM - 5 PM)
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const day of days) {
      const dayHours = parseFloat(formData[day]) || 0;
      if (dayHours > 9) {
        setError(`${day.charAt(0).toUpperCase() + day.slice(1)} hours cannot exceed 9 hours (8 AM - 5 PM)`);
        return false;
      }
      if (dayHours < 0) {
        setError(`${day.charAt(0).toUpperCase() + day.slice(1)} hours cannot be negative`);
        return false;
      }
    }
    
    // Kenya working hours: Maximum 45 hours per week
    if (totalHours > 45) {
      setError('Total weekly hours cannot exceed 45 hours (Kenya standard: 8 AM - 5 PM, Monday to Friday)');
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
    dailyHours: {
      monday: parseFloat(formData.monday) || 0,
      tuesday: parseFloat(formData.tuesday) || 0,
      wednesday: parseFloat(formData.wednesday) || 0,
      thursday: parseFloat(formData.thursday) || 0,
      friday: parseFloat(formData.friday) || 0
    },
    dailyDescriptions: {
      monday: formData.mondayDescription || '',
      tuesday: formData.tuesdayDescription || '',
      wednesday: formData.wednesdayDescription || '',
      thursday: formData.thursdayDescription || '',
      friday: formData.fridayDescription || ''
    },
    totalHours: getTotalHours(),
    status: 'pending',
    submittedAt: new Date(),
    submitterName: userData?.fullName || 'Unknown',
    department: userData?.department || 'Unknown'
      };

      await addDoc(collection(db, 'timesheets'), timesheetData);
      
      setSuccess('Timesheet submitted successfully!');
      setFormData(prev => ({ 
        ...prev, 
        monday: '', tuesday: '', wednesday: '', thursday: '', friday: '',
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
              Select the week you're submitting hours for
            </p>
          </div>

          {/* Daily Hours Input */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Daily Hours & Activities</h4>
            
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
              <div key={day} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={day} className="block text-sm font-medium text-gray-700 mb-1">
                      {day.charAt(0).toUpperCase() + day.slice(1)} Hours
                    </label>
                    <input
                      type="number"
                      id={day}
                      name={day}
                      value={formData[day]}
                      onChange={handleInputChange}
                      min="0"
                      max="9"
                      step="0.5"
                      placeholder="e.g., 8"
                      disabled={getDayStatus(day) === 'restricted'}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        getDayStatus(day) === 'restricted' 
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'border-gray-300'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${
                      getDayStatus(day) === 'restricted' 
                        ? 'text-red-500' 
                        : 'text-gray-500'
                    }`}>
                      {getDayStatus(day) === 'restricted' 
                        ? `Can only fill on ${day.charAt(0).toUpperCase() + day.slice(1)} from 8 AM to 11:59 PM`
                        : 'Max 9 hours (8 AM - 5 PM)'
                      }
                    </p>
                  </div>
                  <div>
                    <label htmlFor={`${day}Description`} className="block text-sm font-medium text-gray-700 mb-1">
                      Activities/Tasks
                    </label>
                    <div className="text-xs text-gray-500 mb-2">
                      List your activities for this day (e.g., "9:00 AM - Team meeting, 10:30 AM - Code review")
                    </div>
                    <textarea
                      id={`${day}Description`}
                      name={`${day}Description`}
                      value={formData[`${day}Description`]}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="9:00 AM - Team meeting&#13;10:30 AM - Code review&#13;2:00 PM - Project work"
                      disabled={getDayStatus(day) === 'restricted'}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        getDayStatus(day) === 'restricted' 
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'border-gray-300'
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Include time and description for each activity
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Total Hours Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Weekly Hours:</span>
                <span className="text-lg font-bold text-blue-600">{getTotalHours().toFixed(1)} hours</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum allowed: 45 hours per week
              </p>
            </div>
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
                        {timesheet.totalHours || timesheet.hoursWorked} hours
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
                    {selectedTimesheet?.id === timesheet.id && timesheet.dailyHours && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => {
                              const hours = timesheet.dailyHours[day] || 0;
                              const description = timesheet.dailyDescriptions?.[day];
                              if (hours > 0 || description) {
                                return (
                                  <div key={day} className="text-sm">
                                    <div className="font-medium text-gray-700 capitalize">
                                      {day}: {hours} hours
                                    </div>
                                    {description && (
                                      <div className="text-gray-600 ml-4 mt-1 whitespace-pre-line">
                                        {description}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
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
