import React, { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingForm() {
  const { currentUser } = useAuth();

  const [idNumber, setIdNumber] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [idCardFile, setIdCardFile] = useState(null);
  const [kraPinFile, setKraPinFile] = useState(null);
  const [bankSlipFile, setBankSlipFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const storage = getStorage();

  const handleFileChange = (e, setFile) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }
    if (!idNumber || !kraPin || !bankName || !branch || !accountNumber) {
      setError('Please fill in all required fields');
      return;
    }
    if (!idCardFile || !kraPinFile || !bankSlipFile) {
      setError('Please upload all required documents');
      return;
    }

    setLoading(true);
    try {
      // Upload files
      const idCardUrl = await uploadFile(idCardFile, `intern_profiles/${currentUser.uid}/idCard`);
      const kraPinUrl = await uploadFile(kraPinFile, `intern_profiles/${currentUser.uid}/kraPin`);
      const bankSlipUrl = await uploadFile(bankSlipFile, `intern_profiles/${currentUser.uid}/bankSlip`);

      // Save form data to Firestore
      const profileData = {
        uid: currentUser.uid,
        idNumber,
        kraPin,
        bankDetails: {
          accountNumber,
          bankName,
          branch,
        },
        documents: {
          idCardUrl,
          kraPinUrl,
          bankSlipUrl,
        },
        status: 'onboarded',
      };

      await setDoc(doc(db, 'intern_profiles', currentUser.uid), profileData);

      setSuccess('Onboarding information submitted successfully.');
      // Reset form
      setIdNumber('');
      setKraPin('');
      setBankName('');
      setBranch('');
      setAccountNumber('');
      setIdCardFile(null);
      setKraPinFile(null);
      setBankSlipFile(null);
    } catch (err) {
      console.error('Error submitting onboarding form:', err);
      setError('Failed to submit onboarding information. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Intern Onboarding Form</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1" htmlFor="idNumber">National ID</label>
          <input
            id="idNumber"
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="kraPin">KRA PIN</label>
          <input
            id="kraPin"
            type="text"
            value={kraPin}
            onChange={(e) => setKraPin(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="bankName">Bank Name</label>
          <input
            id="bankName"
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="branch">Bank Branch</label>
          <input
            id="branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="accountNumber">Account Number</label>
          <input
            id="accountNumber"
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="idCardFile">ID Card Upload</label>
          <input
            id="idCardFile"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileChange(e, setIdCardFile)}
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="kraPinFile">KRA PIN Upload</label>
          <input
            id="kraPinFile"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileChange(e, setKraPinFile)}
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="bankSlipFile">Bank Slip Upload</label>
          <input
            id="bankSlipFile"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileChange(e, setBankSlipFile)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Onboarding'}
        </button>
      </form>
    </div>
  );
}
