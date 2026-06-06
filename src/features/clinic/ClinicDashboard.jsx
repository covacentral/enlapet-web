import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  FileSpreadsheet, 
  Package, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Upload, 
  Save, 
  DollarSign,
  Plus,
  ShieldAlert,
  Users
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import ClinicEhrPanel from './ClinicEhrPanel';
import ClinicInventoryPanel from './ClinicInventoryPanel';
import ClinicBillingPanel from './ClinicBillingPanel';
import ClinicAppointmentsPanel from './ClinicAppointmentsPanel';
import ClinicStaffPanel from './ClinicStaffPanel';
import styles from './ClinicDashboard.module.css';

export default function ClinicDashboard() {
  const { user, clinicData, role, logout, refreshProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState(role === 'staff' ? 'medical_records' : 'settings');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const status = clinicData?.status || 'pending';
  const plan = clinicData?.plan || 'free';

  // Estados para verificación individual de veterinarios (staff)
  const [staffStatus, setStaffStatus] = useState(role === 'staff' ? 'pending_verification' : 'verified');
  const [staffVerifyData, setStaffVerifyData] = useState(null);
  const [staffLoading, setStaffLoading] = useState(role === 'staff');
  
  const [vetForm, setVetForm] = useState({
    professionalCard: '',
    licenseUrl: ''
  });
  const [submittingVet, setSubmittingVet] = useState(false);

  React.useEffect(() => {
    if (role !== 'staff' || !user?.uid) return;
    const docRef = doc(db, 'vet_verifications', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStaffVerifyData(data);
        setStaffStatus(data.status || 'pending');
        setVetForm({
          professionalCard: data.professionalCard || '',
          licenseUrl: data.licenseUrl || ''
        });
      } else {
        setStaffStatus('pending_verification');
      }
      setStaffLoading(false);
    }, (err) => {
      console.error("Error al escuchar verificación de vet:", err);
      setStaffLoading(false);
    });

    return () => unsubscribe();
  }, [role, user]);

  const handleVetFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setVetForm(prev => ({ ...prev, licenseUrl: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleVetSubmit = async (e) => {
    e.preventDefault();
    if (!vetForm.professionalCard.trim() || !vetForm.licenseUrl) {
      alert("Por favor introduce el número de tarjeta y sube la foto.");
      return;
    }

    setSubmittingVet(true);
    try {
      // 1. Crear solicitud global
      const docRef = doc(db, 'vet_verifications', user.uid);
      const cId = clinicData?.id || clinicData?.clinicId || user.uid; // clinicId o uid
      const cName = clinicData?.name || 'Clínica Vinculada';

      await setDoc(docRef, {
        vetId: user.uid,
        name: user.displayName || 'Médico Veterinario',
        email: user.email,
        clinicId: cId,
        clinicName: cName,
        professionalCard: vetForm.professionalCard,
        licenseUrl: vetForm.licenseUrl,
        status: 'pending',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 2. Actualizar el estado en el staff de la clínica
      const staffDocRef = doc(db, 'clinics', cId, 'staff', user.uid);
      await setDoc(staffDocRef, {
        status: 'pending',
        professionalCard: vetForm.professionalCard,
        licenseUrl: vetForm.licenseUrl
      }, { merge: true });

      alert("¡Solicitud de verificación enviada a covacentral!");
    } catch (err) {
      console.error("Error al solicitar verificación de vet:", err);
      alert("Error: " + err.message);
    } finally {
      setSubmittingVet(false);
    }
  };

  // Formulario de Carta de Presentación / Configuración de la Clínica
  const [profileForm, setProfileForm] = useState({
    name: clinicData?.name || '',
    phone: clinicData?.phone || '',
    address: clinicData?.address || '',
    neighborhood: clinicData?.neighborhood || '',
    city: clinicData?.city || '',
    logoUrl: clinicData?.logoUrl || '',
    workingHours: {
      type: clinicData?.workingHours?.type || 'custom', // '24h' | 'custom'
      start: clinicData?.workingHours?.start || '08:00',
      end: clinicData?.workingHours?.end || '18:00'
    },
    bio: clinicData?.bio || '',
    pricing: {
      type: clinicData?.pricing?.type || 'free', // 'free' | 'pay_at_clinic' | 'pre_pay'
      price: clinicData?.pricing?.price || 0
    },
    socials: {
      instagram: clinicData?.socials?.instagram || '',
      facebook: clinicData?.socials?.facebook || '',
      email: clinicData?.socials?.email || '',
      phone: clinicData?.socials?.phone || ''
    }
  });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setProfileForm(prev => ({ ...prev, logoUrl: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const clinicRef = doc(db, 'clinics', user.uid);
      await updateDoc(clinicRef, {
        ...profileForm,
        updatedAt: new Date().toISOString()
      });
      await refreshProfileData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error al guardar perfil clínico:", error);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { id: 'appointments', label: 'Citas Hoy', icon: Calendar },
    { id: 'medical_records', label: 'Historial (EPID)', icon: FileSpreadsheet },
    { id: 'staff', label: 'Mi Equipo (Veterinarios)', icon: Users },
    { id: 'inventory', label: 'Inventario (Premium)', icon: Package, premium: true },
    { id: 'billing', label: 'Caja y Facturas (Premium)', icon: DollarSign, premium: true },
    { id: 'settings', label: 'Mi Perfil Público', icon: Settings }
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar - Desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.logoContainer}>
          <span className={styles.appName}>enlapet<span className={styles.appBadge}>clinic</span></span>
        </div>
        
        <nav className={styles.navMenu}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`${styles.navButton} ${activeTab === item.id ? styles.activeNavButton : ''}`}
                aria-label={item.label}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.premium && <span className={styles.premiumLabel}>PRO</span>}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{clinicData?.name || 'Veterinaria'}</p>
            <p className={styles.userRole}>Administrador</p>
          </div>
          <button onClick={logout} className={styles.logoutButton} aria-label="Cerrar sesión">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Bottom Navigation */}
      <header className={styles.mobileHeader}>
        <span className={styles.appName}>enlapet<span className={styles.appBadge}>clinic</span></span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={styles.menuToggle} aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileDrawerContent}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`${styles.mobileDrawerButton} ${activeTab === item.id ? styles.activeMobileButton : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {item.premium && <span className={styles.premiumLabel}>PRO</span>}
                </button>
              );
            })}
            <button onClick={logout} className={`${styles.mobileDrawerButton} ${styles.mobileLogout}`} aria-label="Cerrar sesión">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {role === 'staff' && staffStatus !== 'verified' ? (
          <div className={styles.lockOverlay}>
            <div className={styles.lockCard} style={{ maxWidth: '550px' }}>
              <div className={styles.lockIconContainer}>
                <ShieldAlert size={48} className={styles.lockIcon} />
              </div>
              <h2>Verificación de Veterinario Requerida</h2>
              <p>
                Tu cuenta de médico veterinario está asociada a <strong>{clinicData?.name || 'la clínica'}</strong>, pero requiere verificación individual de tu tarjeta profesional por parte de <strong>covacentral</strong> para poder firmar historias clínicas.
              </p>

              {staffStatus === 'pending' ? (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', textAlign: 'left' }}>
                  <h4 style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>Solicitud de Verificación Pendiente</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#666', lineHeight: 1.4 }}>
                    Ya has enviado tu Tarjeta Profesional. El administrador maestro de covacentral está inspeccionando tus documentos. Te notificaremos cuando tu perfil sea aprobado.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVetSubmit} className={styles.formGrid} style={{ marginTop: '24px', textAlign: 'left', gap: '16px' }}>
                  <div className={styles.formGroup}>
                    <label>Número de Tarjeta Profesional / Registro Médico</label>
                    <input 
                      type="text" 
                      value={vetForm.professionalCard}
                      onChange={(e) => setVetForm({ ...vetForm, professionalCard: e.target.value })}
                      placeholder="Ej. MP-54321"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'hsl(220, 20%, 96%)', padding: '10px', borderRadius: '10px', border: '1px dashed #ccc' }}>
                      <Upload size={16} />
                      <span>Subir Foto de Tarjeta Profesional</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleVetFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {vetForm.licenseUrl && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>✓ Foto Cargada</span>}
                  </div>
                  <button type="submit" disabled={submittingVet} className={styles.saveButton} style={{ width: '100%', justifyContent: 'center' }}>
                    {submittingVet ? 'Enviando...' : 'Enviar para Verificación'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : status !== 'verified' && activeTab !== 'settings' ? (
          <div className={styles.lockOverlay}>
            <div className={styles.lockCard}>
              <div className={styles.lockIconContainer}>
                <ShieldAlert size={48} className={styles.lockIcon} />
              </div>
              <h2>Verificación Requerida</h2>
              <p>
                Tu veterinaria <strong>{clinicData?.name || 'enlapet clinic'}</strong> se encuentra en estado <strong>{status === 'suspended' ? 'SUSPENDIDO' : 'PENDIENTE DE VERIFICACIÓN'}</strong>.
              </p>
              <p className={styles.lockHelp}>
                El equipo de <strong>covacentral</strong> está revisando tu registro y tarjeta profesional. Una vez aprobada tu veterinaria por el administrador maestro, se habilitará el acceso completo a la agenda, historias clínicas y herramientas de administración.
              </p>
              <div className={styles.lockBadge}>Estado actual: {status.toUpperCase()}</div>
            </div>
          </div>
        ) : (plan !== 'premium' && (activeTab === 'inventory' || activeTab === 'billing')) ? (
          <div className={styles.lockOverlay}>
            <div className={styles.lockCardPremium}>
              <div className={styles.lockIconContainerPremium}>
                <DollarSign size={48} className={styles.lockIconPremium} />
              </div>
              <h2>Función Premium (PRO)</h2>
              <p>
                El acceso a <strong>{activeTab === 'inventory' ? 'Inventario de Medicamentos y Vacunas' : 'Control de Caja y Facturación con IVA'}</strong> está reservado para veterinarias en el plan Premium.
              </p>
              <p className={styles.lockHelp}>
                Optimiza tus procesos, controla tu stock de manera automatizada y genera cierres de caja en segundos actualizando tu plan a Premium.
              </p>
              <button 
                onClick={() => {
                  const message = `Hola! Quiero solicitar información para activar el Plan Premium de enlapet para mi veterinaria: ${clinicData?.name || ''} (Email: ${clinicData?.email || ''})`;
                  window.open(`https://wa.me/573226460199?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className={styles.lockBtnPremium}
              >
                Contactar Soporte para ser PRO (WhatsApp)
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'settings' && (
              <div className={styles.card}>
                {status !== 'verified' && (
                  <div className={styles.setupWarningBanner}>
                    <ShieldAlert size={20} />
                    <span>Tu cuenta está <strong>PENDIENTE DE VERIFICACIÓN</strong>. Completa tu perfil y sube tu logotipo para que el administrador maestro pueda verificar tu veterinaria.</span>
                  </div>
                )}
                <div className={styles.cardHeader}>
                  <h2>Carta de Presentación y Perfil Público</h2>
                  <p>Configura la información que verán los dueños de mascotas en el directorio público para agendar citas.</p>
                </div>

                {saveSuccess && (
                  <div className={styles.successAlert}>
                    ¡Perfil guardado con éxito en tiempo real!
                  </div>
                )}

                <form onSubmit={handleProfileSave} className={styles.formGrid}>
                  {/* Sección Info Básica */}
                  <div className={styles.formSection}>
                    <h3>Información de Contacto y Ubicación</h3>
                    
                    {/* Selector de Logotipo */}
                    <div className={styles.logoUploadSection}>
                      <div className={styles.logoPreviewContainer}>
                        {profileForm.logoUrl ? (
                          <img src={profileForm.logoUrl} alt="Logotipo clínica" className={styles.logoPreviewImage} />
                        ) : (
                          <Upload size={32} className={styles.logoPlaceholderIcon} />
                        )}
                      </div>
                      <div className={styles.logoUploadControls}>
                        <label htmlFor="logoInput" className={styles.logoInputLabel}>
                          <Upload size={16} />
                          Subir Logotipo
                        </label>
                        <input
                          id="logoInput"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className={styles.hiddenFileInput}
                        />
                        <p className={styles.logoUploadHelp}>JPG/PNG recomendado. Redimensionado automáticamente a 200x200px.</p>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="clinicName">Nombre de la Clínica / Consultorio</label>
                      <input
                        id="clinicName"
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                        placeholder="Ej. Clínica Veterinaria San Miguel"
                      />
                    </div>

                    <div className={styles.formGroupRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="clinicCity">Ciudad</label>
                        <input
                          id="clinicCity"
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                          required
                          placeholder="Ej. Bogotá"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="clinicNeighborhood">Barrio</label>
                        <input
                          id="clinicNeighborhood"
                          type="text"
                          value={profileForm.neighborhood}
                          onChange={(e) => setProfileForm({ ...profileForm, neighborhood: e.target.value })}
                          required
                          placeholder="Ej. Cedritos"
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="clinicAddress">Dirección Completa</label>
                      <input
                        id="clinicAddress"
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        required
                        placeholder="Ej. Calle 140 # 12-34"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="clinicPhone">Teléfono de Atención</label>
                      <input
                        id="clinicPhone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        required
                        placeholder="Ej. 3123456789"
                      />
                    </div>
                  </div>

                  {/* Horarios y Biografía */}
                  <div className={styles.formSection}>
                    <h3>Horario de Atención y Presentación</h3>

                    <div className={styles.formGroup}>
                      <label htmlFor="hoursType">Tipo de Horario</label>
                      <select
                        id="hoursType"
                        value={profileForm.workingHours.type}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          workingHours: { ...profileForm.workingHours, type: e.target.value }
                        })}
                      >
                        <option value="custom">Rango de Horas (Parcial)</option>
                        <option value="24h">Abierto 24 Horas (Urgencias)</option>
                      </select>
                    </div>

                    {profileForm.workingHours.type === 'custom' && (
                      <div className={styles.formGroupRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="hoursStart">Hora de Apertura</label>
                          <input
                            id="hoursStart"
                            type="time"
                            value={profileForm.workingHours.start}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              workingHours: { ...profileForm.workingHours, start: e.target.value }
                            })}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="hoursEnd">Hora de Cierre</label>
                          <input
                            id="hoursEnd"
                            type="time"
                            value={profileForm.workingHours.end}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              workingHours: { ...profileForm.workingHours, end: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    )}

                    <div className={styles.formGroup}>
                      <label htmlFor="clinicBio">Biografía / Carta de Presentación</label>
                      <textarea
                        id="clinicBio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={4}
                        placeholder="Cuéntale a los dueños de mascotas sobre tu experiencia, especialidades y servicios..."
                      />
                    </div>
                  </div>

                  {/* Redes Sociales */}
                  <div className={styles.formSection}>
                    <h3>Redes Sociales y Canales de Pago</h3>

                    <div className={styles.formGroupRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="instagram">Instagram</label>
                        <input
                          id="instagram"
                          type="text"
                          value={profileForm.socials.instagram}
                          onChange={(e) => setProfileForm({
                            ...profileForm,
                            socials: { ...profileForm.socials, instagram: e.target.value }
                          })}
                          placeholder="Ej. mi_veterinaria"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="facebook">Facebook</label>
                        <input
                          id="facebook"
                          type="text"
                          value={profileForm.socials.facebook}
                          onChange={(e) => setProfileForm({
                            ...profileForm,
                            socials: { ...profileForm.socials, facebook: e.target.value }
                          })}
                          placeholder="Ej. MiVeterinariaOficial"
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="pricingType">Política de Pago de Consultas</label>
                      <select
                        id="pricingType"
                        value={profileForm.pricing.type}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          pricing: { ...profileForm.pricing, type: e.target.value }
                        })}
                      >
                        <option value="free">Consulta Gratis (Servicio complementario)</option>
                        <option value="pay_at_clinic">Pago en Clínica (Agenda gratis, paga allá)</option>
                        <option value="pre_pay">Pago Previo (Redirecciona a WhatsApp para abono)</option>
                      </select>
                    </div>

                    {profileForm.pricing.type !== 'free' && (
                      <div className={styles.formGroup}>
                        <label htmlFor="pricingVal">Valor de la Consulta (COP)</label>
                        <input
                          id="pricingVal"
                          type="number"
                          value={profileForm.pricing.price}
                          onChange={(e) => setProfileForm({
                            ...profileForm,
                            pricing: { ...profileForm.pricing, price: parseInt(e.target.value) || 0 }
                          })}
                          placeholder="Ej. 40000"
                        />
                      </div>
                    )}
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" disabled={saving} className={styles.saveButton}>
                      <Save size={18} />
                      <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'medical_records' && (
              <ClinicEhrPanel user={user} clinicData={clinicData} />
            )}

            {activeTab === 'staff' && (
              <ClinicStaffPanel user={user} clinicData={clinicData} />
            )}

            {activeTab === 'inventory' && (
              <ClinicInventoryPanel user={user} />
            )}

            {activeTab === 'billing' && (
              <ClinicBillingPanel user={user} />
            )}

            {activeTab === 'appointments' && (
              <ClinicAppointmentsPanel user={user} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
