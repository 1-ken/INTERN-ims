import { doc, updateDoc, arrayUnion, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Function to add notification to a user
export const addNotification = async (userId, notification) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notifications: arrayUnion({
        id: Date.now().toString(),
        message: notification.message,
        type: notification.type,
        date: new Date(),
        read: false,
        ...notification
      })
    });
  } catch (error) {
    console.error('Error adding notification:', error);
  }
};

// Check contracts for expiry and notify users
export const checkContractExpiries = async () => {
  try {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Check intern contracts
    const internProfilesSnapshot = await getDocs(collection(db, 'intern_profiles'));
    for (const profileDoc of internProfilesSnapshot.docs) {
      const profileData = profileDoc.data();
      if (profileData.contractEndDate && !profileData.contractTerminated) {
        const contractEndDate = profileData.contractEndDate.toDate ? 
          profileData.contractEndDate.toDate() : 
          new Date(profileData.contractEndDate);
        
        const userId = profileData.internUid;
        
        // Check if contract expires in 2 weeks
        if (contractEndDate <= twoWeeksFromNow && contractEndDate > oneWeekFromNow) {
          await addNotification(userId, {
            message: `Your contract will expire in 2 weeks on ${contractEndDate.toLocaleDateString()}`,
            type: 'contract_expiry_2weeks'
          });
        }
        // Check if contract expires in 1 week
        else if (contractEndDate <= oneWeekFromNow && contractEndDate > now) {
          await addNotification(userId, {
            message: `Your contract will expire in 1 week on ${contractEndDate.toLocaleDateString()}`,
            type: 'contract_expiry_1week'
          });
        }
      }
    }

    // Check attachee contracts
    const attacheeProfilesSnapshot = await getDocs(collection(db, 'attachee_profiles'));
    for (const profileDoc of attacheeProfilesSnapshot.docs) {
      const profileData = profileDoc.data();
      if (profileData.contractEndDate && !profileData.contractTerminated) {
        const contractEndDate = profileData.contractEndDate.toDate ? 
          profileData.contractEndDate.toDate() : 
          new Date(profileData.contractEndDate);
        
        const userId = profileData.attacheeUid;
        
        // Check if contract expires in 2 weeks
        if (contractEndDate <= twoWeeksFromNow && contractEndDate > oneWeekFromNow) {
          await addNotification(userId, {
            message: `Your contract will expire in 2 weeks on ${contractEndDate.toLocaleDateString()}`,
            type: 'contract_expiry_2weeks'
          });
        }
        // Check if contract expires in 1 week
        else if (contractEndDate <= oneWeekFromNow && contractEndDate > now) {
          await addNotification(userId, {
            message: `Your contract will expire in 1 week on ${contractEndDate.toLocaleDateString()}`,
            type: 'contract_expiry_1week'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking contract expiries:', error);
  }
};

// Notify mentor when intern/attachee contract is terminated
export const notifyMentorOnTermination = async (userId, userRole, userName, mentorUid) => {
  try {
    if (mentorUid) {
      await addNotification(mentorUid, {
        message: `${userName}'s contract has been terminated.`,
        type: 'contract_termination',
        relatedUserId: userId,
        relatedUserRole: userRole
      });
    }
  } catch (error) {
    console.error('Error notifying mentor:', error);
  }
};

// Get user notifications
export const getUserNotifications = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.notifications || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const notifications = userData.notifications || [];
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      );
      
      await updateDoc(doc(db, 'users', userId), {
        notifications: updatedNotifications
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};
