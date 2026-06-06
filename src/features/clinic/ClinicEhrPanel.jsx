import React, { useState, useEffect } from 'react';
import { collection, query, where, doc, getDocs, getDoc, setDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { Search, Heart, User, ShieldAlert, FileText, Activity, Save, Edit3, Lock, Check } from 'lucide-react';
import styles from './ClinicEhrPanel.module.css';

export default function ClinicEhrPanel({ user, clinicData }) {
  const [epidSearch, setEpidSearch] = useState('ELP-');
  const [searching, setSearching] = useState(false);
  const [pet, setPet] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  
  // Estado del Permiso de Escritura
  const [permission, setPermission] = useState(null); // null, 'pending', 'authorized', 'revoked'
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Formulario Clínico EHR
  const [clinicalForm, setClinicalForm] = useState({
    type: 'consultation',
    weight: '',
    temperature: '',
    heartRate: '',
    respRate: '',
    tllc: '', // Llenado capilar
    bodyCondition: '3', // 1-5
    anamnesis: '',
    diagnosis: '',
    treatmentPlan: '',
    visibility: 'all_staff' // 'all_staff' | 'vets_only'
  });

  // Firma electrónica
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');
  const [signingError, setSigningError] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  // Cargar borradores locales de este paciente para evitar pérdida de datos
  useEffect(() => {
    if (!pet) return;
    const draftKey = `draft_${user.uid}_${pet.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        setClinicalForm(JSON.parse(savedDraft));
      } catch (err) {
        console.error("Error al cargar borrador:", err);
      }
    } else {
      // Limpiar formulario si no hay borrador
      setClinicalForm({
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
        visibility: 'all_staff'
      });
    }
  }, [pet, user.uid]);

  // Auto-Save borrador clínico cada 3 segundos
  useEffect(() => {
    if (!pet || permission !== 'authorized') return;
    const interval = setInterval(() => {
      const draftKey = `draft_${user.uid}_${pet.id}`;
      localStorage.setItem(draftKey, JSON.stringify(clinicalForm));
    }, 3000);

    return () => clearInterval(interval);
  }, [clinicalForm, pet, permission, user.uid]);

  // Escuchar el permiso de escritura en tiempo real
  useEffect(() => {
    if (!pet || !user) return;
    const permissionId = `${user.uid}_${pet.id}`;
    const permRef = doc(db, 'clinical_permissions', permissionId);

    const unsubscribe = onSnapshot(permRef, (docSnap) => {
      if (docSnap.exists()) {
        setPermission(docSnap.data().status);
      } else {
        setPermission(null);
      }
    });

    return () => unsubscribe();
  }, [pet, user]);

  // Escuchar historial médico de la mascota seleccionada
  useEffect(() => {
    if (!pet) return;
    const recordsRef = collection(db, 'pets', pet.id, 'medical_records');
    const unsubscribe = onSnapshot(recordsRef, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      // Ordenar por fecha descendente
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMedicalRecords(list);
    });

    return () => unsubscribe();
  }, [pet]);

  // Formatear la entrada de EPID
  const handleInputChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (!val.startsWith('ELP-')) {
      if (val === '' || val === 'E' || val === 'EL' || val === 'ELP') {
        setEpidSearch('ELP-');
        return;
      }
      val = 'ELP-' + val.replace(/[^A-Z0-9]/g, '');
    } else {
      const rest = val.substring(4).replace(/[^A-Z0-9]/g, '');
      val = 'ELP-' + rest;
    }
    if (val.length <= 10) setEpidSearch(val);
  };

  // Buscar mascota por EPID
  const handleSearch = async (e) => {
    e.preventDefault();
    if (epidSearch === 'ELP-' || epidSearch.length < 5) return;
    
    setSearching(true);
    setPet(null);
    try {
      const petsRef = collection(db, 'pets');
      const q = query(petsRef, where('epid', '==', epidSearch.trim()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setPet({ id: docSnap.id, ...docSnap.data() });
        
        // Registrar Log de Auditoría para Lectura Clínica (Habeas Data)
        try {
          const auditRef = collection(db, 'clinics', user.uid, 'audit_logs');
          await addDoc(auditRef, {
            vetId: user.uid,
            action: 'read_history',
            petId: docSnap.id,
            petName: docSnap.data().name,
            timestamp: new Date().toISOString()
          });
        } catch (auditErr) {
          console.error("Error al registrar auditoría de lectura:", auditErr);
        }
      } else {
        alert("No se encontró ninguna mascota con ese EPID.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al buscar.");
    } finally {
      setSearching(false);
    }
  };

  // Solicitar permiso de escritura
  const handleRequestPermission = async () => {
    if (!pet) return;
    setRequestingPermission(true);
    try {
      const permissionId = `${user.uid}_${pet.id}`;
      const permRef = doc(db, 'clinical_permissions', permissionId);
      await setDoc(permRef, {
        vetId: user.uid,
        clinicName: clinicData?.name || 'Veterinario enlapet',
        petId: pet.id,
        ownerId: pet.ownerId,
        status: 'pending',
        requestedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al solicitar permiso:", err);
      alert("No se pudo enviar la solicitud de permiso.");
    } finally {
      setRequestingPermission(false);
    }
  };

  // Firmar y guardar el registro (Firma Digital Ley 527)
  const handleSignAndSave = async (e) => {
    e.preventDefault();
    setSigningError('');
    
    // Simular validación del PIN clínico (Estándar 1234 o validación local por simplicidad en demo)
    if (signaturePin !== '1234') {
      setSigningError('PIN clínico inválido. Por seguridad, digite su PIN de 4 dígitos (Por defecto es 1234).');
      return;
    }

    setSavingRecord(true);
    try {
      // Hash SHA-256 simulado para firma digital Ley 527
      const signatureHash = btoa(`${user.uid}_${pet.id}_${new Date().getTime()}`);

      const recordPayload = {
        vetId: user.uid,
        clinicName: clinicData?.name || 'Clínica Veterinaria',
        createdAt: new Date().toISOString(),
        type: clinicalForm.type,
        data: {
          weight: parseFloat(clinicalForm.weight) || 0,
          temperature: parseFloat(clinicalForm.temperature) || 0,
          heartRate: parseInt(clinicalForm.heartRate) || 0,
          respRate: parseInt(clinicalForm.respRate) || 0,
          tllc: clinicalForm.tllc,
          bodyCondition: clinicalForm.bodyCondition,
          anamnesis: clinicalForm.anamnesis,
          diagnosis: clinicalForm.diagnosis,
          treatmentPlan: clinicalForm.treatmentPlan
        },
        visibility: clinicalForm.visibility,
        signature: {
          vetUid: user.uid,
          hash: signatureHash,
          signedAt: new Date().toISOString()
        }
      };

      const recordsRef = collection(db, 'pets', pet.id, 'medical_records');
      await addDoc(recordsRef, recordPayload);

      // Registrar Log de Auditoría para Escritura Clínica (Habeas Data)
      try {
        const auditRef = collection(db, 'clinics', user.uid, 'audit_logs');
        await addDoc(auditRef, {
          vetId: user.uid,
          action: 'write_history',
          petId: pet.id,
          petName: pet.name,
          timestamp: new Date().toISOString()
        });
      } catch (auditErr) {
        console.error("Error al registrar auditoría de escritura:", auditErr);
      }

      // Borrar borrador local del formulario una vez guardado
      const draftKey = `draft_${user.uid}_${pet.id}`;
      localStorage.removeItem(draftKey);

      setShowSignatureModal(false);
      setSignaturePin('');
      // Limpiar formulario
      setClinicalForm({
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
        visibility: 'all_staff'
      });
      alert("¡Historial clínico firmado y guardado inmutablemente!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar el expediente.");
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchHeader}>
        <h2>Expediente e Historia Clínica Electrónica (EHR)</h2>
        <p>Busca una mascota usando su identificador único EPID para consultar su historial o registrar una atención.</p>

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

      {pet && (
        <div className={styles.workspace}>
          {/* Ficha Resumen Mascota */}
          <div className={styles.petOverviewCard}>
            <div className={styles.avatarContainer}>
              <img 
                src={pet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'}
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
                <p>Raza: <strong>{pet.breed || 'Sin Raza'}</strong></p>
              </div>
              <div>
                <p>Color: <strong>{pet.color || 'No especificado'}</strong></p>
                <p>Sexo: <strong>{pet.gender === 'male' ? 'Macho' : 'Hembra'}</strong></p>
              </div>
            </div>
          </div>

          <div className={styles.mainGrid}>
            {/* Formulario Clínico (Escritura) */}
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
                <form onSubmit={(e) => { e.preventDefault(); setShowSignatureModal(true); }} className={styles.clinicalForm}>
                  {/* Tipo de Registro */}
                  <div className={styles.formGroupRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="recordType">Tipo de Atención</label>
                      <select
                        id="recordType"
                        value={clinicalForm.type}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, type: e.target.value })}
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
                        onChange={(e) => setClinicalForm({ ...clinicalForm, visibility: e.target.value })}
                      >
                        <option value="all_staff">Todo el Staff Clínico (Recepción/Caja/Vets)</option>
                        <option value="vets_only">Solo Médicos Veterinarios (Privado)</option>
                      </select>
                    </div>
                  </div>

                  {/* Constantes Fisiológicas */}
                  <div className={styles.sectionDivider}>Examen Clínico (Constantes)</div>
                  <div className={styles.formGroupRow4}>
                    <div className={styles.formGroup}>
                      <label htmlFor="weight">Peso (kg)</label>
                      <input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={clinicalForm.weight}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, weight: e.target.value })}
                        required
                        placeholder="Ej. 12.5"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="temperature">Temp (°C)</label>
                      <input
                        id="temperature"
                        type="number"
                        step="0.1"
                        value={clinicalForm.temperature}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, temperature: e.target.value })}
                        placeholder="Ej. 38.5"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="heartRate">F. Cardíaca (FC/min)</label>
                      <input
                        id="heartRate"
                        type="number"
                        value={clinicalForm.heartRate}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, heartRate: e.target.value })}
                        placeholder="Ej. 110"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="respRate">F. Resp (FR/min)</label>
                      <input
                        id="respRate"
                        type="number"
                        value={clinicalForm.respRate}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, respRate: e.target.value })}
                        placeholder="Ej. 24"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroupRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="tllc">T. Llenado Capilar (TLLC)</label>
                      <input
                        id="tllc"
                        type="text"
                        value={clinicalForm.tllc}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, tllc: e.target.value })}
                        placeholder="Ej. 2 segundos"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="bodyCondition">Condición Corporal</label>
                      <select
                        id="bodyCondition"
                        value={clinicalForm.bodyCondition}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, bodyCondition: e.target.value })}
                      >
                        <option value="1">1 - Caquéctico</option>
                        <option value="2">2 - Delgado</option>
                        <option value="3">3 - Ideal</option>
                        <option value="4">4 - Sobrepeso</option>
                        <option value="5">5 - Obeso</option>
                      </select>
                    </div>
                  </div>

                  {/* Notas Médicas */}
                  <div className={styles.sectionDivider}>Notas y Diagnóstico</div>
                  <div className={styles.formGroup}>
                    <label htmlFor="anamnesis">Anamnesis (Síntomas y Motivo de Consulta)</label>
                    <textarea
                      id="anamnesis"
                      value={clinicalForm.anamnesis}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, anamnesis: e.target.value })}
                      required
                      rows={3}
                      placeholder="Escribe los síntomas reportados por el dueño..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="diagnosis">Diagnóstico (Presuntivo / Definitivo)</label>
                    <textarea
                      id="diagnosis"
                      value={clinicalForm.diagnosis}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, diagnosis: e.target.value })}
                      required
                      rows={2}
                      placeholder="Diagnóstico clínico..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="treatmentPlan">Plan de Tratamiento y Prescripción</label>
                    <textarea
                      id="treatmentPlan"
                      value={clinicalForm.treatmentPlan}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, treatmentPlan: e.target.value })}
                      required
                      rows={3}
                      placeholder="Detalla medicamentos, dosis, frecuencia y duración..."
                    />
                  </div>

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
                      <p>Hemos enviado una alerta al dueño de <strong>{pet.name}</strong> en tiempo real. La pantalla se desbloqueará una vez el dueño acepte la solicitud en su dashboard.</p>
                    </>
                  ) : (
                    <>
                      <h4>Acceso de Escritura Restringido</h4>
                      <p>Para añadir vacunas, tratamientos o consultas al historial de <strong>{pet.name}</strong>, debes solicitar el permiso digital al dueño.</p>
                      <button 
                        onClick={handleRequestPermission} 
                        disabled={requestingPermission}
                        className={styles.requestBtn}
                      >
                        {requestingPermission ? 'Enviando Solicitud...' : 'Solicitar Permiso de Escritura'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Listado de Antecedentes (Lectura Libre por EPID) */}
            <div className={styles.recordsListContainer}>
              <h3>Historial Médico de la Mascota</h3>
              {medicalRecords.length === 0 ? (
                <p className={styles.noRecords}>No hay registros médicos cargados para esta mascota.</p>
              ) : (
                <div className={styles.recordsTimeline}>
                  {medicalRecords.map((record) => (
                    <div key={record.id} className={styles.timelineItem}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.recordTypeTag}>
                          {record.type === 'consultation' && 'Consulta'}
                          {record.type === 'vaccine' && 'Vacuna'}
                          {record.type === 'deworming' && 'Desparasitante'}
                          {record.type === 'surgery' && 'Cirugía'}
                          {record.type === 'lab_test' && 'Laboratorio'}
                          {record.type === 'emergency' && 'Urgencia'}
                        </span>
                        <span className={styles.recordDate}>
                          {new Date(record.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <div className={styles.timelineBody}>
                        <p className={styles.recordClinicName}>Atendido en: <strong>{record.clinicName}</strong></p>
                        <p className={styles.recordDiag}>Diag: {record.data.diagnosis}</p>
                        <p className={styles.recordPrescription}>Plan: {record.data.treatmentPlan}</p>
                        
                        {record.signature && (
                          <div className={styles.recordSignatureBlock}>
                            <Check size={14} className={styles.signatureCheckIcon} />
                            <span>Firmado Digitalmente (ID Vet: {record.signature.vetUid.substring(0, 8)})</span>
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

      {/* Modal para ingresar PIN de Firma */}
      {showSignatureModal && (
        <div className={styles.signatureOverlay}>
          <div className={styles.signatureCard}>
            <div className={styles.signatureHeader}>
              <Lock size={20} />
              <h3>Confirmación y Firma de Registro</h3>
            </div>
            <form onSubmit={handleSignAndSave} className={styles.signatureBody}>
              <p>Por normativas de auditoría médica (Ley 527 de 1999), debes firmar electrónicamente este registro clínico utilizando tu PIN confidencial.</p>
              
              {signingError && <p className={styles.signatureError}>{signingError}</p>}

              <div className={styles.signatureFormGroup}>
                <label htmlFor="pinInput">Digita tu PIN Clínico (4 dígitos)</label>
                <input
                  id="pinInput"
                  type="password"
                  maxLength={4}
                  value={signaturePin}
                  onChange={(e) => setSignaturePin(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  placeholder="••••"
                  autoFocus
                  className={styles.pinInput}
                />
              </div>

              <div className={styles.signatureActions}>
                <button type="button" onClick={() => { setShowSignatureModal(false); setSignaturePin(''); }} className={styles.signatureCancelBtn}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingRecord || signaturePin.length < 4} className={styles.signatureConfirmBtn}>
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
