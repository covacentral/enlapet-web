import React, { useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import {
  Building2, Upload, CheckCircle2, FileText,
  User, ArrowLeft, Info, ExternalLink, LogOut
} from 'lucide-react';
import styles from './ClinicVerificationForm.module.css';

// ─────────────────────────────────────────────────────────
// UploadField — componente de subida de archivo
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// ClinicVerificationForm — Track A
// Para: clinic_ips y clinic_solo_local
// ─────────────────────────────────────────────────────────
export default function ClinicVerificationForm({ isResubmission = false, onBack }) {
  const { user, clinicData, clinicSubtype, logout } = useAuth();

  const [form, setForm] = useState({
    nit: clinicData?.nit || '',
    directorTechName: '',
    directorComvezcol: '',
    address: clinicData?.address || '',
    city: clinicData?.city || '',
    phone: clinicData?.phone || '',
  });

  const [files, setFiles] = useState({
    chamberOfCommerce: null,      // Cámara de Comercio (obligatorio)
    sanitaryPermit: null,         // Concepto Sanitario (opcional)
    icaLicense: null,             // Registro ICA (opcional)
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isIPS = clinicSubtype === 'ips' || clinicData?.clinicSubtype === 'ips';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // Validaciones mínimas
    if (!form.nit.trim()) return setSubmitError('El NIT es obligatorio.');
    if (!form.directorComvezcol.trim()) return setSubmitError('El número COMVEZCOL del director técnico es obligatorio.');
    if (!files.chamberOfCommerce) return setSubmitError('La Cámara de Comercio es obligatoria.');
    if (!form.address.trim() || !form.city.trim()) return setSubmitError('La dirección y ciudad son obligatorias.');

    setSubmitting(true);
    try {
      const clinicId = user.uid;
      const now = new Date().toISOString();
      const uploadedDocs = {};

      // ── Subir archivos a Storage ──
      const uploadFile = async (file, path) => {
        if (!file) return null;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      };

      uploadedDocs.chamberOfCommerceUrl = await uploadFile(
        files.chamberOfCommerce,
        `verifications/clinics/${clinicId}/chamber_of_commerce`
      );

      if (files.sanitaryPermit) {
        uploadedDocs.sanitaryPermitUrl = await uploadFile(
          files.sanitaryPermit,
          `verifications/clinics/${clinicId}/sanitary_permit`
        );
      }

      if (files.icaLicense) {
        uploadedDocs.icaLicenseUrl = await uploadFile(
          files.icaLicense,
          `verifications/clinics/${clinicId}/ica_license`
        );
      }

      // ── Crear / actualizar solicitud en /clinic_verifications ──
      await setDoc(doc(db, 'clinic_verifications', clinicId), {
        clinicId,
        clinicName: clinicData?.name || 'Clínica',
        adminName: user.displayName || '',
        email: user.email,
        clinicSubtype: clinicData?.clinicSubtype || clinicSubtype || 'ips',
        documents: {
          nit: form.nit.trim(),
          directorTechName: form.directorTechName.trim(),
          directorComvezcol: form.directorComvezcol.trim(),
          ...uploadedDocs,
        },
        status: 'pending',
        submittedAt: now,
        ...(isResubmission ? { resubmittedAt: now } : {}),
      });

      // ── Actualizar /clinics/{uid} con datos básicos ──
      await updateDoc(doc(db, 'clinics', clinicId), {
        nit: form.nit.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        verificationSubmittedAt: now,
        updatedAt: now,
      });

    } catch (err) {
      console.error('Error al enviar verificación:', err);
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
            <Building2 size={28} />
          </div>
          <div>
            <h1 className={styles.title}>
              {isResubmission ? 'Reenviar Verificación' : 'Verificación del Establecimiento'}
            </h1>
            <p className={styles.subtitle}>
              {isIPS
                ? 'Clínica / IPS · Verificación de establecimiento veterinario'
                : 'Consultorio independiente · Verificación de funcionamiento'}
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className={styles.infoBanner}>
          <Info size={16} className={styles.infoIcon} />
          <p>
            Solo solicitamos los documentos mínimos para confirmar que tu establecimiento
            cuenta con los avales para operar. Puedes verificar los datos en{' '}
            <a href="https://www.rues.org.co" target="_blank" rel="noreferrer">
              rues.org.co <ExternalLink size={11} />
            </a>{' '}
            y{' '}
            <a href="https://consejoprofesionalmvz.gov.co/" target="_blank" rel="noreferrer">
              COMVEZCOL <ExternalLink size={11} />
            </a>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ── Datos del establecimiento ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Building2 size={16} /> Datos del Establecimiento
            </h3>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                NIT <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.nit}
                onChange={e => setForm(f => ({ ...f, nit: e.target.value }))}
                placeholder="Ej. 900.123.456-7"
                className={styles.input}
                required
              />
              <p className={styles.fieldHint}>Verificable en rues.org.co</p>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Dirección <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Calle 10 # 25 - 30"
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Ciudad <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Medellín"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Teléfono de contacto</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+57 300 123 4567"
                className={styles.input}
              />
            </div>
          </section>

          {/* ── Director Técnico ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <User size={16} /> Director Técnico Veterinario
            </h3>
            <p className={styles.sectionNote}>
              Todo establecimiento veterinario debe tener un médico veterinario registrado como
              director técnico ante la Secretaría de Salud.
            </p>

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Nombre del Director Técnico
                </label>
                <input
                  type="text"
                  value={form.directorTechName}
                  onChange={e => setForm(f => ({ ...f, directorTechName: e.target.value }))}
                  placeholder="Dr. Juan García"
                  className={styles.input}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Número COMVEZCOL <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={form.directorComvezcol}
                  onChange={e => setForm(f => ({ ...f, directorComvezcol: e.target.value }))}
                  placeholder="Ej. 12345"
                  className={styles.input}
                  required
                />
              </div>
            </div>
            <a
              href="https://consejoprofesionalmvz.gov.co/"
              target="_blank"
              rel="noreferrer"
              className={styles.verifyLink}
            >
              <ExternalLink size={13} /> Verificar matrícula en COMVEZCOL
            </a>
          </section>

          {/* ── Documentos ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FileText size={16} /> Documentos
            </h3>

            <UploadField
              label="Cámara de Comercio / Matrícula Mercantil"
              hint="Certificado de existencia y representación legal. Máximo 90 días de expedición. JPG, PNG o PDF."
              accept="image/*,.pdf"
              value={files.chamberOfCommerce}
              onChange={e => setFiles(f => ({ ...f, chamberOfCommerce: e.target.files[0] || null }))}
              required
            />

            <UploadField
              label="Concepto Sanitario (opcional)"
              hint="Permiso de la Secretaría de Salud municipal. Si no lo tienes, puedes enviarlo después."
              accept="image/*,.pdf"
              value={files.sanitaryPermit}
              onChange={e => setFiles(f => ({ ...f, sanitaryPermit: e.target.files[0] || null }))}
            />

            <UploadField
              label="Registro ICA como establecimiento (opcional)"
              hint="Solo si tu establecimiento está inscrito ante el ICA. Se puede agregar después."
              accept="image/*,.pdf"
              value={files.icaLicense}
              onChange={e => setFiles(f => ({ ...f, icaLicense: e.target.files[0] || null }))}
            />
          </section>

          {/* Error */}
          {submitError && (
            <div className={styles.errorMsg}>{submitError}</div>
          )}

          {/* Acciones */}
          <div className={styles.actions}>
            {onBack && (
              <button type="button" onClick={onBack} className={styles.btnBack}>
                <ArrowLeft size={16} /> Volver
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={styles.btnSubmit}
            >
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
