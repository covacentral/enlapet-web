import React from 'react';
import { useAuth } from '../auth/AuthContext';
import ClinicDashboard from './ClinicDashboard';
import StaffDashboard from './StaffDashboard';
import ClinicVerificationGate from './ClinicVerificationGate';

/**
 * ClinicRouter — Selecciona el dashboard correcto según rol y subtipo.
 *
 * role === 'clinic'
 *   → ClinicDashboard (admin de la clínica)
 *   → Antes de mostrarlo, verifica si necesita pasar por verificación
 *
 * role === 'staff'
 *   → StaffDashboard (recepción, veterinario, contabilidad)
 *   → El staff de tipo 'veterinario' pasa por verificación individual
 */
export default function ClinicRouter() {
  const { role, subRole, clinicData, clinicSubtype, loading } = useAuth();

  if (loading) return null;

  if (role === 'staff') {
    // Staff siempre va a StaffDashboard
    // Internamente StaffDashboard maneja la verificación de veterinarios
    return <StaffDashboard />;
  }

  if (role === 'clinic') {
    // ClinicVerificationGate decide si mostrar el formulario de verificación
    // o el dashboard completo según clinicData.status
    return <ClinicVerificationGate />;
  }

  // Fallback (no debería ocurrir)
  return null;
}
