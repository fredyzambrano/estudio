/* ============================================================
   RESCATE OPEN — Entidad Donación
   Un solo lugar define qué es una donación válida, qué ve el
   público y qué se revela únicamente a quien ya reservó.
   ============================================================ */

import { s } from "./esquema.js";
import { nuevoId } from "./ids.js";
import { ESTADOS } from "./estados.js";
import { evaluar } from "./inocuidad.js";
import { CATEGORIAS, CONSERVACION, ESTADO_EMPAQUE, UNIDADES, ALERGENOS } from "../datos/catalogos.js";
import { aproximar, celda, descripcionPublica } from "./geo.js";

const ids = (o) => Object.keys(o);

export const esquemaDonacion = s.objeto({
  titulo: s.texto({ min: 5, max: 90 }),
  descripcion: s.texto({ min: 0, max: 800 }).opcional(),
  categoria: s.opcion(ids(CATEGORIAS)),
  cantidad: s.numero({ min: 0.1, max: 100000 }),
  unidad: s.opcion(ids(UNIDADES)),
  conservacion: s.opcion(ids(CONSERVACION)),
  temperaturaC: s.numero({ min: -60, max: 120 }).opcional(),
  estadoEmpaque: s.opcion(ids(ESTADO_EMPAQUE)),
  fechaVencimiento: s.fechaIso().opcional(),
  preparadoEn: s.fechaIso().opcional(),
  lote: s.texto({ min: 1, max: 60 }).opcional(),
  registroSanitario: s.texto({ min: 1, max: 60 }).opcional(),
  responsableTecnico: s.texto({ min: 3, max: 90 }).opcional(),
  alergenos: s.lista(s.opcion(ALERGENOS.map((a) => a.id)), { max: 20 }).conDefecto(() => []),
  sinAlergenosDeclarados: s.booleano().conDefecto(false),
  alertaSanitaria: s.booleano().conDefecto(false),
  declaracionAptitud: s.booleano().conDefecto(false),
  requiereTransporteReceptor: s.booleano().conDefecto(true),
  retiroDesde: s.fechaIso(),
  retiroHasta: s.fechaIso(),
  ciudadId: s.texto({ min: 2, max: 8 }),
  zona: s.texto({ min: 2, max: 60 }).opcional(),
  /* Datos sensibles: nunca salen en la vista pública. */
  direccionExacta: s.texto({ min: 5, max: 160 }),
  indicacionesRetiro: s.texto({ max: 400 }).opcional(),
  contactoNombre: s.texto({ min: 3, max: 90 }),
  contactoTelefono: s.telefonoCo(),
  lat: s.numero({ min: -5, max: 14 }).opcional(),
  lon: s.numero({ min: -82, max: -66 }).opcional(),
  fotos: s.lista(s.texto({ min: 3, max: 400 }), { max: 6 }).conDefecto(() => []),
});

/**
 * Crea la donación en estado DRAFT. Publicarla es otra transición
 * con sus propias guardas: aquí nunca se salta a PUBLISHED.
 */
export function nuevaDonacion(datos, actor, ahora = new Date()) {
  const r = esquemaDonacion(datos);
  if (!r.ok) return { ok: false, codigo: "VALIDACION", errores: r.errores };

  const v = r.value;
  if (new Date(v.retiroHasta) <= new Date(v.retiroDesde)) {
    return {
      ok: false,
      codigo: "VALIDACION",
      errores: [{ campo: "retiroHasta", mensaje: "La ventana de retiro debe terminar después de iniciar." }],
    };
  }

  const ts = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  const aprox = v.lat != null && v.lon != null ? aproximar({ lat: v.lat, lon: v.lon }, 1) : null;

  const donacion = {
    id: nuevoId("don"),
    estado: ESTADOS.DRAFT,
    organizacionId: actor.organizacionId,
    creadaPorId: actor.id,
    creadaEn: ts,
    actualizadaEn: ts,
    publicadaEn: null,
    reservadaPorId: null,
    reservadaEn: null,
    codigoEntrega: null,
    entregadaEn: null,
    recibidaEn: null,
    cerradaEn: null,
    finalizadaEn: null,
    motivoFinal: null,
    evidenciaEntrega: null,
    acta: null,
    ...v,
    latAprox: aprox?.lat ?? null,
    lonAprox: aprox?.lon ?? null,
    precisionKm: aprox?.precisionKm ?? 1,
    celda: aprox ? celda({ lat: v.lat, lon: v.lon }, 1) : null,
  };
  /* Las coordenadas exactas no se guardan: solo la celda aproximada
     y la dirección textual, que se revela por reserva. */
  delete donacion.lat;
  delete donacion.lon;

  const sanidad = evaluar(donacion, ahora);
  return { ok: true, donacion, sanidad };
}

/** Campos que jamás viajan al listado público. */
const SENSIBLES = [
  "direccionExacta", "indicacionesRetiro", "contactoNombre", "contactoTelefono",
  "evidenciaEntrega", "acta", "codigoEntrega", "creadaPorId",
];

export function vistaPublica(donacion) {
  const salida = { ...donacion };
  for (const c of SENSIBLES) delete salida[c];
  salida.ubicacionTexto = descripcionPublica(donacion);
  salida.tieneFotos = Array.isArray(donacion.fotos) && donacion.fotos.length > 0;
  return salida;
}

/**
 * Vista para la organización que reservó: se revela lo mínimo para
 * ir a recoger. Todo acceso a esta vista debe quedar auditado.
 */
export function vistaParaReserva(donacion, organizacionReceptoraId) {
  if (!donacion.reservadaPorId || donacion.reservadaPorId !== organizacionReceptoraId) {
    return vistaPublica(donacion);
  }
  const salida = { ...donacion };
  delete salida.creadaPorId;
  salida.ubicacionTexto = descripcionPublica(donacion);
  return salida;
}

export function urgencia(donacion, ahora = new Date()) {
  const t = ahora instanceof Date ? ahora.getTime() : new Date(ahora).getTime();
  const limite = donacion.retiroHasta ? new Date(donacion.retiroHasta).getTime() : null;
  if (!limite) return { nivel: "normal", horas: null };
  const horas = (limite - t) / 3600000;
  if (horas <= 0) return { nivel: "vencida", horas: 0 };
  if (horas <= 4) return { nivel: "critica", horas: Math.round(horas * 10) / 10 };
  if (horas <= 12) return { nivel: "alta", horas: Math.round(horas) };
  if (horas <= 48) return { nivel: "media", horas: Math.round(horas) };
  return { nivel: "normal", horas: Math.round(horas) };
}

export function etiquetaCategoria(id) {
  return CATEGORIAS[id]?.etiqueta || id;
}
