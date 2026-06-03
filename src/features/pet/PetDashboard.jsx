import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
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
          <p>Hola 👋</p>
          <h1>{ownerData?.name || user?.displayName || 'Dueño'}</h1>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={onNavigateToOwnerConfig} 
            className={styles.actionBtn}
            title="Configurar Datos de Contacto"
            aria-label="Configurar Datos de Contacto"
          >
            ⚙️
          </button>
          <button 
            onClick={logout} 
            className={styles.actionBtn}
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Alerta de Configuración Incompleta */}
      {!isProfileComplete && (
        <div className={styles.setupWarning}>
          <div className={styles.setupWarningText}>
            <h3>⚠️ Ficha de contacto incompleta</h3>
            <p>
              Para que el collar NFC funcione y puedan contactarte si tu mascota se extravía, debes rellenar tu número de celular y ciudad en la Ficha del Dueño.
            </p>
          </div>
          <button onClick={onNavigateToOwnerConfig} className={styles.setupWarningBtn}>
            Completar Ficha
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
          <span className={styles.emptyIcon}>🐶</span>
          <h3>Aún no tienes mascotas registradas</h3>
          <p>Registra tu primera mascota para generar su collar de identificación.</p>
          <button onClick={onNavigateToAddPet} className={styles.btnPrimary}>
            Registrar Mascota
          </button>
        </div>
      ) : (
        <div className={styles.petsGrid}>
          {pets.map((pet) => (
            <div key={pet.id} className={styles.petCard}>
              <img 
                src={pet.photoUrl || 'https://via.placeholder.com/150?text=Mascota'} 
                alt={pet.name} 
                className={styles.petPhoto}
              />
              <div className={styles.petInfo}>
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petDetails}>
                  {pet.species === 'Dog' ? '🐶 Perro' : '🐱 Gato'} • {pet.breed || 'Sin Raza'}
                </span>
                <span className={styles.epidBadge}>EPID: {pet.epid}</span>
              </div>
              <div className={styles.petCardActions}>
                <button 
                  onClick={() => onNavigateToPetDetail(pet.id)} 
                  className={styles.viewBtn}
                >
                  Ver Diario
                </button>
                <button 
                  onClick={() => copyNfcLink(pet.secureToken)} 
                  className={styles.nfcBtn}
                >
                  Copiar NFC
                </button>
              </div>
            </div>
          ))}

          {/* Botón flotante para añadir en dispositivos móviles */}
          <button onClick={onNavigateToAddPet} className={styles.btnAddFloating} aria-label="Agregar Mascota">
            +
          </button>
        </div>
      )}
    </div>
  );
}
