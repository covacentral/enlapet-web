import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
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

      <button 
        type="button" 
        onClick={() => {
          logout();
          if (onSaveComplete) onSaveComplete();
        }} 
        className={styles.btnLogout}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
