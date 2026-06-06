import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { X, Calendar, Clock, User, FileText, CheckSquare, Square, Shield, Info } from 'lucide-react';
import styles from './AppointmentModal.module.css';

export default function AppointmentModal({ user, ownerData, clinic, pets, onClose }) {
  const [selectedPets, setSelectedPets] = useState({});
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  
  // Datos del responsable legal de la cita (Habeas Data)
  const [responsibleName, setResponsibleName] = useState(ownerData?.name || '');
  const [responsibleDoc, setResponsibleDoc] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState(ownerData?.contact?.phone || '');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePetToggle = (petId) => {
    setSelectedPets(prev => ({
      ...prev,
      [petId]: !prev[petId]
    }));
  };

  const selectedPetsArray = Object.keys(selectedPets).filter(id => selectedPets[id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPetsArray.length === 0) {
      alert("Por favor selecciona al menos una mascota.");
      return;
    }
    if (!habeasDataAccepted) {
      alert("Debes aceptar el tratamiento de datos personales (Habeas Data).");
      return;
    }

    setSubmitting(true);
    try {
      const selectedPetNames = selectedPetsArray.map(id => {
        const pet = pets.find(p => p.id === id);
        return pet ? pet.name : '';
      });

      const appointmentData = {
        petIds: selectedPetsArray,
        petNames: selectedPetNames,
        date,
        timeSlot,
        responsible: {
          name: responsibleName,
          docId: responsibleDoc,
          phone: responsiblePhone
        },
        status: clinic.pricing?.type === 'pre_pay' ? 'pending_payment' : 'requested',
        paymentType: clinic.pricing?.type || 'free',
        ownerId: user.uid,
        ownerName: ownerData?.name || 'Dueño',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Guardar en la subcolección de citas de la clínica
      const appointmentsRef = collection(db, 'clinics', clinic.id, 'appointments');
      await addDoc(appointmentsRef, appointmentData);

      setSuccess(true);

      // Si requiere pago previo, abrir WhatsApp de inmediato con plantilla
      if (clinic.pricing?.type === 'pre_pay') {
        const text = `Hola, solicité una cita médica en enlapet para mi(s) mascota(s) (${selectedPetNames.join(', ')}) el día ${date} en el bloque ${timeSlot}. Escribo para completar el pago previo de la consulta ($${clinic.pricing.price.toLocaleString('es-CO')} COP) y confirmar la cita.`;
        const waUrl = `https://wa.me/${clinic.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
        setTimeout(() => {
          window.open(waUrl, '_blank');
          onClose();
        }, 2500);
      } else {
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error("Error al agendar la cita:", err);
      alert("Hubo un error al registrar tu cita. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Solicitud de Cita Médica</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className={styles.successScreen}>
            <div className={styles.successIconBg}>✓</div>
            <h3>¡Solicitud de Cita Registrada!</h3>
            {clinic.pricing?.type === 'pre_pay' ? (
              <p>Redirigiéndote a WhatsApp para realizar el abono previo y confirmar el agendamiento...</p>
            ) : (
              <p>Tu cita se encuentra en estado solicitado. La veterinaria se comunicará contigo o podrás ver el estado en tu panel.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalBody}>
            {/* Disclaimer Informativo */}
            <div className={styles.disclaimerBox}>
              <Info size={16} className={styles.disclaimerIcon} />
              <p>
                <strong>Nota Importante:</strong> El bloque seleccionado representa una <strong>hora recomendada/sugerida</strong>. La hora exacta de atención final dependerá de emergencias prioritarias y de la disponibilidad al momento de tu llegada.
              </p>
            </div>

            {/* Selección de Mascota */}
            <div className={styles.formSection}>
              <label className={styles.sectionLabel}>1. Selecciona la o las Mascotas</label>
              {pets.length === 0 ? (
                <p className={styles.noPetsText}>No tienes mascotas registradas. Agrega una mascota primero en tu panel principal.</p>
              ) : (
                <div className={styles.petsList}>
                  {pets.map(pet => (
                    <div 
                      key={pet.id} 
                      onClick={() => handlePetToggle(pet.id)}
                      className={`${styles.petCheckboxItem} ${selectedPets[pet.id] ? styles.petChecked : ''}`}
                    >
                      {selectedPets[pet.id] ? <CheckSquare size={18} className={styles.checkIcon} /> : <Square size={18} />}
                      <span>{pet.name} ({pet.species})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fecha y Bloques */}
            <div className={styles.formSectionRow}>
              <div className={styles.formGroup}>
                <label htmlFor="appointmentDate">Fecha deseada</label>
                <div className={styles.inputIconWrapper}>
                  <Calendar className={styles.inputIcon} size={16} />
                  <input
                    id="appointmentDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="appointmentSlot">Bloque de Horario</label>
                <div className={styles.inputIconWrapper}>
                  <Clock className={styles.inputIcon} size={16} />
                  <select
                    id="appointmentSlot"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar bloque...</option>
                    {timeSlots.map((slot, idx) => (
                      <option key={idx} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Datos del Responsable (Habeas Data) */}
            <div className={styles.formSection}>
              <label className={styles.sectionLabel}>2. Datos del Responsable Legal</label>
              
              <div className={styles.formGroup}>
                <label htmlFor="respName">Nombre Completo</label>
                <div className={styles.inputIconWrapper}>
                  <User className={styles.inputIcon} size={16} />
                  <input
                    id="respName"
                    type="text"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    required
                    placeholder="Nombre del responsable de llevar la mascota"
                  />
                </div>
              </div>

              <div className={styles.formSectionRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="respDoc">Documento de Identidad (Cédula / NIT)</label>
                  <div className={styles.inputIconWrapper}>
                    <FileText className={styles.inputIcon} size={16} />
                    <input
                      id="respDoc"
                      type="text"
                      value={responsibleDoc}
                      onChange={(e) => setResponsibleDoc(e.target.value)}
                      required
                      placeholder="C.C. o pasaporte"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="respPhone">Teléfono Móvil de Contacto</label>
                  <div className={styles.inputIconWrapper}>
                    <User className={styles.inputIcon} size={16} />
                    <input
                      id="respPhone"
                      type="tel"
                      value={responsiblePhone}
                      onChange={(e) => setResponsiblePhone(e.target.value)}
                      required
                      placeholder="Ej. 3001234567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Consentimiento Habeas Data */}
            <div className={styles.habeasDataSection}>
              <div 
                className={styles.habeasCheckbox} 
                onClick={() => setHabeasDataAccepted(!habeasDataAccepted)}
              >
                {habeasDataAccepted ? <CheckSquare size={20} className={styles.checkIcon} /> : <Square size={20} />}
                <p>
                  Acepto el tratamiento de mis datos personales de acuerdo con la <strong>Ley 1581 de 2012 (Habeas Data)</strong> para fines de agendamiento e historial médico.
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={submitting || selectedPetsArray.length === 0 || !habeasDataAccepted} 
                className={styles.submitButton}
              >
                {clinic.pricing?.type === 'pre_pay' ? 'Proceder al Pago en WhatsApp' : 'Solicitar Agendamiento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
