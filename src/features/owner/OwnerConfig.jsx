import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { ChevronLeft, Info } from 'lucide-react';
import styles from './OwnerConfig.module.css';

export default function OwnerConfig({ onSaveComplete, onBack }) {
  const { user, ownerData, refreshOwnerData, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    country: '',
    city: '',
    neighborhood: '',
    phone: ''
  });

  // Rellenar formulario con datos existentes
  useEffect(() => {
    if (ownerData?.contact) {
      setFormData({
        country: ownerData.contact.country || 'Colombia',
        city: ownerData.contact.city || '',
        neighborhood: ownerData.contact.neighborhood || '',
        phone: ownerData.contact.phone || ''
      });
    }
  }, [ownerData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.city.trim() || !formData.phone.trim()) {
      alert("Por favor completa al menos la Ciudad y el Teléfono de contacto.");
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        contact: {
          country: formData.country,
          city: formData.city,
          neighborhood: formData.neighborhood,
          phone: formData.phone
        },
        updatedAt: new Date().toISOString()
      });
      await refreshOwnerData();
      if (onSaveComplete) onSaveComplete();
    } catch (error) {
      console.error("Error al guardar la configuración del dueño:", error);
      alert("Ocurrió un error al guardar la información. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {onBack && (
          <button onClick={onBack} className={styles.backBtn} aria-label="Volver">
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className={styles.title}>Ficha del Dueño</h1>
      </div>

      <form onSubmit={handleSave} className={styles.card}>
        <div className={styles.infoAlert}>
          <Info className={styles.infoIcon} size={20} />
          <p>
            Esta información se utilizará para que te contacten en caso de que tu mascota se pierda. Solo se pedirá tu ubicación general (País, Ciudad, Barrio) y tu WhatsApp. <strong>No guardamos dirección exacta por privacidad.</strong>
          </p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>Número de Celular (con WhatsApp)</label>
          <input 
            type="tel" 
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Ej: +573001234567" 
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="country" className={styles.label}>País</label>
          <input 
            type="text" 
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Ej: Colombia" 
            required
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label htmlFor="city" className={styles.label}>Ciudad</label>
            <input 
              type="text" 
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Ej: Medellín" 
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="neighborhood" className={styles.label}>Barrio (Opcional)</label>
            <input 
              type="text" 
              id="neighborhood"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="Ej: El Poblado" 
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={styles.btnSave}>
          {loading ? 'Guardando...' : 'Guardar Información'}
        </button>
      </form>

      <button 
        type="button" 
        onClick={() => {
          logout();
          if (onSaveComplete) onSaveComplete();
        }} 
        className={styles.btnLogout}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
