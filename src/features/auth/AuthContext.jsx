import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../core/firebase/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Datos del documento /users/{uid}
  const [clinicData, setClinicData] = useState(null); // Datos del documento /clinics/{clinicId} si aplica
  const [loading, setLoading] = useState(true);

  // Carga los datos de usuario y clínica asociados en Firestore
  const fetchProfileData = async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const uData = userSnap.data();
        setUserData(uData);
        
        // Cargar datos de la clínica si el rol es clinic o staff
        if (uData.role === 'clinic') {
          const clinicRef = doc(db, 'clinics', uid);
          const clinicSnap = await getDoc(clinicRef);
          if (clinicSnap.exists()) {
            setClinicData(clinicSnap.data());
          } else {
            setClinicData(null);
          }
        } else if (uData.role === 'staff' && uData.clinicId) {
          const clinicRef = doc(db, 'clinics', uData.clinicId);
          const clinicSnap = await getDoc(clinicRef);
          if (clinicSnap.exists()) {
            setClinicData(clinicSnap.data());
          } else {
            setClinicData(null);
          }
        } else {
          setClinicData(null);
        }
      } else {
        setUserData(null);
        setClinicData(null);
      }
    } catch (error) {
      console.error("Error al obtener datos de perfil:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfileData(currentUser.uid);
      } else {
        setUserData(null);
        setClinicData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;
      
      const userRef = doc(db, 'users', loggedUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const initialProfile = {
          name: loggedUser.displayName || 'Usuario',
          email: loggedUser.email,
          role: null, // Rol no definido inicialmente
          contact: {
            country: '',
            city: '',
            neighborhood: '',
            phone: ''
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, initialProfile);
        setUserData(initialProfile);
      } else {
        await fetchProfileData(loggedUser.uid);
      }
    } catch (error) {
      console.error("Error durante el inicio de sesión con Google:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setClinicData(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para seleccionar el rol inicial
  const selectRole = async (roleType) => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: roleType,
        updatedAt: new Date().toISOString()
      });

      if (roleType === 'clinic') {
        const clinicRef = doc(db, 'clinics', user.uid);
        const initialClinic = {
          name: user.displayName || 'Clínica Veterinaria',
          email: user.email,
          phone: '',
          address: '',
          neighborhood: '',
          city: '',
          workingHours: { type: 'custom', start: '08:00', end: '18:00' }, // o '24h'
          bio: '',
          logoUrl: '',
          socials: { instagram: '', facebook: '', email: user.email, phone: '' },
          pricing: { type: 'free', price: 0 }, // 'free', 'pay_at_clinic', 'pre_pay'
          status: 'pending', // 'pending' | 'verified' | 'suspended'
          plan: 'free', // 'free' | 'premium'
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(clinicRef, initialClinic);
      }
      
      await fetchProfileData(user.uid);
    } catch (error) {
      console.error("Error al seleccionar rol:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfileData = async () => {
    if (user) {
      await fetchProfileData(user.uid);
    }
  };

  const value = {
    user,
    userData,
    clinicData,
    role: userData?.role || null,
    loading,
    loginWithGoogle,
    logout,
    selectRole,
    refreshProfileData,
    isProfileComplete: !!(userData?.contact?.phone && userData?.contact?.city)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
