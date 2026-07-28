/* ============================================================
   RESCATE OPEN — Ubicación aproximada por diseño
   Regla: el mapa público NUNCA muestra la dirección exacta. Se
   publica la celda aproximada; la dirección se revela solo a la
   organización que ya reservó y queda en auditoría.
   ============================================================ */

const RADIO_TIERRA_KM = 6371;
const KM_POR_GRADO_LAT = 110.574;

/**
 * Reduce la precisión a una cuadrícula de `km`. Con 1 km, la posición
 * publicada puede corresponder a cualquier punto de esa manzana ampliada.
 */
export function aproximar({ lat, lon }, km = 1) {
  const paso = km / KM_POR_GRADO_LAT;
  const pasoLon = km / (KM_POR_GRADO_LAT * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    lat: Math.round(lat / paso) * paso,
    lon: Math.round(lon / pasoLon) * pasoLon,
    precisionKm: km,
  };
}

/** Identificador estable de celda, útil para agrupar sin exponer coordenadas. */
export function celda({ lat, lon }, km = 1) {
  const a = aproximar({ lat, lon }, km);
  return `c${a.lat.toFixed(3)}_${a.lon.toFixed(3)}_${km}`;
}

export function distanciaKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h)) * 10) / 10;
}

function rad(g) {
  return (g * Math.PI) / 180;
}

/** Ciudades del piloto. Sirven para filtrar sin pedir geolocalización del navegador. */
export const CIUDADES = [
  { id: "BOG", nombre: "Bogotá D.C.", lat: 4.711, lon: -74.072 },
  { id: "MDE", nombre: "Medellín", lat: 6.244, lon: -75.581 },
  { id: "CLO", nombre: "Cali", lat: 3.452, lon: -76.532 },
  { id: "BAQ", nombre: "Barranquilla", lat: 10.968, lon: -74.781 },
  { id: "CTG", nombre: "Cartagena", lat: 10.391, lon: -75.479 },
  { id: "BGA", nombre: "Bucaramanga", lat: 7.119, lon: -73.122 },
  { id: "PEI", nombre: "Pereira", lat: 4.813, lon: -75.696 },
  { id: "MTR", nombre: "Montería", lat: 8.748, lon: -75.881 },
];

export function ciudad(id) {
  return CIUDADES.find((c) => c.id === id) || null;
}

/**
 * Texto para la interfaz pública. Deliberadamente vago:
 * "Zona centro · Bogotá D.C. (aprox. 1 km)".
 */
export function descripcionPublica(donacion) {
  const c = ciudad(donacion.ciudadId);
  const zona = donacion.zona ? `${donacion.zona} · ` : "";
  const nombre = c ? c.nombre : "Ubicación por confirmar";
  return `${zona}${nombre} (aprox. ${donacion.precisionKm || 1} km)`;
}
