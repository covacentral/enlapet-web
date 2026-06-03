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
