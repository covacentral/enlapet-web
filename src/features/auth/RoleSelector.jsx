import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { PawPrint, Stethoscope, ArrowRight } from 'lucide-react';
import styles from './RoleSelector.module.css';

export default function RoleSelector() {
  const { selectRole } = useAuth();
  const [selected, setSelected] = useState(null); // 'owner' | 'clinic'
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await selectRole(selected);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.circle1}></div>
      <div className={styles.circle2}></div>
      
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoBg}>
            <PawPrint className={styles.logoIcon} size={30} />
          </div>
          <h2 className={styles.title}>¿Cómo usarás enlapet?</h2>
          <p className={styles.subtitle}>Selecciona tu perfil de usuario. Esta configuración definirá tu panel de control.</p>
        </div>

        <div className={styles.options}>
          {/* Card Dueño */}
          <div 
            className={`${styles.optionCard} ${selected === 'owner' ? styles.selectedCard : ''}`}
            onClick={() => setSelected('owner')}
            role="button"
            tabIndex={0}
            aria-pressed={selected === 'owner'}
          >
            <div className={styles.iconBgOwner}>
              <PawPrint size={28} className={styles.cardIcon} />
            </div>
            <div className={styles.optionContent}>
              <h3>Dueño de Mascotas</h3>
              <p>Protege a tus mascotas con medallas NFC, administra su perfil de salud y agenda citas con veterinarias cercanas.</p>
            </div>
          </div>

          {/* Card Clínica */}
          <div 
            className={`${styles.optionCard} ${selected === 'clinic' ? styles.selectedCard : ''}`}
            onClick={() => setSelected('clinic')}
            role="button"
            tabIndex={0}
            aria-pressed={selected === 'clinic'}
          >
            <div className={styles.iconBgClinic}>
              <Stethoscope size={28} className={styles.cardIcon} />
            </div>
            <div className={styles.optionContent}>
              <h3>Clínica o Veterinario</h3>
              <p>Gestiona historias clínicas inmutables, controla tu inventario, maneja la facturación y agenda citas en tiempo real.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleConfirm} 
          disabled={!selected || submitting} 
          className={styles.confirmButton}
          aria-label="Confirmar rol seleccionado"
        >
          <span>{submitting ? 'Guardando...' : 'Comenzar ahora'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
