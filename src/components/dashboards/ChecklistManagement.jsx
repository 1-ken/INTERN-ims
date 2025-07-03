import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { KENYA_COUNTIES } from '../../data/constants';
import { KENYA_INSTITUTIONS } from '../../data/institutions';

export default function ChecklistManagement() {
  const { currentUser } = useAuth();
  const [checklists, setChecklists] = useState({});
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [newItemType, setNewItemType] = useState('text');
  const [activeTab, setActiveTab] = useState('counties');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAllChecklists();
  }, []);

  const loadAllChecklists = async () => {
    try {
      const checklistsSnapshot = await getDocs(collection(db, 'checklists'));
      const checklistsData = {};
      
      checklistsSnapshot.forEach((doc) => {
        checklistsData[doc.id] = doc.data();
      });
      
      setChecklists(checklistsData);
    } catch (err) {
      console.error('Error loading checklists:', err);
      setError('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  const createNewCountyChecklist = async (countyCode) => {
    if (!countyCode) return;

    const newChecklist = {
      countyCode: parseInt(countyCode),
      type: 'county',
      items: [
        { name: "National ID Number", type: "text", required: true },
        { name: "Submit National ID Copy", type: "file", required: true },
        { name: "KRA PIN Number", type: "text", required: true },
        { name: "Submit KRA PIN Certificate", type: "file", required: true },
        { name: "Bank Name", type: "text", required: true },
        { name: "Bank Branch", type: "text", required: true },
        { name: "Account Number", type: "text", required: true },
        { name: "Submit Bank Account Details", type: "file", required: true }
      ]
    };

    try {
      setSaving(true);
      await setDoc(doc(db, 'checklists', countyCode), newChecklist);
      setChecklists(prev => ({
        ...prev,
        [countyCode]: newChecklist
      }));
      setSuccess(`Checklist created for ${getCountyName(countyCode)}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating checklist:', err);
      setError('Failed to create checklist');
    } finally {
      setSaving(false);
    }
  };

  const createNewInstitutionChecklist = async (institutionId) => {
    if (!institutionId) return;

    const newChecklist = {
      institutionKey: institutionId,
      type: 'institution',
      items: [
        { name: "Submit National ID Copy", type: "file", required: true },
        { name: "Submit Student ID Copy", type: "file", required: true },
        { name: "Submit Academic Transcripts", type: "file", required: true },
        { name: "Sign Attachment Agreement", type: "file", required: true },
        { name: "Submit Bank Account Details", type: "file", required: true },
        { name: "Complete Personal Information Form", type: "text", required: true },
        { name: "Submit Supervisor Recommendation Letter", type: "file", required: true }
      ]
    };

    try {
      setSaving(true);
      await setDoc(doc(db, 'checklists', institutionId), newChecklist);
      setChecklists(prev => ({
        ...prev,
        [institutionId]: newChecklist
      }));
      setSuccess(`Checklist created for ${getInstitutionName(institutionId)}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating checklist:', err);
      setError('Failed to create checklist');
    } finally {
      setSaving(false);
    }
  };

  const updateChecklist = async (checklistId, items, checklistData) => {
    try {
      setSaving(true);
      const updatedChecklist = {
        ...checklistData,
        items: items
      };
      
      await updateDoc(doc(db, 'checklists', checklistId), updatedChecklist);
      setChecklists(prev => ({
        ...prev,
        [checklistId]: updatedChecklist
      }));
      
      const name = checklistData.type === 'county' 
        ? getCountyName(checklistData.countyCode) 
        : getInstitutionName(checklistData.institutionKey);
      setSuccess(`Checklist updated for ${name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating checklist:', err);
      setError('Failed to update checklist');
    } finally {
      setSaving(false);
    }
  };

  const deleteChecklist = async (checklistId, checklistData) => {
    const name = checklistData.type === 'county' 
      ? getCountyName(checklistData.countyCode) 
      : getInstitutionName(checklistData.institutionKey);
      
    if (!confirm(`Are you sure you want to delete the checklist for ${name}?`)) {
      return;
    }

    try {
      setSaving(true);
      await deleteDoc(doc(db, 'checklists', checklistId));
      setChecklists(prev => {
        const updated = { ...prev };
        delete updated[checklistId];
        return updated;
      });
      setSuccess(`Checklist deleted for ${name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting checklist:', err);
      setError('Failed to delete checklist');
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (checklistId, checklistData) => {
    if (!newItem.trim()) return;

    try {
      const currentItems = checklistData?.items || [];
      const newItemObj = {
        name: newItem.trim(),
        type: newItemType,
        required: true
      };
      const updatedItems = [...currentItems, newItemObj];
      await updateChecklist(checklistId, updatedItems, checklistData);
      setNewItem('');
      setNewItemType('text');
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
    }
  };

  const removeItem = async (checklistId, itemIndex, checklistData) => {
    try {
      const currentItems = checklistData?.items || [];
      const updatedItems = currentItems.filter((_, index) => index !== itemIndex);
      await updateChecklist(checklistId, updatedItems, checklistData);
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item. Please try again.');
    }
  };

  const updateItem = async (checklistId, itemIndex, field, newValue, checklistData) => {
    try {
      const currentItems = checklistData?.items || [];
      const updatedItems = [...currentItems];
      
      // Handle legacy string items
      if (typeof updatedItems[itemIndex] === 'string') {
        updatedItems[itemIndex] = {
          name: updatedItems[itemIndex],
          type: 'text',
          required: true
        };
      }
      
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        [field]: field === 'name' ? newValue.trim() : newValue
      };
      
      await updateChecklist(checklistId, updatedItems, checklistData);
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item. Please try again.');
    }
  };

  const getCountyName = (countyCode) => {
    const county = KENYA_COUNTIES.find(c => c.code === parseInt(countyCode));
    return county ? county.name : `County ${countyCode}`;
  };

  const getInstitutionName = (institutionId) => {
    const institution = KENYA_INSTITUTIONS.find(i => i.id === institutionId);
    return institution ? institution.name : `Institution ${institutionId}`;
  };

  const getCountiesWithoutChecklists = () => {
    return KENYA_COUNTIES.filter(county => !checklists[county.code.toString()]);
  };

  const getInstitutionsWithoutChecklists = () => {
    return KENYA_INSTITUTIONS.filter(institution => !checklists[institution.id]);
  };

  const getCountyChecklists = () => {
    return Object.entries(checklists).filter(([_, checklist]) => 
      checklist.type === 'county' || checklist.countyCode !== undefined
    );
  };

  const getInstitutionChecklists = () => {
    return Object.entries(checklists).filter(([_, checklist]) => 
      checklist.type === 'institution' || checklist.institutionKey !== undefined
    );
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Onboarding Requirements Management</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select county to create checklist</option>
            {getCountiesWithoutChecklists().map((county) => (
              <option key={county.code} value={county.code}>
                {county.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => createNewCountyChecklist(selectedCounty)}
            disabled={!selectedCounty || saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create County Checklist'}
          </button>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('counties')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'counties'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            County Checklists
          </button>
          <button
            onClick={() => setActiveTab('attachee')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'attachee'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Attachee Checklist
          </button>
        </nav>
      </div>

      {/* Counties Tab */}
      {activeTab === 'counties' && (
        <div>
          <div className="flex items-center space-x-4 mb-6">
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select county to create checklist</option>
              {getCountiesWithoutChecklists().map((county) => (
                <option key={county.code} value={county.code}>
                  {county.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => createNewCountyChecklist(selectedCounty)}
              disabled={!selectedCounty || saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create County Checklist'}
            </button>
          </div>

          <div className="space-y-6">
            {getCountyChecklists().map(([checklistId, checklist]) => (
              <ChecklistCard
                key={checklistId}
                checklistId={checklistId}
                checklist={checklist}
                title={`${getCountyName(checklist.countyCode)} (County ${checklist.countyCode})`}
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                newItem={newItem}
                setNewItem={setNewItem}
                newItemType={newItemType}
                setNewItemType={setNewItemType}
                saving={saving}
                onUpdate={updateChecklist}
                onDelete={deleteChecklist}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onUpdateItem={updateItem}
              />
            ))}
            {getCountyChecklists().length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No county checklists created yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachee Tab */}
      {activeTab === 'attachee' && (
        <div>
          {!checklists['attachee'] ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">No attachee checklist created yet</div>
              <p className="text-gray-400 mb-6">
                Create a uniform checklist for all attachees.
              </p>
              <button
                onClick={() => createNewInstitutionChecklist('attachee')}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Attachee Checklist'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <ChecklistCard
                checklistId="attachee"
                checklist={checklists['attachee']}
                title="Attachee Checklist (All Attachees)"
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                newItem={newItem}
                setNewItem={setNewItem}
                newItemType={newItemType}
                setNewItemType={setNewItemType}
                saving={saving}
                onUpdate={updateChecklist}
                onDelete={deleteChecklist}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onUpdateItem={updateItem}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Checklist Card Component
function ChecklistCard({
  checklistId,
  checklist,
  title,
  editingItem,
  setEditingItem,
  newItem,
  setNewItem,
  newItemType,
  setNewItemType,
  saving,
  onUpdate,
  onDelete,
  onAddItem,
  onRemoveItem,
  onUpdateItem
}) {
  const isEditing = editingItem === checklistId;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingItem(isEditing ? null : checklistId)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isEditing ? 'Done Editing' : 'Edit'}
          </button>
          <button
            onClick={() => onDelete(checklistId, checklist)}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.items?.map((item, index) => {
          const itemObj = typeof item === 'string' 
            ? { name: item, type: 'text', required: true }
            : item;
          
          return (
            <div key={index} className="p-3 bg-gray-50 rounded-md">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={itemObj.name}
                      onChange={(e) => onUpdateItem(checklistId, index, 'name', e.target.value, checklist)}
                      disabled={saving}
                      placeholder="Item name"
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <select
                      value={itemObj.type}
                      onChange={(e) => onUpdateItem(checklistId, index, 'type', e.target.value, checklist)}
                      disabled={saving}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="text">Text Input</option>
                      <option value="file">File Upload</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="select">Dropdown</option>
                    </select>
                    <button
                      onClick={() => onRemoveItem(checklistId, index, checklist)}
                      disabled={saving}
                      className="px-2 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                    >
                      {saving ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={itemObj.required}
                        onChange={(e) => onUpdateItem(checklistId, index, 'required', e.target.checked, checklist)}
                        disabled={saving}
                        className="mr-1"
                      />
                      Required
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
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-gray-700">{itemObj.name}</span>
                    {itemObj.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
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
              )}
            </div>
          );
        })}

        {/* Add New Item */}
        {isEditing && (
          <div className="space-y-2 mt-3 p-3 border-2 border-dashed border-gray-300 rounded-md">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Enter new requirement..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && onAddItem(checklistId, checklist)}
              />
              <select
                value={newItemType}
                onChange={(e) => setNewItemType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="text">Text Input</option>
                <option value="file">File Upload</option>
                <option value="checkbox">Checkbox</option>
                <option value="select">Dropdown</option>
              </select>
              <button
                onClick={() => onAddItem(checklistId, checklist)}
                disabled={!newItem.trim() || saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Item'}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Choose the type of input for this requirement
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        {checklist.items?.length || 0} requirements
      </div>
    </div>
  );
}
