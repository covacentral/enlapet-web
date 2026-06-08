import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { ChevronLeft, Info, Upload, ShieldAlert, CheckCircle } from 'lucide-react';
import { LATAM_COUNTRIES, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../../shared/utils/locationData';
import styles from './OwnerConfig.module.css';

export default function OwnerConfig({ onSaveComplete, onBack }) {
  const { user, userData: ownerData, refreshProfileData: refreshOwnerData, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  // Estado de solicitud de verificación de veterinaria
  const [vetRequest, setVetRequest] = useState(null);
  const [vetRequestLoading, setVetRequestLoading] = useState(true);
  const [submittingVet, setSubmittingVet] = useState(false);
  const [showSolicitudes, setShowSolicitudes] = useState(false);

  // Campos para el formulario de solicitud vet
  const [vetForm, setVetForm] = useState({
    clinicName: '',
    phone: '',
    city: '',
    neighborhood: '',
    address: '',
    nit: '',
    rutUrl: '',
    professionalCard: '',
    licenseUrl: ''
  });

  useEffect(() => {
    if (!user) return;
    const fetchVetRequest = async () => {
      try {
        const docRef = doc(db, 'clinics', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setVetRequest(data);
          setVetForm({
            clinicName: data.name || '',
            phone: data.phone || '',
            city: data.city || '',
            neighborhood: data.neighborhood || '',
            address: data.address || '',
            nit: data.nit || '',
            rutUrl: data.rutUrl || '',
            professionalCard: data.professionalCard || '',
            licenseUrl: data.licenseUrl || ''
          });
        }
      } catch (err) {
        console.error("Error al obtener solicitud de veterinaria:", err);
      } finally {
        setVetRequestLoading(false);
      }
    };
    fetchVetRequest();
  }, [user]);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setVetForm(prev => ({ ...prev, [field]: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleVetSubmit = async (e) => {
    e.preventDefault();
    if (!vetForm.clinicName.trim() || !vetForm.phone.trim() || !vetForm.city.trim() || !vetForm.address.trim() || !vetForm.nit.trim() || !vetForm.professionalCard.trim()) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }
    if (!vetForm.rutUrl) {
      alert("Por favor sube una imagen legible de tu documento RUT.");
      return;
    }
    if (!vetForm.licenseUrl) {
      alert("Por favor sube una imagen legible de tu Tarjeta Profesional.");
      return;
    }

    setSubmittingVet(true);
    try {
      const docRef = doc(db, 'clinics', user.uid);
      const requestData = {
        name: vetForm.clinicName,
        phone: vetForm.phone,
        city: vetForm.city,
        neighborhood: vetForm.neighborhood,
        address: vetForm.address,
        nit: vetForm.nit,
        rutUrl: vetForm.rutUrl,
        professionalCard: vetForm.professionalCard,
        licenseUrl: vetForm.licenseUrl,
        status: 'pending',
        plan: 'free',
        email: user.email,
        updatedAt: new Date().toISOString()
      };
      if (!vetRequest) {
        requestData.createdAt = new Date().toISOString();
      }
      await setDoc(docRef, requestData, { merge: true });
      
      const updatedSnap = await getDoc(docRef);
      setVetRequest(updatedSnap.data());
      alert("¡Solicitud enviada con éxito! El equipo de covacentral revisará tus documentos.");
    } catch (err) {
      console.error("Error al enviar solicitud de veterinaria:", err);
      alert("Error al enviar solicitud: " + err.message);
    } finally {
      setSubmittingVet(false);
    }
  };

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

      {/* Acordeón de Solicitudes / Alianzas */}
      {!vetRequestLoading && (
        <div className={styles.accordionContainer} style={{ marginTop: '24px' }}>
          <button 
            type="button" 
            className={styles.accordionHeader} 
            onClick={() => setShowSolicitudes(!showSolicitudes)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#fff',
              textAlign: 'left'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              💼 Solicitudes / Alianzas
            </span>
            <span>{showSolicitudes ? '▲' : '▼'}</span>
          </button>

          {showSolicitudes && (
            <div className={styles.accordionContent} style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#fff', fontWeight: '700' }}>Registrar Consultorio Clínico o Veterinaria</h3>
              <p className={styles.secondaryCardDesc} style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
                Si eres médico veterinario o administras un consultorio clínico, solicita la verificación de tu cuenta para habilitar el portal clínico. Al iniciar el proceso, cerraremos tu sesión actual para que puedas registrarte con tu correo empresarial o corporativo.
              </p>
              
              {vetRequest && (
                <div className={styles.vetStatusBox} style={{ margin: '0 0 16px 0', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {vetRequest.status === 'verified' ? (
                      <CheckCircle style={{ color: '#10b981' }} size={24} />
                    ) : vetRequest.status === 'suspended' ? (
                      <ShieldAlert style={{ color: '#ef4444' }} size={24} />
                    ) : (
                      <ShieldAlert style={{ color: '#f59e0b' }} size={24} />
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                        Estado: {vetRequest.status === 'verified' ? 'Aprobado' : vetRequest.status === 'suspended' ? 'Suspendido' : 'Pendiente de Aprobación'}
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#888', lineHeight: 1.4 }}>
                        {vetRequest.status === 'verified' 
                          ? 'Tu cuenta de clínica ha sido aprobada. Por favor ingresa desde el portal de clínicas.' 
                          : vetRequest.status === 'suspended'
                          ? 'Tu acceso ha sido suspendido temporalmente por covacentral.'
                          : 'Tu documentación está siendo validada por el administrador maestro.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Para iniciar el registro de enlapet clinic, cerraremos tu sesión actual para que puedas registrar o ingresar con tu cuenta empresarial. ¿Deseas continuar?")) {
                    localStorage.setItem('auth_portal_mode', 'clinic');
                    logout();
                    if (onSaveComplete) onSaveComplete();
                  }
                }}
                className={styles.btnSave}
                style={{ width: 'auto', padding: '10px 20px', background: 'hsl(142, 70%, 45%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Solicitar enlapet clinic
              </button>
            </div>
          )}
        </div>
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
