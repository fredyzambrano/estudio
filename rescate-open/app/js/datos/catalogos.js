/* ============================================================
   RESCATE OPEN — Catálogos operativos
   Estas tablas son PARÁMETROS DE PRODUCTO, no doctrina sanitaria.
   TODO (inocuidad): un profesional debe validar rangos, ventanas
   y exigencias por categoría antes del piloto real, tomando como
   referencia la Resolución 2674 de 2013 y las normas de rotulado
   vigentes. Cambiar aquí cambia el comportamiento de bloqueo.
   ============================================================ */

export const CONSERVACION = {
  AMBIENTE: { etiqueta: "Ambiente seco", min: null, max: null, icono: "📦" },
  REFRIGERADO: { etiqueta: "Refrigerado", min: 0, max: 4, icono: "❄️" },
  CONGELADO: { etiqueta: "Congelado", min: -Infinity, max: -18, icono: "🧊" },
  CALIENTE: { etiqueta: "Caliente mantenido", min: 60, max: null, icono: "🔥" },
};

export const CATEGORIAS = {
  FRUTA_VERDURA: {
    etiqueta: "Frutas y verduras",
    icono: "🥬",
    requiereFecha: false,
    requiereLote: false,
    requiereTrazabilidad: false,
    conservaciones: ["AMBIENTE", "REFRIGERADO"],
    ventanaMaxHoras: 48,
    riesgo: "medio",
  },
  PANADERIA: {
    etiqueta: "Panadería y repostería",
    icono: "🥖",
    requiereFecha: true,
    requiereLote: false,
    requiereTrazabilidad: false,
    conservaciones: ["AMBIENTE", "REFRIGERADO", "CONGELADO"],
    ventanaMaxHoras: 24,
    riesgo: "medio",
  },
  ABARROTES: {
    etiqueta: "Abarrotes envasados",
    icono: "🥫",
    requiereFecha: true,
    requiereLote: true,
    requiereTrazabilidad: false,
    conservaciones: ["AMBIENTE"],
    ventanaMaxHoras: 168,
    riesgo: "bajo",
  },
  LACTEOS: {
    etiqueta: "Lácteos",
    icono: "🥛",
    requiereFecha: true,
    requiereLote: true,
    requiereTrazabilidad: true,
    conservaciones: ["REFRIGERADO", "CONGELADO"],
    ventanaMaxHoras: 12,
    riesgo: "alto",
  },
  CARNICOS: {
    etiqueta: "Cárnicos y derivados",
    icono: "🍖",
    requiereFecha: true,
    requiereLote: true,
    requiereTrazabilidad: true,
    conservaciones: ["REFRIGERADO", "CONGELADO"],
    ventanaMaxHoras: 8,
    riesgo: "alto",
  },
  CONGELADOS: {
    etiqueta: "Congelados",
    icono: "🧊",
    requiereFecha: true,
    requiereLote: true,
    requiereTrazabilidad: true,
    conservaciones: ["CONGELADO"],
    ventanaMaxHoras: 12,
    riesgo: "alto",
  },
  PREPARADO: {
    etiqueta: "Alimento preparado",
    icono: "🍲",
    requiereFecha: true,
    requiereLote: true,
    requiereTrazabilidad: true,
    conservaciones: ["REFRIGERADO", "CALIENTE", "CONGELADO"],
    ventanaMaxHoras: 4,
    riesgo: "critico",
  },
  BEBIDAS: {
    etiqueta: "Bebidas envasadas",
    icono: "🧃",
    requiereFecha: true,
    requiereLote: true,
    requiereTrazabilidad: false,
    conservaciones: ["AMBIENTE", "REFRIGERADO"],
    ventanaMaxHoras: 72,
    riesgo: "bajo",
  },
};

export const ESTADO_EMPAQUE = {
  SELLADO_ORIGINAL: { etiqueta: "Sellado de fábrica", aceptado: true },
  SELLADO_REEMPAQUE: { etiqueta: "Reempacado y sellado con registro", aceptado: true },
  GRANEL_CONTROLADO: { etiqueta: "Granel en contenedor limpio y cerrado", aceptado: true },
  ABIERTO: { etiqueta: "Abierto o parcialmente consumido", aceptado: false },
  DANADO: { etiqueta: "Empaque dañado, inflado u oxidado", aceptado: false },
};

/* Lista base de alérgenos de declaración habitual.
   TODO (legal/inocuidad): confirmar contra la norma de rotulado vigente. */
export const ALERGENOS = [
  { id: "GLUTEN", etiqueta: "Cereales con gluten" },
  { id: "CRUSTACEOS", etiqueta: "Crustáceos" },
  { id: "HUEVO", etiqueta: "Huevo" },
  { id: "PESCADO", etiqueta: "Pescado" },
  { id: "MANI", etiqueta: "Maní" },
  { id: "SOYA", etiqueta: "Soya" },
  { id: "LECHE", etiqueta: "Leche y derivados" },
  { id: "FRUTOS_SECOS", etiqueta: "Frutos secos de árbol" },
  { id: "SESAMO", etiqueta: "Sésamo" },
  { id: "SULFITOS", etiqueta: "Sulfitos" },
];

export const UNIDADES = {
  KG: { etiqueta: "kilogramos", aKg: 1 },
  UNIDAD: { etiqueta: "unidades", aKg: 0.25 }, // TODO: peso promedio configurable por donante
  BANDEJA: { etiqueta: "bandejas", aKg: 1.5 },
  CANASTA: { etiqueta: "canastas", aKg: 12 },
  PORCION: { etiqueta: "porciones", aKg: 0.4 },
};

export const MOTIVOS_RECHAZO = [
  "Producto no corresponde a lo publicado",
  "Cadena de frío incumplida en la entrega",
  "Empaque comprometido al momento del retiro",
  "Fecha de vencimiento inconsistente",
  "Cantidad insuficiente para movilizar",
  "Organización no pudo asumir el transporte",
];

/* Factores de impacto. Son ESTIMACIONES de comunicación, no medición.
   Se muestran siempre con la palabra "estimado" en la interfaz. */
export const FACTORES_IMPACTO = {
  kgPorRacion: 0.4,        // ración estándar asumida para el piloto
  co2ePorKg: 2.5,          // kg CO2e evitados por kg no desperdiciado (rango amplio en literatura)
  litrosAguaPorKg: 700,    // huella hídrica media, altamente variable por alimento
};

/* Los códigos de estado se mantienen en inglés a propósito: son el
   contrato compartido con el esquema Prisma/SQL y con la API. La
   interfaz solo muestra las etiquetas. */
export const ETIQUETA_ESTADO = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  RESERVED: "Reservada",
  HANDED_OVER: "Entregada en custodia",
  RECEIVED: "Recibida",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};

export function categoria(id) {
  return CATEGORIAS[id] || null;
}

export function aKilos(cantidad, unidad) {
  const u = UNIDADES[unidad];
  if (!u) return 0;
  return Math.round(Number(cantidad || 0) * u.aKg * 100) / 100;
}
