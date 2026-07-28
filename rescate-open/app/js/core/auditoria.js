/* ============================================================
   RESCATE OPEN — Auditoría encadenada (a prueba de manipulación)
   Cada evento incluye el hash del anterior. Alterar o borrar un
   evento intermedio rompe la cadena y `verificarCadena` lo señala.
   Esto no reemplaza un almacenamiento append-only, lo complementa.
   ============================================================ */

import { sha256Hex } from "./ids.js";

export const ACCIONES = [
  "SESION_INICIADA", "SESION_CERRADA", "CONSENTIMIENTO_OTORGADO", "CONSENTIMIENTO_REVOCADO",
  "DONACION_CREADA", "DONACION_EDITADA", "DONACION_PUBLICADA", "DONACION_RESERVADA",
  "RESERVA_LIBERADA", "DONACION_ENTREGADA", "DONACION_RECIBIDA", "DONACION_CERRADA",
  "DONACION_CANCELADA", "DONACION_RECHAZADA_MODERACION", "DONACION_RECHAZADA_INCIDENTE",
  "ORGANIZACION_CREADA", "ORGANIZACION_VERIFICADA", "ORGANIZACION_RECHAZADA",
  "ORGANIZACION_SUSPENDIDA", "INCIDENTE_REPORTADO", "ROL_CAMBIADO", "DATOS_EXPORTADOS",
  "INOCUIDAD_BLOQUEO",
];

/* Serialización estable: sin ella, dos ejecuciones producirían hashes
   distintos para el mismo contenido y la cadena sería inútil. */
export function canonico(valor) {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor ?? null);
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  const claves = Object.keys(valor).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(",")}}`;
}

/**
 * Minimiza la IP antes de guardarla: nunca se persiste completa.
 * IPv4 → /24, IPv6 → /48, y luego se seudonimiza con la sal del entorno.
 */
export function recortarIp(ip) {
  const s = String(ip || "").trim();
  if (!s) return null;
  if (s.includes(":")) return s.split(":").slice(0, 3).join(":") + "::/48";
  const p = s.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0/24` : null;
}

export async function seudonimizarIp(ip, sal) {
  const recortada = recortarIp(ip);
  if (!recortada) return null;
  const h = await sha256Hex(`${sal || "sal-local"}::${recortada}`);
  return h.slice(0, 16);
}

/**
 * Crea el evento firmado por encadenamiento.
 * @param {object} args
 * @param {string} args.accion
 * @param {object} args.actor  {id, rol, organizacionId}
 * @param {string} [args.hashAnterior]
 */
export async function crearEvento({
  accion,
  actor,
  recurso = null,
  recursoId = null,
  antes = null,
  despues = null,
  motivo = null,
  ipSeudonima = null,
  hashAnterior = null,
  ahora = new Date(),
}) {
  const cuerpo = {
    accion,
    actorId: actor?.id ?? null,
    actorRol: actor?.rol ?? null,
    organizacionId: actor?.organizacionId ?? null,
    recurso,
    recursoId,
    antes,
    despues,
    motivo,
    ipSeudonima,
    ts: (ahora instanceof Date ? ahora : new Date(ahora)).toISOString(),
    hashAnterior,
  };
  const hash = await sha256Hex(canonico(cuerpo));
  return { ...cuerpo, hash };
}

/** @returns {{ok:boolean, rotoEn?:number, motivo?:string}} */
export async function verificarCadena(eventos) {
  let anterior = null;
  for (let i = 0; i < eventos.length; i++) {
    const { hash, ...cuerpo } = eventos[i];
    if (cuerpo.hashAnterior !== anterior) {
      return { ok: false, rotoEn: i, motivo: "El enlace con el evento previo no coincide." };
    }
    const recalculado = await sha256Hex(canonico(cuerpo));
    if (recalculado !== hash) {
      return { ok: false, rotoEn: i, motivo: "El contenido del evento fue alterado." };
    }
    anterior = hash;
  }
  return { ok: true };
}

/**
 * Diferencia legible para el panel de auditoría: solo campos que cambiaron.
 * Nunca incluye campos marcados como sensibles.
 */
const CAMPOS_OCULTOS = new Set(["contactoTelefono", "contactoCorreo", "direccionExacta", "documentos"]);

export function diferencia(antes, despues) {
  const salida = [];
  const claves = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const k of claves) {
    if (CAMPOS_OCULTOS.has(k)) {
      salida.push({ campo: k, antes: "«oculto»", despues: "«oculto»" });
      continue;
    }
    const a = antes?.[k];
    const b = despues?.[k];
    if (canonico(a) !== canonico(b)) salida.push({ campo: k, antes: a ?? null, despues: b ?? null });
  }
  return salida;
}
