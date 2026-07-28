/* Fixtures compartidas por las pruebas. Datos ficticios: ninguna
   organización, dirección o teléfono real puede entrar al repositorio. */

import { ESTADOS } from "../app/js/core/estados.js";
import { ROLES } from "../app/js/core/rbac.js";
import { VERIFICACION } from "../app/js/core/organizacion.js";

export const AHORA = new Date("2026-07-28T12:00:00.000Z");
export const enHoras = (h, base = AHORA) => new Date(base.getTime() + h * 3600000);

export function orgVerificada(over = {}) {
  return {
    id: "org_donante",
    nombre: "Distribuidora de prueba",
    tipo: "DONANTE",
    estadoVerificacion: VERIFICACION.VERIFICADA,
    suspendida: false,
    ...over,
  };
}

export function actor(rol, over = {}) {
  return {
    id: `usr_${rol.toLowerCase()}`,
    rol,
    organizacionId: rol === ROLES.RECEIVER ? "org_receptora" : "org_donante",
    mfa: rol === ROLES.ADMIN || rol === ROLES.VERIFIER,
    suspendido: false,
    ...over,
  };
}

/** Donación que pasa todas las reglas de inocuidad. */
export function donacionApta(over = {}) {
  return {
    id: "don_1",
    estado: ESTADOS.DRAFT,
    organizacionId: "org_donante",
    titulo: "Banano de exportación con calibre no comercial",
    categoria: "FRUTA_VERDURA",
    cantidad: 40,
    unidad: "KG",
    conservacion: "AMBIENTE",
    temperaturaC: null,
    estadoEmpaque: "GRANEL_CONTROLADO",
    fechaVencimiento: enHoras(72).toISOString(),
    lote: null,
    responsableTecnico: null,
    alergenos: [],
    sinAlergenosDeclarados: true,
    alertaSanitaria: false,
    declaracionAptitud: true,
    retiroDesde: AHORA.toISOString(),
    retiroHasta: enHoras(20).toISOString(),
    ciudadId: "BOG",
    fotos: ["blob:foto-1", "blob:foto-2"],
    reservadaPorId: null,
    ...over,
  };
}

export const contextoBase = (over = {}) => ({
  ahora: AHORA,
  consentimientoVigente: true,
  organizacionDonante: orgVerificada(),
  organizacionReceptora: orgVerificada({ id: "org_receptora", tipo: "RECEPTORA" }),
  ...over,
});
