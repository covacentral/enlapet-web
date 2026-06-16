import React, { useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import {
  Stethoscope, Upload, CheckCircle2, FileText,
  ExternalLink, LogOut, Info, ShieldAlert
} from 'lucide-react';
import styles from './ClinicVerificationForm.module.css';

// Reutilizamos los estilos del formulario de clínica

function UploadField({ label, hint, accept, value, onChange, required = false }) {
  const inputId = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={styles.uploadField}>
      <label className={styles.fieldLabel}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      <label htmlFor={inputId} className={`${styles.uploadLabel} ${value ? styles.uploadDone : ''}`}>
        {value ? <CheckCircle2 size={18} className={styles.uploadCheck} /> : <Upload size={18} />}
        <span>{value ? 'Archivo cargado ✓' : 'Seleccionar archivo'}</span>
        <input
          id={inputId}
          type="file"
          accept={accept || 'image/*,.pdf'}
          onChange={onChange}
          className={styles.hiddenInput}
        />
      </label>
      {value && <p className={styles.uploadName}>{value.name}</p>}
    </div>
  );
}

/**
 * VetVerificationForm — Track B
 * Para: staff.veterinario, clinic_solo_local, clinic_solo_mobile
 */
export default function VetVerificationForm({ isResubmission = false, onBack }) {
  const { user, userData, clinicData, clinicSubtype, subRole, logout } = useAuth();

  const isSoloMobile = clinicSubtype === 'solo_mobile' || userData?.clinicSubtype === 'solo_mobile';
  const isStaffVet = userData?.role === 'staff' && subRole === 'veterinario';

  const [form, setForm] = useState({
    professionalCardNumber: '',   // Número COMVEZCOL
    icaRegistrationNumber: '',    // Número ICA (opcional)
    cedula: '',
  });

  const [files, setFiles] = useState({
    professionalCardPhoto: null,  // Foto tarjeta COMVEZCOL (obligatorio)
    idDocument: null,             // Cédula foto (solo para solo_mobile)
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.professionalCardNumber.trim()) {
      return setSubmitError('El número de matrícula COMVEZCOL es obligatorio.');
    }
    if (!files.professionalCardPhoto) {
      return setSubmitError('La foto de tu tarjeta profesional es obligatoria.');
    }

    setSubmitting(true);
    try {
      const vetId = user.uid;
      const now = new Date().toISOString();

      // ── Subir archivos ──
      const uploadFile = async (file, path) => {
        if (!file) return null;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      };

      const professionalCardPhotoUrl = await uploadFile(
        files.professionalCardPhoto,
        `verifications/vets/${vetId}/professional_card`
      );

      let idDocumentUrl = null;
      if (files.idDocument) {
        idDocumentUrl = await uploadFile(
          files.idDocument,
          `verifications/vets/${vetId}/id_document`
        );
      }

      // ── Crear solicitud en /vet_verifications ──
      const clinicId = isStaffVet ? userData?.clinicId : null;
      const clinicName = isStaffVet ? (clinicData?.name || null) : null;

      await setDoc(doc(db, 'vet_verifications', vetId), {
        vetId,
        name: user.displayName || userData?.name || '',
        email: user.email,
        clinicId,
        clinicName,
        clinicSubtype: userData?.clinicSubtype || clinicSubtype || null,
        documents: {
          professionalCardNumber: form.professionalCardNumber.trim(),
          icaRegistrationNumber: form.icaRegistrationNumber.trim() || null,
          cedula: form.cedula.trim() || null,
          professionalCardPhotoUrl,
          ...(idDocumentUrl ? { idDocumentUrl } : {}),
        },
        status: 'pending',
        submittedAt: now,
        ...(isResubmission ? { resubmittedAt: now } : {}),
      });

      // ── Si es staff: actualizar el doc de staff en la clínica ──
      if (isStaffVet && clinicId) {
        await updateDoc(doc(db, 'clinics', clinicId, 'staff', vetId), {
          status: 'pending',
          vetVerificationId: vetId,
          updatedAt: now,
        });
      }

    } catch (err) {
      console.error('Error al enviar verificación de vet:', err);
      setSubmitError('Error al enviar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.headerIcon}>
            <Stethoscope size={28} />
          </div>
          <div>
            <h1 className={styles.title}>Verificación de Veterinario</h1>
            <p className={styles.subtitle}>
              {isStaffVet
                ? `Staff · ${clinicData?.name || 'Clínica'}`
                : isSoloMobile
                ? 'Veterinario a domicilio · Verificación personal'
                : 'Consultorio independiente · Verificación de veterinario'}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className={styles.infoBanner}>
          <Info size={16} className={styles.infoIcon} />
          <p>
            Tu matrícula puede verificarse en{' '}
            <a href="https://consejoprofesionalmvz.gov.co/" target="_blank" rel="noreferrer">
              COMVEZCOL <ExternalLink size={11} />
            </a>.
            Solo necesitamos tu número y una foto de tu carné.
          </p>
        </div>

        {isStaffVet && (
          <div className={styles.infoBanner} style={{ borderColor: 'hsl(38, 70%, 85%)', background: 'hsl(38, 100%, 97%)' }}>
            <ShieldAlert size={16} style={{ color: 'hsl(38, 90%, 40%)', flexShrink: 0 }} />
            <p style={{ color: 'hsl(38, 70%, 35%)' }}>
              Una vez verificado, podrás firmar historias clínicas y aparecerás como disponible
              en los servicios de <strong>{clinicData?.name || 'tu clínica'}</strong>.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ── Datos personales ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FileText size={16} /> Credenciales Profesionales
            </h3>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Número de Matrícula COMVEZCOL <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.professionalCardNumber}
                onChange={e => setForm(f => ({ ...f, professionalCardNumber: e.target.value }))}
                placeholder="Ej. 12345"
                className={styles.input}
                required
              />
              <p className={styles.fieldHint}>Verificable en consejoprofesionalmvz.gov.co</p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Número de Registro ICA (opcional)
              </label>
              <input
                type="text"
                value={form.icaRegistrationNumber}
                onChange={e => setForm(f => ({ ...f, icaRegistrationNumber: e.target.value }))}
                placeholder="Solo si expides certificados sanitarios"
                className={styles.input}
              />
            </div>

            {isSoloMobile && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Número de Cédula</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))}
                  placeholder="Ej. 1234567890"
                  className={styles.input}
                />
              </div>
            )}
          </section>

          {/* ── Documentos ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Upload size={16} /> Documentos
            </h3>

            <UploadField
              label="Foto de la Tarjeta Profesional COMVEZCOL"
              hint="Foto clara del carné físico o digital. JPG o PNG."
              accept="image/*"
              value={files.professionalCardPhoto}
              onChange={e => setFiles(f => ({ ...f, professionalCardPhoto: e.target.files[0] || null }))}
              required
            />

            {isSoloMobile && (
              <UploadField
                label="Foto de la Cédula de Ciudadanía (opcional)"
                hint="Foto del documento de identidad para verificación adicional."
                accept="image/*"
                value={files.idDocument}
                onChange={e => setFiles(f => ({ ...f, idDocument: e.target.files[0] || null }))}
              />
            )}
          </section>

          {submitError && (
            <div className={styles.errorMsg}>{submitError}</div>
          )}

          <div className={styles.actions}>
            {onBack && (
              <button type="button" onClick={onBack} className={styles.btnBack}>
                Volver
              </button>
            )}
            <button type="submit" disabled={submitting} className={styles.btnSubmit}>
              {submitting ? 'Enviando...' : isResubmission ? 'Reenviar Verificación' : 'Enviar para Verificación'}
            </button>
          </div>
        </form>

        <button onClick={logout} className={styles.logoutLink}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
