import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, doc, updateDoc
} from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import {
  Calendar, Clock, User, Phone,
  Check, X, RefreshCw, AlertCircle, Filter
} from 'lucide-react';
import styles from './ClinicAppointmentsPanel.module.css';

// ── Helpers ──
function todayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function StatusBadge({ status }) {
  const map = {
    requested:          { label: 'Solicitada',          cls: 'requested' },
    confirmed:          { label: 'Confirmada',           cls: 'confirmed' },
    rejected:           { label: 'Rechazada',            cls: 'rejected' },
    rescheduled_by_vet: { label: 'Reasignada',           cls: 'rescheduled' },
    pending_payment:    { label: 'Pago Pendiente',       cls: 'pending' },
    completed:          { label: 'Completada',           cls: 'completed' },
  };
  const s = map[status] || { label: status, cls: 'requested' };
  return <span className={`${styles.statusBadge} ${styles[s.cls]}`}>{s.label}</span>;
}

/**
 * ClinicAppointmentsPanel
 * Props:
 *   user      — firebase auth user
 *   clinicId  — ID de la clínica (puede ser distinto a user.uid para staff)
 *   vetId     — (opcional) filtra solo citas del vet específico
 */
export default function ClinicAppointmentsPanel({ user, clinicId, vetId = null }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today'); // 'today' | 'all' | 'pending'
  const [reschedulingId, setReschedulingId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');

  // ── Listener en tiempo real (sin filtro de fecha en Firestore para evitar índices complejos) ──
  useEffect(() => {
    if (!clinicId) return;
    const appRef = collection(db, 'clinics', clinicId, 'appointments');
    const q = query(appRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error al escuchar citas:', err);
      setLoading(false);
    });

    return unsub;
  }, [clinicId]);

  // ── Filtrado en el cliente (más flexible, sin índices extra) ──
  const filtered = useMemo(() => {
    let list = appointments;

    // Filtrar por vetId si aplica
    if (vetId) {
      list = list.filter(a => a.vetId === vetId || !a.vetId);
    }

    const today = todayStr();
    if (filter === 'today') {
      list = list.filter(a => a.date === today);
    } else if (filter === 'pending') {
      list = list.filter(a => a.status === 'requested' || a.status === 'pending_payment');
    }

    return list;
  }, [appointments, filter, vetId]);

  const counts = useMemo(() => ({
    today:   appointments.filter(a => a.date === todayStr()).length,
    pending: appointments.filter(a => a.status === 'requested' || a.status === 'pending_payment').length,
    all:     appointments.length,
  }), [appointments]);

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await updateDoc(doc(db, 'clinics', clinicId, 'appointments', appId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      alert('Error al actualizar la cita.');
    }
  };

  const handleRescheduleSubmit = async (e, appId) => {
    e.preventDefault();
    if (!newDate || !newTimeSlot) return;
    try {
      await updateDoc(doc(db, 'clinics', clinicId, 'appointments', appId), {
        status: 'rescheduled_by_vet',
        date: newDate,
        timeSlot: newTimeSlot,
        updatedAt: new Date().toISOString(),
      });
      setReschedulingId(null);
      setNewDate('');
      setNewTimeSlot('');
    } catch (err) {
      console.error(err);
      alert('Error al reasignar cita.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Gestión de Citas</h2>
        <p>Monitorea y confirma las solicitudes de citas en tiempo real.</p>
      </div>

      {/* Filtros con contadores */}
      <div className={styles.filterRow}>
        {[
          { key: 'today',   label: 'Hoy',         count: counts.today },
          { key: 'pending', label: 'Por confirmar', count: counts.pending },
          { key: 'all',     label: 'Todas',         count: counts.all },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
          >
            {f.label}
            <span className={styles.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loader}>Cargando citas...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={36} className={styles.emptyIcon} />
          <p>
            {filter === 'today'
              ? 'No hay citas programadas para hoy.'
              : filter === 'pending'
              ? 'No hay citas pendientes de confirmación.'
              : 'No hay citas registradas.'}
          </p>
        </div>
      ) : (
        <div className={styles.appointmentsGrid}>
          {filtered.map(app => (
            <div key={app.id} className={styles.appCard}>
              <div className={styles.appCardHeader}>
                <div className={styles.petBadgeBlock}>
                  {app.petNames?.map((name, idx) => (
                    <span key={idx} className={styles.petNameTag}>{name}</span>
                  ))}
                  {!app.petNames && app.petName && (
                    <span className={styles.petNameTag}>{app.petName}</span>
                  )}
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className={styles.appDetails}>
                <div className={styles.detailItem}>
                  <Calendar size={15} />
                  <span>{app.date || '—'}</span>
                </div>
                <div className={styles.detailItem}>
                  <Clock size={15} />
                  <span>{app.timeSlot || '—'}</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.responsibleBlock}>
                  <p className={styles.blockTitle}>Responsable de la cita:</p>
                  <div className={styles.detailItem}>
                    <User size={14} />
                    <span>{app.responsible?.name || app.ownerName || '—'} {app.responsible?.docId ? `(C.C. ${app.responsible.docId})` : ''}</span>
                  </div>
                  {(app.responsible?.phone || app.ownerPhone) && (
                    <div className={styles.detailItem}>
                      <Phone size={14} />
                      <a href={`tel:${app.responsible?.phone || app.ownerPhone}`} className={styles.phoneLink}>
                        {app.responsible?.phone || app.ownerPhone}
                      </a>
                    </div>
                  )}
                </div>
                {app.notes && (
                  <div className={styles.notesBlock}>
                    <p className={styles.notesText}>📝 {app.notes}</p>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className={styles.appActions}>
                {(app.status === 'requested' || app.status === 'pending_payment') ? (
                  <>
                    <button onClick={() => handleUpdateStatus(app.id, 'confirmed')} className={styles.approveBtn}>
                      <Check size={15} /> Confirmar
                    </button>
                    <button onClick={() => setReschedulingId(app.id)} className={styles.rescheduleBtn}>
                      <RefreshCw size={15} /> Reasignar
                    </button>
                    <button onClick={() => handleUpdateStatus(app.id, 'rejected')} className={styles.rejectBtn}>
                      <X size={15} /> Rechazar
                    </button>
                  </>
                ) : app.status === 'rescheduled_by_vet' ? (
                  <div className={styles.waitingNotice}>
                    <AlertCircle size={15} />
                    <span>Esperando confirmación del dueño.</span>
                  </div>
                ) : (
                  <div className={styles.completedNotice}>
                    <span>Cita {app.status}.</span>
                  </div>
                )}
              </div>

              {/* Formulario reasignar */}
              {reschedulingId === app.id && (
                <form onSubmit={e => handleRescheduleSubmit(e, app.id)} className={styles.rescheduleForm}>
                  <label>Nueva fecha:</label>
                  <input
                    type="date"
                    value={newDate}
                    min={todayStr()}
                    onChange={e => setNewDate(e.target.value)}
                    className={styles.dateInput}
                    required
                  />
                  <label>Nuevo horario:</label>
                  <input
                    type="time"
                    value={newTimeSlot}
                    onChange={e => setNewTimeSlot(e.target.value)}
                    className={styles.dateInput}
                    required
                  />
                  <div className={styles.formBtnGroup}>
                    <button type="submit" className={styles.formConfirmBtn}>Proponer</button>
                    <button type="button" onClick={() => setReschedulingId(null)} className={styles.formCancelBtn}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
