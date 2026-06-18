import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import styles from './PetJournal.module.css';

export default function PetJournal({ petId, onBack }) {
  const { user } = useAuth();
  const [pet, setPet] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'vaccine', // vaccine, history
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // 1. Cargar datos básicos de la mascota
  useEffect(() => {
    const fetchPetData = async () => {
      try {
        const petRef = doc(db, 'pets', petId);
        const petSnap = await getDoc(petRef);
        if (petSnap.exists()) {
          setPet(petSnap.data());
        }
      } catch (error) {
        console.error("Error al cargar mascota en diario:", error);
      }
    };
    fetchPetData();
  }, [petId]);

  // 2. Escuchar en tiempo real el historial médico (vacunas y clínica)
  useEffect(() => {
    const recordsRef = collection(db, 'pets', petId, 'medical_records');
    const q = query(recordsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsList = [];
      snapshot.forEach((doc) => {
        recordsList.push({ id: doc.id, ...doc.data() });
      });
      setRecords(recordsList);
      setLoading(false);
    }, (error) => {
      console.error("Error al escuchar historial médico:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [petId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Por favor introduce un título para el registro.");
      return;
    }

    setSaving(true);
    try {
      const recordsRef = collection(db, 'pets', petId, 'medical_records');
      await addDoc(recordsRef, {
        type: formData.type,
        title: formData.title,
        date: formData.date,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        // Campos necesarios para las reglas de Firestore
        ownerId: user.uid,
        source: 'owner',          // 'owner' | 'clinic' — diferencia visual en la timeline
        signed: false,            // registros de dueño no tienen firma digital de vet
      });

      // Limpiar formulario
      setFormData({
        type: 'vaccine',
        title: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error al añadir registro médico:", error);
      alert("No se pudo guardar el registro. Código de error: " + (error?.code || error?.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Cabecera */}
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn} aria-label="Volver">
          ←
        </button>
        <h1 className={styles.title}>Diario Médico</h1>
      </div>

      {/* Info de la Mascota */}
      {pet && (
        <div className={styles.petHeaderCard}>
          <img 
            src={pet.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
            alt={pet.name} 
            className={styles.petThumb}
          />
          <div className={styles.petInfo}>
            <h2>{pet.name}</h2>
            <p>{pet.species === 'Dog' ? 'Perro' : 'Gato'} • {pet.breed || 'Sin Raza'} • EPID: {pet.epid}</p>
          </div>
        </div>
      )}

      {/* Título de Sección y Botón Agregar */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Historial de Registros</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className={styles.btnAddRecord}>
            + Añadir
          </button>
        )}
      </div>

      {/* Formulario de Adición Inline */}
      {showForm && (
        <form onSubmit={handleAddRecord} className={styles.formCard}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tipo de Registro</label>
            <select name="type" value={formData.type} onChange={handleChange} className={styles.select}>
              <option value="vaccine">💉 Vacuna</option>
              <option value="history">📝 Historial Clínico</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Título / Nombre</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Ej: Triple Felina o Limpieza Dental" 
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Fecha</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Notas / Detalles</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              placeholder="Escribe dosis, peso, veterinaria o recomendaciones clínicas..." 
              rows="3"
              className={styles.textarea}
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)} className={styles.btnCancel}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={styles.btnSave}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Listado de Registros */}
      {loading ? (
        <div className={styles.loadingSpinner}>Cargando diario...</div>
      ) : records.length === 0 ? (
        <div className={styles.emptyRecords}>
          <p>Aún no hay vacunas ni notas clínicas registradas para {pet?.name}.</p>
        </div>
      ) : (
        <div className={styles.recordsList}>
          {records.map((record) => (
            <div key={record.id} className={styles.recordCard}>
              <span className={styles.recordIcon}>
                {record.type === 'vaccine' ? '💉' : '📝'}
              </span>
              <div className={styles.recordContent}>
                <div className={styles.recordHeader}>
                  <span className={styles.recordTitle}>{record.title}</span>
                  <span className={styles.recordDate}>{record.date}</span>
                </div>
                <div className={styles.recordBadgeRow}>
                  <span className={`${styles.recordBadge} ${record.type === 'vaccine' ? styles.badgeVaccine : styles.badgeHistory}`}>
                    {record.type === 'vaccine' ? 'Vacuna' : 'Clínico'}
                  </span>
                  {/* Diferenciador visual: registro del dueño vs veterinario */}
                  {record.source === 'owner'
                    ? <span className={styles.badgeOwner}>📋 Registrado por el dueño</span>
                    : record.signed
                      ? <span className={styles.badgeVet}>🏥 Firmado por veterinario</span>
                      : record.clinicName
                        ? <span className={styles.badgeClinic}>🏥 {record.clinicName}</span>
                        : null
                  }
                </div>
                {record.notes && <p className={styles.recordNotes}>{record.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
