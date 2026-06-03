# Esquema de Base de Datos y Reglas de Seguridad - EnlaPet MVP

## Colecciones y Documentos

### 1. `users` (Colección)
Almacena la información de contacto general del dueño de las mascotas.
* **ID del Documento:** UID del usuario de Firebase Auth.
* **Estructura:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "contact": {
    "country": "Colombia",
    "city": "Medellín",
    "neighborhood": "El Poblado",
    "phone": "+573001234567"
  },
  "createdAt": "2026-06-03T16:00:00.000Z",
  "updatedAt": "2026-06-03T16:00:00.000Z"
}
```

### 2. `pets` (Colección)
Almacena los perfiles individuales de las mascotas.
* **ID del Documento:** Generado automáticamente por Firestore.
* **Estructura:**
```json
{
  "ownerId": "UID_DEL_DUEÑO",
  "epid": "ELP-8F3X29",         // ID único de 6 caracteres legible (ej: para veterinarios)
  "secureToken": "UUID_O_HASH", // Token único no deducible para la URL pública del collar
  "name": "Toby",
  "species": "Dog",            // Dog, Cat, etc.
  "breed": "Golden Retriever",
  "age": 3,                    // Años
  "gender": "Male",            // Male, Female
  "photoUrl": "https://firebasestorage.googleapis.com/.../toby.jpg",
  "createdAt": "2026-06-03T16:00:00.000Z",
  "updatedAt": "2026-06-03T16:00:00.000Z"
}
```

### 3. `pets/{petId}/medical_records` (Subcolección)
Diario clínico y vacunas de la mascota.
* **ID del Documento:** Generado automáticamente por Firestore.
* **Estructura:**
```json
{
  "type": "vaccine",           // vaccine, checkup, deworming, incident
  "title": "Vacuna Antirrábica",
  "date": "2026-05-10",
  "notes": "Próxima dosis en 1 año. Aplicada en Veterinaria San José.",
  "createdBy": "UID_DEL_AUTOR", // Creador del registro
  "createdAt": "2026-06-03T16:00:00.000Z"
}
```

### 4. `nfc_mappings` (Colección de Seguridad)
Permite buscar el ID interno de una mascota (`petId`) a partir del `secureToken` expuesto en la URL pública, sin tener que filtrar toda la colección `pets` y protegiendo los UIDs internos.
* **ID del Documento:** `secureToken` de la mascota.
* **Estructura:**
```json
{
  "petId": "ID_DE_LA_MASCOTA",
  "ownerId": "UID_DEL_DUEÑO"
}
```

---

## Reglas de Seguridad de Firestore (Resumen)

* **`users`:**
  * **Lectura/Escritura:** Solo el usuario autenticado con el mismo UID puede leer y escribir su propia ficha (`request.auth.uid == userId`).
* **`pets`:**
  * **Lectura:** El dueño puede leer. Un usuario no autenticado (público) puede leer **únicamente** a través del flujo de mapeo por token (vista pública del collar).
  * **Escritura:** Solo el dueño puede crear o modificar su mascota (`request.auth.uid == resource.data.ownerId`).
* **`nfc_mappings`:**
  * **Lectura:** Permisión de lectura pública (`allow read: if true`).
  * **Escritura:** Solo el dueño puede crear el mapeo al registrar la mascota.
