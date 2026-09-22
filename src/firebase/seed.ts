import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './config';
import { CatalogItem } from '../types';

export interface PredefinedPartner {
  name: string;
  email: string;
  role: 'admin' | 'member';
  password: string;
  phone: string;
  avatarBg: string;
}

export const PREDEFINED_PARTNERS: PredefinedPartner[] = [
  {
    name: 'Keshav',
    email: 'keshav@diwalipatakas.app',
    role: 'admin',
    password: 'PatakasKeshav@2026',
    phone: '+91 98765 43210',
    avatarBg: 'bg-amber-600'
  },
  {
    name: 'Manav',
    email: 'manav@diwalipatakas.app',
    role: 'admin',
    password: 'PatakasManav@2026',
    phone: '+91 98765 43211',
    avatarBg: 'bg-emerald-600'
  },
  {
    name: 'Buggu',
    email: 'buggu@diwalipatakas.app',
    role: 'member',
    password: 'PatakasBuggu@2026',
    phone: '+91 98765 43212',
    avatarBg: 'bg-sky-600'
  }
];

export const INITIAL_ITEMS: Omit<CatalogItem, 'id'>[] = [
  {
    name: '10cm Electric Sparklers (Phuljhadi)',
    hindiName: 'फुलझड़ी (10cm)',
    category: 'Sparklers (Phuljhadi)',
    unit: 'box',
    costPrice: 45,
    sellingPrice: 85,
    lowStockThreshold: 10
  },
  {
    name: 'Special Ground Chakri (Spinners)',
    hindiName: 'चकरी डीलक्स',
    category: 'Ground Spinners (Chakri)',
    unit: 'box',
    costPrice: 90,
    sellingPrice: 160,
    lowStockThreshold: 8
  },
  {
    name: 'Standard Flower Pots / Anar No. 1',
    hindiName: 'अनार स्पेशल',
    category: 'Flower Pots (Anar)',
    unit: 'box',
    costPrice: 120,
    sellingPrice: 220,
    lowStockThreshold: 6
  },
  {
    name: '1000 Wala Deluxe Garland (Ladi)',
    hindiName: '1000 वाला लड़ी',
    category: 'Garlands (Ladi)',
    unit: 'box',
    costPrice: 380,
    sellingPrice: 650,
    lowStockThreshold: 5
  },
  {
    name: '12-Shot Color Sky Shots Aerial',
    hindiName: '12 शॉट स्काई शॉट',
    category: 'Sky Shots',
    unit: 'box',
    costPrice: 420,
    sellingPrice: 750,
    lowStockThreshold: 4
  },
  {
    name: 'Whistling Rockets',
    hindiName: 'सीटी रॉकेट',
    category: 'Rockets',
    unit: 'packet',
    costPrice: 85,
    sellingPrice: 150,
    lowStockThreshold: 8
  },
  {
    name: 'Kids Pop-Pop Snappers (Magic Crackers)',
    hindiName: 'पॉप-पॉप पटाखे',
    category: 'Kids Novelty',
    unit: 'box',
    costPrice: 20,
    sellingPrice: 40,
    lowStockThreshold: 15
  }
];

/**
 * Initializes or signs in a pre-defined partner
 */
export async function signInPartner(partner: PredefinedPartner) {
  try {
    // Try sign in first
    const credential = await signInWithEmailAndPassword(auth, partner.email, partner.password);
    // Ensure Firestore profile is synced
    const userRef = doc(db, 'users', credential.user.uid);
    await setDoc(userRef, {
      uid: credential.user.uid,
      displayName: partner.name,
      email: partner.email,
      phone: partner.phone,
      role: partner.role,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return credential.user;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
      try {
        // Create account
        const cred = await createUserWithEmailAndPassword(auth, partner.email, partner.password);
        await updateProfile(cred.user, { displayName: partner.name });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          displayName: partner.name,
          email: partner.email,
          phone: partner.phone,
          role: partner.role,
          createdAt: new Date().toISOString()
        });
        return cred.user;
      } catch (createErr) {
        console.error('Error creating partner account:', createErr);
        throw createErr;
      }
    }
    throw err;
  }
}

/**
 * Ensures initial catalog items are populated in Firestore
 */
export async function seedInitialCatalog() {
  try {
    const itemsCol = collection(db, 'items');
    const snap = await getDocs(itemsCol);
    if (snap.empty) {
      const batch = writeBatch(db);
      for (let i = 0; i < INITIAL_ITEMS.length; i++) {
        const item = INITIAL_ITEMS[i];
        const newRef = doc(itemsCol);
        batch.set(newRef, {
          id: newRef.id,
          ...item,
          createdAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Seeded initial Diwali catalog');
    }
  } catch (err) {
    console.warn('Catalog check/seed failed:', err);
  }
}
