import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  Calendar, FileSpreadsheet, Package, Settings,
  LogOut, Menu, X, Save, DollarSign, Users,
  ShieldAlert, Upload, BadgeCheck
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../core/firebase/firebase';
import ClinicEhrPanel from './ClinicEhrPanel';
import ClinicInventoryPanel from './ClinicInventoryPanel';
import ClinicBillingPanel from './ClinicBillingPanel';
import ClinicAppointmentsPanel from './ClinicAppointmentsPanel';
import ClinicStaffPanel from './ClinicStaffPanel';
import styles from './ClinicDashboard.module.css';

export default function ClinicDashboard() {
  // ── Obtener siempre clinicId desde AuthContext (no user.uid) ──
  const { user, userData, clinicData, clinicId, role, subRole, clinicSubtype, logout } = useAuth();

  const status = clinicData?.status || 'pending';
  const plan = clinicData?.plan || 'free';

  // ── activeTab: esperar a que role/subRole carguen ──
  const [activeTab, setActiveTab] = useState('settings');
  useEffect(() => {
    if (!role) return;
    if (role === 'clinic') {
      setActiveTab('settings');
    }
  }, [role]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── profileForm sincronizado con clinicData via useEffect ──
  // (NO usar useState con lazy initializer — clinicData puede ser null al montar)
  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', address: '', neighborhood: '', city: '',
    logoUrl: '',
    workingHours: { type: 'custom', start: '08:00', end: '18:00' },
    bio: '',
    pricing: { type: 'free', price: 0 },
    socials: { instagram: '', facebook: '', email: '', phone: '' }
  });

  useEffect(() => {
    if (!clinicData) return;
    setProfileForm({
      name:         clinicData.name         || '',
      phone:        clinicData.phone        || '',
      address:      clinicData.address      || '',
      neighborhood: clinicData.neighborhood || '',
      city:         clinicData.city         || '',
      logoUrl:      clinicData.logoUrl      || '',
      workingHours: {
        type:  clinicData.workingHours?.type  || 'custom',
        start: clinicData.workingHours?.start || '08:00',
        end:   clinicData.workingHours?.end   || '18:00',
      },
      bio: clinicData.bio || '',
      pricing: {
        type:  clinicData.pricing?.type  || 'free',
        price: clinicData.pricing?.price || 0,
      },
      socials: {
        instagram: clinicData.socials?.instagram || '',
        facebook:  clinicData.socials?.facebook  || '',
        email:     clinicData.socials?.email      || '',
        phone:     clinicData.socials?.phone      || '',
      },
    });
  }, [clinicData]);

  // ── Logo: subir a Storage, no base64 ──
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !clinicId) return;
    try {
      // Comprimir a 200x200 antes de subir
      const compressed = await compressImage(file, 200, 200, 0.75);
      const storageRef = ref(storage, `clinics/${clinicId}/logo.jpg`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      setProfileForm(prev => ({ ...prev, logoUrl: url }));
    } catch (err) {
      console.error('Error subiendo logo:', err);
    }
  };

  // ── Guardar perfil (siempre usando clinicId correcto) ──
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!clinicId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateDoc(doc(db, 'clinics', clinicId), {
        ...profileForm,
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Menú según clinicSubtype ──
  const menuItems = [
    { id: 'appointments',     label: 'Agenda de Citas',      icon: Calendar },
    { id: 'medical_records',  label: 'Historia Clínica',     icon: FileSpreadsheet },
    ...(clinicSubtype === 'ips' ? [{ id: 'staff', label: 'Mi Equipo', icon: Users }] : []),
    { id: 'inventory',        label: 'Inventario',           icon: Package,    premium: true },
    { id: 'billing',          label: 'Caja y Facturas',      icon: DollarSign, premium: true },
    { id: 'settings',         label: 'Mi Perfil Público',    icon: Settings },
  ];

  // ── Bloqueo premium ──
  const isPremiumLocked = plan !== 'premium' && (activeTab === 'inventory' || activeTab === 'billing');

  return (
    <div className={styles.container}>
      {/* ── Sidebar Desktop ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.appName}>enlapet<span className={styles.appBadge}>clinic</span></span>
        </div>

        <nav className={styles.sidebarNav}>
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.premium && <span className={styles.premiumLabel}>PRO</span>}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{clinicData?.name || 'Mi Clínica'}</p>
            <p className={styles.userRole}>
              {clinicSubtype === 'ips' ? 'IPS / Clínica' : clinicSubtype === 'solo_mobile' ? 'Vet a domicilio' : 'Consultorio'}
            </p>
          </div>
          <button onClick={logout} className={styles.logoutButton}>
            <LogOut size={18} /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className={styles.mobileHeader}>
        <span className={styles.appName}>enlapet<span className={styles.appBadge}>clinic</span></span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={styles.menuToggle}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileDrawerContent}>
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`${styles.mobileDrawerButton} ${activeTab === item.id ? styles.activeMobileButton : ''}`}
                >
                  <Icon size={20} /><span>{item.label}</span>
                  {item.premium && <span className={styles.premiumLabel}>PRO</span>}
                </button>
              );
            })}
            <button onClick={logout} className={`${styles.mobileDrawerButton} ${styles.mobileLogout}`}>
              <LogOut size={20} /><span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className={styles.mainContent}>
        {/* Bloqueo premium */}
        {isPremiumLocked ? (
          <div className={styles.lockOverlay}>
            <div className={styles.lockCardPremium}>
              <DollarSign size={40} className={styles.lockIconPremium} />
              <h2>Función Premium (PRO)</h2>
              <p>
                El acceso a <strong>{activeTab === 'inventory' ? 'Inventario' : 'Caja y Facturación'}</strong> está
                reservado para clínicas en el plan Premium.
              </p>
              <button
                onClick={() => {
                  const msg = `Hola! Quiero activar el Plan Premium para ${clinicData?.name || ''} (${clinicData?.email || ''})`;
                  window.open(`https://wa.me/573226460199?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className={styles.lockBtnPremium}
              >
                Contactar Soporte para ser PRO
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Paneles — siempre pasan clinicId (no user.uid) */}
            {activeTab === 'appointments' && clinicId && (
              <ClinicAppointmentsPanel user={user} clinicId={clinicId} />
            )}
            {activeTab === 'medical_records' && clinicId && (
              <ClinicEhrPanel user={user} clinicId={clinicId} clinicData={clinicData} />
            )}
            {activeTab === 'staff' && clinicId && clinicSubtype === 'ips' && (
              <ClinicStaffPanel user={user} clinicId={clinicId} clinicData={clinicData} />
            )}
            {activeTab === 'inventory' && clinicId && (
              <ClinicInventoryPanel user={user} clinicId={clinicId} plan={plan} />
            )}
            {activeTab === 'billing' && clinicId && (
              <ClinicBillingPanel user={user} clinicId={clinicId} plan={plan} />
            )}

            {/* Configuración / Perfil Público */}
            {activeTab === 'settings' && (
              <div className={styles.card}>
                {status !== 'verified' && (
                  <div className={styles.setupWarningBanner}>
                    <ShieldAlert size={20} />
                    <span>Tu cuenta está <strong>PENDIENTE DE VERIFICACIÓN</strong>. Completa tu perfil para que covacentral pueda verificar tu establecimiento.</span>
                  </div>
                )}
                <div className={styles.cardHeader}>
                  <h2>Carta de Presentación y Perfil Público</h2>
                  <p>Configura la información que verán los dueños de mascotas en el directorio.</p>
                </div>

                {saveSuccess && <div className={styles.successAlert}>¡Perfil guardado exitosamente!</div>}

                <form onSubmit={handleProfileSave} className={styles.formGrid}>
                  {/* Logo */}
                  <div className={styles.formSection}>
                    <h3>Logo de la Clínica</h3>
                    <div className={styles.logoUploadSection}>
                      <div className={styles.logoPreviewContainer}>
                        {profileForm.logoUrl
                          ? <img src={profileForm.logoUrl} alt="Logo" className={styles.logoPreviewImage} />
                          : <Upload size={32} className={styles.logoPlaceholderIcon} />}
                      </div>
                      <div className={styles.logoUploadControls}>
                        <label htmlFor="logoInput" className={styles.logoInputLabel}>
                          <Upload size={16} /> Subir Logo
                        </label>
                        <input id="logoInput" type="file" accept="image/*" onChange={handleLogoChange} className={styles.hiddenFileInput} />
                        <p className={styles.logoUploadHelp}>JPG/PNG. Se redimensiona a 200×200px automáticamente.</p>
                      </div>
                    </div>
                  </div>

                  {/* Info básica */}
                  <div className={styles.formSection}>
                    <h3>Información de Contacto</h3>
                    <div className={styles.formGroup}>
                      <label htmlFor="clinicName">Nombre de la Clínica</label>
                      <input id="clinicName" type="text" value={profileForm.name}
                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Teléfono</label>
                        <input type="tel" value={profileForm.phone}
                          onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="+57 300..." />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ciudad</label>
                        <input type="text" value={profileForm.city}
                          onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))} placeholder="Medellín" />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Dirección</label>
                      <input type="text" value={profileForm.address}
                        onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))} placeholder="Calle 10 # 25-30" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Barrio</label>
                      <input type="text" value={profileForm.neighborhood}
                        onChange={e => setProfileForm(p => ({ ...p, neighborhood: e.target.value }))} placeholder="El Poblado" />
                    </div>
                  </div>

                  {/* Horario */}
                  <div className={styles.formSection}>
                    <h3>Horario de Atención</h3>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioOption}>
                        <input type="radio" name="whType" value="24h"
                          checked={profileForm.workingHours.type === '24h'}
                          onChange={() => setProfileForm(p => ({ ...p, workingHours: { ...p.workingHours, type: '24h' } }))} />
                        <span>24 horas / Urgencias</span>
                      </label>
                      <label className={styles.radioOption}>
                        <input type="radio" name="whType" value="custom"
                          checked={profileForm.workingHours.type === 'custom'}
                          onChange={() => setProfileForm(p => ({ ...p, workingHours: { ...p.workingHours, type: 'custom' } }))} />
                        <span>Horario personalizado</span>
                      </label>
                    </div>
                    {profileForm.workingHours.type === 'custom' && (
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Apertura</label>
                          <input type="time" value={profileForm.workingHours.start}
                            onChange={e => setProfileForm(p => ({ ...p, workingHours: { ...p.workingHours, start: e.target.value } }))} />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Cierre</label>
                          <input type="time" value={profileForm.workingHours.end}
                            onChange={e => setProfileForm(p => ({ ...p, workingHours: { ...p.workingHours, end: e.target.value } }))} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className={styles.formSection}>
                    <h3>Descripción de la Clínica</h3>
                    <div className={styles.formGroup}>
                      <label>Bio / Presentación</label>
                      <textarea value={profileForm.bio} rows={4}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Describe los servicios y especialidades de tu clínica..." />
                    </div>
                  </div>

                  {/* Precios */}
                  <div className={styles.formSection}>
                    <h3>Política de Citas</h3>
                    <div className={styles.radioGroup}>
                      {[
                        { val: 'free',          label: 'Consulta gratuita / Sin costo de agendamiento' },
                        { val: 'pay_at_clinic',  label: 'Pago en el consultorio (al momento de la visita)' },
                        { val: 'pre_pay',        label: 'Prepago para reservar la cita' },
                      ].map(opt => (
                        <label key={opt.val} className={styles.radioOption}>
                          <input type="radio" name="pricingType" value={opt.val}
                            checked={profileForm.pricing.type === opt.val}
                            onChange={() => setProfileForm(p => ({ ...p, pricing: { ...p.pricing, type: opt.val } }))} />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    {profileForm.pricing.type !== 'free' && (
                      <div className={styles.formGroup} style={{ marginTop: 12 }}>
                        <label>Valor de la cita (COP)</label>
                        <input type="number" value={profileForm.pricing.price} min="0"
                          onChange={e => setProfileForm(p => ({ ...p, pricing: { ...p.pricing, price: parseInt(e.target.value) || 0 } }))} />
                      </div>
                    )}
                  </div>

                  {/* Redes */}
                  <div className={styles.formSection}>
                    <h3>Redes Sociales y Contacto</h3>
                    <div className={styles.formGroup}>
                      <label>Instagram</label>
                      <input type="text" value={profileForm.socials.instagram}
                        onChange={e => setProfileForm(p => ({ ...p, socials: { ...p.socials, instagram: e.target.value } }))}
                        placeholder="@miclinica" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Facebook</label>
                      <input type="text" value={profileForm.socials.facebook}
                        onChange={e => setProfileForm(p => ({ ...p, socials: { ...p.socials, facebook: e.target.value } }))}
                        placeholder="facebook.com/miclinica" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>WhatsApp de Contacto</label>
                      <input type="tel" value={profileForm.socials.phone}
                        onChange={e => setProfileForm(p => ({ ...p, socials: { ...p.socials, phone: e.target.value } }))}
                        placeholder="+57 300 123 4567" />
                    </div>
                  </div>

                  <button type="submit" disabled={saving} className={styles.saveButton}>
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Utilidad: comprimir imagen con canvas ──
async function compressImage(file, maxW, maxH, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxW) { h = h * maxW / w; w = maxW; } }
        else        { if (h > maxH) { w = w * maxH / h; h = maxH; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
