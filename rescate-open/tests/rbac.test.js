import { test } from "node:test";
import assert from "node:assert/strict";

import { puede, pudiera, ROLES, PERMISOS, ROLES_CON_MFA_OBLIGATORIO } from "../app/js/core/rbac.js";
import { actor } from "./ayuda.js";

const recursoPropio = { organizacionId: "org_donante" };
const recursoAjeno = { organizacionId: "org_ajena" };

test("sin sesión no hay permiso alguno", () => {
  for (const p of PERMISOS) {
    assert.equal(puede(null, p, recursoPropio).ok, false);
  }
});

test("el donante solo administra donaciones de su organización", () => {
  const d = actor(ROLES.DONOR);
  assert.equal(puede(d, "donacion:publicar", recursoPropio).ok, true);
  assert.equal(puede(d, "donacion:publicar", recursoAjeno).codigo, "NO_ES_PROPIETARIO");
});

test("el receptor no puede crear ni publicar donaciones", () => {
  const r = actor(ROLES.RECEIVER);
  assert.equal(puede(r, "donacion:crear", recursoPropio).codigo, "ROL_INSUFICIENTE");
  assert.equal(puede(r, "donacion:publicar", recursoPropio).codigo, "ROL_INSUFICIENTE");
});

test("el donante no puede reservar donaciones", () => {
  assert.equal(puede(actor(ROLES.DONOR), "reserva:crear").codigo, "ROL_INSUFICIENTE");
});

test("nadie fuera de VERIFIER/ADMIN verifica organizaciones", () => {
  for (const rol of [ROLES.DONOR, ROLES.RECEIVER, ROLES.SUPPORT]) {
    assert.equal(puede(actor(rol), "organizacion:verificar").codigo, "ROL_INSUFICIENTE");
  }
  assert.equal(puede(actor(ROLES.VERIFIER), "organizacion:verificar").ok, true);
});

test("solo ADMIN suspende organizaciones", () => {
  assert.equal(puede(actor(ROLES.VERIFIER), "organizacion:suspender").codigo, "ROL_INSUFICIENTE");
  assert.equal(puede(actor(ROLES.SUPPORT), "organizacion:suspender").codigo, "ROL_INSUFICIENTE");
  assert.equal(puede(actor(ROLES.ADMIN), "organizacion:suspender").ok, true);
});

test("los roles críticos exigen MFA activo", () => {
  for (const rol of ROLES_CON_MFA_OBLIGATORIO) {
    const sinMfa = actor(rol, { mfa: false });
    assert.equal(puede(sinMfa, "auditoria:leer").codigo, "MFA_REQUERIDO");
  }
});

test("una cuenta suspendida pierde todos los permisos", () => {
  const susp = actor(ROLES.ADMIN, { suspendido: true });
  assert.equal(puede(susp, "auditoria:leer").codigo, "CUENTA_SUSPENDIDA");
});

test("el alcance 'reserva' exige ser parte de la operación", () => {
  const receptorParte = actor(ROLES.RECEIVER, { organizacionId: "org_receptora" });
  const receptorAjeno = actor(ROLES.RECEIVER, { organizacionId: "org_tercera" });
  const recurso = { organizacionId: "org_donante", reservadaPorId: "org_receptora" };

  assert.equal(puede(receptorParte, "recepcion:confirmar", recurso).ok, true);
  assert.equal(puede(receptorAjeno, "recepcion:confirmar", recurso).codigo, "NO_ES_PARTE");
});

test("ni siquiera SUPPORT puede publicar donaciones ajenas", () => {
  assert.equal(puede(actor(ROLES.SUPPORT), "donacion:publicar", recursoPropio).codigo, "ROL_INSUFICIENTE");
});

test("un permiso no declarado se niega, no se asume", () => {
  assert.equal(puede(actor(ROLES.ADMIN), "donacion:borrar_todo").codigo, "PERMISO_DESCONOCIDO");
});

test("pudiera() refleja exactamente a puede()", () => {
  const a = actor(ROLES.DONOR);
  for (const p of PERMISOS) {
    assert.equal(pudiera(a, p, recursoPropio), puede(a, p, recursoPropio).ok);
  }
});

test("los datos de contacto solo los ve soporte o administración", () => {
  const recurso = { organizacionId: "org_donante", reservadaPorId: "org_receptora" };
  assert.equal(puede(actor(ROLES.RECEIVER, { organizacionId: "org_receptora" }), "donacion:ver_contacto", recurso).codigo, "ROL_INSUFICIENTE");
  assert.equal(puede(actor(ROLES.SUPPORT), "donacion:ver_contacto", recurso).ok, true);
});
