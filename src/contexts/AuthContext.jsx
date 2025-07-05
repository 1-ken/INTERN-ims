import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create base user data
      const baseUserData = {
        uid: user.uid,
        email: user.email,
        role: userData.role,
        fullName: userData.fullName,
        department: userData.department,
        isActive: true, // Default to active
        createdAt: serverTimestamp()
      };

      // Add role-specific data
      if (userData.role === 'intern' && userData.countyCode) {
        baseUserData.countyCode = userData.countyCode;
      } else if (userData.role === 'attachee' && userData.institution) {
        baseUserData.institution = userData.institution;
      }

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), baseUserData);

      return user;
    } catch (error) {
      throw error;
    }
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if user is active
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.isActive === false) {
        // Sign out the user immediately if they're deactivated
        await signOut(auth);
        throw new Error('ACCOUNT_DEACTIVATED');
      }
    }
    
    return userCredential;
  }

  function logout() {
    return signOut(auth);
  }

  async function getUserRole() {
    if (!currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  }

  async function getUserData() {
    if (!currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  }

  async function updateUserStatus(userId, isActive) {
    if (!currentUser) throw new Error('Not authenticated');
    
    // Check if current user is HR
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data().role !== 'hr') {
      throw new Error('Unauthorized: Only HR can update user status');
    }
    
    const updateData = {
      isActive: isActive,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    };
    
    if (!isActive) {
      updateData.deactivatedAt = serverTimestamp();
      updateData.deactivatedBy = currentUser.uid;
    } else {
      updateData.reactivatedAt = serverTimestamp();
      updateData.reactivatedBy = currentUser.uid;
    }
    
    await setDoc(doc(db, 'users', userId), updateData, { merge: true });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // If new Google user, they need to complete profile setup
        // Return false to indicate profile setup needed
        return { needsProfileSetup: true, user };
      }
      
      // Check if existing user is active
      const userData = userDoc.data();
      if (userData.isActive === false) {
        throw new Error('ACCOUNT_DEACTIVATED');
      }
      
      return { needsProfileSetup: false, user };
    } catch (error) {
      throw error;
    }
  }

  async function completeGoogleSignup(user, userData) {
    try {
      // Create base user data
      const baseUserData = {
        uid: user.uid,
        email: user.email,
        role: userData.role,
        fullName: userData.fullName || user.displayName,
        department: userData.department,
        isActive: true, // Default to active
        createdAt: serverTimestamp()
      };

      // Add role-specific data
      if (userData.role === 'intern' && userData.countyCode) {
        baseUserData.countyCode = userData.countyCode;
      } else if (userData.role === 'attachee' && userData.institution) {
        baseUserData.institution = userData.institution;
      }

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), baseUserData);

      return user;
    } catch (error) {
      throw error;
    }
  }

  const value = {
    currentUser,
    signup,
    login,
    logout,
    getUserRole,
    getUserData,
    updateUserStatus,
    resetPassword,
    signInWithGoogle,
    completeGoogleSignup
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
