import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../core/firebase/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [clinicData, setClinicData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs para los listeners activos (cleanup)
  const userListenerRef = useRef(null);
  const clinicListenerRef = useRef(null);

  // ─────────────────────────────────────────
  // Helpers para limpiar listeners activos
  // ─────────────────────────────────────────
  const clearUserListener = () => {
    if (userListenerRef.current) {
      userListenerRef.current();
      userListenerRef.current = null;
    }
  };

  const clearClinicListener = () => {
    if (clinicListenerRef.current) {
      clinicListenerRef.current();
      clinicListenerRef.current = null;
    }
  };

  // ─────────────────────────────────────────
  // Suscripción en tiempo real a /users/{uid}
  // Cuando el admin aprueba/rechaza, el cambio
  // se refleja instantáneamente en la sesión.
  // ─────────────────────────────────────────
  const subscribeToUserData = (uid) => {
    clearUserListener();
    const userRef = doc(db, 'users', uid);
    userListenerRef.current = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        setUserData(uData);
        subscribeToClinicData(uid, uData);
      } else {
        setUserData(null);
        clearClinicListener();
        setClinicData(null);
      }
    }, (err) => {
      console.error('Error en listener de usuario:', err);
    });
  };

  // ─────────────────────────────────────────
  // Suscripción en tiempo real a /clinics/{id}
  // ─────────────────────────────────────────
  const subscribeToClinicData = (uid, uData) => {
    clearClinicListener();

    let clinicId = null;
    if (uData?.role === 'clinic') {
      clinicId = uid;
    } else if (uData?.role === 'staff' && uData?.clinicId) {
      clinicId = uData.clinicId;
    }

    if (!clinicId) {
      setClinicData(null);
      return;
    }

    const clinicRef = doc(db, 'clinics', clinicId);
    clinicListenerRef.current = onSnapshot(clinicRef, (snap) => {
      if (snap.exists()) {
        // Siempre incluir el id del documento para que todos los paneles lo usen
        setClinicData({ id: snap.id, ...snap.data() });
      } else {
        setClinicData(null);
      }
    }, (err) => {
      console.error('Error en listener de clínica:', err);
    });
  };

  // ─────────────────────────────────────────
  // Auth state change → arrancar listeners
  // ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        subscribeToUserData(currentUser.uid);
      } else {
        clearUserListener();
        clearClinicListener();
        setUserData(null);
        setClinicData(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      clearUserListener();
      clearClinicListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────
  // Login con Google
  // portalMode: 'owner' | 'clinic' | 'staff'
  // clinicSubtype: 'ips' | 'solo_local' | 'solo_mobile' | null
  // ─────────────────────────────────────────
  const loginWithGoogle = async (portalMode = 'owner', clinicSubtype = null) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;

      const userRef = doc(db, 'users', loggedUser.uid);
      const userSnap = await getDoc(userRef);

      if (portalMode === 'clinic') {
        // ── Registro / login de clínica ──
        const baseClinicProfile = {
          name: loggedUser.displayName || 'Clínica Veterinaria',
          email: loggedUser.email,
          role: 'clinic',
          clinicSubtype: clinicSubtype || 'ips',
          updatedAt: new Date().toISOString(),
        };

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            ...baseClinicProfile,
            createdAt: new Date().toISOString(),
          });
        } else {
          // Si ya existe, no sobreescribir clinicSubtype si ya está verificado
          const existingRole = userSnap.data().role;
          if (existingRole !== 'clinic') {
            await updateDoc(userRef, {
              role: 'clinic',
              clinicSubtype: clinicSubtype || 'ips',
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Crear /clinics/{uid} si no existe
        const clinicRef = doc(db, 'clinics', loggedUser.uid);
        const clinicSnap = await getDoc(clinicRef);
        if (!clinicSnap.exists()) {
          await setDoc(clinicRef, {
            id: loggedUser.uid,
            name: loggedUser.displayName || 'Clínica Veterinaria',
            email: loggedUser.email,
            phone: '',
            address: '',
            neighborhood: '',
            city: '',
            department: '',
            workingHours: { type: 'custom', start: '08:00', end: '18:00' },
            bio: '',
            logoUrl: '',
            socials: { instagram: '', facebook: '', whatsapp: '' },
            pricing: { type: 'free', price: 0 },
            clinicSubtype: clinicSubtype || 'ips',
            status: 'pending',
            plan: 'free',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (portalMode === 'staff') {
        // ── Login de staff (asociados) ──
        const emailLower = loggedUser.email.toLowerCase();
        const inviteRef = doc(db, 'invitations', emailLower);
        const inviteSnap = await getDoc(inviteRef);

        if (inviteSnap.exists()) {
          const inviteData = inviteSnap.data();
          const staffProfile = {
            name: loggedUser.displayName || inviteData.name || 'Asociado',
            email: emailLower,
            role: 'staff',
            clinicSubtype: null,
            subRole: inviteData.subRole || 'recepcion',
            clinicId: inviteData.clinicId,
            updatedAt: new Date().toISOString(),
          };

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              ...staffProfile,
              createdAt: new Date().toISOString(),
            });
          } else {
            await updateDoc(userRef, {
              role: 'staff',
              clinicSubtype: null,
              subRole: inviteData.subRole || 'recepcion',
              clinicId: inviteData.clinicId,
              updatedAt: new Date().toISOString(),
            });
          }

          // Crear/actualizar el doc de staff en la clínica
          const staffStatus =
            inviteData.subRole === 'veterinario' ? 'pending_vet_verification' : 'verified';
          const clinicStaffRef = doc(
            db,
            'clinics',
            inviteData.clinicId,
            'staff',
            loggedUser.uid
          );
          await setDoc(clinicStaffRef, {
            name: loggedUser.displayName || inviteData.name || 'Asociado',
            email: emailLower,
            subRole: inviteData.subRole || 'recepcion',
            clinicId: inviteData.clinicId,
            clinicName: inviteData.clinicName || 'Clínica',
            status: staffStatus,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          // Eliminar invitación usada
          await deleteDoc(inviteRef);
        } else {
          // Sin invitación: solo permitir si ya tenía rol staff
          if (userSnap.exists() && userSnap.data().role === 'staff') {
            // OK — ya es staff, el onSnapshot se encargará de cargar los datos
          } else {
            await signOut(auth);
            throw new Error(
              'No tienes ninguna invitación activa para este correo. Contacta al administrador de tu clínica.'
            );
          }
        }
      } else {
        // ── Login de propietario de mascotas ──
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: loggedUser.displayName || 'Usuario',
            email: loggedUser.email,
            role: 'owner',
            clinicSubtype: null,
            subRole: null,
            clinicId: null,
            contact: { country: '', city: '', neighborhood: '', phone: '' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else if (userSnap.data().role !== 'owner') {
          // Proteger: si era clinic o staff, no dejarlos entrar por el portal de mascotas
          await signOut(auth);
          throw new Error(
            'Esta cuenta está registrada como clínica o asociado. Por favor accede desde enlapet.com/clinic'
          );
        }
      }
    } catch (error) {
      console.error('Error durante el inicio de sesión con Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // Logout — limpia todo
  // ─────────────────────────────────────────
  const logout = async () => {
    clearUserListener();
    clearClinicListener();
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setClinicData(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // ─────────────────────────────────────────
  // refreshProfileData — fuerza re-lectura puntual
  // (útil para forzar UI tras guardar un formulario)
  // ─────────────────────────────────────────
  const refreshProfileData = async () => {
    if (!user) return;
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    if (userSnap.exists()) {
      setUserData(userSnap.data());
      subscribeToClinicData(user.uid, userSnap.data());
    }
  };

  // ─────────────────────────────────────────
  // Derivados calculados
  // ─────────────────────────────────────────
  const role = userData?.role || null;
  const subRole = userData?.subRole || null;
  const clinicSubtype = userData?.clinicSubtype || null;

  // El admin es solo covacentral@gmail.com (hardcoded, sin regex peligrosa)
  const isAdmin = user?.email === 'covacentral@gmail.com';

  // clinicId correcto según el tipo de usuario
  const clinicId = role === 'clinic'
    ? user?.uid
    : role === 'staff'
    ? userData?.clinicId
    : null;

  const isProfileComplete = !!(userData?.contact?.phone && userData?.contact?.city);

  const value = {
    user,
    userData,
    clinicData,
    role,
    subRole,
    clinicSubtype,
    clinicId,     // ← NUEVO: siempre el ID correcto de la clínica
    isAdmin,      // ← NUEVO: booleano directo, sin regex
    loading,
    loginWithGoogle,
    logout,
    refreshProfileData,
    isProfileComplete,
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
