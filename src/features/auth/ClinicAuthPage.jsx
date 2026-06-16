import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import {
  PawPrint,
  ShieldAlert,
  ChevronDown,
  Building,
  User,
  ArrowLeft,
} from 'lucide-react';
import styles from './ClinicAuthPage.module.css';

export default function ClinicAuthPage() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Modos del portal clínico
  const [portalMode, setPortalMode] = useState('clinic'); // 'clinic' | 'staff'
  const [showDropdown, setShowDropdown] = useState(false);

  // Tipo de clínica (solo aplica si portalMode === 'clinic')
  const [clinicType, setClinicType] = useState('ips'); // 'ips' | 'solo'

  const handleGoogleLogin = async () => {
    setError('');
    setSigningIn(true);
    try {
      await loginWithGoogle(portalMode, clinicType);
    } catch (err) {
      console.error('Error en login de clínica:', err);
      setError(err.message || 'No se pudo iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      {/* Fondo decorativo */}
      <div className={styles.bg1}></div>
      <div className={styles.bg2}></div>
      <div className={styles.bg3}></div>

      {/* Barra superior: volver al login normal */}
      <div className={styles.topBar}>
        <a href="/" className={styles.backLink} aria-label="Volver al portal de mascotas">
          <ArrowLeft size={16} />
          <span>Portal Mascotas</span>
        </a>

        {/* Selector de rol (dropdown) */}
        <div className={styles.dropdownWrapper}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className={styles.dropdownTrigger}
            aria-expanded={showDropdown}
            aria-label="Cambiar modo de portal clínico"
          >
            <span>
              {portalMode === 'clinic' ? 'Admin / Clínicas' : 'Asociados / Equipo'}
            </span>
            <ChevronDown size={15} className={showDropdown ? styles.chevronOpen : ''} />
          </button>

          {showDropdown && (
            <div className={styles.dropdownMenu} role="menu">
              <button
                role="menuitem"
                className={`${styles.dropdownItem} ${portalMode === 'clinic' ? styles.dropdownItemActive : ''}`}
                onClick={() => { setPortalMode('clinic'); setShowDropdown(false); }}
              >
                <Building size={16} />
                Admin / Clínicas
              </button>
              <button
                role="menuitem"
                className={`${styles.dropdownItem} ${portalMode === 'staff' ? styles.dropdownItemActive : ''}`}
                onClick={() => { setPortalMode('staff'); setShowDropdown(false); }}
              >
                <User size={16} />
                Asociados / Equipo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoBg}>
            <PawPrint size={36} className={styles.logoIcon} />
          </div>
        </div>

        <h1 className={styles.title}>
          enlapet <span className={styles.badge}>clinic</span>
        </h1>

        <p className={styles.subtitle}>
          {portalMode === 'clinic'
            ? 'Panel administrativo para clínicas veterinarias y médicos independientes.'
            : 'Portal exclusivo para médicos asociados, contabilidad y recepción autorizados.'}
        </p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {/* Selector tipo de clínica */}
        {portalMode === 'clinic' && (
          <div className={styles.typePicker}>
            <p className={styles.typeLabel}>Selecciona tu modelo de atención:</p>
            <div className={styles.typeOptions}>
              <label className={`${styles.typeOption} ${clinicType === 'ips' ? styles.typeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="clinicType"
                  value="ips"
                  checked={clinicType === 'ips'}
                  onChange={() => setClinicType('ips')}
                  className={styles.hiddenRadio}
                />
                <Building size={20} className={styles.typeIcon} />
                <div className={styles.typeText}>
                  <h4>Consultorio / IPS</h4>
                  <p>Clínica con múltiples veterinarios, recepción y contabilidad.</p>
                </div>
              </label>

              <label className={`${styles.typeOption} ${clinicType === 'solo' ? styles.typeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="clinicType"
                  value="solo"
                  checked={clinicType === 'solo'}
                  onChange={() => setClinicType('solo')}
                  className={styles.hiddenRadio}
                />
                <User size={20} className={styles.typeIcon} />
                <div className={styles.typeText}>
                  <h4>Veterinario Independiente</h4>
                  <p>Médico autónomo que realiza consultas y gestiona su propia caja.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Aviso para staff */}
        {portalMode === 'staff' && (
          <div className={styles.staffNotice}>
            <ShieldAlert size={18} className={styles.noticeIcon} />
            <p>
              Deberás ingresar con la cuenta de Google cuyo correo haya sido previamente
              vinculado por el administrador de tu clínica en el módulo{' '}
              <strong>"Mi Equipo"</strong>.
            </p>
          </div>
        )}

        {/* Botón Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={signingIn}
          className={styles.googleBtn}
          aria-label="Iniciar sesión con Google"
        >
          {signingIn ? (
            <span>Conectando...</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 2.66-.99 3.56l3.1 2.4c1.8-1.68 2.9-4.18 2.9-7.81z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.1-2.4c-.9.6-2.07.96-3.26.96-3.13 0-5.78-2.11-6.73-4.96L3.68 18.06C5.68 21.6 9.53 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.69c-.25-.7-.39-1.4-.39-2.19s.14-1.5.39-2.19l-3.2-2.39C1.29 9.68 1 10.82 1 12.5s.29 2.82.88 4.58l3.39-2.39z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.4C17.96 1.19 15.24 0 12 0 9.53 0 5.68 2.4 3.68 5.94l3.2 2.39C7.83 5.46 10.48 4.75 12 4.75z"/>
              </svg>
              <span>
                {portalMode === 'clinic' ? 'Registrar / Ingresar Clínica' : 'Ingresar al Portal Asociados'}
              </span>
            </>
          )}
        </button>

        <p className={styles.footer}>
          Al ingresar aceptas los términos de servicio de enlapet clinic.
        </p>
      </div>
    </div>
  );
}
