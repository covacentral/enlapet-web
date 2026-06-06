import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { Search, MapPin, Clock, ShieldCheck, MessageCircle, Mail, Phone, Heart, Award, ArrowLeft } from 'lucide-react';
import AppointmentModal from './AppointmentModal';
import styles from './VetDirectory.module.css';

export default function VetDirectory({ user, ownerData, pets, onBack }) {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState(null); // Detalle / Carta de presentación
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('all'); // all, 24h, custom

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const clinicsCol = collection(db, 'clinics');
        const clinicsSnapshot = await getDocs(clinicsCol);
        const clinicsList = clinicsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClinics(clinicsList);
      } catch (err) {
        console.error("Error al obtener clínicas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []);

  // Filtrado de veterinarias
  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = 
      clinic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchedule = 
      scheduleFilter === 'all' || 
      clinic.workingHours?.type === scheduleFilter;

    return matchesSearch && matchesSchedule;
  });

  return (
    <div className={styles.container}>
      {/* Botón Volver */}
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={18} />
        <span>Volver a Mis Mascotas</span>
      </button>

      {!selectedClinic ? (
        <>
          <div className={styles.header}>
            <h1>Directorio de Veterinarias en Colombia</h1>
            <p>Encuentra y agenda citas con centros veterinarios y especialistas de confianza.</p>
          </div>

          {/* Filtros */}
          <div className={styles.filterBar}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} size={18} />
              <input
                type="text"
                placeholder="Buscar por barrio, ciudad o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              value={scheduleFilter} 
              onChange={(e) => setScheduleFilter(e.target.value)}
              className={styles.selectFilter}
            >
              <option value="all">Cualquier Horario</option>
              <option value="24h">Urgencias 24 Horas</option>
              <option value="custom">Horarios Diurnos</option>
            </select>
          </div>

          {/* Listado */}
          {loading ? (
            <div className={styles.loader}>Cargando directorio...</div>
          ) : filteredClinics.length === 0 ? (
            <div className={styles.emptyState}>No encontramos veterinarias que coincidan con tu búsqueda.</div>
          ) : (
            <div className={styles.grid}>
              {filteredClinics.map((clinic) => (
                <div key={clinic.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    {clinic.logoUrl ? (
                      <img src={clinic.logoUrl} alt={clinic.name} className={styles.logo} />
                    ) : (
                      <div className={styles.logoPlaceholder}>
                        <Award size={24} />
                      </div>
                    )}
                    <div className={styles.cardInfo}>
                      <h3>{clinic.name}</h3>
                      <p className={styles.location}>
                        <MapPin size={14} />
                        <span>{clinic.neighborhood}, {clinic.city}</span>
                      </p>
                    </div>
                  </div>

                  <div className={styles.cardDetails}>
                    <p className={styles.scheduleText}>
                      <Clock size={14} />
                      <span>
                        {clinic.workingHours?.type === '24h' 
                          ? 'Abierto 24 Horas (Urgencias)' 
                          : `Horario: ${clinic.workingHours?.start} - ${clinic.workingHours?.end}`}
                      </span>
                    </p>
                    <p className={styles.pricePolicy}>
                      {clinic.pricing?.type === 'free' && <span className={styles.tagFree}>Consulta Gratis</span>}
                      {clinic.pricing?.type === 'pay_at_clinic' && <span className={styles.tagClinic}>Paga en Clínica</span>}
                      {clinic.pricing?.type === 'pre_pay' && <span className={styles.tagPrepay}>Pago Previo</span>}
                    </p>
                  </div>

                  <button 
                    onClick={() => setSelectedClinic(clinic)} 
                    className={styles.detailButton}
                  >
                    Ver Carta de Presentación
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Vista de Detalle / Carta de Presentación de la Clínica */
        <div className={styles.profileView}>
          <button onClick={() => setSelectedClinic(null)} className={styles.profileBackButton}>
            <ArrowLeft size={16} />
            <span>Volver al Directorio</span>
          </button>

          <div className={styles.profileHeader}>
            {selectedClinic.logoUrl ? (
              <img src={selectedClinic.logoUrl} alt={selectedClinic.name} className={styles.profileLogo} />
            ) : (
              <div className={styles.profileLogoPlaceholder}>
                <Award size={40} />
              </div>
            )}
            <div className={styles.profileTitleBlock}>
              <h2>{selectedClinic.name}</h2>
              <p className={styles.profileLocation}>
                <MapPin size={16} />
                <span>{selectedClinic.address} ({selectedClinic.neighborhood}, {selectedClinic.city})</span>
              </p>
            </div>
          </div>

          <div className={styles.profileBody}>
            {/* Biografía / Presentación */}
            <div className={styles.profileMain}>
              <h3>Sobre Nosotros</h3>
              <p className={styles.bioText}>
                {selectedClinic.bio || "Esta veterinaria aún no ha agregado una biografía."}
              </p>

              <div className={styles.profileMetadata}>
                <div className={styles.metaItem}>
                  <Clock size={20} className={styles.metaIcon} />
                  <div>
                    <h4>Horario de Atención</h4>
                    <p>
                      {selectedClinic.workingHours?.type === '24h' 
                        ? 'Abierto las 24 Horas' 
                        : `${selectedClinic.workingHours?.start} a ${selectedClinic.workingHours?.end}`}
                    </p>
                  </div>
                </div>

                <div className={styles.metaItem}>
                  <ShieldCheck size={20} className={styles.metaIcon} />
                  <div>
                    <h4>Política de Cobro</h4>
                    <p>
                      {selectedClinic.pricing?.type === 'free' && 'La consulta inicial es gratuita.'}
                      {selectedClinic.pricing?.type === 'pay_at_clinic' && `Consulta: $${selectedClinic.pricing?.price?.toLocaleString('es-CO')} COP (Se paga en la clínica).`}
                      {selectedClinic.pricing?.type === 'pre_pay' && `Consulta: $${selectedClinic.pricing?.price?.toLocaleString('es-CO')} COP (Requiere abono anticipado para confirmar).`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Contacto Lateral */}
            <div className={styles.profileSidebar}>
              <h3>Canales Oficiales</h3>
              <div className={styles.socialButtons}>
                {selectedClinic.socials?.instagram && (
                  <a 
                    href={`https://instagram.com/${selectedClinic.socials.instagram.replace('@', '')}`}
                    target="_blank" 
                    rel="noreferrer"
                    className={styles.socialButton}
                  >
                    <Heart size={18} />
                    <span>Instagram</span>
                  </a>
                )}
                {selectedClinic.socials?.facebook && (
                  <a 
                    href={`https://facebook.com/${selectedClinic.socials.facebook}`}
                    target="_blank" 
                    rel="noreferrer"
                    className={styles.socialButton}
                  >
                    <Award size={18} />
                    <span>Facebook</span>
                  </a>
                )}
                {selectedClinic.socials?.email && (
                  <a href={`mailto:${selectedClinic.socials.email}`} className={styles.socialButton}>
                    <Mail size={18} />
                    <span>Enviar Correo</span>
                  </a>
                )}
                {selectedClinic.phone && (
                  <a href={`tel:${selectedClinic.phone}`} className={styles.socialButton}>
                    <Phone size={18} />
                    <span>Llamar al {selectedClinic.phone}</span>
                  </a>
                )}
              </div>

              <button 
                onClick={() => setShowBookingModal(true)} 
                className={styles.bookButton}
              >
                Agendar Cita Médica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendamiento Inteligente */}
      {showBookingModal && selectedClinic && (
        <AppointmentModal
          user={user}
          ownerData={ownerData}
          clinic={selectedClinic}
          pets={pets}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
}
