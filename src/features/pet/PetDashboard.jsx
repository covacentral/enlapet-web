import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Settings, LogOut, AlertTriangle, Plus, Copy, Notebook, Heart } from 'lucide-react';
import styles from './PetDashboard.module.css';

export default function PetDashboard({ onNavigateToOwnerConfig, onNavigateToPetDetail, onNavigateToAddPet }) {
  const { user, ownerData, logout, isProfileComplete } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuchador en tiempo real de mascotas
  useEffect(() => {
    if (!user) return;
    const petsRef = collection(db, 'pets');
    const q = query(petsRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const petsList = [];
      querySnapshot.forEach((doc) => {
        petsList.push({ id: doc.id, ...doc.data() });
      });
      setPets(petsList);
      setLoading(false);
    }, (error) => {
      console.error("Error al escuchar mascotas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const copyNfcLink = (secureToken) => {
    const link = `${window.location.origin}/p/${secureToken}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("¡Enlace de identificación NFC copiado al portapapeles!");
    }).catch(err => {
      console.error("No se pudo copiar el enlace:", err);
    });
  };

  return (
    <div className={styles.container}>
      {/* Cabecera */}
      <div className={styles.header}>
        <div className={styles.welcomeSection}>
          <p className={styles.greeting}>Bienvenido,</p>
          <h1>{ownerData?.name || user?.displayName || 'Dueño'}</h1>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={onNavigateToOwnerConfig} 
            className={styles.actionBtn}
            title="Configurar Datos de Contacto"
            aria-label="Configurar Datos de Contacto"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={logout} 
            className={styles.actionBtn}
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Alerta de Configuración Incompleta */}
      {!isProfileComplete && (
        <div className={styles.setupWarning}>
          <div className={styles.setupWarningIconContainer}>
            <AlertTriangle className={styles.setupWarningIcon} size={24} />
          </div>
          <div className={styles.setupWarningText}>
            <h3>Contacto Incompleto</h3>
            <p>
              Completa tu número de celular y ciudad para que puedan contactarte si tu mascota se extravía.
            </p>
          </div>
          <button onClick={onNavigateToOwnerConfig} className={styles.setupWarningBtn}>
            Completar
          </button>
        </div>
      )}

      {/* Título de Sección */}
      <h2 className={styles.sectionTitle}>Mis Mascotas</h2>

      {/* Listado de Mascotas */}
      {loading ? (
        <div className={styles.loadingSpinner}>Cargando mascotas...</div>
      ) : pets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBg}>
            <Heart className={styles.emptyIcon} size={48} />
          </div>
          <h3>Sin mascotas registradas</h3>
          <p>Registra tu mascota para generar su ficha y collar inteligente NFC.</p>
          <button onClick={onNavigateToAddPet} className={styles.btnPrimary}>
            <Plus size={18} />
            <span>Registrar Mascota</span>
          </button>
        </div>
      ) : (
        <div className={styles.petsGrid}>
          {pets.map((pet) => (
            <div key={pet.id} className={styles.petCard}>
              <img 
                src={pet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
                alt={pet.name} 
                className={styles.petPhoto}
              />
              <div className={styles.petInfo}>
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petDetails}>
                  {pet.species === 'Dog' ? 'Perro' : 'Gato'} • {pet.breed || 'Sin Raza'}
                </span>
                <span className={styles.epidBadge}>EPID: {pet.epid}</span>
              </div>
              <div className={styles.petCardActions}>
                <button 
                  onClick={() => onNavigateToPetDetail(pet.id)} 
                  className={styles.viewBtn}
                  title="Ver Diario Médico"
                  aria-label="Ver Diario Médico"
                >
                  <Notebook size={16} />
                </button>
                <button 
                  onClick={() => copyNfcLink(pet.secureToken)} 
                  className={styles.nfcBtn}
                  title="Copiar Enlace NFC"
                  aria-label="Copiar Enlace NFC"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Botón flotante para añadir en dispositivos móviles */}
          <button onClick={onNavigateToAddPet} className={styles.btnAddFloating} aria-label="Agregar Mascota">
            <Plus size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
