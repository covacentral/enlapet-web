/**
 * Genera un código alfanumérico seguro para el EPID (EnlaPet ID) con formato "ELP-XXXXXX"
 * @returns {string} Código único formateado.
 */
export function generateEPID() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const length = 6;
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return `ELP-${code}`;
}

/**
 * Genera un token aleatorio largo y no adivinable para la URL pública del NFC.
 * @returns {string} Token de seguridad hexadecimal de 32 caracteres.
 */
export function generateSecureToken() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calcula la edad legible de una mascota a partir de su fecha de nacimiento YYYY-MM-DD.
 * @param {string} birthDateString - Fecha de nacimiento.
 * @returns {string} Edad legible en años/meses.
 */
export function formatPetAge(birthDateString) {
  if (!birthDateString) return 'Cachorro';
  
  const birth = new Date(birthDateString);
  const now = new Date();
  
  // Si la fecha es inválida
  if (isNaN(birth.getTime())) return 'Cachorro';
  
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  
  if (months <= 0) {
    return 'Recién nacido';
  }
  
  if (months < 12) {
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  }
  
  return `${years} ${years === 1 ? 'año' : 'años'} y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
}
