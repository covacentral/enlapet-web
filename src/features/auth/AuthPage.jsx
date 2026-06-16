import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { PawPrint } from 'lucide-react';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setSigningIn(true);
    try {
      await loginWithGoogle('owner', null);
    } catch (err) {
      console.error('Error en login con Google:', err);
      setError(err.message || 'No se pudo iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.circle1}></div>
      <div className={styles.circle2}></div>

      <div className={styles.authCard}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIconBg}>
            <PawPrint className={styles.logoIcon} size={40} />
          </div>
        </div>

        <h1 className={styles.title}>enlapet</h1>

        <p className={styles.subtitle}>
          Identificación inteligente NFC para proteger a quienes más quieres.
        </p>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <button
          onClick={handleGoogleLogin}
          disabled={signingIn}
          className={styles.googleButton}
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
              <span>Ingresar con Google</span>
            </>
          )}
        </button>

        <p className={styles.footerText}>
          Tu tranquilidad, su seguridad. Al ingresar aceptas los términos de servicio.
        </p>

        <a
          href="/clinic"
          className={styles.clinicLink}
          aria-label="Ir al portal de clínicas"
        >
          ¿Eres una clínica o veterinario? →
        </a>
      </div>
    </div>
  );
}
