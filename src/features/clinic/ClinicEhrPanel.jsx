import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, doc,
  getDocs, getDoc, setDoc, addDoc, onSnapshot, updateDoc
} from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import {
  Search, Lock, Check, Save,
  ShieldAlert, Activity, FileText
} from 'lucide-react';
import styles from './ClinicEhrPanel.module.css';

// ─────────────────────────────────────────────────────────
// SHA-256 real usando Web Crypto API (nativa del navegador)
// Sin dependencias externas. Cumple Ley 527/1999.
// ─────────────────────────────────────────────────────────
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────
// PIN almacenado en Firestore en /clinics/{clinicId}/settings/pin
// Hasheado con SHA-256 antes de guardarse. Nunca texto plano.
// ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  type: 'consultation',
  weight: '',
  temperature: '',
  heartRate: '',
  respRate: '',
  tllc: '',
  bodyCondition: '3',
  anamnesis: '',
  diagnosis: '',
  treatmentPlan: '',
  visibility: 'all_staff',
};

/**
 * ClinicEhrPanel
 * Props:
 *   user       — firebase auth user
 *   clinicId   — ID de la clínica (puede diferir de user.uid para staff)
 *   clinicData — datos del documento /clinics/{clinicId}
 */
export default function ClinicEhrPanel({ user, clinicId, clinicData }) {
  // ── Búsqueda ──
  const [epidSearch, setEpidSearch] = useState('ELP-');
  const [searching, setSearching] = useState(false);
  const [pet, setPet] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);

  // ── Permiso de escritura ──
  const [permission, setPermission] = useState(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  // ── Formulario clínico ──
  const [clinicalForm, setClinicalForm] = useState(EMPTY_FORM);

  // ── Firma electrónica ──
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');
  const [signingError, setSigningError] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  // ── PIN configuración ──
  const [pinHash, setPinHash] = useState(null);         // hash guardado en Firestore
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Cargar PIN hash desde Firestore al montar
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clinicId || !user?.uid) return;
    const pinRef = doc(db, 'clinics', clinicId, 'settings', 'pin');
    const unsub = onSnapshot(pinRef, (snap) => {
      if (snap.exists()) {
        // El PIN se guarda por usuario (cada vet tiene el suyo)
        const data = snap.data();
        setPinHash(data[user.uid] || null);
      } else {
        setPinHash(null);
      }
    });
    return unsub;
  }, [clinicId, user?.uid]);

  // ─────────────────────────────────────────────────────────
  // Borrador local autosave cada 3s
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pet) return;
    const draftKey = `ehr_draft_${user.uid}_${pet.id}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try { setClinicalForm(JSON.parse(saved)); } catch (_) {}
    } else {
      setClinicalForm(EMPTY_FORM);
    }
  }, [pet?.id, user.uid]);

  useEffect(() => {
    if (!pet || permission !== 'authorized') return;
    const interval = setInterval(() => {
      localStorage.setItem(`ehr_draft_${user.uid}_${pet.id}`, JSON.stringify(clinicalForm));
    }, 3000);
    return () => clearInterval(interval);
  }, [clinicalForm, pet?.id, permission, user.uid]);

  // ─────────────────────────────────────────────────────────
  // Permiso en tiempo real
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pet || !user) return;
    const permRef = doc(db, 'clinical_permissions', `${user.uid}_${pet.id}`);
    const unsub = onSnapshot(permRef, (snap) => {
      setPermission(snap.exists() ? snap.data().status : null);
    });
    return unsub;
  }, [pet?.id, user?.uid]);

  // ─────────────────────────────────────────────────────────
  // Historial médico en tiempo real
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pet) return;
    const unsub = onSnapshot(
      collection(db, 'pets', pet.id, 'medical_records'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMedicalRecords(list);
      }
    );
    return unsub;
  }, [pet?.id]);

  // ─────────────────────────────────────────────────────────
  // Buscar mascota por EPID
  // ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (!val.startsWith('ELP-')) {
      if (['', 'E', 'EL', 'ELP'].includes(val)) { setEpidSearch('ELP-'); return; }
      val = 'ELP-' + val.replace(/[^A-Z0-9]/g, '');
    } else {
      val = 'ELP-' + val.substring(4).replace(/[^A-Z0-9]/g, '');
    }
    if (val.length <= 10) setEpidSearch(val);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (epidSearch === 'ELP-' || epidSearch.length < 5) return;
    setSearching(true);
    setPet(null);
    try {
      const snap = await getDocs(
        query(collection(db, 'pets'), where('epid', '==', epidSearch.trim()))
      );
      if (!snap.empty) {
        const d = snap.docs[0];
        setPet({ id: d.id, ...d.data() });
        // Log de auditoría con clinicId correcto
        try {
          await addDoc(collection(db, 'clinics', clinicId, 'audit_logs'), {
            vetId: user.uid,
            action: 'read_history',
            petId: d.id,
            petName: d.data().name,
            timestamp: new Date().toISOString(),
          });
        } catch (_) {}
      } else {
        alert('No se encontró ninguna mascota con ese EPID.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al buscar.');
    } finally {
      setSearching(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Solicitar permiso de escritura
  // ─────────────────────────────────────────────────────────
  const handleRequestPermission = async () => {
    if (!pet) return;
    setRequestingPermission(true);
    try {
      await setDoc(doc(db, 'clinical_permissions', `${user.uid}_${pet.id}`), {
        vetId: user.uid,
        clinicName: clinicData?.name || 'Veterinario enlapet',
        petId: pet.id,
        ownerId: pet.ownerId,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      alert('No se pudo enviar la solicitud de permiso.');
    } finally {
      setRequestingPermission(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Configurar / cambiar PIN (hashed con SHA-256)
  // ─────────────────────────────────────────────────────────
  const handleSavePin = async (e) => {
    e.preventDefault();
    setPinSetupError('');
    if (newPin.length !== 4) return setPinSetupError('El PIN debe ser de exactamente 4 dígitos.');
    if (newPin !== newPinConfirm) return setPinSetupError('Los PINs no coinciden.');
    setSavingPin(true);
    try {
      const hash = await sha256(`${user.uid}:${newPin}`);
      const pinRef = doc(db, 'clinics', clinicId, 'settings', 'pin');
      await setDoc(pinRef, { [user.uid]: hash }, { merge: true });
      setNewPin('');
      setNewPinConfirm('');
      setShowPinSetup(false);
    } catch (err) {
      setPinSetupError('Error al guardar el PIN: ' + err.message);
    } finally {
      setSavingPin(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Firmar y guardar registro (SHA-256 real, Ley 527)
  // ─────────────────────────────────────────────────────────
  const handleSignAndSave = async (e) => {
    e.preventDefault();
    setSigningError('');

    // Si el vet aún no configuró PIN → error amigable
    if (!pinHash) {
      setSigningError('Debes configurar tu PIN clínico antes de firmar registros. Usa el botón "Configurar PIN".');
      return;
    }

    // Verificar PIN: SHA-256(uid + ":" + pin) debe coincidir con el hash guardado
    const inputHash = await sha256(`${user.uid}:${signaturePin}`);
    if (inputHash !== pinHash) {
      setSigningError('PIN incorrecto. Verifica tu PIN clínico personal.');
      return;
    }

    setSavingRecord(true);
    try {
      const now = new Date().toISOString();
      // Hash de firma que incluye contenido del registro (integridad del documento)
      const payloadForHash = `${user.uid}|${pet.id}|${now}|${clinicalForm.diagnosis}|${clinicalForm.treatmentPlan}`;
      const signatureHash = await sha256(payloadForHash);

      const recordPayload = {
        vetId: user.uid,
        vetName: user.displayName || 'Médico Veterinario',
        clinicId,
        clinicName: clinicData?.name || 'Clínica Veterinaria',
        createdAt: now,
        type: clinicalForm.type,
        data: {
          weight:        parseFloat(clinicalForm.weight)    || 0,
          temperature:   parseFloat(clinicalForm.temperature) || 0,
          heartRate:     parseInt(clinicalForm.heartRate)   || 0,
          respRate:      parseInt(clinicalForm.respRate)    || 0,
          tllc:          clinicalForm.tllc,
          bodyCondition: clinicalForm.bodyCondition,
          anamnesis:     clinicalForm.anamnesis,
          diagnosis:     clinicalForm.diagnosis,
          treatmentPlan: clinicalForm.treatmentPlan,
        },
        visibility: clinicalForm.visibility,
        signed: true,
        signature: {
          algorithm: 'SHA-256',
          vetUid:    user.uid,
          hash:      signatureHash,
          signedAt:  now,
        },
      };

      await addDoc(collection(db, 'pets', pet.id, 'medical_records'), recordPayload);

      // Log de auditoría con clinicId correcto
      try {
        await addDoc(collection(db, 'clinics', clinicId, 'audit_logs'), {
          vetId: user.uid,
          action: 'write_history',
          petId: pet.id,
          petName: pet.name,
          signatureHash,
          timestamp: now,
        });
      } catch (_) {}

      // Limpiar borrador y formulario
      localStorage.removeItem(`ehr_draft_${user.uid}_${pet.id}`);
      setShowSignatureModal(false);
      setSignaturePin('');
      setClinicalForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      setSigningError('Error al guardar el expediente: ' + err.message);
    } finally {
      setSavingRecord(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* Header búsqueda */}
      <div className={styles.searchHeader}>
        <div className={styles.searchTitleRow}>
          <h2>Historia Clínica Electrónica (EHR)</h2>
          {/* Botón configurar PIN — siempre visible para el vet */}
          <button
            onClick={() => setShowPinSetup(true)}
            className={styles.pinConfigBtn}
            title="Configurar PIN de firma"
          >
            <Lock size={15} />
            {pinHash ? 'Cambiar PIN' : 'Configurar PIN'}
          </button>
        </div>
        <p>Busca una mascota por su EPID para consultar su historial o registrar una atención.</p>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={epidSearch}
            onChange={handleInputChange}
            placeholder="Ej: ELP-ABC123"
            required
            className={styles.searchInput}
          />
          <button type="submit" disabled={searching} className={styles.searchBtn}>
            <Search size={18} />
            <span>{searching ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>
      </div>

      {/* Workspace con ficha de mascota */}
      {pet && (
        <div className={styles.workspace}>
          {/* Ficha resumen */}
          <div className={styles.petOverviewCard}>
            <div className={styles.avatarContainer}>
              <img
                src={pet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'}
                alt={pet.name}
                className={styles.avatar}
              />
            </div>
            <div className={styles.petInfoGrid}>
              <div>
                <h3>{pet.name}</h3>
                <p>EPID: <strong>{pet.epid}</strong></p>
              </div>
              <div>
                <p>Especie: <strong>{pet.species === 'Dog' ? 'Perro' : pet.species === 'Cat' ? 'Gato' : pet.species}</strong></p>
                <p>Raza: <strong>{pet.breed || 'Sin raza'}</strong></p>
              </div>
              <div>
                <p>Color: <strong>{pet.color || 'No especificado'}</strong></p>
                <p>Sexo: <strong>{pet.gender === 'male' ? 'Macho' : 'Hembra'}</strong></p>
              </div>
            </div>
          </div>

          <div className={styles.mainGrid}>
            {/* Formulario clínico */}
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h3>Registrar Atención Médica</h3>
                {permission === 'authorized' ? (
                  <span className={styles.authBadgeSuccess}>✓ Permiso Autorizado</span>
                ) : permission === 'pending' ? (
                  <span className={styles.authBadgePending}>⚡ Esperando Autorización</span>
                ) : (
                  <span className={styles.authBadgeNone}>⚠ Sin Permiso de Escritura</span>
                )}
              </div>

              {permission === 'authorized' ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); setShowSignatureModal(true); }}
                  className={styles.clinicalForm}
                >
                  {/* Tipo y visibilidad */}
                  <div className={styles.formGroupRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="recordType">Tipo de Atención</label>
                      <select
                        id="recordType"
                        value={clinicalForm.type}
                        onChange={e => setClinicalForm(f => ({ ...f, type: e.target.value }))}
                      >
                        <option value="consultation">Consulta General</option>
                        <option value="vaccine">Vacunación</option>
                        <option value="deworming">Desparasitación</option>
                        <option value="surgery">Cirugía</option>
                        <option value="lab_test">Exámenes de Laboratorio</option>
                        <option value="emergency">Urgencias</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="recordVisibility">Visibilidad del Registro</label>
                      <select
                        id="recordVisibility"
                        value={clinicalForm.visibility}
                        onChange={e => setClinicalForm(f => ({ ...f, visibility: e.target.value }))}
                      >
                        <option value="all_staff">Todo el Staff Clínico</option>
                        <option value="vets_only">Solo Médicos Veterinarios (Privado)</option>
                      </select>
                    </div>
                  </div>

                  {/* Constantes fisiológicas */}
                  <div className={styles.sectionDivider}>Examen Clínico (Constantes)</div>
                  <div className={styles.formGroupRow4}>
                    {[
                      { id: 'weight',      label: 'Peso (kg)',         step: '0.1', placeholder: 'Ej. 12.5' },
                      { id: 'temperature', label: 'Temp (°C)',         step: '0.1', placeholder: 'Ej. 38.5' },
                      { id: 'heartRate',   label: 'FC (lat/min)',      step: '1',   placeholder: 'Ej. 110'  },
                      { id: 'respRate',    label: 'FR (resp/min)',     step: '1',   placeholder: 'Ej. 24'   },
                    ].map(f => (
                      <div key={f.id} className={styles.formGroup}>
                        <label htmlFor={f.id}>{f.label}</label>
                        <input
                          id={f.id}
                          type="number"
                          step={f.step}
                          value={clinicalForm[f.id]}
                          onChange={e => setClinicalForm(cf => ({ ...cf, [f.id]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      </div>
                    ))}
                  </div>

                  <div className={styles.formGroupRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="tllc">T. Llenado Capilar (TLLC)</label>
                      <input
                        id="tllc"
                        type="text"
                        value={clinicalForm.tllc}
                        onChange={e => setClinicalForm(f => ({ ...f, tllc: e.target.value }))}
                        placeholder="Ej. 2 segundos"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="bodyCondition">Condición Corporal</label>
                      <select
                        id="bodyCondition"
                        value={clinicalForm.bodyCondition}
                        onChange={e => setClinicalForm(f => ({ ...f, bodyCondition: e.target.value }))}
                      >
                        <option value="1">1 — Caquéctico</option>
                        <option value="2">2 — Delgado</option>
                        <option value="3">3 — Ideal</option>
                        <option value="4">4 — Sobrepeso</option>
                        <option value="5">5 — Obeso</option>
                      </select>
                    </div>
                  </div>

                  {/* Notas médicas */}
                  <div className={styles.sectionDivider}>Notas y Diagnóstico</div>
                  {[
                    { id: 'anamnesis',     label: 'Anamnesis (Síntomas y Motivo de Consulta)', rows: 3, placeholder: 'Síntomas reportados por el dueño...', required: true },
                    { id: 'diagnosis',     label: 'Diagnóstico (Presuntivo / Definitivo)',      rows: 2, placeholder: 'Diagnóstico clínico...',             required: true },
                    { id: 'treatmentPlan', label: 'Plan de Tratamiento y Prescripción',         rows: 3, placeholder: 'Medicamentos, dosis, frecuencia...',  required: true },
                  ].map(f => (
                    <div key={f.id} className={styles.formGroup}>
                      <label htmlFor={f.id}>{f.label}</label>
                      <textarea
                        id={f.id}
                        value={clinicalForm[f.id]}
                        onChange={e => setClinicalForm(cf => ({ ...cf, [f.id]: e.target.value }))}
                        rows={f.rows}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    </div>
                  ))}

                  <button type="submit" className={styles.saveRecordBtn}>
                    <Save size={18} />
                    <span>Firmar y Guardar Registro</span>
                  </button>
                </form>
              ) : (
                <div className={styles.blockedFormScreen}>
                  <Lock size={48} className={styles.lockIcon} />
                  {permission === 'pending' ? (
                    <>
                      <h4>Solicitud de Escritura Pendiente</h4>
                      <p>Hemos enviado una alerta al dueño de <strong>{pet.name}</strong>. La pantalla se desbloqueará una vez acepte.</p>
                    </>
                  ) : (
                    <>
                      <h4>Acceso de Escritura Restringido</h4>
                      <p>Para registrar atenciones en el historial de <strong>{pet.name}</strong>, debes solicitar permiso al dueño.</p>
                      <button
                        onClick={handleRequestPermission}
                        disabled={requestingPermission}
                        className={styles.requestBtn}
                      >
                        {requestingPermission ? 'Enviando solicitud...' : 'Solicitar Permiso de Escritura'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Historial (timeline) */}
            <div className={styles.recordsListContainer}>
              <h3>Historial Médico</h3>
              {medicalRecords.length === 0 ? (
                <p className={styles.noRecords}>No hay registros para esta mascota.</p>
              ) : (
                <div className={styles.recordsTimeline}>
                  {medicalRecords.map(record => (
                    <div key={record.id} className={styles.timelineItem}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.recordTypeTag}>
                          {{ consultation: 'Consulta', vaccine: 'Vacuna', deworming: 'Desparasitante', surgery: 'Cirugía', lab_test: 'Laboratorio', emergency: 'Urgencia' }[record.type] || record.type}
                        </span>
                        <span className={styles.recordDate}>
                          {new Date(record.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <div className={styles.timelineBody}>
                        <p className={styles.recordClinicName}>Atendido en: <strong>{record.clinicName}</strong></p>
                        <p className={styles.recordDiag}>Diag: {record.data?.diagnosis}</p>
                        <p className={styles.recordPrescription}>Plan: {record.data?.treatmentPlan}</p>
                        {record.signed && (
                          <div className={styles.recordSignatureBlock}>
                            <Check size={13} className={styles.signatureCheckIcon} />
                            <span>
                              Firmado digitalmente · SHA-256 ·{' '}
                              <code title={record.signature?.hash}>
                                {record.signature?.hash?.substring(0, 12)}…
                              </code>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PIN: Configurar / Cambiar ── */}
      {showPinSetup && (
        <div className={styles.signatureOverlay}>
          <div className={styles.signatureCard}>
            <div className={styles.signatureHeader}>
              <Lock size={20} />
              <h3>{pinHash ? 'Cambiar PIN Clínico' : 'Configurar PIN Clínico'}</h3>
            </div>
            <form onSubmit={handleSavePin} className={styles.signatureBody}>
              <p>
                Tu PIN de 4 dígitos se guarda como hash SHA-256 y nunca en texto plano.
                Es personal e intransferible — firma tus registros clínicos (Ley 527/1999).
              </p>
              {pinSetupError && <p className={styles.signatureError}>{pinSetupError}</p>}
              <div className={styles.signatureFormGroup}>
                <label>Nuevo PIN (4 dígitos)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className={styles.pinInput}
                  autoFocus
                />
              </div>
              <div className={styles.signatureFormGroup}>
                <label>Confirmar PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPinConfirm}
                  onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className={styles.pinInput}
                />
              </div>
              <div className={styles.signatureActions}>
                <button
                  type="button"
                  onClick={() => { setShowPinSetup(false); setNewPin(''); setNewPinConfirm(''); setPinSetupError(''); }}
                  className={styles.signatureCancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPin || newPin.length < 4}
                  className={styles.signatureConfirmBtn}
                >
                  {savingPin ? 'Guardando...' : 'Guardar PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal firma: Ingresar PIN para firmar ── */}
      {showSignatureModal && (
        <div className={styles.signatureOverlay}>
          <div className={styles.signatureCard}>
            <div className={styles.signatureHeader}>
              <Lock size={20} />
              <h3>Confirmar Firma de Registro</h3>
            </div>
            <form onSubmit={handleSignAndSave} className={styles.signatureBody}>
              <p>
                Por normativa de auditoría médica (Ley 527 de 1999), debes confirmar tu identidad
                con tu PIN clínico personal antes de guardar este registro.
              </p>
              {!pinHash && (
                <p className={styles.signatureError}>
                  ⚠ No tienes PIN configurado. Cierra este modal y usa el botón{' '}
                  <strong>"Configurar PIN"</strong> primero.
                </p>
              )}
              {signingError && <p className={styles.signatureError}>{signingError}</p>}
              <div className={styles.signatureFormGroup}>
                <label htmlFor="pinInput">PIN Clínico (4 dígitos)</label>
                <input
                  id="pinInput"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={signaturePin}
                  onChange={e => setSignaturePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className={styles.pinInput}
                />
              </div>
              <div className={styles.signatureActions}>
                <button
                  type="button"
                  onClick={() => { setShowSignatureModal(false); setSignaturePin(''); setSigningError(''); }}
                  className={styles.signatureCancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRecord || signaturePin.length < 4 || !pinHash}
                  className={styles.signatureConfirmBtn}
                >
                  {savingRecord ? 'Firmando...' : 'Confirmar Firma Médica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
