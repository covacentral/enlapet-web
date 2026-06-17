import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc, getDocs
} from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import {
  ShieldCheck, ClipboardList, Stethoscope, Building2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  ExternalLink, LogOut, AlertTriangle, Clock,
  Users, BadgeCheck, Nfc, Search, Copy, CheckCheck
} from 'lucide-react';
import styles from './AdminPanel.module.css';

// ─────────────────────────────────────────────────────────
// Confirmación en 2 pasos
// ─────────────────────────────────────────────────────────
function ConfirmModal({ action, targetName, onConfirm, onCancel, requireReason = false }) {
  const [reason, setReason] = useState('');
  const isApprove = action === 'approve';

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={`${styles.modalIcon} ${isApprove ? styles.modalIconGreen : styles.modalIconRed}`}>
          {isApprove ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
        </div>
        <h3>{isApprove ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}</h3>
        <p>
          {isApprove
            ? `¿Confirmas que has verificado los documentos y apruebas a `
            : `¿Confirmas que rechazas la solicitud de `}
          <strong>{targetName}</strong>?
        </p>
        {requireReason && !isApprove && (
          <div className={styles.modalField}>
            <label>Motivo del rechazo (obligatorio)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe por qué se rechaza esta solicitud..."
              rows={3}
            />
          </div>
        )}
        <div className={styles.modalActions}>
          <button onClick={onCancel} className={styles.btnSecondary}>Cancelar</button>
          <button
            onClick={() => onConfirm(reason)}
            className={isApprove ? styles.btnApprove : styles.btnReject}
            disabled={requireReason && !isApprove && !reason.trim()}
          >
            {isApprove ? 'Sí, Aprobar' : 'Sí, Rechazar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Badge de estado
// ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
    approved:  { label: 'Aprobado',  color: '#10b981', bg: '#f0fdf4' },
    verified:  { label: 'Verificado', color: '#10b981', bg: '#f0fdf4' },
    rejected:  { label: 'Rechazado', color: '#ef4444', bg: '#fef2f2' },
    suspended: { label: 'Suspendido', color: '#6b7280', bg: '#f9fafb' },
  };
  const s = map[status] || map['pending'];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.76rem',
      fontWeight: 700, color: s.color, background: s.bg,
      border: `1px solid ${s.color}30`
    }}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Panel: Solicitudes de Clínicas (Track A)
// ─────────────────────────────────────────────────────────
function ClinicRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, name, action }
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'clinic_verifications'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDecision = async (reason) => {
    if (!confirm) return;
    setProcessing(true);
    const { id, action } = confirm;
    try {
      const isApprove = action === 'approve';
      const now = new Date().toISOString();

      // 1. Actualizar clinic_verifications
      await updateDoc(doc(db, 'clinic_verifications', id), {
        status: isApprove ? 'approved' : 'rejected',
        reviewedAt: now,
        reviewedBy: 'covacentral@gmail.com',
        ...(reason ? { rejectionReason: reason } : {}),
      });

      // 2. Actualizar /clinics/{id}
      await updateDoc(doc(db, 'clinics', id), {
        status: isApprove ? 'verified' : 'rejected',
        ...(isApprove ? { verifiedAt: now } : { rejectionReason: reason }),
        updatedAt: now,
      });

      // 3. Actualizar /users/{id}
      await updateDoc(doc(db, 'users', id), {
        updatedAt: now,
      });

      setConfirm(null);
    } catch (err) {
      console.error('Error al procesar solicitud de clínica:', err);
      alert('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className={styles.loading}>Cargando solicitudes...</p>;
  if (requests.length === 0) return (
    <div className={styles.emptyState}>
      <CheckCircle2 size={40} className={styles.emptyIcon} />
      <p>No hay solicitudes de clínicas pendientes.</p>
    </div>
  );

  return (
    <div className={styles.requestList}>
      {requests.map(req => (
        <div key={req.id} className={styles.requestCard}>
          <div className={styles.requestHeader} onClick={() => setExpanded(expanded === req.id ? null : req.id)}>
            <div className={styles.requestInfo}>
              <Building2 size={20} className={styles.requestIcon} />
              <div>
                <h4>{req.clinicName || req.clinicId}</h4>
                <span className={styles.requestMeta}>{req.email} · {req.clinicSubtype === 'ips' ? 'IPS / Clínica' : 'Consultorio Independiente'}</span>
              </div>
            </div>
            <div className={styles.requestActions}>
              <StatusBadge status={req.status} />
              <span className={styles.chevron}>{expanded === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
            </div>
          </div>

          {expanded === req.id && (
            <div className={styles.requestBody}>
              <div className={styles.docGrid}>
                <div className={styles.docField}>
                  <label>NIT</label>
                  <span>{req.documents?.nit || '—'}</span>
                </div>
                <div className={styles.docField}>
                  <label>Director Técnico COMVEZCOL</label>
                  <span>{req.documents?.directorTechName || '—'} · <code>{req.documents?.directorComvezcol || '—'}</code></span>
                </div>
                <div className={styles.docField}>
                  <label>Verificar en RUES</label>
                  <a href="https://www.rues.org.co" target="_blank" rel="noreferrer" className={styles.verifyLink}>
                    <ExternalLink size={14} /> rues.org.co
                  </a>
                </div>
                <div className={styles.docField}>
                  <label>Verificar COMVEZCOL</label>
                  <a href="https://consejoprofesionalmvz.gov.co/" target="_blank" rel="noreferrer" className={styles.verifyLink}>
                    <ExternalLink size={14} /> consejoprofesionalmvz.gov.co
                  </a>
                </div>
              </div>

              {/* Documentos subidos */}
              {req.documents?.chamberOfCommerceUrl && (
                <div className={styles.docFiles}>
                  <a href={req.documents.chamberOfCommerceUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                    <ExternalLink size={14} /> Cámara de Comercio
                  </a>
                  {req.documents.sanitaryPermitUrl && (
                    <a href={req.documents.sanitaryPermitUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                      <ExternalLink size={14} /> Concepto Sanitario
                    </a>
                  )}
                  {req.documents.icaLicenseUrl && (
                    <a href={req.documents.icaLicenseUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                      <ExternalLink size={14} /> Registro ICA
                    </a>
                  )}
                </div>
              )}

              <div className={styles.requestDecisionRow}>
                <span className={styles.submittedAt}>
                  <Clock size={13} /> Enviado: {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('es-CO') : '—'}
                </span>
                <div className={styles.decisionBtns}>
                  <button
                    className={styles.btnRejectSm}
                    onClick={() => setConfirm({ id: req.id, name: req.clinicName, action: 'reject' })}
                    disabled={processing}
                  >
                    <XCircle size={15} /> Rechazar
                  </button>
                  <button
                    className={styles.btnApproveSm}
                    onClick={() => setConfirm({ id: req.id, name: req.clinicName, action: 'approve' })}
                    disabled={processing}
                  >
                    <CheckCircle2 size={15} /> Aprobar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {confirm && (
        <ConfirmModal
          action={confirm.action}
          targetName={confirm.name}
          requireReason={true}
          onConfirm={handleDecision}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Panel: Solicitudes de Veterinarios (Track B)
// ─────────────────────────────────────────────────────────
function VetRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'vet_verifications'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDecision = async (reason) => {
    if (!confirm) return;
    setProcessing(true);
    const { id, action, clinicId } = confirm;
    try {
      const isApprove = action === 'approve';
      const now = new Date().toISOString();

      // 1. Actualizar vet_verifications
      await updateDoc(doc(db, 'vet_verifications', id), {
        status: isApprove ? 'approved' : 'rejected',
        reviewedAt: now,
        reviewedBy: 'covacentral@gmail.com',
        ...(reason ? { rejectionReason: reason } : {}),
      });

      // 2. Si está asociado a una clínica (staff), actualizar el doc de staff
      if (clinicId) {
        await updateDoc(doc(db, 'clinics', clinicId, 'staff', id), {
          status: isApprove ? 'verified' : 'rejected',
          updatedAt: now,
        });
      }

      setConfirm(null);
    } catch (err) {
      console.error('Error al procesar solicitud de vet:', err);
      alert('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className={styles.loading}>Cargando solicitudes...</p>;
  if (requests.length === 0) return (
    <div className={styles.emptyState}>
      <CheckCircle2 size={40} className={styles.emptyIcon} />
      <p>No hay solicitudes de veterinarios pendientes.</p>
    </div>
  );

  return (
    <div className={styles.requestList}>
      {requests.map(req => (
        <div key={req.id} className={styles.requestCard}>
          <div className={styles.requestHeader} onClick={() => setExpanded(expanded === req.id ? null : req.id)}>
            <div className={styles.requestInfo}>
              <Stethoscope size={20} className={styles.requestIcon} />
              <div>
                <h4>{req.name}</h4>
                <span className={styles.requestMeta}>
                  {req.email}
                  {req.clinicName ? ` · ${req.clinicName}` : ' · Independiente'}
                  {' · '}
                  {req.clinicSubtype === 'solo_mobile' ? 'A domicilio' : req.clinicSubtype === 'solo_local' ? 'Consultorio' : 'IPS'}
                </span>
              </div>
            </div>
            <div className={styles.requestActions}>
              <StatusBadge status={req.status} />
              <span className={styles.chevron}>{expanded === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
            </div>
          </div>

          {expanded === req.id && (
            <div className={styles.requestBody}>
              <div className={styles.docGrid}>
                <div className={styles.docField}>
                  <label>Número COMVEZCOL</label>
                  <span><code>{req.documents?.professionalCardNumber || '—'}</code></span>
                </div>
                <div className={styles.docField}>
                  <label>Número ICA</label>
                  <span><code>{req.documents?.icaRegistrationNumber || '—'}</code></span>
                </div>
                <div className={styles.docField}>
                  <label>Verificar en COMVEZCOL</label>
                  <a href="https://consejoprofesionalmvz.gov.co/" target="_blank" rel="noreferrer" className={styles.verifyLink}>
                    <ExternalLink size={14} /> Consultar matrícula
                  </a>
                </div>
              </div>

              {req.documents?.professionalCardPhotoUrl && (
                <div className={styles.docFiles}>
                  <a href={req.documents.professionalCardPhotoUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                    <ExternalLink size={14} /> Ver Tarjeta Profesional
                  </a>
                  {req.documents.idDocumentUrl && (
                    <a href={req.documents.idDocumentUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                      <ExternalLink size={14} /> Ver Cédula
                    </a>
                  )}
                </div>
              )}

              <div className={styles.requestDecisionRow}>
                <span className={styles.submittedAt}>
                  <Clock size={13} /> Enviado: {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('es-CO') : '—'}
                </span>
                <div className={styles.decisionBtns}>
                  <button
                    className={styles.btnRejectSm}
                    onClick={() => setConfirm({ id: req.id, name: req.name, action: 'reject', clinicId: req.clinicId })}
                    disabled={processing}
                  >
                    <XCircle size={15} /> Rechazar
                  </button>
                  <button
                    className={styles.btnApproveSm}
                    onClick={() => setConfirm({ id: req.id, name: req.name, action: 'approve', clinicId: req.clinicId })}
                    disabled={processing}
                  >
                    <CheckCircle2 size={15} /> Aprobar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {confirm && (
        <ConfirmModal
          action={confirm.action}
          targetName={confirm.name}
          requireReason={true}
          onConfirm={handleDecision}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Panel: Directorio de Clínicas Verificadas
// ─────────────────────────────────────────────────────────
function ClinicDirectoryPanel() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'clinics'), where('status', '==', 'verified'));
    const unsub = onSnapshot(q, (snap) => {
      setClinics(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSuspend = async () => {
    if (!confirm) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'clinics', confirm.id), {
        status: 'suspended',
        updatedAt: new Date().toISOString(),
      });
      setConfirm(null);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className={styles.loading}>Cargando directorio...</p>;
  if (clinics.length === 0) return (
    <div className={styles.emptyState}>
      <Building2 size={40} className={styles.emptyIcon} />
      <p>No hay clínicas verificadas todavía.</p>
    </div>
  );

  return (
    <div className={styles.requestList}>
      {clinics.map(clinic => (
        <div key={clinic.id} className={`${styles.requestCard} ${styles.directoryCard}`}>
          <div className={styles.requestInfo}>
            <Building2 size={20} className={styles.requestIcon} />
            <div>
              <h4>{clinic.name}</h4>
              <span className={styles.requestMeta}>
                {clinic.city} · {clinic.clinicSubtype === 'ips' ? 'IPS / Clínica' : clinic.clinicSubtype === 'solo_local' ? 'Consultorio' : 'A domicilio'}
              </span>
            </div>
          </div>
          <div className={styles.requestActions}>
            <StatusBadge status={clinic.status} />
            <button
              className={styles.btnSuspendSm}
              onClick={() => setConfirm({ id: clinic.id, name: clinic.name })}
              title="Suspender clínica"
            >
              <AlertTriangle size={14} /> Suspender
            </button>
          </div>
        </div>
      ))}

      {confirm && (
        <ConfirmModal
          action="reject"
          targetName={confirm.name}
          requireReason={false}
          onConfirm={handleSuspend}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Panel: Generador de URL para Tags NFC
// Solo accesible por covacentral. Busca la mascota por EPID,
// obtiene su token seguro de /nfc_mappings y genera la URL
// lista para grabar en el identificador físico.
// ─────────────────────────────────────────────────────────
function NfcUrlPanel() {
  const [epid, setEpid] = useState('ELP-');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { petName, url }
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInputChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (!val.startsWith('ELP-')) {
      if (['', 'E', 'EL', 'ELP'].includes(val)) { setEpid('ELP-'); return; }
      val = 'ELP-' + val.replace(/[^A-Z0-9]/g, '');
    } else {
      val = 'ELP-' + val.substring(4).replace(/[^A-Z0-9]/g, '');
    }
    if (val.length <= 10) setEpid(val);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (epid === 'ELP-' || epid.length < 5) return;
    setLoading(true);
    setResult(null);
    setError('');
    setCopied(false);

    try {
      // 1. Buscar la mascota por EPID
      const petSnap = await getDocs(
        query(collection(db, 'pets'), where('epid', '==', epid.trim()))
      );
      if (petSnap.empty) {
        setError(`No se encontró ninguna mascota con el EPID "${epid}".`);
        return;
      }
      const petId = petSnap.docs[0].id;
      const petName = petSnap.docs[0].data().name;

      // 2. Buscar el token NFC asociado a esta mascota
      const mappingSnap = await getDocs(
        query(collection(db, 'nfc_mappings'), where('petId', '==', petId))
      );
      if (mappingSnap.empty) {
        setError(`La mascota "${petName}" (${epid}) no tiene un tag NFC asignado todavía. El dueño debe generarlo desde su dashboard.`);
        return;
      }
      const token = mappingSnap.docs[0].data().secureToken || mappingSnap.docs[0].id;
      const nfcUrl = `${window.location.origin}/p/${token}`;

      setResult({ petName, epid, petId, token, url: nfcUrl });
    } catch (err) {
      console.error(err);
      setError('Error al buscar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.url) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={styles.nfcPanel}>
      <div className={styles.nfcHeader}>
        <Nfc size={28} className={styles.nfcIcon} />
        <div>
          <h2>Generador de URL para Tags NFC</h2>
          <p>
            Busca la mascota por su EPID y obtén la URL segura para programar
            en el identificador físico. Solo covacentral puede generar estos links.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className={styles.nfcForm}>
        <input
          type="text"
          value={epid}
          onChange={handleInputChange}
          placeholder="Ej: ELP-ABC123"
          className={styles.nfcInput}
        />
        <button type="submit" disabled={loading} className={styles.nfcSearchBtn}>
          <Search size={17} />
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && (
        <div className={styles.nfcError}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className={styles.nfcResult}>
          <div className={styles.nfcResultHeader}>
            <CheckCircle2 size={20} className={styles.nfcResultIcon} />
            <div>
              <h3>{result.petName}</h3>
              <span>EPID: <strong>{result.epid}</strong></span>
            </div>
          </div>

          <div className={styles.nfcUrlBlock}>
            <label>URL para grabar en el Tag NFC:</label>
            <div className={styles.nfcUrlRow}>
              <code className={styles.nfcUrl}>{result.url}</code>
              <button onClick={handleCopy} className={styles.nfcCopyBtn} title="Copiar URL">
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className={styles.nfcMeta}>
            <span>Token: <code>{result.token}</code></span>
            <span>Pet ID: <code>{result.petId.substring(0, 12)}…</code></span>
          </div>

          <div className={styles.nfcInstructions}>
            <p>📱 <strong>Cómo grabar:</strong> Usa la app <strong>NFC Tools</strong> o <strong>NFC TagWriter</strong> en tu teléfono. Crea un registro de tipo <em>URI/URL</em> y pega la URL de arriba. El tag debe ser <strong>NTAG213 o superior</strong>.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AdminPanel — Shell Principal
// ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('clinic_requests');

  const tabs = [
    { id: 'clinic_requests', label: 'Solicitudes Clínicas',  icon: ClipboardList },
    { id: 'vet_requests',    label: 'Solicitudes Vets',      icon: Stethoscope },
    { id: 'directory',       label: 'Clínicas Verificadas',  icon: BadgeCheck },
    { id: 'nfc',             label: 'Generador NFC',         icon: Nfc },
  ];

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <ShieldCheck size={24} className={styles.brandIcon} />
          <span className={styles.brandName}>covacentral <span className={styles.brandBadge}>admin</span></span>
        </div>
        <button onClick={logout} className={styles.logoutBtn} title="Cerrar sesión">
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className={styles.tabNav}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className={styles.content}>
        {activeTab === 'clinic_requests' && <ClinicRequestsPanel />}
        {activeTab === 'vet_requests'    && <VetRequestsPanel />}
        {activeTab === 'directory'       && <ClinicDirectoryPanel />}
        {activeTab === 'nfc'             && <NfcUrlPanel />}
      </main>
    </div>
  );
}
