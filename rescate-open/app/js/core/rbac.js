/* ============================================================
   RESCATE OPEN — Roles y autorización por recurso
   Regla de oro: ningún permiso se concede por "estar autenticado".
   Cada verificación cruza rol + pertenencia al recurso + estado.
   ============================================================ */

export const ROLES = {
  DONOR: "DONOR",       // empresa/persona jurídica que entrega excedentes
  RECEIVER: "RECEIVER", // organización receptora verificada
  VERIFIER: "VERIFIER", // revisa documentos de organizaciones (MFA obligatorio)
  SUPPORT: "SUPPORT",   // atención, incidentes, moderación
  ADMIN: "ADMIN",       // administración de la plataforma (MFA obligatorio)
};

export const ROLES_CON_MFA_OBLIGATORIO = [ROLES.VERIFIER, ROLES.ADMIN];

/** Etiquetas para la interfaz. La lógica nunca compara por etiqueta. */
export const ETIQUETA_ROL = {
  DONOR: "Donante",
  RECEIVER: "Organización receptora",
  VERIFIER: "Verificador",
  SUPPORT: "Soporte",
  ADMIN: "Administración",
};

/**
 * Matriz base. `propio` significa que el permiso solo aplica sobre
 * recursos de la organización del actor.
 */
const MATRIZ = {
  "donacion:crear": { roles: [ROLES.DONOR], alcance: "propio" },
  "donacion:editar": { roles: [ROLES.DONOR, ROLES.ADMIN], alcance: "propio" },
  "donacion:publicar": { roles: [ROLES.DONOR, ROLES.ADMIN], alcance: "propio" },
  "donacion:cancelar": { roles: [ROLES.DONOR, ROLES.SUPPORT, ROLES.ADMIN], alcance: "propio" },
  "donacion:ver_publicada": { roles: [ROLES.RECEIVER, ROLES.SUPPORT, ROLES.ADMIN, ROLES.VERIFIER], alcance: "global" },
  "donacion:ver_contacto": { roles: [ROLES.SUPPORT, ROLES.ADMIN], alcance: "reserva" },
  "donacion:moderar": { roles: [ROLES.SUPPORT, ROLES.ADMIN, ROLES.VERIFIER], alcance: "global" },
  "reserva:crear": { roles: [ROLES.RECEIVER], alcance: "global" },
  "reserva:liberar": { roles: [ROLES.RECEIVER, ROLES.SUPPORT, ROLES.ADMIN], alcance: "reserva" },
  "entrega:registrar": { roles: [ROLES.DONOR, ROLES.ADMIN], alcance: "propio" },
  "recepcion:confirmar": { roles: [ROLES.RECEIVER, ROLES.ADMIN], alcance: "reserva" },
  "custodia:cerrar": { roles: [ROLES.RECEIVER, ROLES.SUPPORT, ROLES.ADMIN], alcance: "reserva" },
  "organizacion:verificar": { roles: [ROLES.VERIFIER, ROLES.ADMIN], alcance: "global" },
  "organizacion:suspender": { roles: [ROLES.ADMIN], alcance: "global" },
  "incidente:crear": { roles: [ROLES.DONOR, ROLES.RECEIVER, ROLES.SUPPORT, ROLES.ADMIN], alcance: "global" },
  "auditoria:leer": { roles: [ROLES.SUPPORT, ROLES.ADMIN, ROLES.VERIFIER], alcance: "global" },
  "datos:exportar_propios": { roles: Object.values(ROLES), alcance: "propio" },
};

export const PERMISOS = Object.keys(MATRIZ);

/**
 * @param {{rol:string, organizacionId?:string, mfa?:boolean, suspendido?:boolean}} actor
 * @param {string} permiso
 * @param {{organizacionId?:string, reservadaPorId?:string}} [recurso]
 * @returns {{ok:boolean, codigo?:string, mensaje?:string}}
 */
export function puede(actor, permiso, recurso = null) {
  if (!actor || !actor.rol) return no("SIN_SESION", "Sesión requerida.");
  if (actor.suspendido) return no("CUENTA_SUSPENDIDA", "La cuenta está suspendida.");

  const regla = MATRIZ[permiso];
  if (!regla) return no("PERMISO_DESCONOCIDO", `Permiso no declarado: ${permiso}`);
  if (!regla.roles.includes(actor.rol)) return no("ROL_INSUFICIENTE", "El rol no permite esta acción.");

  if (ROLES_CON_MFA_OBLIGATORIO.includes(actor.rol) && actor.mfa !== true) {
    return no("MFA_REQUERIDO", "Este rol exige segundo factor activo.");
  }

  if (regla.alcance === "propio") {
    if (actor.rol === ROLES.ADMIN) return si();
    if (!recurso) return no("RECURSO_REQUERIDO", "Falta el recurso a verificar.");
    if (!actor.organizacionId || recurso.organizacionId !== actor.organizacionId) {
      return no("NO_ES_PROPIETARIO", "El recurso pertenece a otra organización.");
    }
  }

  if (regla.alcance === "reserva") {
    if (actor.rol === ROLES.ADMIN || actor.rol === ROLES.SUPPORT) return si();
    if (!recurso) return no("RECURSO_REQUERIDO", "Falta el recurso a verificar.");
    const esParte =
      recurso.reservadaPorId === actor.organizacionId || recurso.organizacionId === actor.organizacionId;
    if (!esParte) return no("NO_ES_PARTE", "Solo las partes de la reserva pueden hacer esto.");
  }

  return si();
}

/** Versión booleana para plantillas de interfaz. */
export function pudiera(actor, permiso, recurso) {
  return puede(actor, permiso, recurso).ok;
}

function si() {
  return { ok: true };
}
function no(codigo, mensaje) {
  return { ok: false, codigo, mensaje };
}
