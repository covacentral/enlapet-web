import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import styles from './PublicPetView.module.css';

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
    `Hola! He escaneado el collar de identificación EnlaPet y encontré a tu mascota ${pet?.name}. ¿Se encuentra extraviada?`
  )}`;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Foto de la Mascota (80vw de ancho y proporcional 1:1) */}
        <div className={styles.petPhotoContainer}>
          <img 
            src={pet?.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="150" height="150" fill="%23ccc"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3zm-4.5-3c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zm9 0c-.83 0-1.5-.67-1.5-1.5S15.67 8 16.5 8s1.5.67 1.5 1.5S17.33 11 16.5 11zm-5.25-3.5c-.69 0-1.25-.56-1.25-1.25S10.81 5 11.25 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm2.5 0c-.69 0-1.25-.56-1.25-1.25S13.31 5 13.75 5s1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'} 
            alt={pet?.name} 
            className={styles.petPhoto}
          />
        </div>

        {/* Nombre y Edad */}
        <div className={styles.petMainInfo}>
          <h1 className={styles.petName}>{pet?.name}</h1>
          <span className={styles.ageText}>
            {pet?.age ? `${pet.age} años de edad` : 'Cachorro'}
          </span>
        </div>

        {/* Botón de Contacto por WhatsApp */}
        {owner?.contact?.phone ? (
          <button 
            onClick={() => window.open(whatsappUrl, '_blank')} 
            className={styles.btnWhatsapp}
            aria-label="Contactar al dueño por WhatsApp"
          >
            <svg className={styles.whatsappIcon} viewBox="0 0 24 24">
              <path d="M12.031 6.172c-2.078 0-3.761 1.684-3.761 3.761 0 .724.208 1.4.564 1.979l-.6 2.199 2.253-.591c.477.29 1.033.459 1.626.459 2.078 0 3.761-1.684 3.761-3.761 0-2.078-1.684-3.761-3.761-3.761zm3.896 5.518c-.109.284-.636.549-.877.585-.23.036-.508.066-1.503-.332-.988-.396-1.611-1.393-1.66-1.459-.048-.066-.396-.525-.396-1.007 0-.482.253-.72.343-.817.09-.096.2-.144.29-.144.09 0 .18 0 .253.006.079.006.187-.03.29.217.109.265.374.91.41.982.036.072.06.157.012.253-.048.096-.072.157-.144.241-.072.084-.157.187-.223.253-.079.072-.163.151-.066.313.096.163.434.717.934 1.163.645.572 1.187.747 1.356.831.169.084.265.072.361-.036.096-.109.422-.494.536-.663.115-.169.23-.139.386-.084.157.054.994.47 1.163.554.169.084.284.127.325.2.042.072.042.41-.066.699zM12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.526 5.864L.079 23.518c-.066.241.139.47.386.422l5.772-1.424C7.942 23.488 9.907 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.921 0-3.722-.516-5.289-1.414l-.38-.217-3.486.86.877-3.411-.237-.378A9.957 9.957 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
            </svg>
            <span>Contactar al Dueño</span>
          </button>
        ) : (
          <p className={styles.ageText} style={{ fontSize: '0.85rem', color: 'red' }}>
            Sin celular configurado por el dueño
          </p>
        )}
      </div>
    </div>
  );
}
