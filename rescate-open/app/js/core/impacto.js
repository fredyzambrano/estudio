/* ============================================================
   RESCATE OPEN — Métricas de impacto (estimadas, no medidas)
   Toda cifra derivada se presenta con la palabra "estimado".
   Solo cuentan donaciones efectivamente RECIBIDAS o CERRADAS:
   publicar no es rescatar.
   ============================================================ */

import { FACTORES_IMPACTO, aKilos } from "../datos/catalogos.js";
import { ESTADOS } from "./estados.js";

const CUENTAN = [ESTADOS.RECEIVED, ESTADOS.CLOSED];

export function kilosDe(donacion) {
  const acta = donacion.acta;
  if (acta && typeof acta.cantidadRecibida === "number") {
    return aKilos(acta.cantidadRecibida, acta.unidad || donacion.unidad);
  }
  return aKilos(donacion.cantidad, donacion.unidad);
}

export function resumen(donaciones = []) {
  const efectivas = donaciones.filter((d) => CUENTAN.includes(d.estado));
  const kg = efectivas.reduce((a, d) => a + kilosDe(d), 0);
  const f = FACTORES_IMPACTO;
  return {
    entregas: efectivas.length,
    kg: redondear(kg),
    raciones: Math.round(kg / f.kgPorRacion),
    co2eKg: redondear(kg * f.co2ePorKg),
    aguaLitros: Math.round(kg * f.litrosAguaPorKg),
    organizaciones: new Set(efectivas.map((d) => d.reservadaPorId).filter(Boolean)).size,
    donantes: new Set(efectivas.map((d) => d.organizacionId).filter(Boolean)).size,
  };
}

/** Tasa de conversión del embudo: cuánto de lo publicado termina rescatado. */
export function embudo(donaciones = []) {
  const cuenta = (e) => donaciones.filter((d) => d.estado === e).length;
  const publicadas = donaciones.filter((d) => d.estado !== ESTADOS.DRAFT).length;
  const recibidas = donaciones.filter((d) => CUENTAN.includes(d.estado)).length;
  return {
    borradores: cuenta(ESTADOS.DRAFT),
    publicadas: cuenta(ESTADOS.PUBLISHED),
    reservadas: cuenta(ESTADOS.RESERVED),
    enCustodia: cuenta(ESTADOS.HANDED_OVER),
    recibidas,
    canceladas: cuenta(ESTADOS.CANCELLED),
    rechazadas: cuenta(ESTADOS.REJECTED),
    tasaRescate: publicadas ? Math.round((recibidas / publicadas) * 100) : 0,
  };
}

/** Serie diaria de kilos para el gráfico del panel. */
export function serieDiaria(donaciones = [], dias = 14, ahora = new Date()) {
  const salida = [];
  const base = new Date(ahora);
  base.setHours(0, 0, 0, 0);
  for (let i = dias - 1; i >= 0; i--) {
    const dia = new Date(base.getTime() - i * 86400000);
    const clave = dia.toISOString().slice(0, 10);
    const kg = donaciones
      .filter((d) => CUENTAN.includes(d.estado) && (d.recibidaEn || "").slice(0, 10) === clave)
      .reduce((a, d) => a + kilosDe(d), 0);
    salida.push({ dia: clave, kg: redondear(kg) });
  }
  return salida;
}

/** Tiempo mediano entre publicar y recibir — el indicador que importa. */
export function tiempoMedianoHoras(donaciones = []) {
  const tiempos = donaciones
    .filter((d) => CUENTAN.includes(d.estado) && d.publicadaEn && d.recibidaEn)
    .map((d) => (new Date(d.recibidaEn) - new Date(d.publicadaEn)) / 3600000)
    .sort((a, b) => a - b);
  if (!tiempos.length) return null;
  const m = Math.floor(tiempos.length / 2);
  const mediana = tiempos.length % 2 ? tiempos[m] : (tiempos[m - 1] + tiempos[m]) / 2;
  return redondear(mediana);
}

function redondear(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}
