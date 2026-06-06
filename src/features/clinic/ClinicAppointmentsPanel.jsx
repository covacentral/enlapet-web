import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { Calendar, Clock, User, Phone, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import styles from './ClinicAppointmentsPanel.module.css';

export default function ClinicAppointmentsPanel({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reasignación
  const [reschedulingId, setReschedulingId] = useState(null);
  const [newTimeSlot, setNewTimeSlot] = useState('');

  useEffect(() => {
    if (!user) return;
    const appRef = collection(db, 'clinics', user.uid, 'appointments');
    const q = query(appRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAppointments(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      const docRef = doc(db, 'clinics', user.uid, 'appointments', appId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la cita.");
    }
  };

  const handleRescheduleSubmit = async (e, appId) => {
    e.preventDefault();
    if (!newTimeSlot) return;

    try {
      const docRef = doc(db, 'clinics', user.uid, 'appointments', appId);
      await updateDoc(docRef, {
        status: 'rescheduled_by_vet',
        timeSlot: newTimeSlot,
        updatedAt: new Date().toISOString()
      });
      setReschedulingId(null);
      setNewTimeSlot('');
    } catch (err) {
      console.error(err);
      alert("Error al reasignar cita.");
    }
  };

  const timeSlots = [
    "Mañana (08:00 AM - 10:00 AM)",
    "Mañana (10:00 AM - 12:00 PM)",
    "Tarde (12:00 PM - 02:00 PM)",
    "Tarde (02:00 PM - 04:00 PM)",
    "Tarde (04:00 PM - 06:00 PM)",
    "Noche / Urgencia (06:00 PM - 08:00 PM)"
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Gestión de Citas y Agendamiento</h2>
        <p>Monitorea y confirma las solicitudes de citas de tus pacientes en tiempo real.</p>
      </div>

      {loading ? (
        <div className={styles.loader}>Cargando solicitudes...</div>
      ) : appointments.length === 0 ? (
        <div className={styles.emptyState}>No tienes solicitudes de citas registradas aún.</div>
      ) : (
        <div className={styles.appointmentsGrid}>
          {appointments.map((app) => (
            <div key={app.id} className={styles.appCard}>
              <div className={styles.appCardHeader}>
                <div className={styles.petBadgeBlock}>
                  {app.petNames?.map((name, idx) => (
                    <span key={idx} className={styles.petNameTag}>{name}</span>
                  ))}
                </div>
                <span className={`${styles.statusBadge} ${styles[app.status]}`}>
                  {app.status === 'requested' && 'Solicitada'}
                  {app.status === 'confirmed' && 'Confirmada'}
                  {app.status === 'rejected' && 'Rechazada'}
                  {app.status === 'rescheduled_by_vet' && 'Reasignada (A espera)'}
                  {app.status === 'pending_payment' && 'Pago Pendiente'}
                </span>
              </div>

              <div className={styles.appDetails}>
                <div className={styles.detailItem}>
                  <Calendar size={16} />
                  <span>{app.date}</span>
                </div>
                <div className={styles.detailItem}>
                  <Clock size={16} />
                  <span>{app.timeSlot}</span>
                </div>
                
                <div className={styles.divider} />
                
                <div className={styles.responsibleBlock}>
                  <p className={styles.blockTitle}>Responsable de la cita:</p>
                  <div className={styles.detailItem}>
                    <User size={14} />
                    <span>{app.responsible?.name} (C.C. {app.responsible?.docId})</span>
                  </div>
                  <div className={styles.detailItem}>
                    <Phone size={14} />
                    <a href={`tel:${app.responsible?.phone}`} className={styles.phoneLink}>
                      {app.responsible?.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Controles de Citas */}
              <div className={styles.appActions}>
                {app.status === 'requested' || app.status === 'pending_payment' ? (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(app.id, 'confirmed')} 
                      className={styles.approveBtn}
                      title="Aprobar Cita"
                    >
                      <Check size={16} />
                      <span>Confirmar</span>
                    </button>
                    <button 
                      onClick={() => setReschedulingId(app.id)} 
                      className={styles.rescheduleBtn}
                      title="Reasignar Horario"
                    >
                      <RefreshCw size={16} />
                      <span>Reasignar</span>
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(app.id, 'rejected')} 
                      className={styles.rejectBtn}
                      title="Rechazar Cita"
                    >
                      <X size={16} />
                      <span>Rechazar</span>
                    </button>
                  </>
                ) : app.status === 'rescheduled_by_vet' ? (
                  <div className={styles.waitingNotice}>
                    <AlertCircle size={16} />
                    <span>Esperando confirmación del nuevo horario por el dueño.</span>
                  </div>
                ) : (
                  <div className={styles.completedNotice}>
                    <span>Cita finalizada / confirmada.</span>
                  </div>
                )}
              </div>

              {/* Formulario de Reasignación */}
              {reschedulingId === app.id && (
                <form 
                  onSubmit={(e) => handleRescheduleSubmit(e, app.id)} 
                  className={styles.rescheduleForm}
                >
                  <label htmlFor={`slotSelect-${app.id}`}>Propón un nuevo bloque horario:</label>
                  <div className={styles.rescheduleInputGroup}>
                    <select
                      id={`slotSelect-${app.id}`}
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar horario...</option>
                      {timeSlots.map((slot, idx) => (
                        <option key={idx} value={slot}>{slot}</option>
                      ))}
                    </select>
                    <div className={styles.formBtnGroup}>
                      <button type="submit" className={styles.formConfirmBtn}>Proponer</button>
                      <button 
                        type="button" 
                        onClick={() => setReschedulingId(null)} 
                        className={styles.formCancelBtn}
                      >
                        X
                      </button>
                    </div>
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
