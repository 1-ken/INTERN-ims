import React, { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingForm() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({});
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const storage = getStorage();

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
      const checklistDoc = await getDoc(doc(db, 'checklists', countyCode.toString()));
      if (!checklistDoc.exists()) {
        throw new Error('Checklist template not found');
      }

      setChecklist(checklistDoc.data().items || []);

      // Load existing data if any
      const internProfileDoc = await getDoc(doc(db, 'intern_profiles', currentUser.uid));
      if (internProfileDoc.exists()) {
        const data = internProfileDoc.data();
        setFormData(data.formData || {});
      }
    } catch (err) {
      console.error('Error loading checklist:', err);
      setError('Failed to load onboarding requirements');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (name, file) => {
    if (file) {
      setFiles(prev => ({
        ...prev,
        [name]: file
      }));
    }
  };

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    // Validate required fields
    const missingFields = checklist.filter(item => {
      if (!item.required) return false;
      if (item.type === 'file') return !files[item.name];
      return !formData[item.name];
    });

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const fileUrls = {};
      
      // Upload all files
      for (const [name, file] of Object.entries(files)) {
        const url = await uploadFile(file, `intern_profiles/${currentUser.uid}/${name}`);
        fileUrls[name] = url;
      }

      // Calculate completed items for checklist sync
      const completedItems = [];
      
      // Add text/checkbox/select items that have values
      checklist.forEach(item => {
        const itemObj = typeof item === 'string' 
          ? { name: item, type: 'text', required: true }
          : item;
          
        if (itemObj.type === 'text' || itemObj.type === 'select' || itemObj.type === 'checkbox') {
          const formValue = formData[itemObj.name];
          if (formValue !== undefined && formValue !== null && formValue !== '') {
            completedItems.push(itemObj.name);
          }
        }
      });
      
      // Add file items that were uploaded
      Object.keys(fileUrls).forEach(fileName => {
        completedItems.push(fileName);
      });

      // Save form data to Firestore
      const profileData = {
        uid: currentUser.uid,
        formData,
        documents: fileUrls,
        checklistProgress: completedItems,
        status: 'onboarded',
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'intern_profiles', currentUser.uid), profileData, { merge: true });

      setSuccess('Onboarding information submitted successfully.');
    } catch (err) {
      console.error('Error submitting onboarding form:', err);
      setError('Failed to submit onboarding information. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Intern Onboarding Form</h2>
      
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
        {checklist.map((item, index) => {
          const itemKey = `${item.name}-${index}`;
          
          if (item.type === 'text') {
            return (
              <div key={itemKey}>
                <label className="block font-medium mb-1" htmlFor={itemKey}>
                  {item.name}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  id={itemKey}
                  type="text"
                  value={formData[item.name] || ''}
                  onChange={(e) => handleInputChange(item.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required={item.required}
                />
              </div>
            );
          }

          if (item.type === 'file') {
            return (
              <div key={itemKey}>
                <label className="block font-medium mb-1" htmlFor={itemKey}>
                  {item.name}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  id={itemKey}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(item.name, e.target.files[0])}
                  className="w-full"
                  required={item.required}
                />
                {files[item.name] && (
                  <p className="mt-1 text-sm text-green-600">
                    File selected: {files[item.name].name}
                  </p>
                )}
              </div>
            );
          }

          if (item.type === 'checkbox') {
            return (
              <div key={itemKey}>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData[item.name] || false}
                    onChange={(e) => handleInputChange(item.name, e.target.checked)}
                    required={item.required}
                  />
                  <span className="font-medium">
                    {item.name}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>
              </div>
            );
          }

          if (item.type === 'select') {
            return (
              <div key={itemKey}>
                <label className="block font-medium mb-1" htmlFor={itemKey}>
                  {item.name}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  id={itemKey}
                  value={formData[item.name] || ''}
                  onChange={(e) => handleInputChange(item.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required={item.required}
                >
                  <option value="">Select an option</option>
                  {item.options?.map((option, i) => (
                    <option key={i} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return null;
        })}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Onboarding'}
        </button>
      </form>
    </div>
  );
}
