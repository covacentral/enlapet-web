import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './core/firebase/firebase';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import AuthPage from './features/auth/AuthPage';
import RoleSelector from './features/auth/RoleSelector';
import ClinicDashboard from './features/clinic/ClinicDashboard';
import VetDirectory from './features/booking/VetDirectory';
import PetDashboard from './features/pet/PetDashboard';
import OwnerConfig from './features/owner/OwnerConfig';
import AddPetModal from './features/pet/AddPetModal';
import PublicPetView from './features/nfc/PublicPetView';
import PetJournal from './features/pet/PetJournal';

function AppContent() {
  const { user, userData, role, loading } = useAuth();
  const [view, setView] = useState('dashboard'); // dashboard, owner-config, add-pet, public-view, pet-journal, vet-directory
  const [nfcToken, setNfcToken] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);

  // Escuchador en tiempo real de mascotas del dueño (Compartido para optimizar Firestore)
  useEffect(() => {
    if (!user || role !== 'owner') {
      setPetsLoading(false);
      return;
    }
    
    const petsRef = collection(db, 'pets');
    const q = query(petsRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const petsList = [];
      querySnapshot.forEach((doc) => {
        petsList.push({ id: doc.id, ...doc.data() });
      });
      setPets(petsList);
      setPetsLoading(false);
    }, (error) => {
      console.error("Error al escuchar mascotas en App:", error);
      setPetsLoading(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  // Router nativo por análisis de Pathname (para escaneos de NFC /p/<token>)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/p/')) {
      const token = path.split('/p/')[1];
      if (token) {
        setNfcToken(token);
        setView('public-view');
      }
    }
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: "'Outfit', sans-serif",
        color: '#666'
      }}>
        Cargando EnlaPet...
      </div>
    );
  }

  // Si la vista es el perfil público del NFC, renderizar sin exigir autenticación
  if (view === 'public-view' && nfcToken) {
    return <PublicPetView secureToken={nfcToken} />;
  }

  // Si el usuario no está logueado, forzar pantalla de autenticación
  if (!user) {
    return <AuthPage />;
  }

  // Si está autenticado pero no tiene rol asignado (nuevo registro)
  if (user && !role) {
    return <RoleSelector />;
  }

  // Si es una clínica o staff clínico, renderizar el panel de la clínica
  if (role === 'clinic' || role === 'staff') {
    return <ClinicDashboard />;
  }

  // Router interno del Dashboard privado del dueño de mascotas
  switch (view) {
    case 'owner-config':
      return (
        <OwnerConfig 
          onSaveComplete={() => setView('dashboard')} 
          onBack={() => setView('dashboard')} 
        />
      );
    case 'add-pet':
      return (
        <AddPetModal 
          onSaveComplete={() => {
            setSelectedPetId(null);
            setView('dashboard');
          }} 
          onBack={() => {
            setSelectedPetId(null);
            setView('dashboard');
          }} 
          petId={selectedPetId}
        />
      );
    case 'pet-journal':
      return (
        <PetJournal 
          petId={selectedPetId} 
          onBack={() => {
            setSelectedPetId(null);
            setView('dashboard');
          }} 
        />
      );
    case 'vet-directory':
      return (
        <VetDirectory
          user={user}
          ownerData={userData}
          pets={pets}
          onBack={() => setView('dashboard')}
        />
      );
    case 'dashboard':
    default:
      return (
        <PetDashboard 
          petsList={pets}
          petsLoading={petsLoading}
          onNavigateToOwnerConfig={() => setView('owner-config')}
          onNavigateToAddPet={() => {
            setSelectedPetId(null);
            setView('add-pet');
          }}
          onNavigateToPetDetail={(petId) => {
            setSelectedPetId(petId);
            setView('pet-journal');
          }}
          onNavigateToEditPet={(petId) => {
            setSelectedPetId(petId);
            setView('add-pet');
          }}
          onNavigateToVetDirectory={() => setView('vet-directory')}
        />
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
