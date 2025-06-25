import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const ChecklistDisplay = () => {
  const { currentUser, userData } = useAuth();
  const [checklist, setChecklist] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadChecklistData = async () => {
      if (!userData?.countyCode || !currentUser?.uid) return;

      try {
        setLoading(true);
        
        // Load county-specific checklist
        const checklistDoc = await getDoc(doc(db, 'checklists', userData.countyCode.toString()));
        if (checklistDoc.exists()) {
          setChecklist(checklistDoc.data().items || []);
        } else {
          // Default checklist if county-specific doesn't exist
          setChecklist([
            "Submit National ID Copy",
            "Submit KRA PIN Certificate", 
            "Sign NDA Agreement",
            "Complete Safety Training",
            "Setup Email Account",
            "Attend Orientation Session"
          ]);
        }

        // Load intern's progress
        const profileDoc = await getDoc(doc(db, 'intern_profiles', currentUser.uid));
        if (profileDoc.exists()) {
          setCompletedItems(profileDoc.data().checklistProgress || []);
        }
      } catch (err) {
        console.error('Error loading checklist:', err);
        setError('Failed to load checklist');
      } finally {
        setLoading(false);
      }
    };

    loadChecklistData();
  }, [userData?.countyCode, currentUser?.uid]);

  const handleItemCheck = async (item) => {
    if (completedItems.includes(item)) return; // Already completed

    try {
      // Update Firestore
      const profileRef = doc(db, 'intern_profiles', currentUser.uid);
      await updateDoc(profileRef, {
        checklistProgress: arrayUnion(item),
        lastUpdated: new Date()
      });

      // Update local state
      setCompletedItems(prev => [...prev, item]);
    } catch (err) {
      console.error('Error updating checklist progress:', err);
      setError('Failed to update progress');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const completionPercentage = checklist.length > 0 
    ? Math.round((completedItems.length / checklist.length) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          County {userData?.countyCode} Onboarding Checklist
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span>{completedItems.length} of {checklist.length} completed</span>
          <span className="font-medium">{completionPercentage}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {checklist.map((item, index) => {
          const isCompleted = completedItems.includes(item);
          
          return (
            <div 
              key={index}
              className={`flex items-center p-3 rounded-lg border transition-colors ${
                isCompleted 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => handleItemCheck(item)}
                disabled={isCompleted}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white cursor-default'
                    : 'border-gray-300 hover:border-blue-500 cursor-pointer'
                }`}
              >
                {isCompleted && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <span className={`flex-1 ${isCompleted ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                {item}
              </span>
              
              {isCompleted && (
                <span className="text-green-600 text-sm font-medium">✓ Complete</span>
              )}
            </div>
          );
        })}
      </div>

      {completionPercentage === 100 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-700 font-medium">
              Congratulations! You've completed all onboarding requirements.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistDisplay;
