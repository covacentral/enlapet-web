import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import styles from './PublicPetView.module.css';
import { Phone, ShieldAlert, PawPrint } from 'lucide-react';
import { formatPetAge } from '../../shared/utils/generators';

export default function PublicPetView({ secureToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const resolveNfcToken = async () => {
      if (!secureToken) {
        setError('Token no válido.');
        setLoading(false);
        return;
      }

      try {
        // 1. Resolver token en nfc_mappings
        const mappingRef = doc(db, 'nfc_mappings', secureToken);
        const mappingSnap = await getDoc(mappingRef);

        if (!mappingSnap.exists()) {
          setError('El código del collar escaneado no corresponde a ninguna mascota.');
          setLoading(false);
          return;
        }

        const { petId, ownerId } = mappingSnap.data();

        // 2. Obtener datos de la mascota
        const petRef = doc(db, 'pets', petId);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) {
          setError('Mascota no encontrada.');
          setLoading(false);
          return;
        }

        setPet(petSnap.data());

        // 3. Obtener datos del dueño (solo el teléfono para WhatsApp)
        const ownerRef = doc(db, 'users', ownerId);
        const ownerSnap = await getDoc(ownerRef);

        if (ownerSnap.exists()) {
          setOwner(ownerSnap.data());
        }

      } catch (err) {
        console.error("Error al resolver perfil de identificación:", err);
        setError('Error al cargar la información del collar.');
      } finally {
        setLoading(false);
      }
    };

    resolveNfcToken();
  }, [secureToken]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>Buscando identificación...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>🔍</span>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }
  // Generar link de WhatsApp
  const phone = owner?.contact?.phone || '';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hola! He escaneado el collar de identificación enlapet y encontré a tu mascota ${pet?.name}. ¿Se encuentra extraviada?`
  )}`;

  return (
    <div className={styles.container}>
      <div className={styles.circle1}></div>
      <div className={styles.circle2}></div>

      {/* Identidad enlapet en la parte superior */}
      <header className={styles.brandHeader}>
        <div className={styles.brandLogo}>
          <PawPrint className={styles.brandLogoIcon} size={28} />
          <span className={styles.brandLogoText}>enlapet</span>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.card}>
          {/* Foto de la Mascota */}
          <div className={styles.petPhotoContainer}>
            <img 
              src={pet?.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
              alt={pet?.name} 
              className={styles.petPhoto}
            />
            <div className={styles.epidBadge}>ID: {pet?.epid}</div>
          </div>

          {/* Nombre y Edad */}
          <div className={styles.petMainInfo}>
            <span className={styles.speciesTag}>
              {pet?.species === 'Dog' ? '🐶 Perro' : pet?.species === 'Cat' ? '🐱 Gato' : (pet?.species || 'Otro')} &bull; {pet?.breed || 'Sin Raza'}
            </span>
            <h1 className={styles.petName}>{pet?.name}</h1>
            <span className={styles.ageBadge}>
              {formatPetAge(pet?.birthDate)}
            </span>
          </div>

          <div className={styles.divider}></div>

          {/* Botón de Contacto por WhatsApp */}
          <div className={styles.actionSection}>
            <p className={styles.actionPrompt}>
              Si has encontrado a <strong>{pet?.name}</strong>, por favor avisa a su familia de inmediato:
            </p>
            {owner?.contact?.phone ? (
              <button 
                onClick={() => window.open(whatsappUrl, '_blank')} 
                className={styles.btnWhatsapp}
                aria-label="Contactar al dueño por WhatsApp"
              >
                <Phone size={22} />
                <span>Contactar al Dueño</span>
              </button>
            ) : (
              <div className={styles.noPhoneAlert}>
                <ShieldAlert size={22} />
                <span>Contacto no disponible públicamente</span>
              </div>
            )}
          </div>

          {/* Consejos para quien encuentra la mascota */}
          <div className={styles.helpTips}>
            <h3>💡 ¿Qué hacer si tienes a {pet?.name}?</h3>
            <ul>
              <li>Dale un poco de agua fresca y un espacio tranquilo.</li>
              <li>Mantén a la mascota segura mientras su familia acude al rescate.</li>
              <li>Avísale que escaneaste su placa inteligente.</li>
            </ul>
          </div>
        </div>

        {/* Sección de Captación / Presentación */}
        <section className={styles.promoSection}>
          <h2>¿Quieres proteger a tu mascota?</h2>
          <p>
            Con <strong>enlapet</strong> obtienes una medalla inteligente NFC que permite a cualquier persona contactarte al instante con un solo toque del celular, sin instalar aplicaciones.
          </p>
          <button 
            onClick={() => window.open(window.location.origin, '_self')} 
            className={styles.btnRegisterPromo}
          >
            <PawPrint size={18} />
            <span>Registra tu mascota gratis</span>
          </button>
        </section>
      </main>

      <footer className={styles.publicFooter}>
        <p>&copy; {new Date().getFullYear()} enlapet &bull; Identificación Inteligente de Mascotas</p>
      </footer>
    </div>
  );
}
