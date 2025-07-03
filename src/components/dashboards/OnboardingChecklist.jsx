import React, { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { createDefaultChecklist, createDefaultInstitutionChecklist } from '../../utils/initializeChecklists';

export default function OnboardingChecklist() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({});
  const [checklist, setChecklist] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [uploadingItem, setUploadingItem] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState('');
  const [profileCollection, setProfileCollection] = useState('');

  const storage = getStorage();

  useEffect(() => {
    loadChecklist();
  }, [currentUser]);

  const loadChecklist = async () => {
    if (!currentUser) return;

    try {
      // Get user's data
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const role = userData.role;
      let checklistKey, profileColl, profileUidField;

      // Determine checklist key and profile collection based on role
      if (role === 'intern') {
        checklistKey = userData.countyCode?.toString();
        profileColl = 'intern_profiles';
        profileUidField = 'internUid';
        
        if (!checklistKey) {
          throw new Error('No county assigned to intern');
        }
      } else if (role === 'attachee') {
        checklistKey = 'attachee'; // Uniform checklist for all attachees
        profileColl = 'attachee_profiles';
        profileUidField = 'attacheeUid';
      } else {
        throw new Error('Invalid user role for onboarding checklist');
      }

      setUserRole(role);
      setProfileCollection(profileColl);

      // Get checklist template
      let checklistDoc = await getDoc(doc(db, 'checklists', checklistKey));
      let checklistData;
      
      if (!checklistDoc.exists()) {
        console.log(`No checklist found for ${checklistKey}, creating default...`);
        if (role === 'intern') {
          checklistData = await createDefaultChecklist(checklistKey);
        } else {
          checklistData = await createDefaultInstitutionChecklist(checklistKey);
        }
      } else {
        checklistData = checklistDoc.data();
      }

      // Get user's progress and form data
      const profileDoc = await getDoc(doc(db, profileColl, currentUser.uid));
      let checklistProgress = [];
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        checklistProgress = profileData.checklistProgress || [];
        setFormData(profileData.formData || {});
      } else {
        const newProfile = {
          [profileUidField]: currentUser.uid,
          checklistProgress: [],
          formData: {},
          documents: {},
          createdAt: new Date()
        };
        await setDoc(doc(db, profileColl, currentUser.uid), newProfile);
      }

      setChecklist(checklistData.items || []);
      setCompletedItems(checklistProgress);
      updateProgress(checklistProgress, checklistData.items || []);
    } catch (err) {
      console.error('Error loading checklist:', err);
      setError('Failed to load onboarding requirements');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = (completed, items) => {
    setProgress((completed.length / items.length) * 100);
  };

  const handleInputChange = async (item, value) => {
    try {
      const profileRef = doc(db, profileCollection, currentUser.uid);
      const updatedFormData = {
        ...formData,
        [item.name]: value
      };

      await updateDoc(profileRef, {
        [`formData.${item.name}`]: value
      });

      if (value && !completedItems.includes(item.name)) {
        await updateDoc(profileRef, {
          checklistProgress: arrayUnion(item.name)
        });
        const newCompletedItems = [...completedItems, item.name];
        setCompletedItems(newCompletedItems);
        updateProgress(newCompletedItems, checklist);
      }

      setFormData(updatedFormData);
      setSuccess(`${item.name} updated successfully`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error updating item:', err);
      setError(`Failed to update ${item.name}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleFileUpload = async (item, file) => {
    if (!file) return;

    setUploadingItem(item.name);
    try {
      // Upload file
      const storageRef = ref(storage, `documents/${currentUser.uid}/${item.name}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update profile
      const profileRef = doc(db, profileCollection, currentUser.uid);
      await updateDoc(profileRef, {
        [`documents.${item.name}`]: downloadURL,
        checklistProgress: arrayUnion(item.name)
      });

      const newCompletedItems = [...completedItems, item.name];
      setCompletedItems(newCompletedItems);
      updateProgress(newCompletedItems, checklist);
      
      setSuccess(`${item.name} uploaded successfully`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(`Failed to upload ${item.name}`);
      setTimeout(() => setError(''), 3000);
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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Onboarding Requirements</h2>

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

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completedItems.length} of {checklist.length} requirements completed
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
      <div className="space-y-6">
        {checklist.map((item, index) => {
          const itemObj = typeof item === 'string' 
            ? { name: item, type: 'text', required: true }
            : item;

          const isCompleted = completedItems.includes(itemObj.name);
          const isUploading = uploadingItem === itemObj.name;

          return (
            <div 
              key={`${itemObj.name}-${index}`}
              className={`p-4 border rounded-lg ${
                isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 h-5 w-5 mt-1 ${
                  isCompleted ? 'text-green-500' : 'text-gray-400'
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-medium text-gray-900">
                      {itemObj.name}
                      {itemObj.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
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

                  {!isCompleted && (
                    <div className="mt-2">
                      {itemObj.type === 'text' && (
                        <input
                          type="text"
                          value={formData[itemObj.name] || ''}
                          onChange={(e) => handleInputChange(itemObj, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder={`Enter ${itemObj.name.toLowerCase()}`}
                          required={itemObj.required}
                        />
                      )}

                      {itemObj.type === 'file' && (
                        <div>
                          <input
                            type="file"
                            id={`file-${itemObj.name}-${index}`}
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(itemObj, e.target.files[0])}
                            required={itemObj.required}
                          />
                          <label
                            htmlFor={`file-${itemObj.name}-${index}`}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                              isUploading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                            } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                          >
                            {isUploading ? 'Uploading...' : 'Upload File'}
                          </label>
                        </div>
                      )}

                      {itemObj.type === 'checkbox' && (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData[itemObj.name] || false}
                            onChange={(e) => handleInputChange(itemObj, e.target.checked)}
                            required={itemObj.required}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-gray-700">I confirm this requirement</span>
                        </label>
                      )}

                      {itemObj.type === 'select' && (
                        <select
                          value={formData[itemObj.name] || ''}
                          onChange={(e) => handleInputChange(itemObj, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          required={itemObj.required}
                        >
                          <option value="">Select an option</option>
                          {itemObj.options?.map((option, i) => (
                            <option key={i} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Completed
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {checklist.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No onboarding requirements found for your {userRole === 'intern' ? 'county' : 'institution'}.
          </p>
        </div>
      )}
    </div>
  );
}
