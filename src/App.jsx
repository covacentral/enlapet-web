import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import AuthPage from './features/auth/AuthPage';
import PetDashboard from './features/pet/PetDashboard';
import OwnerConfig from './features/owner/OwnerConfig';
import AddPetModal from './features/pet/AddPetModal';
import PublicPetView from './features/nfc/PublicPetView';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard'); // dashboard, owner-config, add-pet, public-view
  const [nfcToken, setNfcToken] = useState(null);

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

  // Router interno del Dashboard privado
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
          onSaveComplete={() => setView('dashboard')} 
          onBack={() => setView('dashboard')} 
        />
      );
    case 'dashboard':
    default:
      return (
        <PetDashboard 
          onNavigateToOwnerConfig={() => setView('owner-config')}
          onNavigateToAddPet={() => setView('add-pet')}
          onNavigateToPetDetail={(petId) => {
            // En el MVP inicial, "Ver Diario" redirige o alerta al usuario 
            // que estará disponible en la app móvil.
            alert("Esta función de diario detallado estará disponible próximamente en nuestra aplicación móvil iOS y Android.");
          }}
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
