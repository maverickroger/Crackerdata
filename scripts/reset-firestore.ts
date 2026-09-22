import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { PREDEFINED_PARTNERS } from '../src/firebase/seed';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

async function runReset() {
  console.log('--- Starting Complete Data Reset & Partner Reconfiguration ---');

  // Step 1: Ensure Keshav partner account exists and sign in as Admin
  const adminPartner = PREDEFINED_PARTNERS[0]; // Keshav
  let adminUid = '';

  try {
    const cred = await signInWithEmailAndPassword(auth, adminPartner.email, adminPartner.password);
    adminUid = cred.user.uid;
    console.log(`Signed in as admin partner: ${adminPartner.name} (${adminPartner.email})`);
  } catch (err: any) {
    console.log(`Creating admin partner account: ${adminPartner.name}...`);
    const cred = await createUserWithEmailAndPassword(auth, adminPartner.email, adminPartner.password);
    adminUid = cred.user.uid;
  }

  // Ensure Keshav is set as admin in Firestore users/{adminUid}
  await setDoc(doc(db, 'users', adminUid), {
    uid: adminUid,
    displayName: adminPartner.name,
    email: adminPartner.email,
    phone: adminPartner.phone,
    role: 'admin',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // Step 2: Ensure Manav partner account exists and is set as Admin
  const manavPartner = PREDEFINED_PARTNERS[1]; // Manav
  let manavUid = '';
  try {
    const cred = await signInWithEmailAndPassword(auth, manavPartner.email, manavPartner.password);
    manavUid = cred.user.uid;
  } catch {
    try {
      const cred = await createUserWithEmailAndPassword(auth, manavPartner.email, manavPartner.password);
      manavUid = cred.user.uid;
    } catch {}
  }
  if (manavUid) {
    await setDoc(doc(db, 'users', manavUid), {
      uid: manavUid,
      displayName: manavPartner.name,
      email: manavPartner.email,
      phone: manavPartner.phone,
      role: 'admin',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Configured Manav as admin partner (${manavPartner.email})`);
  }

  // Step 3: Ensure Buggu partner account exists and is set as Member
  const bugguPartner = PREDEFINED_PARTNERS[2]; // Buggu
  let bugguUid = '';
  try {
    const cred = await signInWithEmailAndPassword(auth, bugguPartner.email, bugguPartner.password);
    bugguUid = cred.user.uid;
  } catch {
    try {
      const cred = await createUserWithEmailAndPassword(auth, bugguPartner.email, bugguPartner.password);
      bugguUid = cred.user.uid;
    } catch {}
  }
  if (bugguUid) {
    await setDoc(doc(db, 'users', bugguUid), {
      uid: bugguUid,
      displayName: bugguPartner.name,
      email: bugguPartner.email,
      phone: bugguPartner.phone,
      role: 'member',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Configured Buggu as partner (${bugguPartner.email})`);
  }

  // Step 4: Delete all entries in all transactional and audit collections
  const collectionsToClear = [
    'purchases',
    'sales',
    'expenses',
    'damaged_stock',
    'cash_handovers',
    'audit_logs',
    'daily_seals'
  ];

  for (const colName of collectionsToClear) {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      console.log(`Clearing ${snap.docs.length} documents from ${colName}...`);
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    } else {
      console.log(`Collection ${colName} is already empty.`);
    }
  }

  // Step 5: Reset season config to clean active state
  console.log('Resetting season_config/current to active state...');
  await setDoc(doc(db, 'season_config', 'current'), {
    id: 'current',
    seasonYear: 2026,
    seasonName: 'Diwali Patakas 2026',
    status: 'active',
    signoffs: [],
    createdAt: new Date().toISOString()
  });

  // Step 6: Remove any old users from Firestore that aren't Keshav, Manav, or Buggu
  const usersSnap = await getDocs(collection(db, 'users'));
  const validEmails = new Set(PREDEFINED_PARTNERS.map(p => p.email.toLowerCase()));
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    if (userData.email && !validEmails.has(userData.email.toLowerCase())) {
      console.log(`Removing old user doc: ${userData.displayName} (${userData.email})`);
      await deleteDoc(userDoc.ref);
    }
  }

  console.log('--- ALL ENTRIES AND DATA RESET COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runReset().catch((err) => {
  console.error('Reset failed with error:', err);
  process.exit(1);
});
