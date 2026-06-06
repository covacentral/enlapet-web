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
    email: '',
    subRole: 'veterinario'
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
    const emailClean = newStaff.email.trim().toLowerCase();
    const nameClean = newStaff.name.trim();
    if (!nameClean || !emailClean) {
      alert("Por favor completa el nombre y el correo.");
      return;
    }

    setAdding(true);
    try {
      // 1. Buscar si el usuario existe en 'users' por su correo
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', emailClean));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Fallback: Crear invitación en la colección '/invitations/{email}'
        const inviteRef = doc(db, 'invitations', emailClean);
        await setDoc(inviteRef, {
          email: emailClean,
          name: nameClean,
          clinicId: user.uid,
          clinicName: clinicData?.name || 'Clínica',
          subRole: newStaff.subRole,
          createdAt: new Date().toISOString()
        });

        setNewStaff({ name: '', email: '', subRole: 'veterinario' });
        alert(`¡Asociado invitado! Como el usuario con correo ${emailClean} aún no se ha registrado, hemos guardado una invitación segura. Cuando esta persona inicie sesión con Google desde el Portal de Asociados usando este correo, su cuenta se configurará automáticamente.`);
        setAdding(false);
        return;
      }

      const vetUserDoc = snap.docs[0];
      const vetUid = vetUserDoc.id;

      // 2. Crear documento de staff en la clínica
      // Vets inician como 'pending_verification'. Recepción y contabilidad inician como 'verified'.
      const initialStatus = newStaff.subRole === 'veterinario' ? 'pending_verification' : 'verified';

      const staffDocRef = doc(db, 'clinics', user.uid, 'staff', vetUid);
      await setDoc(staffDocRef, {
        name: nameClean,
        email: emailClean,
        clinicId: user.uid,
        clinicName: clinicData?.name || 'Clínica',
        role: 'staff',
        subRole: newStaff.subRole,
        status: initialStatus,
        createdAt: new Date().toISOString()
      });

      // 3. Vincular la clínica en el perfil del usuario (role 'staff', subRole, y clinicId)
      const userRef = doc(db, 'users', vetUid);
      await updateDoc(userRef, {
        clinicId: user.uid,
        role: 'staff',
        subRole: newStaff.subRole,
        updatedAt: new Date().toISOString()
      });

      setNewStaff({ name: '', email: '', subRole: 'veterinario' });
      if (newStaff.subRole === 'veterinario') {
        alert("¡Veterinario vinculado! Ahora el médico debe iniciar sesión y cargar su Tarjeta Profesional para ser verificado.");
      } else {
        alert("¡Asociado vinculado exitosamente! Ya puede ingresar a su panel asignado.");
      }
    } catch (err) {
      console.error("Error al agregar personal:", err);
      alert("Error al agregar: " + err.message);
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
          <h2>Mi Equipo y Asociados</h2>
          <p>Gestiona el personal médico, administrativo y contable autorizado para acceder a tu firma clínica.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Formulario de Registro */}
        <div className={styles.card}>
          <h3>Vincular Nuevo Colaborador</h3>
          <form onSubmit={handleAddStaff} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="vetName">Nombre Completo</label>
              <input 
                id="vetName"
                type="text"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="Nombre del colaborador"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="vetEmail">Correo Electrónico (Google Mail)</label>
              <input 
                id="vetEmail"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="vetRole">Área / Rol Designado</label>
              <select
                id="vetRole"
                value={newStaff.subRole}
                onChange={(e) => setNewStaff({ ...newStaff, subRole: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10.5px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  fontSize: '0.92rem',
                  color: '#333'
                }}
              >
                <option value="veterinario">Médico Veterinario (Requiere Tarjeta Prof.)</option>
                <option value="recepcion">Recepción (Acceso a Citas únicamente)</option>
                <option value="contabilidad">Contabilidad (Acceso a Caja e Inventario únicamente)</option>
              </select>
            </div>
            <button type="submit" disabled={adding} className={styles.btnAdd} style={{ marginTop: '8px' }}>
              <Plus size={16} />
              <span>{adding ? 'Vinculando...' : 'Vincular Colaborador'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Staff */}
        <div className={styles.card}>
          <h3>Equipo Vinculado</h3>
          {loading ? (
            <p>Cargando personal...</p>
          ) : staffList.length === 0 ? (
            <p className={styles.empty}>No hay colaboradores vinculados todavía.</p>
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
                        <p style={{ margin: '2px 0', fontSize: '0.82rem', fontWeight: '600', color: 'hsl(142, 60%, 40%)' }}>
                          Rol: {vet.subRole === 'recepcion' ? 'Recepción' : vet.subRole === 'contabilidad' ? 'Contabilidad' : 'Médico Veterinario'}
                        </p>
                        <span className={`${styles.badge} ${styles[status]}`}>
                          {status === 'verified' 
                            ? '✓ Activo' 
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
