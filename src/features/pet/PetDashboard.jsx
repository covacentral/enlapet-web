import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Settings, LogOut, AlertTriangle, Plus, Copy, Notebook, Heart, Edit2, Search, PawPrint } from 'lucide-react';
import styles from './PetDashboard.module.css';

export default function PetDashboard({ onNavigateToOwnerConfig, onNavigateToPetDetail, onNavigateToAddPet, onNavigateToEditPet }) {
  const { user, ownerData, logout, isProfileComplete } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para la orden de la medalla NFC
  const [selectedPetsForMedal, setSelectedPetsForMedal] = useState({});

  // Estados de Administrador Maestro
  const [searchInput, setSearchInput] = useState('ELP-');
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundPet, setFoundPet] = useState(null);

  const isAdmin = user?.email === 'covacentral@gmail.com' || user?.email?.includes('admin');

  // Escuchador en tiempo real de mascotas del dueño
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

  // Manejar entrada de EPID con auto-relleno e inteligente
  const handleSearchInputChange = (e) => {
    let value = e.target.value.toUpperCase();
    
    // Si el usuario intentó borrar el prefijo o vaciar el campo
    if (!value.startsWith('ELP-')) {
      if (value === '' || value === 'E' || value === 'EL' || value === 'ELP') {
        setSearchInput('ELP-');
        return;
      }
      // Si pegó el código directo (ej. 4B7X82), agregar prefijo
      value = 'ELP-' + value.replace(/[^A-Z0-9]/g, '');
    } else {
      // Limpiar caracteres no alfanuméricos después de 'ELP-'
      const prefix = 'ELP-';
      const rest = value.substring(prefix.length).replace(/[^A-Z0-9]/g, '');
      value = prefix + rest;
    }

    // Máximo 10 caracteres (ELP- es 4 + 6 alfanuméricos)
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    
    setSearchInput(value);
  };

  // Búsqueda maestra por EPID para Administrador
  const handleAdminSearch = async (e) => {
    e.preventDefault();
    const queryEpid = searchInput.trim().toUpperCase();
    if (queryEpid === 'ELP-' || !queryEpid) return;

    setSearchLoading(true);
    setFoundPet(null);
    try {
      const petsRef = collection(db, 'pets');
      const q = query(petsRef, where('epid', '==', queryEpid));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const doc = snap.docs[0];
        setFoundPet({ id: doc.id, ...doc.data() });
      } else {
        alert(`No se encontró ninguna mascota con el EPID ${queryEpid}.`);
      }
    } catch (err) {
      console.error("Error en búsqueda administrativa:", err);
      alert("Error al buscar el EPID.");
    } finally {
      setSearchLoading(false);
    }
  };

  const togglePetSelectionForMedal = (petId) => {
    setSelectedPetsForMedal(prev => ({
      ...prev,
      [petId]: !prev[petId]
    }));
  };

  const handleRequestMedal = () => {
    const selectedIds = Object.keys(selectedPetsForMedal).filter(id => selectedPetsForMedal[id]);
    if (selectedIds.length === 0) {
      alert("Por favor selecciona al menos una mascota para solicitar su medalla NFC.");
      return;
    }

    const selectedPetsInfo = pets.filter(p => selectedIds.includes(p.id));
    let message = "¡Hola! Quiero solicitar la medalla inteligente NFC enlapet para mi(s) mascota(s):\n\n";
    selectedPetsInfo.forEach(p => {
      message += `- ${p.name} (EPID: ${p.epid})\n`;
    });

    const waUrl = `https://wa.me/573226460199?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

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
      {/* Identidad enlapet */}
      <div className={styles.brandHeader}>
        <PawPrint className={styles.brandLogoIcon} size={26} />
        <span className={styles.brandLogoText}>enlapet</span>
      </div>

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
        </div>
      </div>

      {/* Panel Administrador Maestro */}
      {isAdmin && (
        <div className={styles.adminPanel}>
          <h2 className={styles.sectionTitle}>Buscador EPID Maestro</h2>
          <form onSubmit={handleAdminSearch} className={styles.adminSearchForm}>
            <input 
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder="Escribe el EPID de la mascota (ej: ELP-XXXXXX)"
              className={styles.adminSearchInput}
            />
            <button type="submit" disabled={searchLoading} className={styles.adminSearchBtn}>
              <Search size={18} />
            </button>
          </form>

          {/* Tarjeta de Mascota Encontrada (Solo foto y botón de copiar NFC) */}
          {foundPet && (
            <div className={styles.foundPetCard}>
              <img 
                src={foundPet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
                alt={foundPet.name} 
                className={styles.foundPetPhoto}
              />
              <button 
                onClick={() => copyNfcLink(foundPet.secureToken)} 
                className={styles.adminCopyBtn}
              >
                <Copy size={16} />
                <span>Copiar URL NFC de {foundPet.name}</span>
              </button>
            </div>
          )}
          <div className={styles.divider} />
        </div>
      )}

      {/* Alerta de Configuración Incompleta (Para usuarios estándar) */}
      {!isProfileComplete && !isAdmin && (
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

      {/* Panel de Solicitud de Medalla NFC (Para usuarios estándar) */}
      {!loading && pets.length > 0 && !isAdmin && (
        <div className={styles.nfcOrderPanel}>
          <h3 className={styles.nfcOrderTitle}>Adquiere la Medalla Inteligente NFC</h3>
          <p className={styles.nfcOrderDesc}>
            Selecciona la(s) mascota(s) para pedir su medalla física grabada. La orden se completará a través de WhatsApp.
          </p>
          <div className={styles.nfcOrderList}>
            {pets.map(p => (
              <label key={p.id} className={styles.nfcOrderLabel}>
                <input 
                  type="checkbox" 
                  checked={!!selectedPetsForMedal[p.id]} 
                  onChange={() => togglePetSelectionForMedal(p.id)}
                  className={styles.nfcOrderCheckbox}
                />
                <span className={styles.nfcOrderPetName}>{p.name}</span>
                <span className={styles.nfcOrderPetEpid}>{p.epid}</span>
              </label>
            ))}
          </div>
          <button onClick={handleRequestMedal} className={styles.nfcOrderBtn}>
            Solicitar Medalla NFC (WhatsApp)
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
                onClick={() => onNavigateToEditPet(pet.id)}
                style={{ cursor: 'pointer' }}
                title="Hacer clic para editar foto"
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
                  onClick={() => onNavigateToEditPet(pet.id)} 
                  className={styles.editBtn}
                  title="Editar Mascota"
                  aria-label="Editar Mascota"
                >
                  <Edit2 size={16} />
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
