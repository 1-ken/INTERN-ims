import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Sample checklist templates for different counties
const checklistTemplates = {
  // Nairobi County (47)
  47: {
    countyCode: 47,
    items: [
      "Submit National ID Copy",
      "Submit KRA PIN Certificate", 
      "Sign Non-Disclosure Agreement",
      "Submit Bank Account Details",
      "Complete Medical Examination",
      "Submit Academic Transcripts"
    ]
  },
  // Mombasa County (1)
  1: {
    countyCode: 1,
    items: [
      "Submit National ID Copy",
      "Submit KRA PIN Certificate",
      "Sign Employment Contract",
      "Submit Bank Account Details",
      "Complete Security Clearance",
      "Submit Academic Certificates"
    ]
  },
  // Kiambu County (22)
  22: {
    countyCode: 22,
    items: [
      "Submit National ID Copy",
      "Submit KRA PIN Certificate",
      "Sign Code of Conduct",
      "Submit Bank Account Details",
      "Complete Health Insurance Form",
      "Submit Academic Transcripts",
      "Submit Passport Photo"
    ]
  },
  // Nakuru County (32)
  32: {
    countyCode: 32,
    items: [
      "Submit National ID Copy",
      "Submit KRA PIN Certificate",
      "Sign Internship Agreement",
      "Submit Bank Account Details",
      "Complete Emergency Contact Form",
      "Submit Academic Records"
    ]
  },
  // Kisumu County (42)
  42: {
    countyCode: 42,
    items: [
      "Submit National ID Copy",
      "Submit KRA PIN Certificate",
      "Sign Confidentiality Agreement",
      "Submit Bank Account Details",
      "Complete Background Check Form",
      "Submit Academic Certificates",
      "Submit Reference Letters"
    ]
  }
};

// Function to initialize checklist templates in Firestore
export const initializeChecklistTemplates = async () => {
  try {
    console.log('Initializing checklist templates...');
    
    for (const [countyCode, template] of Object.entries(checklistTemplates)) {
      await setDoc(doc(db, 'checklists', countyCode), template);
      console.log(`Checklist template created for county ${countyCode}`);
    }
    
    console.log('All checklist templates initialized successfully!');
  } catch (error) {
    console.error('Error initializing checklist templates:', error);
  }
};

// Function to create a default checklist for any county not in the templates
export const createDefaultChecklist = async (countyCode) => {
  const defaultTemplate = {
    countyCode: parseInt(countyCode),
    type: 'county',
    items: [
      { name: "Submit National ID Copy", type: "file", required: true },
      { name: "Submit KRA PIN Certificate", type: "file", required: true },
      { name: "Sign Internship Agreement", type: "file", required: true },
      { name: "Submit Bank Account Details", type: "file", required: true },
      { name: "Complete Personal Information Form", type: "text", required: true },
      { name: "Submit Academic Documents", type: "file", required: true }
    ]
  };

  try {
    await setDoc(doc(db, 'checklists', countyCode.toString()), defaultTemplate);
    console.log(`Default checklist template created for county ${countyCode}`);
    return defaultTemplate;
  } catch (error) {
    console.error(`Error creating default checklist for county ${countyCode}:`, error);
    throw error;
  }
};

// Function to create a default checklist for any institution not in the templates
export const createDefaultInstitutionChecklist = async (institutionKey) => {
  const defaultTemplate = {
    institutionKey: institutionKey,
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
    await setDoc(doc(db, 'checklists', institutionKey), defaultTemplate);
    console.log(`Default checklist template created for institution ${institutionKey}`);
    return defaultTemplate;
  } catch (error) {
    console.error(`Error creating default checklist for institution ${institutionKey}:`, error);
    throw error;
  }
};
