import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Settings, LogOut, AlertTriangle, Plus, Copy, Notebook, Heart, Edit2, Search, PawPrint, Phone, ShieldAlert, UserCheck, UserX, Crown } from 'lucide-react';
import { formatPetAge } from '../../shared/utils/generators';
import styles from './PetDashboard.module.css';

export default function PetDashboard({ 
  petsList = [], 
  petsLoading = false, 
  onNavigateToOwnerConfig, 
  onNavigateToPetDetail, 
  onNavigateToAddPet, 
  onNavigateToEditPet,
  onNavigateToVetDirectory 
}) {
  const { user, ownerData, logout, isProfileComplete } = useAuth();
  
  // Usar las mascotas y estado cargando pasados por el padre (App.jsx)
  const pets = petsList;
  const loading = petsLoading;

  // Estado para la orden de la medalla NFC
  const [selectedPetsForMedal, setSelectedPetsForMedal] = useState({});

  // Estado para vista previa del perfil público del NFC
  const [previewPet, setPreviewPet] = useState(null);

  // Estados de Administrador Maestro
  const [searchInput, setSearchInput] = useState('ELP-');
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundPet, setFoundPet] = useState(null);

  const isAdmin = user?.email === 'covacentral@gmail.com' || user?.email?.includes('admin');

  // Estados de clínicas para administrador
  const [clinicsList, setClinicsList] = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setClinicsLoading(true);
    const q = collection(db, 'clinics');
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setClinicsList(list);
      setClinicsLoading(false);
    }, (err) => {
      console.error("Error al obtener clínicas:", err);
      setClinicsLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const [expandedDocs, setExpandedDocs] = useState({});

  const toggleDocs = (clinicId) => {
    setExpandedDocs(prev => ({
      ...prev,
      [clinicId]: !prev[clinicId]
    }));
  };

  const handleUpdateClinicStatus = async (clinicId, newStatus) => {
    try {
      const docRef = doc(db, 'clinics', clinicId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Si el estado es 'verified', actualizar el rol del usuario a 'clinic'
      if (newStatus === 'verified') {
        const userRef = doc(db, 'users', clinicId);
        await updateDoc(userRef, {
          role: 'clinic',
          updatedAt: new Date().toISOString()
        });
      } else if (newStatus === 'suspended') {
        // Si es suspendido, revertir el rol del usuario a 'owner'
        const userRef = doc(db, 'users', clinicId);
        await updateDoc(userRef, {
          role: 'owner',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error al actualizar estado de veterinaria:", err);
      alert("Error al actualizar estado.");
    }
  };

  const handleUpdateClinicPlan = async (clinicId, newPlan) => {
    try {
      const docRef = doc(db, 'clinics', clinicId);
      await updateDoc(docRef, {
        plan: newPlan,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al actualizar plan de veterinaria:", err);
      alert("Error al actualizar plan.");
    }
  };

  // Estado y escuchador en tiempo real para solicitudes de permisos clínicos
  const [pendingPermissions, setPendingPermissions] = useState([]);

  useEffect(() => {
    if (!user || isAdmin) return;
    const q = query(
      collection(db, 'clinical_permissions'),
      where('ownerId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setPendingPermissions(list);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleApprovePermission = async (permId) => {
    try {
      const docRef = doc(db, 'clinical_permissions', permId);
      await updateDoc(docRef, {
        status: 'authorized',
        authorizedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al autorizar permiso:", err);
    }
  };

  const handleRejectPermission = async (permId) => {
    try {
      const docRef = doc(db, 'clinical_permissions', permId);
      await updateDoc(docRef, {
        status: 'revoked',
        revokedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al rechazar permiso:", err);
    }
  };

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

      {/* Barra de Navegación del Dashboard */}
      <div className={styles.navTabs}>
        <button className={`${styles.navTab} ${styles.activeTab}`}>
          Mis Mascotas
        </button>
        <button onClick={onNavigateToVetDirectory} className={styles.navTab}>
          Buscar Veterinarias
        </button>
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
          
          {/* Sección de Gestión de Clínicas (Covacentral Master Panel) */}
          <div className={styles.adminSection}>
            <h2 className={styles.sectionTitle}>Gestión de Clínicas enlapet</h2>
            {clinicsLoading ? (
              <div className={styles.loadingSpinner}>Cargando veterinarias...</div>
            ) : clinicsList.length === 0 ? (
              <div className={styles.emptyState}>No hay veterinarias registradas en la plataforma.</div>
            ) : (
              <div className={styles.adminClinicsList}>
                {clinicsList.map((clinic) => {
                  const status = clinic.status || 'pending';
                  const plan = clinic.plan || 'free';
                  return (
                    <div key={clinic.id} className={styles.adminClinicCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
                        <div className={styles.adminClinicInfo}>
                          {clinic.logoUrl ? (
                            <img src={clinic.logoUrl} alt={clinic.name} className={styles.adminClinicLogo} />
                          ) : (
                            <div className={styles.adminClinicLogoPlaceholder}>
                              <PawPrint size={24} />
                            </div>
                          )}
                          <div className={styles.adminClinicText}>
                            <h3>{clinic.name || 'Veterinaria Sin Nombre'}</h3>
                            <p>{clinic.city || 'Sin ciudad'} - {clinic.neighborhood || 'Sin barrio'}</p>
                            <p className={styles.adminClinicMeta}>Contacto: {clinic.phone || 'Sin teléfono'} | {clinic.email}</p>
                            <div className={styles.adminClinicBadges}>
                              <span className={`${styles.statusBadge} ${styles[status]}`}>
                                {status === 'verified' ? '✓ Verificado' : status === 'suspended' ? '✕ Suspendido' : '⚡ Pendiente'}
                              </span>
                              <span className={`${styles.planBadge} ${styles[plan]}`}>
                                {plan === 'premium' ? '👑 Premium' : 'Gratuito'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.adminClinicActions}>
                          <div className={styles.actionGroup}>
                            <button 
                              onClick={() => toggleDocs(clinic.id)}
                              className={styles.adminActionBtn}
                              style={{ marginRight: '8px', background: expandedDocs[clinic.id] ? '#eee' : 'white', borderColor: expandedDocs[clinic.id] ? '#10b981' : '#ccc' }}
                            >
                              <span>{expandedDocs[clinic.id] ? 'Ocultar Documentos' : 'Inspeccionar Docs'}</span>
                            </button>
                            <span className={styles.actionGroupLabel}>Verificación:</span>
                            <button 
                              onClick={() => handleUpdateClinicStatus(clinic.id, 'verified')}
                              className={`${styles.adminActionBtn} ${status === 'verified' ? styles.activeVerify : ''}`}
                              title="Aprobar Verificación"
                            >
                              <UserCheck size={14} />
                              <span>Aprobar</span>
                            </button>
                            <button 
                              onClick={() => handleUpdateClinicStatus(clinic.id, 'suspended')}
                              className={`${styles.adminActionBtn} ${status === 'suspended' ? styles.activeSuspend : ''}`}
                              title="Suspender Cuenta"
                            >
                              <UserX size={14} />
                              <span>Suspender</span>
                            </button>
                            {status !== 'pending' && (
                              <button 
                                onClick={() => handleUpdateClinicStatus(clinic.id, 'pending')}
                                className={styles.adminActionBtn}
                                title="Poner en Pendiente"
                              >
                                <span>Marcar Pendiente</span>
                              </button>
                            )}
                          </div>
                          <div className={styles.actionGroup}>
                            <span className={styles.actionGroupLabel}>Suscripción:</span>
                            <button 
                              onClick={() => handleUpdateClinicPlan(clinic.id, 'premium')}
                              className={`${styles.adminActionBtn} ${plan === 'premium' ? styles.activePremium : ''}`}
                              title="Plan Premium (PRO)"
                            >
                              <Crown size={14} />
                              <span>Premium</span>
                            </button>
                            <button 
                              onClick={() => handleUpdateClinicPlan(clinic.id, 'free')}
                              className={`${styles.adminActionBtn} ${plan === 'free' ? styles.activeFree : ''}`}
                              title="Plan Gratuito"
                            >
                              <span>Gratuito</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedDocs[clinic.id] && (
                        <div className={styles.adminClinicDocsInspection} style={{ display: 'flex', gap: '20px', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '16px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: 'hsl(220, 20%, 40%)' }}>
                              NIT/RUT: <strong style={{ color: '#333' }}>{clinic.nit || 'No Registrado'}</strong>
                            </p>
                            {clinic.rutUrl ? (
                              <img src={clinic.rutUrl} alt="RUT de la clínica" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', padding: '8px' }} />
                            ) : (
                              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#666' }}>No se ha cargado documento RUT</p>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: 'hsl(220, 20%, 40%)' }}>
                              Tarjeta Profesional / Registro: <strong style={{ color: '#333' }}>{clinic.professionalCard || 'No Registrado'}</strong>
                            </p>
                            {clinic.licenseUrl ? (
                              <img src={clinic.licenseUrl} alt="Tarjeta Profesional" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', padding: '8px' }} />
                            ) : (
                              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#666' }}>No se ha cargado documento de Tarjeta Profesional</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className={styles.divider} />
        </div>
      )}

      {/* Solicitudes de Permiso Clínico Activas */}
      {!isAdmin && pendingPermissions.map((perm) => {
        const petName = pets.find(p => p.id === perm.petId)?.name || 'Mascota';
        return (
          <div key={perm.id} className={styles.permissionAlert}>
            <div className={styles.permissionAlertIconContainer}>
              <ShieldAlert className={styles.permissionAlertIcon} size={24} />
            </div>
            <div className={styles.permissionAlertText}>
              <h3>Solicitud de Acceso Clínico</h3>
              <p>
                La veterinaria <strong>{perm.clinicName}</strong> está solicitando autorización para agregar vacunas, consultas y notas al historial médico de <strong>{petName}</strong>.
              </p>
            </div>
            <div className={styles.permissionAlertActions}>
              <button onClick={() => handleRejectPermission(perm.id)} className={styles.permissionRejectBtn}>
                Rechazar
              </button>
              <button onClick={() => handleApprovePermission(perm.id)} className={styles.permissionApproveBtn}>
                Autorizar Acceso
              </button>
            </div>
          </div>
        );
      })}

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
            <div 
              key={pet.id} 
              className={styles.petCard} 
              onClick={() => setPreviewPet(pet)}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={pet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
                alt={pet.name} 
                className={styles.petPhoto}
                onClick={(e) => { e.stopPropagation(); onNavigateToEditPet(pet.id); }}
                style={{ cursor: 'pointer' }}
                title="Hacer clic para editar foto"
              />
              <div className={styles.petInfo}>
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petDetails}>
                  {pet.species === 'Dog' ? 'Perro' : pet.species === 'Cat' ? 'Gato' : pet.species} • {pet.breed || 'Sin Raza'}
                </span>
                <span className={styles.epidBadge}>EPID: {pet.epid}</span>
              </div>
              <div className={styles.petCardActions}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onNavigateToPetDetail(pet.id); }} 
                  className={styles.viewBtn}
                  title="Ver Diario Médico"
                  aria-label="Ver Diario Médico"
                >
                  <Notebook size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onNavigateToEditPet(pet.id); }} 
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

      {/* Ventana flotante de Vista Previa NFC */}
      {previewPet && (
        <div className={styles.modalOverlay} onClick={() => setPreviewPet(null)}>
          <div className={styles.previewModalCard} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closePreviewBtn} 
              onClick={() => setPreviewPet(null)}
              aria-label="Cerrar vista previa"
            >
              &times;
            </button>
            <div className={styles.previewCircle1}></div>
            <div className={styles.previewCircle2}></div>

            {/* Identidad enlapet en la parte superior */}
            <div className={styles.previewBrandHeader}>
              <PawPrint className={styles.previewBrandLogoIcon} size={22} />
              <span className={styles.previewBrandLogoText}>enlapet</span>
            </div>

            {/* Foto de la Mascota */}
            <div className={styles.previewPetPhotoContainer}>
              <img 
                src={previewPet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
                alt={previewPet.name} 
                className={styles.previewPetPhoto}
              />
            </div>

            {/* Nombre y Edad */}
            <div className={styles.previewPetMainInfo}>
              <span className={styles.previewSpeciesTag}>
                {previewPet.species === 'Dog' ? '🐶 Perro' : previewPet.species === 'Cat' ? '🐱 Gato' : (previewPet.species || 'Otro')} &bull; {previewPet.breed || 'Sin Raza'}
              </span>
              <h1 className={styles.previewPetName}>{previewPet.name}</h1>
              <span className={styles.previewAgeText}>
                {formatPetAge(previewPet.birthDate)}
              </span>
            </div>

            {/* Botón de Contacto por WhatsApp ficticio/real (utilizando ownerData) */}
            {ownerData?.contact?.phone ? (
              <button 
                onClick={() => {
                  const phone = ownerData?.contact?.phone || '';
                  const cleanPhone = phone.replace(/[^0-9+]/g, '');
                  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hola! He escaneado el collar de identificación enlapet y encontré a tu mascota ${previewPet.name}. ¿Se encuentra extraviada?`
                  )}`;
                  window.open(whatsappUrl, '_blank');
                }} 
                className={styles.previewBtnWhatsapp}
                aria-label="Contactar al dueño por WhatsApp (Vista previa)"
              >
                <Phone size={20} />
                <span>Contactar al Dueño</span>
              </button>
            ) : (
              <div className={styles.previewNoPhoneAlert}>
                <ShieldAlert size={20} />
                <span>Sin contacto registrado</span>
              </div>
            )}

            {/* Botón de Captación para Registrar Mascota (Vista previa) */}
            <button 
              onClick={() => setPreviewPet(null)} 
              className={styles.previewBtnRegisterPromo}
            >
              <PawPrint size={18} />
              <span>Registra tu mascota en enlapet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
