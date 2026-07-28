import { test } from "node:test";
import assert from "node:assert/strict";

import {
  nuevaOrganizacion,
  decidirVerificacion,
  suspender,
  chequeoCompleto,
  puedeOperar,
  CHEQUEO_VERIFICACION,
  VERIFICACION,
} from "../app/js/core/organizacion.js";
import { ROLES } from "../app/js/core/rbac.js";
import { actor, AHORA } from "./ayuda.js";

const datos = {
  nombre: "Fundación de prueba",
  tipo: "RECEPTORA",
  nit: "900.123.456-7",
  ciudadId: "BOG",
  direccion: "Calle ficticia 123",
  correoContacto: "contacto@ejemplo.org",
  telefonoContacto: "573001234567",
  responsableNombre: "Coordinación general",
  tieneCadenaFrio: true,
};

const chequeoOk = Object.fromEntries(CHEQUEO_VERIFICACION.map((c) => [c.id, true]));

test("una organización nace PENDIENTE y no puede operar", () => {
  const r = nuevaOrganizacion(datos, AHORA);
  assert.equal(r.ok, true, JSON.stringify(r.errores));
  assert.equal(r.organizacion.estadoVerificacion, VERIFICACION.PENDIENTE);
  assert.equal(puedeOperar(r.organizacion), false);
});

test("valida NIT, correo y teléfono", () => {
  assert.equal(nuevaOrganizacion({ ...datos, nit: "abc" }, AHORA).ok, false);
  assert.equal(nuevaOrganizacion({ ...datos, correoContacto: "no-es-correo" }, AHORA).ok, false);
  assert.equal(nuevaOrganizacion({ ...datos, telefonoContacto: "123" }, AHORA).ok, false);
});

test("no se aprueba con la lista de chequeo incompleta", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  const parcial = { ...chequeoOk, EXISTENCIA: false };
  const r = decidirVerificacion({
    organizacion,
    actor: actor(ROLES.VERIFIER),
    decision: VERIFICACION.VERIFICADA,
    chequeo: parcial,
    motivo: "Documentación revisada en sesión del comité",
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "CHEQUEO_INCOMPLETO");
});

test("los ítems opcionales no bloquean la aprobación", () => {
  const soloObligatorios = Object.fromEntries(
    CHEQUEO_VERIFICACION.filter((c) => c.obligatorio).map((c) => [c.id, true])
  );
  assert.equal(chequeoCompleto(soloObligatorios).completo, true);
});

test("aprobar exige motivo escrito", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  const r = decidirVerificacion({
    organizacion,
    actor: actor(ROLES.VERIFIER),
    decision: VERIFICACION.VERIFICADA,
    chequeo: chequeoOk,
    motivo: "ok",
  });
  assert.equal(r.codigo, "SIN_MOTIVO");
});

test("aprobación válida deja evento de auditoría y habilita operación", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  const r = decidirVerificacion({
    organizacion,
    actor: actor(ROLES.VERIFIER),
    decision: VERIFICACION.VERIFICADA,
    chequeo: chequeoOk,
    motivo: "Cámara de comercio vigente y videollamada con representante legal",
    ahora: AHORA,
  });
  assert.equal(r.ok, true, r.mensaje);
  assert.equal(puedeOperar(r.organizacion), true);
  assert.equal(r.evento.accion, "ORGANIZACION_VERIFICADA");
  assert.equal(r.organizacion.verificadaPorId, "usr_verifier");
});

test("nadie verifica su propia organización", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  const r = decidirVerificacion({
    organizacion,
    actor: actor(ROLES.VERIFIER, { organizacionId: organizacion.id }),
    decision: VERIFICACION.VERIFICADA,
    chequeo: chequeoOk,
    motivo: "Documentación completa y revisada",
  });
  assert.equal(r.codigo, "AUTOVERIFICACION");
});

test("un rol de soporte no puede verificar", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  const r = decidirVerificacion({
    organizacion,
    actor: actor(ROLES.SUPPORT),
    decision: VERIFICACION.VERIFICADA,
    chequeo: chequeoOk,
    motivo: "Intento de aprobación sin competencia",
  });
  assert.equal(r.codigo, "ROL_INSUFICIENTE");
});

test("una organización verificada pero suspendida no puede operar", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  const aprobada = decidirVerificacion({
    organizacion,
    actor: actor(ROLES.VERIFIER),
    decision: VERIFICACION.VERIFICADA,
    chequeo: chequeoOk,
    motivo: "Documentación completa y verificada",
  }).organizacion;

  const r = suspender({
    organizacion: aprobada,
    actor: actor(ROLES.ADMIN),
    motivo: "Incidente sanitario reportado en dos entregas consecutivas",
  });
  assert.equal(r.ok, true, r.mensaje);
  assert.equal(puedeOperar(r.organizacion), false);
  assert.equal(r.evento.accion, "ORGANIZACION_SUSPENDIDA");
});

test("solo ADMIN suspende", () => {
  const { organizacion } = nuevaOrganizacion(datos, AHORA);
  assert.equal(
    suspender({ organizacion, actor: actor(ROLES.VERIFIER), motivo: "motivo suficientemente largo" }).codigo,
    "ROL_INSUFICIENTE"
  );
});
