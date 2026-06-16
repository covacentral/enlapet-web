import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './core/firebase/firebase';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import AuthPage from './features/auth/AuthPage';
import ClinicAuthPage from './features/auth/ClinicAuthPage';
import AdminPanel from './features/admin/AdminPanel';
import ClinicRouter from './features/clinic/ClinicRouter';
import PetDashboard from './features/pet/PetDashboard';
import OwnerConfig from './features/owner/OwnerConfig';
import AddPetModal from './features/pet/AddPetModal';
import PublicPetView from './features/nfc/PublicPetView';
import PetJournal from './features/pet/PetJournal';
import VetDirectory from './features/booking/VetDirectory';

// ─────────────────────────────────────────────────────────
// Pantalla de carga
// ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif",
      gap: '16px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '3px solid hsl(220, 20%, 90%)',
        borderTopColor: 'hsl(350, 90%, 60%)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'hsl(220, 20%, 50%)', fontWeight: 600, fontSize: '0.9rem' }}>
        Cargando enlapet...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AppContent — lógica de routing principal
// ─────────────────────────────────────────────────────────
function AppContent() {
  const { user, userData, role, isAdmin, clinicSubtype, subRole, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [nfcToken, setNfcToken] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);

  // Detectar ruta del navegador
  const pathname = window.location.pathname;
  const isClinicRoute = pathname.startsWith('/clinic');
  const isPublicPetRoute = pathname.startsWith('/p/');

  // ── Listener en tiempo real de mascotas del dueño ──
  useEffect(() => {
    if (!user || role !== 'owner') {
      setPetsLoading(false);
      return;
    }
    const petsRef = collection(db, 'pets');
    const q = query(petsRef, where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setPets(list);
      setPetsLoading(false);
    }, (err) => {
      console.error('Error al escuchar mascotas:', err);
      setPetsLoading(false);
    });
    return () => unsubscribe();
  }, [user, role]);

  // ── Ruta pública NFC /p/<token> ──
  useEffect(() => {
    if (isPublicPetRoute) {
      const token = pathname.split('/p/')[1];
      if (token) {
        setNfcToken(token);
        setView('public-view');
      }
    }
  }, []);

  // ── Pantalla de carga ──
  if (loading) return <LoadingScreen />;

  // ── Vista pública NFC (sin autenticación) ──
  if (view === 'public-view' && nfcToken) {
    return <PublicPetView secureToken={nfcToken} />;
  }

  // ── Sin sesión → login según ruta ──
  if (!user) {
    return isClinicRoute ? <ClinicAuthPage /> : <AuthPage />;
  }

  // ── Admin covacentral → Panel de administración ──
  if (isAdmin) {
    return <AdminPanel />;
  }

  // ── Clinic o Staff → ClinicRouter maneja el subrouting ──
  if (role === 'clinic' || role === 'staff') {
    return <ClinicRouter />;
  }

  // ── Owner → Dashboard de mascotas ──
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
          onSaveComplete={() => { setSelectedPetId(null); setView('dashboard'); }}
          onBack={() => { setSelectedPetId(null); setView('dashboard'); }}
          petId={selectedPetId}
        />
      );

    case 'pet-journal':
      return (
        <PetJournal
          petId={selectedPetId}
          onBack={() => { setSelectedPetId(null); setView('dashboard'); }}
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
          onNavigateToAddPet={() => { setSelectedPetId(null); setView('add-pet'); }}
          onNavigateToPetDetail={(petId) => { setSelectedPetId(petId); setView('pet-journal'); }}
          onNavigateToEditPet={(petId) => { setSelectedPetId(petId); setView('add-pet'); }}
          onNavigateToVetDirectory={() => setView('vet-directory')}
        />
      );
  }
}

// ─────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
