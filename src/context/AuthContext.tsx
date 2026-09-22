import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';
import { PREDEFINED_PARTNERS, PredefinedPartner, signInPartner } from '../firebase/seed';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signInPartnerQuick: (partner: PredefinedPartner) => Promise<void>;
  signInCustomEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  predefinedPartners: PredefinedPartner[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen to user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          const matchedPartner = PREDEFINED_PARTNERS.find(p => p.email.toLowerCase() === (user.email || '').toLowerCase());
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (matchedPartner && (data.role !== matchedPartner.role || data.displayName !== matchedPartner.name)) {
              await setDoc(userRef, {
                role: matchedPartner.role,
                displayName: matchedPartner.name
              }, { merge: true });
              setProfile({ ...data, role: matchedPartner.role, displayName: matchedPartner.name });
            } else {
              setProfile(data);
            }
            setLoading(false);
          } else {
            // Self-register fallback profile
            const role = matchedPartner ? matchedPartner.role : (user.email?.includes('admin') ? 'admin' : 'member');
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || matchedPartner?.name || user.email?.split('@')[0] || 'Partner',
              email: user.email || '',
              role: role,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            } catch (err) {
              console.error('Failed to create user profile:', err);
              setProfile(newProfile); // fallback memory
            }
            setLoading(false);
          }
        }, (error) => {
          console.warn('Profile listen error:', error);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInPartnerQuick = async (partner: PredefinedPartner) => {
    setLoading(true);
    try {
      await signInPartner(partner);
    } finally {
      setLoading(false);
    }
  };

  const signInCustomEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const role = email.toLowerCase().includes('admin') ? 'admin' : 'member';
        await setDoc(userRef, {
          uid: cred.user.uid,
          displayName: cred.user.displayName || email.split('@')[0],
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        isAdmin,
        loading,
        signInPartnerQuick,
        signInCustomEmail,
        logout,
        predefinedPartners: PREDEFINED_PARTNERS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
