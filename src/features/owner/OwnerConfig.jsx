import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { ChevronLeft, Info } from 'lucide-react';
import { LATAM_COUNTRIES, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../../shared/utils/locationData';
import styles from './OwnerConfig.module.css';

export default function OwnerConfig({ onSaveComplete, onBack }) {
  const { user, ownerData, refreshOwnerData, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  // Estados del Formulario
  const [country, setCountry] = useState('Colombia');
  const [state, setState] = useState('');
  const [customState, setCustomState] = useState('');
  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [dialCode, setDialCode] = useState('+57');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Estados para Feedback y Soporte
  const [activeSection, setActiveSection] = useState(null); // 'feedback' | 'support' | null
  const [feedbackTopic, setFeedbackTopic] = useState('');
  const [feedbackCustomTopic, setFeedbackCustomTopic] = useState('');
  const [feedbackDetail, setFeedbackDetail] = useState('');
  
  const [supportTopic, setSupportTopic] = useState('');
  const [supportCustomTopic, setSupportCustomTopic] = useState('');
  const [supportDetail, setSupportDetail] = useState('');

  const handleSendFeedback = (e) => {
    e.preventDefault();
    const finalTopic = feedbackTopic === 'Otro' ? feedbackCustomTopic.trim() : feedbackTopic;
    if (!finalTopic || !feedbackDetail.trim()) {
      alert("Por favor completa el asunto y el detalle de tu feedback.");
      return;
    }

    const email = "covacentral+feedbackenlapetweb@gmail.com";
    const subject = `Feedback enlapet: ${finalTopic}`;
    const body = `Nombre del Dueño: ${ownerData?.name || user?.displayName || 'Usuario enlapet'}\n` +
                 `Correo: ${user?.email || 'N/A'}\n` +
                 `Asunto: ${finalTopic}\n\n` +
                 `Detalle del problema/sugerencia:\n${feedbackDetail.trim()}`;
                 
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    
    // Limpiar form
    setFeedbackTopic('');
    setFeedbackCustomTopic('');
    setFeedbackDetail('');
    setActiveSection(null);
  };

  const handleSendSupport = (e) => {
    e.preventDefault();
    const finalTopic = supportTopic === 'Otro' ? supportCustomTopic.trim() : supportTopic;
    if (!finalTopic || !supportDetail.trim()) {
      alert("Por favor completa el asunto y el detalle de tu solicitud.");
      return;
    }

    const message = `¡Hola! Solicito Atención al Cliente para enlapet:\n\n` +
                    `*Dueño:* ${ownerData?.name || user?.displayName || 'Usuario enlapet'}\n` +
                    `*Correo:* ${user?.email || 'N/A'}\n` +
                    `*Asunto:* ${finalTopic}\n\n` +
                    `*Detalle:* ${supportDetail.trim()}`;

    const waUrl = `https://wa.me/573226460199?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Limpiar form
    setSupportTopic('');
    setSupportCustomTopic('');
    setSupportDetail('');
    setActiveSection(null);
  };

  // Cargar datos existentes del dueño
  useEffect(() => {
    if (ownerData?.contact) {
      const c = ownerData.contact.country || 'Colombia';
      const s = ownerData.contact.state || ownerData.contact.department || '';
      const ci = ownerData.contact.city || '';
      const n = ownerData.contact.neighborhood || '';
      const fullPhone = ownerData.contact.phone || '';

      setCountry(c);
      setNeighborhood(n);

      // Encontrar el país correspondiente
      const foundCountry = LATAM_COUNTRIES.find(item => item.name.toLowerCase() === c.toLowerCase());
      
      // Separar dialCode y número telefónico
      if (fullPhone) {
        let matchedCode = '+57';
        let matchedNum = fullPhone;

        const sortedCountries = [...LATAM_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
        for (const item of sortedCountries) {
          if (fullPhone.startsWith(item.dialCode)) {
            matchedCode = item.dialCode;
            matchedNum = fullPhone.substring(item.dialCode.length);
            break;
          }
        }
        setDialCode(matchedCode);
        setPhoneNumber(matchedNum);
      } else if (foundCountry) {
        setDialCode(foundCountry.dialCode);
      }

      // Resolver Departamento/Estado
      const availableStates = foundCountry ? STATES_BY_COUNTRY[foundCountry.code] : [];
      if (availableStates && availableStates.includes(s)) {
        setState(s);
        setCustomState('');
      } else if (s) {
        setState('Otro');
        setCustomState(s);
      } else {
        setState('');
        setCustomState('');
      }

      // Resolver Municipio/Ciudad
      const availableCities = CITIES_BY_STATE[s] || [];
      if (availableCities && availableCities.includes(ci)) {
        setCity(ci);
        setCustomCity('');
      } else if (ci) {
        setCity('Otro');
        setCustomCity(ci);
      } else {
        setCity('');
        setCustomCity('');
      }
    }
  }, [ownerData]);

  // Al cambiar de país, actualizar el código telefónico y reiniciar estado/ciudad
  const handleCountryChange = (e) => {
    const selectedName = e.target.value;
    setCountry(selectedName);
    setState('');
    setCustomState('');
    setCity('');
    setCustomCity('');

    const foundCountry = LATAM_COUNTRIES.find(item => item.name === selectedName);
    if (foundCountry) {
      setDialCode(foundCountry.dialCode);
    }
  };

  // Al cambiar de departamento
  const handleStateChange = (e) => {
    const selectedState = e.target.value;
    setState(selectedState);
    setCity('');
    setCustomCity('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const finalState = state === 'Otro' ? customState.trim() : state;
    const finalCity = city === 'Otro' ? customCity.trim() : city;
    const finalPhone = `${dialCode}${phoneNumber.replace(/\s+/g, '')}`;

    if (!finalCity || !phoneNumber.trim()) {
      alert("Por favor completa al menos la Ciudad/Municipio y el Teléfono de contacto.");
      return;
    }

    setLoading(true);
    try {
      // 1. Actualizar el perfil del usuario en la colección 'users'
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        contact: {
          country,
          state: finalState,
          city: finalCity,
          neighborhood: neighborhood.trim(),
          phone: finalPhone
        },
        updatedAt: new Date().toISOString()
      });

      // 2. Propagar el teléfono a todas las mascotas del usuario
      const petsRef = collection(db, 'pets');
      const q = query(petsRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.forEach((petDoc) => {
          const petData = petDoc.data();
          // Actualizar teléfono en base de datos
          batch.update(petDoc.ref, {
            ownerPhone: finalPhone,
            updatedAt: new Date().toISOString()
          });

          // Limpiar el caché de la pestaña local de esta mascota si existe token seguro
          if (petData.secureToken) {
            sessionStorage.removeItem(`nfc_cache_${petData.secureToken}`);
          }
        });
        await batch.commit();
      }

      await refreshOwnerData();
      if (onSaveComplete) onSaveComplete();
    } catch (error) {
      console.error("Error al guardar la configuración del dueño:", error);
      alert("Ocurrió un error al guardar la información. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Obtener los estados disponibles para el país actual
  const currentCountryCode = LATAM_COUNTRIES.find(item => item.name === country)?.code;
  const statesList = currentCountryCode ? STATES_BY_COUNTRY[currentCountryCode] || [] : [];

  // Obtener las ciudades disponibles para el estado/departamento actual
  const citiesList = CITIES_BY_STATE[currentCountryCode]?.[state] || [];

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

        {/* 1. Selección de País */}
        <div className={styles.formGroup}>
          <label htmlFor="country" className={styles.label}>País</label>
          <select 
            id="country"
            value={country}
            onChange={handleCountryChange}
            required
            className={styles.select}
          >
            {LATAM_COUNTRIES.map((item) => (
              <option key={item.code} value={item.name}>{item.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Selección de Estado/Departamento */}
        <div className={styles.formGroup}>
          <label htmlFor="state" className={styles.label}>Departamento / Estado / Provincia</label>
          {statesList.length > 0 ? (
            <>
              <select 
                id="state"
                value={state}
                onChange={handleStateChange}
                required
                className={styles.select}
              >
                <option value="">-- Selecciona --</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
                <option value="Otro">Otro (Escribir manualmente)</option>
              </select>
              {state === 'Otro' && (
                <input 
                  type="text" 
                  value={customState}
                  onChange={(e) => setCustomState(e.target.value)}
                  placeholder="Escribe tu Departamento/Estado" 
                  required
                  className={styles.input}
                  style={{ marginTop: '8px' }}
                />
              )}
            </>
          ) : (
            <input 
              type="text" 
              id="state"
              value={state === 'Otro' ? customState : state}
              onChange={(e) => {
                setState('Otro');
                setCustomState(e.target.value);
              }}
              placeholder="Escribe tu Departamento/Estado" 
              required
              className={styles.input}
            />
          )}
        </div>

        {/* 3. Selección de Ciudad/Municipio */}
        <div className={styles.formGroup}>
          <label htmlFor="city" className={styles.label}>Ciudad / Municipio</label>
          {citiesList.length > 0 ? (
            <>
              <select 
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className={styles.select}
              >
                <option value="">-- Selecciona --</option>
                {citiesList.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
                <option value="Otro">Otro (Escribir manualmente)</option>
              </select>
              {city === 'Otro' && (
                <input 
                  type="text" 
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Escribe tu Ciudad/Municipio" 
                  required
                  className={styles.input}
                  style={{ marginTop: '8px' }}
                />
              )}
            </>
          ) : (
            <input 
              type="text" 
              id="city"
              value={city === 'Otro' ? customCity : city}
              onChange={(e) => {
                setCity('Otro');
                setCustomCity(e.target.value);
              }}
              placeholder="Escribe tu Ciudad/Municipio" 
              required
              className={styles.input}
            />
          )}
        </div>

        {/* 4. Barrio (Opcional) */}
        <div className={styles.formGroup}>
          <label htmlFor="neighborhood" className={styles.label}>Barrio (Opcional)</label>
          <input 
            type="text" 
            id="neighborhood"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Ej: El Poblado" 
            className={styles.input}
          />
        </div>

        {/* 5. Teléfono Móvil (Al final y lado a lado con código de país) */}
        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>Número de Celular (con WhatsApp)</label>
          <div className={styles.phoneInputContainer}>
            <select 
              value={dialCode}
              onChange={(e) => setDialCode(e.target.value)}
              className={styles.dialSelect}
              title="Código de país"
            >
              {LATAM_COUNTRIES.map((item) => (
                <option key={item.code} value={item.dialCode}>
                  {item.code} ({item.dialCode})
                </option>
              ))}
            </select>
            <input 
              type="tel" 
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ej: 3001234567" 
              required
              className={styles.phoneInput}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={styles.btnSave}>
          {loading ? 'Guardando...' : 'Guardar Información'}
        </button>
      </form>

      <div className={styles.extraActions}>
        <button 
          type="button" 
          onClick={() => setActiveSection(activeSection === 'support' ? null : 'support')}
          className={styles.btnSupport}
        >
          Atención al Cliente
        </button>
        <button 
          type="button" 
          onClick={() => setActiveSection(activeSection === 'feedback' ? null : 'feedback')}
          className={styles.btnFeedback}
        >
          Enviar Feedback / Sugerencias
        </button>
      </div>

      {/* Formulario de Atención al Cliente (WhatsApp) */}
      {activeSection === 'support' && (
        <form onSubmit={handleSendSupport} className={styles.secondaryCard}>
          <h3>Contacto de Atención al Cliente</h3>
          <p className={styles.secondaryCardDesc}>
            Completa tu solicitud. Se abrirá un chat pre-rellenado directamente en nuestro canal de WhatsApp.
          </p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tipo de Solicitud</label>
            <select 
              value={supportTopic} 
              onChange={(e) => setSupportTopic(e.target.value)}
              required
              className={styles.select}
            >
              <option value="">-- Selecciona --</option>
              <option value="Dudas sobre el collar NFC">Dudas sobre el collar NFC</option>
              <option value="Soporte técnico de la web">Soporte técnico de la web</option>
              <option value="Problemas con mi cuenta">Problemas con mi cuenta</option>
              <option value="Otro">Otro (Escribir abajo)</option>
            </select>
          </div>
          {supportTopic === 'Otro' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Especifica tu Asunto</label>
              <input 
                type="text" 
                value={supportCustomTopic}
                onChange={(e) => setSupportCustomTopic(e.target.value)}
                placeholder="Ej: Dudas de envío"
                required
                className={styles.input}
              />
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.label}>Detalle de la Solicitud</label>
            <textarea 
              value={supportDetail}
              onChange={(e) => setSupportDetail(e.target.value)}
              placeholder="Explica en detalle qué necesitas para poder ayudarte..."
              required
              rows={4}
              className={styles.textarea}
            />
          </div>
          <button type="submit" className={styles.btnSendSupport}>
            Enviar a WhatsApp
          </button>
        </form>
      )}

      {/* Formulario de Feedback (Correo) */}
      {activeSection === 'feedback' && (
        <form onSubmit={handleSendFeedback} className={styles.secondaryCard}>
          <h3>Enviar Feedback / Reportar Error</h3>
          <p className={styles.secondaryCardDesc}>
            Tu reporte se enviará por correo electrónico a soporte de enlapetweb.
          </p>
          <div className={styles.formGroup}>
            <label className={styles.label}>¿Qué problema experimentaste?</label>
            <select 
              value={feedbackTopic} 
              onChange={(e) => setFeedbackTopic(e.target.value)}
              required
              className={styles.select}
            >
              <option value="">-- Selecciona --</option>
              <option value="Error al registrar/editar mascota">Error al registrar/editar mascota</option>
              <option value="Problema al recortar la foto">Problema al recortar la foto</option>
              <option value="Error al cargar la información pública">Error al cargar la información pública</option>
              <option value="Sugerencia de nueva función">Sugerencia de nueva función</option>
              <option value="Otro">Otro (Escribir abajo)</option>
            </select>
          </div>
          {feedbackTopic === 'Otro' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Especifica el Tema</label>
              <input 
                type="text" 
                value={feedbackCustomTopic}
                onChange={(e) => setFeedbackCustomTopic(e.target.value)}
                placeholder="Ej: Error ortográfico"
                required
                className={styles.input}
              />
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción Detallada</label>
            <textarea 
              value={feedbackDetail}
              onChange={(e) => setFeedbackDetail(e.target.value)}
              placeholder="Escribe detalladamente el error o tu sugerencia..."
              required
              rows={4}
              className={styles.textarea}
            />
          </div>
          <button type="submit" className={styles.btnSendFeedback}>
            Enviar por Correo
          </button>
        </form>
      )}

      <button 
        type="button" 
        onClick={() => {
          if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            logout();
            if (onSaveComplete) onSaveComplete();
          }
        }} 
        className={styles.btnLogout}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
