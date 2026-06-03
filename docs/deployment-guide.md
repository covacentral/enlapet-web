# Guía de Despliegue Paso a Paso - EnlaPet MVP

Esta guía explica detalladamente todos los servicios que debes configurar en **Google Firebase** y **Vercel** para que la aplicación funcione en producción con total seguridad.

---

## 1. Configuración en la Consola de Firebase

### Paso 1.1: Crear el Proyecto
1. Ve a [Firebase Console](https://console.firebase.google.com/).
2. Haz clic en **Agregar proyecto** (o "Add project") y asígnale el nombre: `enlapet`.
3. Habilita o deshabilita Google Analytics según tu preferencia (para producción inicial puedes deshabilitarlo para acelerar la creación).
4. Haz clic en **Crear proyecto**.

### Paso 1.2: Habilitar Autenticación (Firebase Auth)
1. En el menú lateral izquierdo, ve a **Build** > **Authentication**.
2. Haz clic en **Comenzar** (o "Get Started").
3. En la pestaña **Método de inicio de sesión** (Sign-in method), selecciona **Google**.
4. Activa el interruptor para habilitarlo.
5. Configura el correo de soporte del proyecto y haz clic en **Guardar**.

### Paso 1.3: Crear la Base de Datos (Cloud Firestore)
1. En el menú lateral izquierdo, ve a **Build** > **Firestore Database**.
2. Haz clic en **Crear base de datos** (Create database).
3. Selecciona la ubicación de tu servidor más cercana a tus usuarios (ej: `nam5 (us-central)` es excelente y estándar).
4. Elige **Comenzar en modo de prueba** o **modo de producción** (cualquiera está bien, ya que sobrescribiremos las reglas).
5. Haz clic en **Habilitar**.
6. Ve a la pestaña **Reglas** (Rules), borra el contenido actual, pega las reglas de nuestro archivo `firestore.rules` y haz clic en **Publicar** (Publish).

### Paso 1.4: Configurar el Almacenamiento de Fotos (Cloud Storage)
1. En el menú lateral, ve a **Build** > **Storage**.
2. Haz clic en **Comenzar** (Get Started).
3. Selecciona iniciar en modo de producción, haz clic en siguiente y luego en **Listo**.

### Paso 1.5: Registrar la App Web y Obtener las Credenciales
1. Ve al engranaje de configuración del proyecto en la esquina superior izquierda (Configuración del proyecto / Project Settings).
2. En la pestaña **General**, desplázate hacia abajo hasta la sección "Tus apps" y haz clic en el icono Web (`</>`).
3. Registra tu aplicación con el nombre `enlapet-web`.
4. Firebase te mostrará un código de inicialización con un objeto `firebaseConfig` que luce así:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "enlapet.firebaseapp.com",
     projectId: "enlapet",
     storageBucket: "enlapet.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:123456:web:abcd"
   };
   ```
5. Copia estos valores; los usaremos para configurar el archivo `.env` en local y en Vercel.

---

## 2. Configuración en Vercel (Hosting)

### Paso 2.1: Crear y Conectar el Repositorio
1. Sube tu carpeta `enlapet-web` a tu cuenta de GitHub (crearemos el repositorio `enlapet-web` en tu cuenta).
2. Ve a [Vercel](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **Add New** > **Project**.
4. Importa el repositorio `enlapet-web`.

### Paso 2.2: Configurar las Variables de Entorno en Vercel
En la pantalla de configuración antes de desplegar, despliega la sección **Environment Variables** y añade las siguientes llaves con los valores que copiaste de Firebase en el Paso 1.5:

| Nombre de la Variable | Valor (Ejemplo) |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `enlapet.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `enlapet` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `enlapet.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1234567890` |
| `VITE_FIREBASE_APP_ID` | `1:123456:web:abcd` |

*Nota: Es muy importante incluir el prefijo `VITE_` ya que de lo contrario Vite no expondrá las variables al frontend en producción.*

### Paso 2.3: Desplegar
1. Haz clic en **Deploy**.
2. En un par de minutos tu aplicación estará en línea con una URL pública gratuita provista por Vercel (ej: `enlapet-web.vercel.app`).

### Paso 2.4: Registrar la URL de Vercel en la Consola de Google/Firebase (Para Google Auth)
Por seguridad, Google solo permite iniciar sesión desde dominios autorizados:
1. En la consola de Firebase, ve a **Authentication** > **Settings** (Ajustes).
2. En la sección **Dominios autorizados** (Authorized domains), haz clic en **Agregar dominio**.
3. Pega el dominio público que te dio Vercel (ej. `enlapet-web.vercel.app`) y haz clic en **Guardar**.
