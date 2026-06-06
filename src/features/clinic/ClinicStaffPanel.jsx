import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { Users, Plus, Trash2, ShieldAlert, CheckCircle, Mail, User } from 'lucide-react';
import styles from './ClinicStaffPanel.module.css';

export default function ClinicStaffPanel({ user, clinicData }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Formulario para agregar staff
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    if (!user.uid) return;
    const staffRef = collection(db, 'clinics', user.uid, 'staff');
    const unsubscribe = onSnapshot(staffRef, (snap) => {
      const list = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setStaffList(list);
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar personal médico:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.email.trim()) {
      alert("Por favor completa el nombre y el correo.");
      return;
    }

    setAdding(true);
    try {
      // 1. Buscar si el usuario existe en 'users' por su correo
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newStaff.email.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("El veterinario no se ha registrado aún en enlapet. Por favor, pídele que cree una cuenta en la aplicación primero con este correo.");
        setAdding(false);
        return;
      }

      const vetUserDoc = snap.docs[0];
      const vetUid = vetUserDoc.id;

      // 2. Crear documento de staff en la clínica
      const staffDocRef = doc(db, 'clinics', user.uid, 'staff', vetUid);
      await setDoc(staffDocRef, {
        name: newStaff.name.trim(),
        email: newStaff.email.trim().toLowerCase(),
        clinicId: user.uid,
        clinicName: clinicData?.name || 'Clínica',
        status: 'pending_verification', // pending_verification -> pending -> verified
        createdAt: new Date().toISOString()
      });

      // 3. Vincular la clínica en el perfil del usuario (role 'staff' y clinicId)
      const userRef = doc(db, 'users', vetUid);
      await updateDoc(userRef, {
        clinicId: user.uid,
        role: 'staff',
        updatedAt: new Date().toISOString()
      });

      setNewStaff({ name: '', email: '' });
      alert("¡Veterinario agregado! Ahora el veterinario debe iniciar sesión en su cuenta y subir su Tarjeta Profesional para ser verificado.");
    } catch (err) {
      console.error("Error al agregar veterinario:", err);
      alert("Error al agregar veterinario: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStaff = async (vetId, vetName) => {
    if (!window.confirm(`¿Estás seguro de que deseas retirar a ${vetName} del equipo médico? Perderá acceso a las historias clínicas.`)) {
      return;
    }

    try {
      // 1. Eliminar de la subcolección de staff
      const staffDocRef = doc(db, 'clinics', user.uid, 'staff', vetId);
      await deleteDoc(staffDocRef);

      // 2. Desvincular en el documento de usuarios (revertir rol a owner)
      const userRef = doc(db, 'users', vetId);
      await updateDoc(userRef, {
        clinicId: null,
        role: 'owner',
        updatedAt: new Date().toISOString()
      });

      // 3. Eliminar de vet_verifications si existe
      try {
        const vetVerifyRef = doc(db, 'vet_verifications', vetId);
        await deleteDoc(vetVerifyRef);
      } catch (e) {}

      alert(`${vetName} ha sido retirado con éxito.`);
    } catch (err) {
      console.error("Error al retirar staff:", err);
      alert("Error al retirar.");
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2>Mi Equipo de Veterinarios</h2>
          <p>Gestiona los médicos veterinarios autorizados para firmar historias clínicas en tu consultorio.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Formulario de Registro */}
        <div className={styles.card}>
          <h3>Vincular Nuevo Veterinario</h3>
          <form onSubmit={handleAddStaff} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="vetName">Nombre Completo</label>
              <input 
                id="vetName"
                type="text"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="Nombre del médico"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="vetEmail">Correo Electrónico (Registrado en enlapet)</label>
              <input 
                id="vetEmail"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <button type="submit" disabled={adding} className={styles.btnAdd}>
              <Plus size={16} />
              <span>{adding ? 'Vinculando...' : 'Vincular Veterinario'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Staff */}
        <div className={styles.card}>
          <h3>Médicos Vinculados</h3>
          {loading ? (
            <p>Cargando personal...</p>
          ) : staffList.length === 0 ? (
            <p className={styles.empty}>No hay veterinarios vinculados todavía.</p>
          ) : (
            <div className={styles.list}>
              {staffList.map((vet) => {
                const status = vet.status || 'pending_verification';
                return (
                  <div key={vet.id} className={styles.listItem}>
                    <div className={styles.vetInfo}>
                      <div className={styles.avatar}>
                        <User size={20} />
                      </div>
                      <div className={styles.text}>
                        <h4>{vet.name}</h4>
                        <p className={styles.email}><Mail size={12} style={{ marginRight: '4px' }} />{vet.email}</p>
                        <span className={`${styles.badge} ${styles[status]}`}>
                          {status === 'verified' 
                            ? '✓ Verificado' 
                            : status === 'pending'
                            ? '⚡ Pendiente Aprobación'
                            : '⚠ Esperando Documentación'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveStaff(vet.id, vet.name)}
                      className={styles.btnRemove}
                      title="Retirar de la clínica"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
