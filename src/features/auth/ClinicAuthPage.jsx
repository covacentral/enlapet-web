import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import {
  PawPrint, ShieldAlert, ChevronDown,
  Building2, User, MapPin, ArrowLeft,
  Check
} from 'lucide-react';
import styles from './ClinicAuthPage.module.css';

// ── Opciones de clinicSubtype ──────────────────────────────
const CLINIC_TYPES = [
  {
    value: 'ips',
    icon: Building2,
    title: 'Consultorio / IPS',
    description: 'Establecimiento con múltiples veterinarios, recepción y contabilidad. Requiere NIT y Cámara de Comercio.',
  },
  {
    value: 'solo_local',
    icon: User,
    title: 'Veterinario Independiente (con local)',
    description: 'Médico autónomo con consultorio físico propio. Gestiona citas, historial y caja de forma individual.',
  },
  {
    value: 'solo_mobile',
    icon: MapPin,
    title: 'Veterinario a Domicilio',
    description: 'Médico que atiende sin local fijo. Solo se requiere tarjeta profesional COMVEZCOL y cédula.',
  },
];

export default function ClinicAuthPage() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // 'clinic' | 'staff'
  const [portalMode, setPortalMode] = useState('clinic');
  const [showDropdown, setShowDropdown] = useState(false);

  // Solo aplica cuando portalMode === 'clinic'
  const [clinicSubtype, setClinicSubtype] = useState('ips');

  const handleGoogleLogin = async () => {
    setError('');
    setSigningIn(true);
    try {
      // Pasamos clinicSubtype como segundo argumento — AuthContext ya lo maneja correctamente
      await loginWithGoogle(portalMode, clinicSubtype);
    } catch (err) {
      console.error('Error en login de clínica:', err);
      setError(err.message || 'No se pudo iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setSigningIn(false);
    }
  };

  const selectedType = CLINIC_TYPES.find(t => t.value === clinicSubtype);

  return (
    <div className={styles.authContainer}>
      {/* Fondos decorativos */}
      <div className={styles.bg1} />
      <div className={styles.bg2} />
      <div className={styles.bg3} />

      {/* Barra superior */}
      <div className={styles.topBar}>
        <a href="/" className={styles.backLink} aria-label="Volver al portal de mascotas">
          <ArrowLeft size={16} />
          <span>Portal Mascotas</span>
        </a>

        {/* Dropdown: Admin o Asociados */}
        <div className={styles.dropdownWrapper}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            className={styles.dropdownTrigger}
            aria-expanded={showDropdown}
            aria-label="Cambiar modo de portal clínico"
          >
            <span>{portalMode === 'clinic' ? 'Admin / Clínicas' : 'Asociados / Equipo'}</span>
            <ChevronDown size={15} className={showDropdown ? styles.chevronOpen : ''} />
          </button>

          {showDropdown && (
            <div className={styles.dropdownMenu} role="menu">
              {[
                { mode: 'clinic', label: 'Admin / Clínicas', icon: Building2 },
                { mode: 'staff',  label: 'Asociados / Equipo', icon: User },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.mode}
                    role="menuitem"
                    className={`${styles.dropdownItem} ${portalMode === opt.mode ? styles.dropdownItemActive : ''}`}
                    onClick={() => { setPortalMode(opt.mode); setShowDropdown(false); }}
                  >
                    <Icon size={16} />
                    {opt.label}
                    {portalMode === opt.mode && <Check size={14} className={styles.dropdownCheck} />}
                  </button>
                );
              })}
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
            ? 'Panel para clínicas veterinarias y médicos independientes.'
            : 'Portal exclusivo para médicos asociados, contabilidad y recepción autorizados.'}
        </p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {/* Selector tipo de clínica — solo para mode 'clinic' */}
        {portalMode === 'clinic' && (
          <div className={styles.typePicker}>
            <p className={styles.typeLabel}>Selecciona tu modelo de atención:</p>
            <div className={styles.typeOptions}>
              {CLINIC_TYPES.map(opt => {
                const Icon = opt.icon;
                return (
                  <label
                    key={opt.value}
                    className={`${styles.typeOption} ${clinicSubtype === opt.value ? styles.typeOptionActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="clinicSubtype"
                      value={opt.value}
                      checked={clinicSubtype === opt.value}
                      onChange={() => setClinicSubtype(opt.value)}
                      className={styles.hiddenRadio}
                    />
                    <Icon size={22} className={styles.typeIcon} />
                    <div className={styles.typeText}>
                      <h4>{opt.title}</h4>
                      <p>{opt.description}</p>
                    </div>
                    {clinicSubtype === opt.value && (
                      <Check size={16} className={styles.typeCheck} />
                    )}
                  </label>
                );
              })}
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
                {portalMode === 'clinic'
                  ? 'Registrar / Ingresar mi Clínica'
                  : 'Ingresar al Portal de Asociados'}
              </span>
            </>
          )}
        </button>

        <p className={styles.footer}>
          Al ingresar aceptas los{' '}
          <a href="/terms" target="_blank" rel="noreferrer">términos de servicio</a>{' '}
          de enlapet clinic.
        </p>
      </div>
    </div>
  );
}
