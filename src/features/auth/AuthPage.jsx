import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { PawPrint, ShieldAlert, ChevronDown, Building, User, Users } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const { loginWithGoogle, selectRole } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Modos de Portal: 'owner' (Propietario), 'clinic' (Clínica / Admin), 'staff' (Asociados / Personal IPS)
  const [portalMode, setPortalMode] = useState(() => {
    return localStorage.getItem('auth_portal_mode') || 'owner';
  });
  const [showDropdown, setShowDropdown] = useState(false);

  // Tipos de cuenta clínica (Solo aplicable si portalMode === 'clinic')
  const [clinicType, setClinicType] = useState('ips'); // 'ips' (Con Staff) o 'solo' (Independiente)

  useEffect(() => {
    const savedMode = localStorage.getItem('auth_portal_mode');
    if (savedMode) {
      localStorage.removeItem('auth_portal_mode');
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setSigningIn(false); // Reset error state visually
    
    // Iniciar el flujo de autenticación con Google
    setSigningIn(true);
    try {
      // Intentar login
      await loginWithGoogle(portalMode, clinicType);
      
      // Una vez logueado, verificamos y configuramos el rol en base al portal seleccionado
      // Note: AuthContext se encargará del redireccionamiento, pero si es un nuevo registro
      // asignamos de inmediato el rol correspondiente para evitar que queden como dueños por accidente.
      // fetchProfileData se ejecuta inmediatamente después de onAuthStateChanged
    } catch (err) {
      console.error("Error en login con Google:", err);
      setError(err.message || 'No se pudo iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.circle1}></div>
      <div className={styles.circle2}></div>
      
      {/* Selector de Modo de Portal (Oculto en menú desplegable superior derecho) */}
      <div className={styles.topNav}>
        <div className={styles.portalSelectorContainer}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            className={styles.portalDropdownBtn}
            aria-label="Alternar portal de ingreso"
          >
            <span>
              {portalMode === 'owner' && 'Portal Mascotas'}
              {portalMode === 'clinic' && 'enlapet clinic (Admin)'}
              {portalMode === 'staff' && 'enlapet clinic (Asociados)'}
            </span>
            <ChevronDown size={16} />
          </button>
          
          {showDropdown && (
            <div className={styles.portalDropdownMenu}>
              <button onClick={() => { setPortalMode('owner'); setShowDropdown(false); }} className={styles.portalOption}>
                Portal Mascotas (Propietarios)
              </button>
              <button onClick={() => { setPortalMode('clinic'); setShowDropdown(false); }} className={styles.portalOption}>
                enlapet clinic (Admin / Clínicas)
              </button>
              <button onClick={() => { setPortalMode('staff'); setShowDropdown(false); }} className={styles.portalOption}>
                enlapet clinic (Asociados / Equipo)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.authCard}>
        <div className={styles.logoContainer}>
          <div className={`${styles.logoIconBg} ${portalMode !== 'owner' ? styles.clinicLogoBg : ''}`}>
            <PawPrint className={styles.logoIcon} size={40} />
          </div>
        </div>
        
        <h1 className={styles.title}>
          enlapet
          {portalMode !== 'owner' && <span className={styles.titleBadge}>clinic</span>}
        </h1>

        {portalMode === 'owner' && (
          <p className={styles.subtitle}>
            Identificación inteligente NFC para proteger a quienes más quieres.
          </p>
        )}

        {portalMode === 'clinic' && (
          <p className={styles.subtitle}>
            Panel administrativo para clínicas veterinarias y médicos independientes.
          </p>
        )}

        {portalMode === 'staff' && (
          <p className={styles.subtitle}>
            Portal exclusivo para médicos asociados, contabilidad y recepción autorizados.
          </p>
        )}

        {error && <p className={styles.errorMessage}>{error}</p>}

        {/* Selección de Tipo de Cuenta si es registro de clínica */}
        {portalMode === 'clinic' && (
          <div className={styles.clinicTypePicker}>
            <p className={styles.pickerTitle}>Selecciona tu modelo de atención:</p>
            <div className={styles.pickerOptions}>
              <label className={`${styles.pickerOption} ${clinicType === 'ips' ? styles.pickerActive : ''}`}>
                <input 
                  type="radio" 
                  name="clinicType" 
                  value="ips" 
                  checked={clinicType === 'ips'} 
                  onChange={() => setClinicType('ips')}
                  className={styles.hiddenRadio}
                />
                <Building size={20} className={styles.pickerIcon} />
                <div className={styles.pickerText}>
                  <h4>Consultorio / IPS</h4>
                  <p>Clínica con múltiples veterinarios, recepción y contabilidad.</p>
                </div>
              </label>

              <label className={`${styles.pickerOption} ${clinicType === 'solo' ? styles.pickerActive : ''}`}>
                <input 
                  type="radio" 
                  name="clinicType" 
                  value="solo" 
                  checked={clinicType === 'solo'} 
                  onChange={() => setClinicType('solo')}
                  className={styles.hiddenRadio}
                />
                <User size={20} className={styles.pickerIcon} />
                <div className={styles.pickerText}>
                  <h4>Veterinario Independiente</h4>
                  <p>Médico autónomo que realiza consultas y gestiona su propia caja.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {portalMode === 'staff' && (
          <div className={styles.staffNotice}>
            <ShieldAlert size={18} />
            <p>Deberás ingresar con la cuenta de Google cuyo correo electrónico haya sido previamente vinculado por el administrador de tu clínica en el módulo "Mi Equipo".</p>
          </div>
        )}

        <button 
          onClick={handleGoogleLogin} 
          disabled={signingIn} 
          className={`${styles.googleButton} ${portalMode !== 'owner' ? styles.clinicBtn : ''}`}
          aria-label="Iniciar sesión con Google"
        >
          {signingIn ? (
            <span>Conectando...</span>
          ) : (
            <>
              <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 2.66-.99 3.56l3.1 2.4c1.8-1.68 2.9-4.18 2.9-7.81z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.1-2.4c-.9.6-2.07.96-3.26.96-3.13 0-5.78-2.11-6.73-4.96L3.68 18.06C5.68 21.6 9.53 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.69c-.25-.7-.39-1.4-.39-2.19s.14-1.5.39-2.19l-3.2-2.39C1.29 9.68 1 10.82 1 12.5s.29 2.82.88 4.58l3.39-2.39z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.4C17.96 1.19 15.24 0 12 0 9.53 0 5.68 2.4 3.68 5.94l3.2 2.39C7.83 5.46 10.48 4.75 12 4.75z"/>
              </svg>
              <span>
                {portalMode === 'owner' && 'Ingresar con Google'}
                {portalMode === 'clinic' && 'Registrar / Ingresar Clínica'}
                {portalMode === 'staff' && 'Ingresar al Portal Asociados'}
              </span>
            </>
          )}
        </button> 

        <p className={styles.footerText}>
          Tu tranquilidad, su seguridad. Al ingresar aceptas los términos de servicio.
        </p>
      </div>
    </div>
  );
}
