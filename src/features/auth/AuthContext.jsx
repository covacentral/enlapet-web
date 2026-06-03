import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../core/firebase/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carga los datos adicionales del dueño desde Firestore
  const fetchOwnerData = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOwnerData(docSnap.data());
      } else {
        setOwnerData(null);
      }
    } catch (error) {
      console.error("Error al obtener datos del dueño:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchOwnerData(currentUser.uid);
      } else {
        setOwnerData(null);
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
      
      // Si es un usuario nuevo, crea un registro básico en Firestore
      const docRef = doc(db, 'users', loggedUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const initialProfile = {
          name: loggedUser.displayName || 'Dueño sin nombre',
          email: loggedUser.email,
          contact: {
            country: '',
            city: '',
            neighborhood: '',
            phone: ''
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, initialProfile);
        setOwnerData(initialProfile);
      } else {
        setOwnerData(docSnap.data());
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
      setOwnerData(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshOwnerData = async () => {
    if (user) {
      await fetchOwnerData(user.uid);
    }
  };

  const value = {
    user,
    ownerData,
    loading,
    loginWithGoogle,
    logout,
    refreshOwnerData,
    isProfileComplete: !!(ownerData?.contact?.phone && ownerData?.contact?.city)
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
