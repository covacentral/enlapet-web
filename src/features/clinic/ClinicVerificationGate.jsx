import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import ClinicDashboard from './ClinicDashboard';
import ClinicVerificationForm from './ClinicVerificationForm';
import { ShieldAlert, CheckCircle2, XCircle, LogOut } from 'lucide-react';
import styles from './ClinicVerificationGate.module.css';

/**
 * ClinicVerificationGate
 *
 * status: 'pending'   → muestra formulario de verificación (si aún no han enviado docs)
 *                     → muestra pantalla "en revisión" (si ya enviaron)
 * status: 'verified'  → muestra el ClinicDashboard completo
 * status: 'rejected'  → muestra motivo de rechazo + permite re-enviar
 * status: 'suspended' → muestra pantalla de suspensión
 */
export default function ClinicVerificationGate() {
  const { clinicData, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const status = clinicData?.status || 'pending';
  // verificationSubmittedAt indica que ya enviaron docs (status = pending_review)
  const verificationSubmitted = !!(clinicData?.verificationSubmittedAt) || status === 'pending_review';

  // ── Clínica verificada → dashboard completo ──
  if (status === 'verified') {
    return <ClinicDashboard />;
  }

  // ── Suspendida ──
  if (status === 'suspended') {
    return (
      <div className={styles.gateContainer}>
        <div className={styles.gateCard}>
          <div className={`${styles.gateIcon} ${styles.suspended}`}>
            <XCircle size={40} />
          </div>
          <h2>Cuenta Suspendida</h2>
          <p>
            Tu cuenta de <strong>{clinicData?.name || 'la clínica'}</strong> ha sido suspendida
            por el equipo de covacentral.
          </p>
          {clinicData?.rejectionReason && (
            <div className={styles.reasonBox}>
              <strong>Motivo:</strong> {clinicData.rejectionReason}
            </div>
          )}
          <p className={styles.contactNote}>
            Para más información, contacta a{' '}
            <a href="https://wa.me/573226460199" target="_blank" rel="noreferrer">
              soporte vía WhatsApp
            </a>.
          </p>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Rechazada → permitir re-envío ──
  if (status === 'rejected') {
    if (showForm) {
      return <ClinicVerificationForm onBack={() => setShowForm(false)} isResubmission />;
    }
    return (
      <div className={styles.gateContainer}>
        <div className={styles.gateCard}>
          <div className={`${styles.gateIcon} ${styles.rejected}`}>
            <XCircle size={40} />
          </div>
          <h2>Verificación Rechazada</h2>
          <p>
            Tu solicitud de verificación para <strong>{clinicData?.name || 'tu clínica'}</strong> fue
            revisada y no fue aprobada.
          </p>
          {clinicData?.rejectionReason && (
            <div className={styles.reasonBox}>
              <strong>Motivo:</strong> {clinicData.rejectionReason}
            </div>
          )}
          <button onClick={() => setShowForm(true)} className={styles.primaryBtn}>
            Reenviar Verificación
          </button>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Pendiente ──
  // Si ya enviaron los documentos → pantalla "en revisión"
  if (verificationSubmitted) {
    return (
      <div className={styles.gateContainer}>
        <div className={styles.gateCard}>
          <div className={`${styles.gateIcon} ${styles.pending}`}>
            <ShieldAlert size={40} />
          </div>
          <h2>Verificación en Revisión</h2>
          <p>
            Hemos recibido los documentos de <strong>{clinicData?.name || 'tu clínica'}</strong>.
            El equipo de <strong>covacentral</strong> está revisando tu solicitud.
          </p>
          <p className={styles.timeNote}>
            ⏱ El proceso de verificación toma entre 24 y 48 horas hábiles.
            Cuando sea aprobada, tu sesión se actualizará automáticamente sin necesidad de cerrar sesión.
          </p>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Pendiente y aún no ha enviado documentos → formulario ──
  return <ClinicVerificationForm />;
}
