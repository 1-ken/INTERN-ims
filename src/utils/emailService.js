import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Firebase Functions for email sending
const sendEmailFunction = httpsCallable(functions, 'sendEmail');

export const sendContractTerminationEmail = async (userEmail, userName, terminationReason) => {
  try {
    const emailData = {
      to: userEmail,
      subject: 'Contract Termination Notification - Interns Management System',
      template: 'contract_termination',
      templateData: {
        userName: userName,
        terminationReason: terminationReason,
        hrContactEmail: 'hr@company.com', // Replace with actual HR email
        companyName: 'Your Company Name' // Replace with actual company name
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #dc3545; margin: 0;">Contract Termination Notice</h1>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${userName},</p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                We regret to inform you that your contract with our organization has been terminated effective immediately.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #333;">Reason for Termination:</p>
                <p style="margin: 5px 0 0 0; color: #666;">${terminationReason}</p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                Please note that your access to company systems and facilities has been deactivated. 
                If you have any company property, please arrange for its return as soon as possible.
              </p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                For any questions regarding this decision or to discuss next steps, please contact our HR department.
              </p>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                <strong>HR Department Contact:</strong><br>
                Email: hr@company.com<br>
                Phone: +1 (555) 123-4567
              </p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="font-size: 14px; color: #999; margin: 0;">
                This is an automated message from the Interns Management System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `
    };

    console.log('Sending contract termination email via Firebase Functions...');
    
    const result = await sendEmailFunction(emailData);
    
    if (result.data.success) {
      console.log('Contract termination email sent successfully:', result.data);
      return { success: true, message: 'Email sent successfully', data: result.data };
    } else {
      console.error('Failed to send email:', result.data.error);
      return { success: false, message: result.data.error || 'Failed to send email' };
    }
    
  } catch (error) {
    console.error('Error sending contract termination email:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send email',
      error: error
    };
  }
};

export const sendContractExpiryEmail = async (userEmail, userName, daysUntilExpiry, contractEndDate) => {
  try {
    const isUrgent = daysUntilExpiry <= 7;
    const urgencyColor = isUrgent ? '#dc3545' : '#fd7e14';
    const urgencyText = isUrgent ? 'URGENT' : 'REMINDER';
    
    const emailData = {
      to: userEmail,
      subject: `${urgencyText}: Contract Expiry Notice - ${daysUntilExpiry} days remaining`,
      template: 'contract_expiry',
      templateData: {
        userName: userName,
        daysUntilExpiry: daysUntilExpiry,
        contractEndDate: contractEndDate,
        isUrgent: isUrgent,
        hrContactEmail: 'hr@company.com',
        companyName: 'Your Company Name'
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: ${urgencyColor}; margin: 0;">Contract Expiry ${urgencyText}</h1>
              ${isUrgent ? '<div style="background-color: #dc3545; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; font-weight: bold; margin-top: 10px;">URGENT ACTION REQUIRED</div>' : ''}
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${userName},</p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                This is a ${isUrgent ? 'final' : ''} reminder that your contract with our organization will expire soon.
              </p>
              
              <div style="background-color: ${isUrgent ? '#f8d7da' : '#fff3cd'}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${urgencyColor};">
                <div style="text-align: center;">
                  <h2 style="color: ${urgencyColor}; margin: 0 0 15px 0; font-size: 24px;">
                    ${daysUntilExpiry} Day${daysUntilExpiry !== 1 ? 's' : ''} Remaining
                  </h2>
                  <p style="margin: 0; font-size: 18px; color: #333;">
                    <strong>Contract End Date: ${contractEndDate}</strong>
                  </p>
                </div>
              </div>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                ${isUrgent 
                  ? 'Please contact HR immediately to discuss contract renewal or transition arrangements. Failure to act may result in loss of access to company systems and facilities.'
                  : 'Please contact HR to discuss contract renewal options or to clarify any questions about your contract status.'
                }
              </p>
              
              <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #0066cc;">
                  <strong>💡 Next Steps:</strong><br>
                  1. Contact HR to discuss renewal options<br>
                  2. Complete any pending work or handovers<br>
                  3. Prepare for potential transition if renewal is not confirmed
                </p>
              </div>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                <strong>HR Department Contact:</strong><br>
                Email: hr@company.com<br>
                Phone: +1 (555) 123-4567<br>
                Office Hours: Monday - Friday, 9:00 AM - 5:00 PM
              </p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="font-size: 14px; color: #999; margin: 0;">
                This is an automated reminder from the Interns Management System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `
    };

    console.log('Sending contract expiry email via Firebase Functions...');
    
    const result = await sendEmailFunction(emailData);
    
    if (result.data.success) {
      console.log('Contract expiry email sent successfully:', result.data);
      return { success: true, message: 'Contract expiry email sent successfully', data: result.data };
    } else {
      console.error('Failed to send contract expiry email:', result.data.error);
      return { success: false, message: result.data.error || 'Failed to send contract expiry email' };
    }
    
  } catch (error) {
    console.error('Error sending contract expiry email:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send contract expiry email',
      error: error
    };
  }
};

export const sendWelcomeEmail = async (userEmail, userName, userRole, temporaryPassword = null) => {
  try {
    const emailData = {
      to: userEmail,
      subject: 'Welcome to Interns Management System',
      template: 'welcome',
      templateData: {
        userName: userName,
        userRole: userRole,
        temporaryPassword: temporaryPassword,
        loginUrl: window.location.origin + '/login',
        hrContactEmail: 'hr@company.com',
        companyName: 'Your Company Name'
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">Welcome to Our Team!</h1>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${userName},</p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                Welcome to our Interns Management System! We're excited to have you join us as a ${userRole}.
              </p>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #0066cc; margin: 0 0 15px 0;">Your Account Details:</h3>
                <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${userEmail}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Role:</strong> ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</p>
                ${temporaryPassword ? `<p style="margin: 5px 0; color: #333;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
              </div>
              
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                You can now access the system using the login link below. ${temporaryPassword ? 'Please change your temporary password after your first login.' : ''}
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${window.location.origin}/login" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Access System
                </a>
              </div>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                <strong>Need Help?</strong><br>
                Contact HR: hr@company.com<br>
                Phone: +1 (555) 123-4567
              </p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="font-size: 14px; color: #999; margin: 0;">
                This is an automated message from the Interns Management System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `
    };

    console.log('Sending welcome email via Firebase Functions...');
    
    const result = await sendEmailFunction(emailData);
    
    if (result.data.success) {
      console.log('Welcome email sent successfully:', result.data);
      return { success: true, message: 'Welcome email sent successfully', data: result.data };
    } else {
      console.error('Failed to send welcome email:', result.data.error);
      return { success: false, message: result.data.error || 'Failed to send welcome email' };
    }
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send welcome email',
      error: error
    };
  }
};

// Utility function to validate email addresses
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility function to send bulk emails
export const sendBulkEmails = async (emailList) => {
  const results = [];
  
  for (const emailData of emailList) {
    try {
      const result = await sendEmailFunction(emailData);
      results.push({
        email: emailData.to,
        success: result.data.success,
        message: result.data.message || 'Email sent successfully'
      });
    } catch (error) {
      results.push({
        email: emailData.to,
        success: false,
        message: error.message || 'Failed to send email'
      });
    }
    
    // Add small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

/*
FIREBASE FUNCTIONS SETUP INSTRUCTIONS:

1. Install Firebase CLI and initialize functions:
   npm install -g firebase-tools
   firebase init functions

2. Install required dependencies in functions folder:
   cd functions
   npm install nodemailer @sendgrid/mail

3. Create the sendEmail function in functions/index.js:

const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

// Set your SendGrid API key
sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendEmail = functions.https.onCall(async (data, context) => {
  try {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { to, subject, html, template, templateData } = data;

    if (!to || !subject || !html) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required email fields');
    }

    const msg = {
      to: to,
      from: 'noreply@yourcompany.com', // Replace with your verified sender
      subject: subject,
      html: html,
    };

    await sgMail.send(msg);
    
    return { 
      success: true, 
      message: 'Email sent successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});

4. Set SendGrid API key:
   firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"

5. Deploy the function:
   firebase deploy --only functions

6. Update your Firebase configuration to include functions
*/
