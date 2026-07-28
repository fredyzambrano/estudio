/* ============================================================
   RESCATE OPEN — Consentimiento informado (Ley 1581 de 2012)
   La autorización debe ser previa, expresa e informada, y hay que
   poder PROBARLA después. Por eso se guarda: qué versión de texto
   se mostró, su hash, cuándo, por qué canal y para qué finalidades.
   TODO (legal): un abogado debe aprobar textos y finalidades.
   ============================================================ */

import { sha256Hex } from "./ids.js";

/* Cambiar una versión invalida los consentimientos anteriores y
   obliga a volver a pedirlos. Es intencional. */
export const VERSIONES = {
  terminos: "1.0.0-borrador",
  privacidad: "1.0.0-borrador",
};

export const FINALIDADES = [
  {
    id: "COORDINACION",
    etiqueta: "Coordinar la donación",
    detalle: "Publicar, reservar y trazar la entrega entre donante y organización receptora.",
    obligatoria: true,
  },
  {
    id: "TRAZABILIDAD",
    etiqueta: "Trazabilidad y auditoría",
    detalle: "Conservar el registro de la cadena de custodia y atender incidentes o reclamaciones.",
    obligatoria: true,
  },
  {
    id: "CONTACTO_OPERATIVO",
    etiqueta: "Contacto operativo",
    detalle: "Enviar avisos sobre reservas, retiros y novedades de las donaciones propias.",
    obligatoria: true,
  },
  {
    id: "ESTADISTICA",
    etiqueta: "Estadísticas agregadas",
    detalle: "Publicar cifras de impacto sin identificar personas ni organizaciones.",
    obligatoria: false,
  },
  {
    id: "COMUNICACIONES",
    etiqueta: "Comunicaciones del proyecto",
    detalle: "Boletín ocasional sobre el piloto. Se puede revocar en cualquier momento.",
    obligatoria: false,
  },
];

export const FINALIDADES_OBLIGATORIAS = FINALIDADES.filter((f) => f.obligatoria).map((f) => f.id);

/**
 * @returns {Promise<object>} registro de consentimiento listo para persistir
 */
export async function otorgar({
  usuarioId,
  finalidades,
  textoMostrado,
  canal = "web",
  ipSeudonima = null,
  agenteUsuario = null,
  ahora = new Date(),
}) {
  const elegidas = Array.from(new Set(finalidades || []));
  const faltantes = FINALIDADES_OBLIGATORIAS.filter((f) => !elegidas.includes(f));
  if (faltantes.length) {
    return {
      ok: false,
      codigo: "FINALIDADES_OBLIGATORIAS",
      mensaje: "Sin las finalidades esenciales no es posible operar la coordinación.",
      faltantes,
    };
  }

  return {
    ok: true,
    registro: {
      usuarioId,
      finalidades: elegidas,
      versionTerminos: VERSIONES.terminos,
      versionPrivacidad: VERSIONES.privacidad,
      hashTextoMostrado: await sha256Hex(textoMostrado || ""),
      canal,
      ipSeudonima,
      /* Solo familia de navegador, no la huella completa. */
      agenteUsuario: agenteUsuario ? String(agenteUsuario).slice(0, 120) : null,
      otorgadoEn: (ahora instanceof Date ? ahora : new Date(ahora)).toISOString(),
      revocadoEn: null,
    },
  };
}

export function revocar(registro, { finalidad = null, ahora = new Date() } = {}) {
  const ts = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  if (!finalidad) return { ...registro, revocadoEn: ts };
  if (FINALIDADES_OBLIGATORIAS.includes(finalidad)) {
    return {
      ...registro,
      _error: "Revocar una finalidad esencial implica cerrar la cuenta: use el flujo de supresión.",
    };
  }
  return {
    ...registro,
    finalidades: registro.finalidades.filter((f) => f !== finalidad),
    revocacionesParciales: [...(registro.revocacionesParciales || []), { finalidad, ts }],
  };
}

/** ¿El usuario aceptó la versión vigente de los textos? */
export function vigente(registro, versiones = VERSIONES) {
  if (!registro || registro.revocadoEn) return false;
  if (registro.versionTerminos !== versiones.terminos) return false;
  if (registro.versionPrivacidad !== versiones.privacidad) return false;
  return FINALIDADES_OBLIGATORIAS.every((f) => registro.finalidades.includes(f));
}

/** Texto corto que acompaña cada formulario (aviso de privacidad). */
export const AVISO_CORTO =
  "Tratamos tus datos para coordinar donaciones y dejar trazabilidad. " +
  "Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización. " +
  "Consulta la política de tratamiento antes de continuar.";
