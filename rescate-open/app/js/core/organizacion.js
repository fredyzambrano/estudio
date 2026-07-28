/* ============================================================
   RESCATE OPEN — Entidad Organización y verificación documental
   La verificación es MANUAL y con lista de chequeo completa: no se
   aprueba por automatismo. Es la barrera antifraude principal del
   piloto, junto con "solo organizaciones legalmente constituidas".
   ============================================================ */

import { s } from "./esquema.js";
import { nuevoId } from "./ids.js";
import { puede, ROLES } from "./rbac.js";

export const VERIFICACION = {
  PENDIENTE: "PENDIENTE",
  EN_REVISION: "EN_REVISION",
  VERIFICADA: "VERIFICADA",
  RECHAZADA: "RECHAZADA",
};

export const ETIQUETA_VERIFICACION = {
  PENDIENTE: "Pendiente de documentos",
  EN_REVISION: "En revisión",
  VERIFICADA: "Verificada",
  RECHAZADA: "Rechazada",
};

export const TIPOS = {
  DONANTE: "DONANTE",
  RECEPTORA: "RECEPTORA",
};

/**
 * Lista de chequeo obligatoria. Todos los ítems `obligatorio: true`
 * deben marcarse antes de habilitar VERIFICADA.
 * TODO (legal): confirmar el set documental con asesoría colombiana.
 */
export const CHEQUEO_VERIFICACION = [
  { id: "EXISTENCIA", etiqueta: "Certificado de existencia y representación legal vigente (≤ 30 días)", obligatorio: true },
  { id: "REPRESENTANTE", etiqueta: "Identidad del representante legal confirmada en videollamada", obligatorio: true },
  { id: "RUT", etiqueta: "RUT o documento tributario equivalente", obligatorio: true },
  { id: "DIRECCION", etiqueta: "Dirección operativa confirmada (no solo domicilio de correspondencia)", obligatorio: true },
  { id: "RESPONSABLE", etiqueta: "Responsable operativo con contacto directo y horario", obligatorio: true },
  { id: "CAPACIDAD", etiqueta: "Capacidad declarada: almacenamiento, frío y transporte", obligatorio: true },
  { id: "AUTORIZACION", etiqueta: "Autorización de tratamiento de datos firmada por el representante", obligatorio: true },
  { id: "DESTINO_GRATUITO", etiqueta: "Compromiso de destino gratuito y prohibición de comercialización", obligatorio: true },
  { id: "REFERENCIA", etiqueta: "Al menos una referencia verificable de operación previa", obligatorio: false },
  { id: "MANIPULACION", etiqueta: "Certificados de manipulación de alimentos del personal", obligatorio: false },
];

export const esquemaOrganizacion = s.objeto({
  nombre: s.texto({ min: 3, max: 120 }),
  tipo: s.opcion(Object.values(TIPOS)),
  nit: s.texto({ min: 5, max: 20, patron: /^[\d.\-]+$/ }),
  ciudadId: s.texto({ min: 2, max: 8 }),
  direccion: s.texto({ min: 5, max: 160 }),
  correoContacto: s.correo(),
  telefonoContacto: s.telefonoCo(),
  responsableNombre: s.texto({ min: 3, max: 90 }),
  responsableCargo: s.texto({ min: 2, max: 60 }).opcional(),
  capacidadKgMes: s.numero({ min: 0, max: 1e6 }).opcional(),
  tieneCadenaFrio: s.booleano().conDefecto(false),
  tieneTransporte: s.booleano().conDefecto(false),
  descripcion: s.texto({ max: 600 }).opcional(),
});

export function nuevaOrganizacion(datos, ahora = new Date()) {
  const r = esquemaOrganizacion(datos);
  if (!r.ok) return { ok: false, codigo: "VALIDACION", errores: r.errores };
  const ts = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  return {
    ok: true,
    organizacion: {
      id: nuevoId("org"),
      ...r.value,
      estadoVerificacion: VERIFICACION.PENDIENTE,
      chequeo: {},
      suspendida: false,
      motivoEstado: null,
      verificadaPorId: null,
      verificadaEn: null,
      creadaEn: ts,
      actualizadaEn: ts,
    },
  };
}

export function chequeoCompleto(chequeo = {}) {
  const faltantes = CHEQUEO_VERIFICACION.filter((c) => c.obligatorio && chequeo[c.id] !== true);
  return { completo: faltantes.length === 0, faltantes: faltantes.map((f) => f.etiqueta) };
}

/**
 * Decisión de verificación. Solo VERIFIER/ADMIN con MFA, siempre con
 * motivo escrito y chequeo completo para aprobar.
 */
export function decidirVerificacion({ organizacion, actor, decision, chequeo = {}, motivo = "", ahora = new Date() }) {
  const permiso = puede(actor, "organizacion:verificar");
  if (!permiso.ok) return { ok: false, codigo: permiso.codigo, mensaje: permiso.mensaje };

  if (actor.organizacionId && actor.organizacionId === organizacion.id) {
    return { ok: false, codigo: "AUTOVERIFICACION", mensaje: "Nadie verifica a su propia organización." };
  }
  if (!Object.values(VERIFICACION).includes(decision) || decision === VERIFICACION.PENDIENTE) {
    return { ok: false, codigo: "DECISION_INVALIDA", mensaje: "Decisión no admitida." };
  }
  if (motivo.trim().length < 10) {
    return { ok: false, codigo: "SIN_MOTIVO", mensaje: "Registre el sustento de la decisión (mínimo 10 caracteres)." };
  }
  if (decision === VERIFICACION.VERIFICADA) {
    const { completo, faltantes } = chequeoCompleto(chequeo);
    if (!completo) {
      return {
        ok: false,
        codigo: "CHEQUEO_INCOMPLETO",
        mensaje: `Faltan ítems obligatorios: ${faltantes.join("; ")}`,
      };
    }
  }

  const ts = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  const antes = { estadoVerificacion: organizacion.estadoVerificacion };
  const actualizada = {
    ...organizacion,
    estadoVerificacion: decision,
    chequeo,
    motivoEstado: motivo.trim(),
    verificadaPorId: actor.id,
    verificadaEn: ts,
    actualizadaEn: ts,
  };

  return {
    ok: true,
    organizacion: actualizada,
    evento: {
      accion: decision === VERIFICACION.VERIFICADA ? "ORGANIZACION_VERIFICADA" : "ORGANIZACION_RECHAZADA",
      recurso: "organizacion",
      recursoId: organizacion.id,
      antes,
      despues: { estadoVerificacion: decision },
      motivo: motivo.trim(),
    },
  };
}

export function suspender({ organizacion, actor, motivo = "", ahora = new Date() }) {
  const permiso = puede(actor, "organizacion:suspender");
  if (!permiso.ok) return { ok: false, codigo: permiso.codigo, mensaje: permiso.mensaje };
  if (motivo.trim().length < 10) {
    return { ok: false, codigo: "SIN_MOTIVO", mensaje: "Describa el motivo de la suspensión." };
  }
  const ts = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  return {
    ok: true,
    organizacion: { ...organizacion, suspendida: true, motivoEstado: motivo.trim(), actualizadaEn: ts },
    evento: {
      accion: "ORGANIZACION_SUSPENDIDA",
      recurso: "organizacion",
      recursoId: organizacion.id,
      antes: { suspendida: organizacion.suspendida },
      despues: { suspendida: true },
      motivo: motivo.trim(),
    },
  };
}

export function puedeOperar(organizacion) {
  return !!organizacion && organizacion.estadoVerificacion === VERIFICACION.VERIFICADA && !organizacion.suspendida;
}

export { ROLES };
