export const LATAM_COUNTRIES = [
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591' },
  { code: 'CL', name: 'Chile', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { code: 'CU', name: 'Cuba', dialCode: '+53' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502' },
  { code: 'HN', name: 'Honduras', dialCode: '+504' },
  { code: 'MX', name: 'México', dialCode: '+52' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { code: 'PA', name: 'Panamá', dialCode: '+507' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595' },
  { code: 'PE', name: 'Perú', dialCode: '+51' },
  { code: 'DO', name: 'República Dominicana', dialCode: '+1' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58' }
];

export const STATES_BY_COUNTRY = {
  CO: [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 
    'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 
    'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 
    'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 
    'Valle del Cauca', 'Vaupés', 'Vichada'
  ],
  MX: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 
    'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 
    'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ],
  PE: [
    'Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 
    'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 
    'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ],
  AR: [
    'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 
    'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 
    'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'
  ],
  VE: [
    'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes', 
    'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 
    'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas (La Guaira)', 'Yaracuy', 'Zulia'
  ],
  CL: [
    'Aysén', 'Antofagasta', 'Araucanía', 'Arica y Parinacota', 'Atacama', 'Biobío', 'Coquimbo', 
    'Los Lagos', 'Los Ríos', 'Magallanes', 'Maule', 'Ñuble', 'O\'Higgins', 'Santiago Metropolitana', 
    'Tarapacá', 'Valparaíso'
  ],
  EC: [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galápagos', 
    'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza', 
    'Pichincha', 'Santa Elena', 'Santo Domingo', 'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe'
  ],
  GT: [
    'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala', 
    'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 
    'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'
  ],
  HN: [
    'Atlántida', 'Choluteca', 'Colón', 'Comayagua', 'Copán', 'Cortés', 'El Paraíso', 'Francisco Morazán', 
    'Gracias a Dios', 'Intibucá', 'Islas de la Bahía', 'La Paz', 'Lempira', 'Ocotepeque', 'Olancho', 
    'Santa Bárbara', 'Valle', 'Yoro'
  ],
  SV: [
    'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión', 
    'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'
  ],
  NI: [
    'Boaco', 'Carazo', 'Chinandega', 'Chontales', 'Estelí', 'Granada', 'Jinotega', 'León', 'Madriz', 
    'Managua', 'Masaya', 'Matagalpa', 'Nueva Segovia', 'Río San Juan', 'Rivas', 'RACCN', 'RACCS'
  ],
  CR: [
    'Alajuela', 'Cartago', 'Guanacaste', 'Heredia', 'Limón', 'Puntarenas', 'San José'
  ],
  PA: [
    'Bocas del Toro', 'Chiriquí', 'Coclé', 'Colón', 'Darién', 'Herrera', 'Los Santos', 'Panamá', 
    'Panamá Oeste', 'Veraguas', 'Guna Yala', 'Ngäbe-Buglé', 'Emberá-Wounaan'
  ],
  DO: [
    'Azua', 'Bahoruco', 'Barahona', 'Dajabón', 'Distrito Nacional', 'Duarte', 'El Seibo', 'Elías Piña', 
    'Espaillat', 'Hato Mayor', 'Hermanas Mirabal', 'Independencia', 'La Altagracia', 'La Romana', 
    'La Vega', 'María Trinidad Sánchez', 'Monseñor Nouel', 'Monte Cristi', 'Monte Plata', 'Pedernales', 
    'Peravia', 'Puerto Plata', 'Samaná', 'San Cristóbal', 'San José de Ocoa', 'San Juan', 
    'San Pedro de Macorís', 'Sánchez Ramírez', 'Santiago', 'Santiago Rodríguez', 'Valverde'
  ],
  BO: [
    'Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'
  ],
  UY: [
    'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 
    'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 
    'Soriano', 'Tacuarembó', 'Treinta y Tres'
  ],
  PY: [
    'Alto Paraguay', 'Alto Paraná', 'Amambay', 'Asunción', 'Boquerón', 'Caaguazú', 'Caazapá', 
    'Canindeyú', 'Central', 'Concepción', 'Cordillera', 'Guairá', 'Itapúa', 'Misiones', 'Ñeembucú', 
    'Paraguarí', 'Presidente Hayes', 'San Pedro'
  ],
  CU: [
    'Artemisa', 'Camagüey', 'Ciego de Ávila', 'Cienfuegos', 'Granma', 'Guantánamo', 'Holguín', 
    'Isla de la Juventud', 'La Habana', 'Las Tunas', 'Matanzas', 'Mayabeque', 'Pinar del Río', 
    'Sancti Spíritus', 'Santiago de Cuba', 'Villa Clara'
  ]
};

// Ciudades principales por departamento/estado para facilitar la selección.
export const CITIES_BY_STATE = {
  // Colombia
  Antioquia: ['Medellín', 'Envigado', 'Sabaneta', 'Bello', 'Itagüí', 'Rionegro', 'Apartadó', 'Turbo', 'Caucasia'],
  Atlántico: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Baranoa'],
  Bogotá: ['Bogotá D.C.'],
  Cundinamarca: ['Bogotá D.C.', 'Soacha', 'Chía', 'Facatativá', 'Zipaquirá', 'Fusagasugá', 'Girardot', 'Cajicá', 'Funza', 'Mosquera'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Buga', 'Cartago', 'Jamundí', 'Yumbo'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'],
  Bolívar: ['Cartagena', 'Magangué', 'Turbaco'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
  Risaralda: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
  Caldas: ['Manizales', 'Chinchiná', 'La Dorada'],
  Quindío: ['Armenia', 'Calarcá', 'Tebaida'],
  Tolima: ['Ibagué', 'Espinal', 'Melgar'],
  Huila: ['Neiva', 'Pitalito', 'Garzón'],
  Nariño: ['Pasto', 'Tumaco', 'Ipiales'],
  Córdoba: ['Montería', 'Cereté', 'Lorica', 'Sahagún'],
  Sucre: ['Sincelejo', 'Corozal'],
  Magdalena: ['Santa Marta', 'Ciénaga', 'Fundación'],
  Cesar: ['Valledupar', 'Aguachica'],
  Meta: ['Villavicencio', 'Acacías', 'Granada'],
  // México
  'Ciudad de México': ['Álvaro Obregón', 'Coyoacán', 'Gustavo A. Madero', 'Iztapalapa', 'Miguel Hidalgo', 'Tlalpan', 'Cuauhtémoc', 'Benito Juárez'],
  Jalisco: ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Tlajomulco de Zúñiga'],
  'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'San Nicolás de los Garza', 'Guadalupe', 'Apodaca', 'Santa Catarina', 'Escobedo'],
  'Estado de México': ['Ecatepec', 'Nezahualcóyotl', 'Naucalpan', 'Tlalnepantla', 'Toluca', 'Chimalhuacán', 'Cuautitlán Izcalli'],
  Puebla: ['Puebla', 'Tehuacán', 'San Andrés Cholula', 'San Pedro Cholula'],
  // Perú
  Lima: ['Lima', 'Miraflores', 'San Isidro', 'Santiago de Surco', 'La Molina', 'San Borja', 'Chorrillos', 'San Miguel'],
  Arequipa: ['Arequipa', 'Cayma', 'Yanahuara', 'Cerro Colorado'],
  'La Libertad': ['Trujillo', 'Huanchaco', 'El Porvenir'],
  Piura: ['Piura', 'Sullana', 'Talara'],
  // Argentina
  'Buenos Aires': ['Ciudad Autónoma de Buenos Aires', 'La Plata', 'Mar del Plata', 'Bahía Blanca', 'San Isidro', 'Vicente López', 'Tandil'],
  Córdoba: ['Córdoba', 'Villa Carlos Paz', 'Río Cuarto', 'San Francisco'],
  'Santa Fe': ['Rosario', 'Santa Fe', 'Rafaela', 'Venado Tuerto']
};
