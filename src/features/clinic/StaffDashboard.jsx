import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import ClinicAppointmentsPanel from './ClinicAppointmentsPanel';
import ClinicEhrPanel from './ClinicEhrPanel';
import ClinicInventoryPanel from './ClinicInventoryPanel';
import ClinicBillingPanel from './ClinicBillingPanel';
import VetVerificationForm from './VetVerificationForm';
import {
  Calendar, FileText, Package, DollarSign,
  ShieldAlert, LogOut, Menu, X, Clock
} from 'lucide-react';
import styles from './StaffDashboard.module.css';

/**
 * StaffDashboard — Panel para personal vinculado a una IPS
 *
 * recepcion    → solo Citas
 * veterinario  → Citas + Historia Clínica (requiere verificación)
 * contabilidad → Inventario + Caja (requiere plan premium de la clínica)
 */
export default function StaffDashboard() {
  const { user, userData, clinicData, clinicId, subRole, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (subRole === 'contabilidad') return 'inventory';
    return 'appointments';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const subRoleLabel = {
    recepcion: 'Recepción',
    veterinario: 'Médico Veterinario',
    contabilidad: 'Contabilidad',
  }[subRole] || 'Asociado';

  const menuItems = (() => {
    if (subRole === 'recepcion') {
      return [{ id: 'appointments', label: 'Agenda de Citas', icon: Calendar }];
    }
    if (subRole === 'veterinario') {
      return [
        { id: 'appointments', label: 'Mis Citas', icon: Calendar },
        { id: 'ehr', label: 'Historia Clínica', icon: FileText },
      ];
    }
    if (subRole === 'contabilidad') {
      return [
        { id: 'inventory', label: 'Inventario', icon: Package },
        { id: 'billing', label: 'Caja y Facturas', icon: DollarSign },
      ];
    }
    return [];
  })();

  return (
    <div className={styles.shell}>
      {/* ── Sidebar Desktop ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.brandText}>
            enlapet<span className={styles.brandBadge}>clinic</span>
          </span>
        </div>

        <div className={styles.clinicInfo}>
          <p className={styles.clinicName}>{clinicData?.name || 'Clínica'}</p>
          <span className={styles.roleChip}>{subRoleLabel}</span>
        </div>

        <nav className={styles.nav}>
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
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <p className={styles.staffName}>{user?.displayName || 'Asociado'}</p>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Header Mobile ── */}
      <header className={styles.mobileHeader}>
        <span className={styles.brandText}>enlapet<span className={styles.brandBadge}>clinic</span></span>
        <button onClick={() => setMobileOpen(!mobileOpen)} className={styles.menuToggle}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileClinicInfo}>
            <p>{clinicData?.name || 'Clínica'}</p>
            <span className={styles.roleChip}>{subRoleLabel}</span>
          </div>
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                className={`${styles.drawerItem} ${activeTab === item.id ? styles.drawerActive : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button onClick={logout} className={styles.drawerLogout}>
            <LogOut size={16} /><span>Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className={styles.main}>
        <VetStatusGate
          subRole={subRole}
          clinicId={clinicId}
          userId={user?.uid}
          clinicData={clinicData}
        >
          {activeTab === 'appointments' && clinicId && (
            <ClinicAppointmentsPanel
              user={user}
              clinicId={clinicId}
              vetId={subRole === 'veterinario' ? user?.uid : null}
            />
          )}
          {activeTab === 'ehr' && clinicId && (
            <ClinicEhrPanel user={user} clinicId={clinicId} clinicData={clinicData} />
          )}
          {activeTab === 'inventory' && clinicId && (
            <ClinicInventoryPanel user={user} clinicId={clinicId} plan={clinicData?.plan} />
          )}
          {activeTab === 'billing' && clinicId && (
            <ClinicBillingPanel user={user} clinicId={clinicId} plan={clinicData?.plan} />
          )}
        </VetStatusGate>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// VetStatusGate — Controla acceso para veterinarios
// Lee en tiempo real el status del staff desde Firestore
// ─────────────────────────────────────────────────────────
function VetStatusGate({ subRole, clinicId, userId, clinicData, children }) {
  const [staffStatus, setStaffStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (subRole !== 'veterinario' || !clinicId || !userId) {
      setLoading(false);
      return;
    }

    const staffRef = doc(db, 'clinics', clinicId, 'staff', userId);
    const unsub = onSnapshot(staffRef, (snap) => {
      if (snap.exists()) {
        setStaffStatus(snap.data().status || 'pending_vet_verification');
      } else {
        setStaffStatus('pending_vet_verification');
      }
      setLoading(false);
    });

    return unsub;
  }, [subRole, clinicId, userId]);

  // No vet → render children sin restricción
  if (subRole !== 'veterinario') return children;
  if (loading) return null;
  if (staffStatus === 'verified') return children;

  // Pendiente de verificación (docs ya enviados)
  if (staffStatus === 'pending') {
    return (
      <div className={styles.lockOverlay}>
        <div className={styles.lockCard}>
          <div className={styles.lockIconWrap}>
            <Clock size={36} />
          </div>
          <h3>Verificación en Revisión</h3>
          <p>
            Ya enviaste tu tarjeta profesional. El equipo de <strong>covacentral</strong> está
            revisando tu solicitud. Cuando sea aprobada, tu sesión se actualizará automáticamente.
          </p>
        </div>
      </div>
    );
  }

  // Rechazada
  if (staffStatus === 'rejected') {
    if (showForm) return <VetVerificationForm isResubmission onBack={() => setShowForm(false)} />;
    return (
      <div className={styles.lockOverlay}>
        <div className={styles.lockCard}>
          <div className={`${styles.lockIconWrap} ${styles.lockRed}`}>
            <ShieldAlert size={36} />
          </div>
          <h3>Verificación Rechazada</h3>
          <p>Tu solicitud de verificación no fue aprobada. Puedes reenviar los documentos.</p>
          <button onClick={() => setShowForm(true)} className={styles.lockBtn}>
            Reenviar Verificación
          </button>
        </div>
      </div>
    );
  }

  // Sin documentos aún (pending_vet_verification) → mostrar formulario
  if (showForm) return <VetVerificationForm onBack={() => setShowForm(false)} />;

  return (
    <div className={styles.lockOverlay}>
      <div className={styles.lockCard}>
        <div className={styles.lockIconWrap}>
          <ShieldAlert size={36} />
        </div>
        <h3>Verificación Requerida</h3>
        <p>
          Tu cuenta de médico veterinario está vinculada a{' '}
          <strong>{clinicData?.name || 'la clínica'}</strong>, pero necesitas verificar tu
          tarjeta profesional ante <strong>covacentral</strong> para firmar historias clínicas
          y aparecer disponible para citas.
        </p>
        <button onClick={() => setShowForm(true)} className={styles.lockBtn}>
          Verificar mi Tarjeta Profesional
        </button>
      </div>
    </div>
  );
}
