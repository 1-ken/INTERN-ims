import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { createDefaultChecklist } from '../../utils/initializeChecklists';

export default function ChecklistDisplay() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [uploadingItem, setUploadingItem] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadChecklist();
  }, [currentUser]);

  const loadChecklist = async () => {
    if (!currentUser) return;

    try {
      // Get user's county code
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const countyCode = userDoc.data().countyCode;

      // Get checklist template for the county
      let checklistDoc = await getDoc(doc(db, 'checklists', countyCode.toString()));
      let checklistData;
      
      if (!checklistDoc.exists()) {
        // Create default checklist if none exists for this county
        console.log(`No checklist found for county ${countyCode}, creating default...`);
        checklistData = await createDefaultChecklist(countyCode);
      } else {
        checklistData = checklistDoc.data();
      }

      // Get intern's progress
      const internProfileDoc = await getDoc(doc(db, 'intern_profiles', currentUser.uid));
      let checklistProgress = [];
      
      if (internProfileDoc.exists()) {
        checklistProgress = internProfileDoc.data().checklistProgress || [];
      } else {
        // Create intern profile if it doesn't exist
        await setDoc(doc(db, 'intern_profiles', currentUser.uid), {
          internUid: currentUser.uid,
          checklistProgress: [],
          documents: {},
          createdAt: new Date()
        });
      }

      const items = checklistData.items || [];
      setChecklist(items);
      
      // Sync completion status with onboarding form data
      const allCompletedItems = new Set(checklistProgress);
      
      if (internProfileDoc.exists()) {
        const profileData = internProfileDoc.data();
        
        // Check form data for text/checkbox/select items
        if (profileData.formData) {
          items.forEach(item => {
            const itemObj = typeof item === 'string' 
              ? { name: item, type: 'text', required: true }
              : item;
              
            if (itemObj.type === 'text' || itemObj.type === 'select' || itemObj.type === 'checkbox') {
              const formValue = profileData.formData[itemObj.name];
              if (formValue !== undefined && formValue !== null && formValue !== '') {
                allCompletedItems.add(itemObj.name);
              }
            }
          });
        }
        
        // Check documents for file items
        if (profileData.documents) {
          Object.keys(profileData.documents).forEach(docName => {
            allCompletedItems.add(docName);
          });
        }
      }
      
      const completedArray = Array.from(allCompletedItems);
      setCompletedItems(completedArray);
      setProgress((completedArray.length / items.length) * 100);

    } catch (err) {
      console.error('Error loading checklist:', err);
      setError('Failed to load checklist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async (itemName) => {
    if (!currentUser) return;

    try {
      const internProfileRef = doc(db, 'intern_profiles', currentUser.uid);
      await updateDoc(internProfileRef, {
        checklistProgress: arrayUnion(itemName)
      });

      setCompletedItems(prev => [...prev, itemName]);
      setProgress((completedItems.length + 1) / checklist.length * 100);
    } catch (err) {
      console.error('Error updating checklist:', err);
      setError('Failed to update checklist. Please try again.');
    }
  };

  const handleFileUpload = async (event, itemName) => {
    if (!currentUser || !event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    setUploadingItem(itemName);

    try {
      // Create reference to store the file
      const storageRef = ref(storage, `documents/${currentUser.uid}/${itemName}/${file.name}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update intern profile with document URL
      const internProfileRef = doc(db, 'intern_profiles', currentUser.uid);
      await updateDoc(internProfileRef, {
        [`documents.${itemName}`]: downloadURL,
        checklistProgress: arrayUnion(itemName)
      });

      setCompletedItems(prev => [...prev, itemName]);
      setProgress((completedItems.length + 1) / checklist.length * 100);

    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploadingItem(null);
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
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding Checklist</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completedItems.length} of {checklist.length} tasks completed
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {checklist.map((item, index) => {
          // Handle legacy string items
          const itemObj = typeof item === 'string' 
            ? { name: item, type: 'text', required: true }
            : item;

          const isCompleted = completedItems.includes(itemObj.name);
          const isUploading = uploadingItem === itemObj.name;
          const requiresUpload = itemObj.type === 'file';

          return (
            <div 
              key={`${itemObj.name}-${index}`}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 h-5 w-5 ${
                  isCompleted 
                    ? 'text-green-500' 
                    : 'text-gray-400'
                }`}>
                  {isCompleted ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${
                    isCompleted ? 'text-green-800' : 'text-gray-700'
                  }`}>
                    {itemObj.name}
                    {itemObj.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className={`px-2 py-1 rounded text-xs ${
                      itemObj.type === 'file' ? 'bg-blue-100 text-blue-800' :
                      itemObj.type === 'text' ? 'bg-green-100 text-green-800' :
                      itemObj.type === 'checkbox' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {itemObj.type === 'file' ? 'File Upload' :
                       itemObj.type === 'text' ? 'Text Input' :
                       itemObj.type === 'checkbox' ? 'Checkbox' :
                       'Dropdown'}
                    </span>
                  </div>
                </div>
              </div>

              {!isCompleted && (
                <div className="flex items-center space-x-2">
                  {requiresUpload ? (
                    <div>
                      <input
                        type="file"
                        id={`file-${itemObj.name}-${index}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, itemObj.name)}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor={`file-${itemObj.name}-${index}`}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                          isUploading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                        } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </label>
                    </div>
                  ) : (
                    <button
                      onClick={() => markAsComplete(itemObj.name)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Mark as Done
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {checklist.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No checklist items found for your county.</p>
        </div>
      )}
    </div>
  );
}
