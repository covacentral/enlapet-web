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
        setError('Token inválido o no suministrado.');
        setLoading(false);
        return;
      }

      try {
        // 1. Resolver token en nfc_mappings
        const mappingRef = doc(db, 'nfc_mappings', secureToken);
        const mappingSnap = await getDoc(mappingRef);

        if (!mappingSnap.exists()) {
          setError('El código del collar escaneado no corresponde a ninguna mascota activa.');
          setLoading(false);
          return;
        }

        const { petId, ownerId } = mappingSnap.data();

        // 2. Obtener datos de la mascota
        const petRef = doc(db, 'pets', petId);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) {
          setError('No se pudo encontrar el registro de la mascota.');
          setLoading(false);
          return;
        }

        setPet(petSnap.data());

        // 3. Obtener ficha de contacto del dueño
        const ownerRef = doc(db, 'users', ownerId);
        const ownerSnap = await getDoc(ownerRef);

        if (ownerSnap.exists()) {
          setOwner(ownerSnap.data());
        }

      } catch (err) {
        console.error("Error al resolver perfil de identificación:", err);
        setError('Ocurrió un error al cargar los datos del collar. Revisa tu señal.');
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
          <h2 className={styles.petName}>No Encontrado</h2>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  // Generar link de WhatsApp
  const phone = owner?.contact?.phone || '';
  const cleanPhone = phone.replace(/[^0-9+]/g, ''); // Limpiar caracteres innecesarios
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hola! He escaneado el collar de identificación EnlaPet y encontré a tu mascota ${pet?.name}. ¿Se encuentra extraviada?`
  )}`;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Foto de la Mascota */}
        <div className={styles.petPhotoContainer}>
          <img 
            src={pet?.photoUrl || 'https://via.placeholder.com/150?text=Mascota'} 
            alt={pet?.name} 
            className={styles.petPhoto}
          />
        </div>

        {/* Nombre e Info Básica */}
        <div className={styles.petMainInfo}>
          <h1 className={styles.petName}>{pet?.name}</h1>
          <span className={styles.breedText}>
            {pet?.species === 'Dog' ? '🐶 Perro' : '🐱 Gato'} • {pet?.breed || 'Sin Raza'}
          </span>
          <div>
            <span className={styles.epidBadge}>ID: {pet?.epid}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Detalles de la Mascota */}
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Edad</span>
            <span className={styles.detailValue}>
              {pet?.age ? `${pet.age} años` : 'Cachorro'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Género</span>
            <span className={styles.detailValue}>
              {pet?.gender === 'Male' ? 'Macho' : 'Hembra'}
            </span>
          </div>
        </div>

        {/* Datos de Contacto del Dueño */}
        {owner?.contact?.phone ? (
          <div className={styles.ownerCard}>
            <h3 className={styles.ownerTitle}>📍 Ubicación de Residencia</h3>
            <p className={styles.ownerLocation}>
              {owner.contact.city}, {owner.contact.neighborhood || 'Barrio no especificado'} ({owner.contact.country})
            </p>
          </div>
        ) : (
          <div className={styles.ownerCard} style={{ backgroundColor: 'hsl(35, 100%, 97%)', borderColor: 'hsl(40, 100%, 80%)' }}>
            <h3 className={styles.ownerTitle} style={{ color: 'hsl(25, 90%, 25%)' }}>⚠️ Sin Datos de Contacto</h3>
            <p className={styles.ownerLocation} style={{ color: 'hsl(25, 60%, 35%)' }}>
              El dueño no ha completado su información de contacto.
            </p>
          </div>
        )}

        {/* Botón de Contacto por WhatsApp */}
        {owner?.contact?.phone && (
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
        )}
      </div>
    </div>
  );
}
