import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../core/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { generateEPID, generateSecureToken } from '../../shared/utils/generators';
import ImageCropper from '../../shared/components/ImageCropper';
import { ChevronLeft, Camera } from 'lucide-react';
import styles from './AddPetModal.module.css';

export default function AddPetModal({ onSaveComplete, onBack, petId }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [existingPet, setExistingPet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    species: 'Dog',
    breed: '',
    age: '',
    gender: 'Male'
  });

  // Estado para el recortador de imagen
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState('');

  // 0. Cargar datos si estamos en modo edición
  useEffect(() => {
    if (!petId) return;
    const fetchPetData = async () => {
      try {
        const petRef = doc(db, 'pets', petId);
        const petSnap = await getDoc(petRef);
        if (petSnap.exists()) {
          const data = petSnap.data();
          setExistingPet(data);
          setFormData({
            name: data.name || '',
            species: data.species || 'Dog',
            breed: data.breed || '',
            age: data.age || '',
            gender: data.gender || 'Male'
          });
          if (data.photoUrl) {
            setCroppedPreviewUrl(data.photoUrl);
          }
        }
      } catch (err) {
        console.error("Error al cargar mascota para editar:", err);
      }
    };
    fetchPetData();
  }, [petId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Maneja la selección del archivo original
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Recibe la imagen recortada 1:1 en formato WebP blob
  const handleCropComplete = (blob) => {
    setCroppedBlob(blob);
    setCroppedPreviewUrl(URL.createObjectURL(blob));
    setSelectedImageSrc(null); // Cerrar recortador
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Por favor introduce el nombre de la mascota.");
      return;
    }

    setLoading(true);
    try {
      let photoUrl = existingPet?.photoUrl || '';

      // 1. Subir la foto recortada a Firebase Storage si existe
      if (croppedBlob) {
        const fileId = `${user.uid}_${Date.now()}`;
        const storageRef = ref(storage, `pets/${fileId}.webp`);
        await uploadBytes(storageRef, croppedBlob, { contentType: 'image/webp' });
        photoUrl = await getDownloadURL(storageRef);
      }

      if (petId) {
        // Modo Edición
        const petRef = doc(db, 'pets', petId);
        await updateDoc(petRef, {
          name: formData.name,
          species: formData.species,
          breed: formData.breed,
          age: Number(formData.age) || 0,
          gender: formData.gender,
          photoUrl,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Modo Registro
        const epid = generateEPID();
        const secureToken = generateSecureToken();

        const petData = {
          ownerId: user.uid,
          epid,
          secureToken,
          name: formData.name,
          species: formData.species,
          breed: formData.breed,
          age: Number(formData.age) || 0,
          gender: formData.gender,
          photoUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Guardar en base de datos
        const petsCollectionRef = collection(db, 'pets');
        const petDocRef = await addDoc(petsCollectionRef, petData);

        // Crear mapeo NFC
        const mappingRef = doc(db, 'nfc_mappings', secureToken);
        await setDoc(mappingRef, {
          petId: petDocRef.id,
          ownerId: user.uid
        });
      }

      if (onSaveComplete) onSaveComplete();
    } catch (error) {
      console.error("Error al guardar mascota:", error);
      alert("Error al guardar los datos. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Recortador modal flotante */}
      {selectedImageSrc && (
        <ImageCropper 
          imageSrc={selectedImageSrc}
          onCrop={handleCropComplete}
          onCancel={() => setSelectedImageSrc(null)}
        />
      )}

      <div className={styles.header}>
        {onBack && (
          <button onClick={onBack} className={styles.backBtn} aria-label="Volver">
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className={styles.title}>Registrar Mascota</h1>
      </div>

      <form onSubmit={handleSave} className={styles.card}>
        {/* Sección de Foto de Mascota */}
        <div className={styles.imageSection}>
          <div className={styles.imagePreviewContainer} onClick={() => fileInputRef.current.click()}>
            {croppedPreviewUrl ? (
              <img src={croppedPreviewUrl} alt="Vista previa" className={styles.imagePreview} />
            ) : (
              <Camera className={styles.uploadIcon} size={32} />
            )}
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current.click()} 
            className={styles.btnUpload}
          >
            Subir Foto (1:1)
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>Nombre de la Mascota</label>
          <input 
            type="text" 
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej: Toby" 
            required
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label htmlFor="species" className={styles.label}>Especie</label>
            <select 
              id="species"
              name="species"
              value={formData.species}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="Dog">Perro</option>
              <option value="Cat">Gato</option>
              <option value="Other">Otro</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="gender" className={styles.label}>Género</label>
            <select 
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="Male">Macho</option>
              <option value="Female">Hembra</option>
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label htmlFor="breed" className={styles.label}>Raza / Línea</label>
            <input 
              type="text" 
              id="breed"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              placeholder="Ej: Golden" 
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="age" className={styles.label}>Edad (Años)</label>
            <input 
              type="number" 
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Ej: 3" 
              min="0"
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={styles.btnSubmit}>
          {loading ? 'Registrando Mascota...' : 'Registrar y Generar EPID'}
        </button>
      </form>
    </div>
  );
}
