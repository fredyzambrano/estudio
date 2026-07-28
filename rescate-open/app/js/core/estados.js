/* ============================================================
   RESCATE OPEN — Máquina de estados de la donación
   DRAFT → PUBLISHED → RESERVED → HANDED_OVER → RECEIVED → CLOSED
   CANCELLED y REJECTED son terminales.

   Invariante del sistema: no existe forma de cambiar el estado de
   una donación sin pasar por `evaluarTransicion`. Toda transición
   cruza tres puertas — autorización del actor, guardas sanitarias
   y registro en auditoría — y ninguna es opcional.
   ============================================================ */

import { puede } from "./rbac.js";
import { evaluar, evaluarParaEntrega } from "./inocuidad.js";

export const ESTADOS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  RESERVED: "RESERVED",
  HANDED_OVER: "HANDED_OVER",
  RECEIVED: "RECEIVED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
};

export const TERMINALES = [ESTADOS.CLOSED, ESTADOS.CANCELLED, ESTADOS.REJECTED];

/* ---------- Guardas ----------
   Cada guarda es (donacion, contexto) => {ok, codigo?, mensaje?}.
   Son puras y reciben `ahora` por contexto para poder probarlas. */
const G = {
  inocuidadApta(donacion, ctx) {
    const r = evaluar(donacion, ctx.ahora);
    return r.apta
      ? { ok: true }
      : {
          ok: false,
          codigo: "INOCUIDAD",
          mensaje: r.bloqueos.map((b) => b.mensaje).join(" "),
          detalle: r.bloqueos,
        };
  },

  inocuidadAptaEnEntrega(donacion, ctx) {
    const r = evaluarParaEntrega(donacion, ctx.ahora);
    return r.apta
      ? { ok: true }
      : {
          ok: false,
          codigo: "INOCUIDAD_ENTREGA",
          mensaje: "La donación dejó de cumplir los criterios sanitarios. " +
            r.bloqueos.map((b) => b.mensaje).join(" "),
          detalle: r.bloqueos,
        };
  },

  donanteVerificado(donacion, ctx) {
    const org = ctx.organizacionDonante;
    if (!org) return fallo("ORG_DESCONOCIDA", "No se encontró la organización donante.");
    if (org.estadoVerificacion !== "VERIFICADA")
      return fallo("DONANTE_NO_VERIFICADO", "La organización donante no está verificada.");
    if (org.suspendida) return fallo("DONANTE_SUSPENDIDO", "La organización donante está suspendida.");
    return { ok: true };
  },

  receptorVerificado(donacion, ctx) {
    const org = ctx.organizacionReceptora;
    if (!org) return fallo("ORG_DESCONOCIDA", "No se encontró la organización receptora.");
    if (org.estadoVerificacion !== "VERIFICADA")
      return fallo(
        "RECEPTOR_NO_VERIFICADO",
        "Solo organizaciones verificadas pueden reservar donaciones en el piloto."
      );
    if (org.suspendida) return fallo("RECEPTOR_SUSPENDIDO", "La organización receptora está suspendida.");
    return { ok: true };
  },

  consentimientoVigente(donacion, ctx) {
    if (ctx.consentimientoVigente === true) return { ok: true };
    return fallo(
      "SIN_CONSENTIMIENTO",
      "Falta aceptar la versión vigente de términos y política de datos."
    );
  },

  sinReservaActiva(donacion) {
    return donacion.reservadaPorId
      ? fallo("YA_RESERVADA", "La donación ya tiene una reserva activa.")
      : { ok: true };
  },

  hayReservaActiva(donacion) {
    return donacion.reservadaPorId
      ? { ok: true }
      : fallo("SIN_RESERVA", "La donación no tiene una reserva activa.");
  },

  /* Prueba de presencia física: el receptor dicta el código al donante. */
  codigoEntregaValido(donacion, ctx) {
    if (!donacion.codigoEntrega) return fallo("SIN_CODIGO", "La reserva no generó código de entrega.");
    const dado = String(ctx.codigoEntrega || "").toUpperCase().replace(/\s/g, "");
    return dado === String(donacion.codigoEntrega).toUpperCase()
      ? { ok: true }
      : fallo("CODIGO_INVALIDO", "El código de entrega no coincide.");
  },

  evidenciaEntrega(donacion, ctx) {
    const fotos = Array.isArray(ctx.evidencia?.fotos) ? ctx.evidencia.fotos.length : 0;
    if (fotos < 1) return fallo("SIN_EVIDENCIA_ENTREGA", "Adjunte evidencia fotográfica de la entrega.");
    if (!ctx.evidencia?.recibeNombre)
      return fallo("SIN_RECEPTOR_FISICO", "Registre quién recibe físicamente el lote.");
    return { ok: true };
  },

  actaRecepcion(donacion, ctx) {
    const a = ctx.acta || {};
    if (typeof a.cantidadRecibida !== "number" || a.cantidadRecibida <= 0)
      return fallo("SIN_CANTIDAD", "Registre la cantidad efectivamente recibida.");
    if (a.conformidad !== true && !texto(a.observaciones))
      return fallo("SIN_OBSERVACIONES", "Si la recepción no es conforme, describa la novedad.");
    return { ok: true };
  },

  motivoObligatorio(donacion, ctx) {
    return texto(ctx.motivo) && ctx.motivo.trim().length >= 10
      ? { ok: true }
      : fallo("SIN_MOTIVO", "Escriba el motivo (mínimo 10 caracteres). Queda en auditoría.");
  },
};

/* ---------- Tabla de transiciones ----------
   Nota de diseño: además del camino feliz de la especificación se
   admite RESERVED → PUBLISHED (liberar reserva) porque el piloto real
   lo necesita; queda documentada en docs/05-maquina-de-estados.md. */
export const TRANSICIONES = [
  {
    de: ESTADOS.DRAFT,
    a: ESTADOS.PUBLISHED,
    permiso: "donacion:publicar",
    accion: "DONACION_PUBLICADA",
    guardas: ["consentimientoVigente", "donanteVerificado", "inocuidadApta"],
  },
  {
    de: ESTADOS.DRAFT,
    a: ESTADOS.CANCELLED,
    permiso: "donacion:cancelar",
    accion: "DONACION_CANCELADA",
    guardas: ["motivoObligatorio"],
  },
  {
    de: ESTADOS.PUBLISHED,
    a: ESTADOS.RESERVED,
    permiso: "reserva:crear",
    accion: "DONACION_RESERVADA",
    guardas: ["receptorVerificado", "consentimientoVigente", "sinReservaActiva", "inocuidadApta"],
  },
  {
    de: ESTADOS.PUBLISHED,
    a: ESTADOS.CANCELLED,
    permiso: "donacion:cancelar",
    accion: "DONACION_CANCELADA",
    guardas: ["motivoObligatorio"],
  },
  {
    de: ESTADOS.PUBLISHED,
    a: ESTADOS.REJECTED,
    permiso: "donacion:moderar",
    accion: "DONACION_RECHAZADA_MODERACION",
    guardas: ["motivoObligatorio"],
  },
  {
    de: ESTADOS.RESERVED,
    a: ESTADOS.PUBLISHED,
    permiso: "reserva:liberar",
    accion: "RESERVA_LIBERADA",
    guardas: ["hayReservaActiva", "motivoObligatorio"],
  },
  {
    de: ESTADOS.RESERVED,
    a: ESTADOS.HANDED_OVER,
    permiso: "entrega:registrar",
    accion: "DONACION_ENTREGADA",
    guardas: ["hayReservaActiva", "codigoEntregaValido", "inocuidadAptaEnEntrega", "evidenciaEntrega"],
  },
  {
    de: ESTADOS.RESERVED,
    a: ESTADOS.CANCELLED,
    permiso: "donacion:cancelar",
    accion: "DONACION_CANCELADA",
    guardas: ["motivoObligatorio"],
  },
  {
    de: ESTADOS.HANDED_OVER,
    a: ESTADOS.RECEIVED,
    permiso: "recepcion:confirmar",
    accion: "DONACION_RECIBIDA",
    guardas: ["hayReservaActiva", "actaRecepcion"],
  },
  {
    de: ESTADOS.HANDED_OVER,
    a: ESTADOS.REJECTED,
    permiso: "donacion:moderar",
    accion: "DONACION_RECHAZADA_INCIDENTE",
    guardas: ["motivoObligatorio"],
  },
  {
    de: ESTADOS.RECEIVED,
    a: ESTADOS.CLOSED,
    permiso: "custodia:cerrar",
    accion: "DONACION_CERRADA",
    guardas: [],
  },
];

export function transicionesDesde(estado) {
  return TRANSICIONES.filter((t) => t.de === estado);
}

export function esTerminal(estado) {
  return TERMINALES.includes(estado);
}

/**
 * Única puerta de cambio de estado.
 * @param {{donacion:object, a:string, actor:object, contexto?:object}} args
 * @returns {{ok:boolean, codigo?:string, mensaje?:string, detalle?:any, transicion?:object}}
 */
export function evaluarTransicion({ donacion, a, actor, contexto = {} }) {
  if (!donacion || !donacion.estado) return fallo("DONACION_INVALIDA", "Donación sin estado.");
  const ctx = { ahora: new Date(), ...contexto };

  if (esTerminal(donacion.estado)) {
    return fallo("ESTADO_TERMINAL", `“${donacion.estado}” es un estado final: no admite cambios.`);
  }

  const transicion = TRANSICIONES.find((t) => t.de === donacion.estado && t.a === a);
  if (!transicion) {
    return fallo(
      "TRANSICION_NO_PERMITIDA",
      `No existe transición de ${donacion.estado} a ${a}.`
    );
  }

  const permiso = puede(actor, transicion.permiso, {
    organizacionId: donacion.organizacionId,
    reservadaPorId: donacion.reservadaPorId,
  });
  if (!permiso.ok) return fallo(permiso.codigo, permiso.mensaje);

  for (const nombre of transicion.guardas) {
    const guarda = G[nombre];
    if (!guarda) return fallo("GUARDA_DESCONOCIDA", `Guarda no implementada: ${nombre}`);
    const r = guarda(donacion, ctx);
    if (!r.ok) return { ...r, transicion };
  }

  return { ok: true, transicion };
}

/**
 * Aplica la transición y devuelve la nueva donación + el evento a auditar.
 * No muta la entrada: el estado anterior se conserva para el registro.
 */
export function aplicarTransicion({ donacion, a, actor, contexto = {} }) {
  const r = evaluarTransicion({ donacion, a, actor, contexto });
  if (!r.ok) return r;

  const ahora = (contexto.ahora instanceof Date ? contexto.ahora : new Date()).toISOString();
  const antes = { estado: donacion.estado, reservadaPorId: donacion.reservadaPorId || null };
  const nueva = { ...donacion, estado: a, actualizadaEn: ahora };

  if (a === ESTADOS.PUBLISHED && donacion.estado === ESTADOS.DRAFT) {
    nueva.publicadaEn = ahora;
  }
  if (a === ESTADOS.RESERVED) {
    nueva.reservadaPorId = contexto.organizacionReceptora?.id || actor.organizacionId;
    nueva.reservadaEn = ahora;
    nueva.codigoEntrega = contexto.codigoEntregaGenerado || donacion.codigoEntrega || null;
  }
  if (a === ESTADOS.PUBLISHED && donacion.estado === ESTADOS.RESERVED) {
    nueva.reservadaPorId = null;
    nueva.reservadaEn = null;
    nueva.codigoEntrega = null;
  }
  if (a === ESTADOS.HANDED_OVER) {
    nueva.entregadaEn = ahora;
    nueva.evidenciaEntrega = contexto.evidencia || null;
  }
  if (a === ESTADOS.RECEIVED) {
    nueva.recibidaEn = ahora;
    nueva.acta = contexto.acta || null;
  }
  if (a === ESTADOS.CLOSED) nueva.cerradaEn = ahora;
  if (a === ESTADOS.CANCELLED || a === ESTADOS.REJECTED) {
    nueva.finalizadaEn = ahora;
    nueva.motivoFinal = contexto.motivo || null;
  }

  return {
    ok: true,
    transicion: r.transicion,
    donacion: nueva,
    evento: {
      accion: r.transicion.accion,
      recurso: "donacion",
      recursoId: donacion.id,
      antes,
      despues: { estado: a, reservadaPorId: nueva.reservadaPorId || null },
      motivo: contexto.motivo || null,
    },
  };
}

function fallo(codigo, mensaje) {
  return { ok: false, codigo, mensaje };
}
function texto(v) {
  return typeof v === "string" && v.trim().length > 0;
}
