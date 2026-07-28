import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ESTADOS,
  TRANSICIONES,
  evaluarTransicion,
  aplicarTransicion,
  esTerminal,
  transicionesDesde,
} from "../app/js/core/estados.js";
import { ROLES } from "../app/js/core/rbac.js";
import { AHORA, enHoras, actor, donacionApta, contextoBase, orgVerificada } from "./ayuda.js";

const donante = actor(ROLES.DONOR);
const receptor = actor(ROLES.RECEIVER);
const admin = actor(ROLES.ADMIN);
const soporte = actor(ROLES.SUPPORT);

/* ---------- Camino feliz completo ---------- */

test("recorre DRAFT → PUBLISHED → RESERVED → HANDED_OVER → RECEIVED → CLOSED", () => {
  let d = donacionApta();

  const pub = aplicarTransicion({ donacion: d, a: ESTADOS.PUBLISHED, actor: donante, contexto: contextoBase() });
  assert.equal(pub.ok, true, pub.mensaje);
  assert.equal(pub.donacion.estado, ESTADOS.PUBLISHED);
  assert.ok(pub.donacion.publicadaEn);
  assert.equal(pub.evento.accion, "DONACION_PUBLICADA");
  d = pub.donacion;

  const res = aplicarTransicion({
    donacion: d,
    a: ESTADOS.RESERVED,
    actor: receptor,
    contexto: contextoBase({ codigoEntregaGenerado: "ABC-123" }),
  });
  assert.equal(res.ok, true, res.mensaje);
  assert.equal(res.donacion.reservadaPorId, "org_receptora");
  assert.equal(res.donacion.codigoEntrega, "ABC-123");
  d = res.donacion;

  const ent = aplicarTransicion({
    donacion: d,
    a: ESTADOS.HANDED_OVER,
    actor: donante,
    contexto: contextoBase({
      codigoEntrega: "abc-123",
      evidencia: { fotos: ["blob:entrega"], recibeNombre: "Coordinadora logística" },
    }),
  });
  assert.equal(ent.ok, true, ent.mensaje);
  d = ent.donacion;

  const rec = aplicarTransicion({
    donacion: d,
    a: ESTADOS.RECEIVED,
    actor: receptor,
    contexto: contextoBase({ acta: { cantidadRecibida: 38, unidad: "KG", conformidad: true } }),
  });
  assert.equal(rec.ok, true, rec.mensaje);
  assert.equal(rec.donacion.acta.cantidadRecibida, 38);
  d = rec.donacion;

  const cer = aplicarTransicion({ donacion: d, a: ESTADOS.CLOSED, actor: receptor, contexto: contextoBase() });
  assert.equal(cer.ok, true, cer.mensaje);
  assert.ok(esTerminal(cer.donacion.estado));
});

/* ---------- Transiciones prohibidas ---------- */

test("no se puede saltar de DRAFT directo a RESERVED", () => {
  const r = evaluarTransicion({ donacion: donacionApta(), a: ESTADOS.RESERVED, actor: receptor, contexto: contextoBase() });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "TRANSICION_NO_PERMITIDA");
});

test("no se puede saltar de PUBLISHED a RECEIVED", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.PUBLISHED }),
    a: ESTADOS.RECEIVED,
    actor: receptor,
    contexto: contextoBase(),
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "TRANSICION_NO_PERMITIDA");
});

test("no se puede volver atrás de RECEIVED a PUBLISHED", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.RECEIVED }),
    a: ESTADOS.PUBLISHED,
    actor: admin,
    contexto: contextoBase(),
  });
  assert.equal(r.ok, false);
});

test("los estados terminales no admiten ningún cambio, ni para ADMIN", () => {
  for (const terminal of [ESTADOS.CLOSED, ESTADOS.CANCELLED, ESTADOS.REJECTED]) {
    for (const destino of Object.values(ESTADOS)) {
      const r = evaluarTransicion({
        donacion: donacionApta({ estado: terminal }),
        a: destino,
        actor: admin,
        contexto: contextoBase(),
      });
      assert.equal(r.ok, false, `${terminal} → ${destino} no debería permitirse`);
      assert.equal(r.codigo, "ESTADO_TERMINAL");
    }
  }
});

/* ---------- Autorización cruzada ---------- */

test("un receptor no puede publicar la donación de un donante", () => {
  const r = evaluarTransicion({ donacion: donacionApta(), a: ESTADOS.PUBLISHED, actor: receptor, contexto: contextoBase() });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "ROL_INSUFICIENTE");
});

test("un donante no puede publicar donaciones de OTRA organización", () => {
  const ajeno = actor(ROLES.DONOR, { id: "usr_otro", organizacionId: "org_ajena" });
  const r = evaluarTransicion({ donacion: donacionApta(), a: ESTADOS.PUBLISHED, actor: ajeno, contexto: contextoBase() });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "NO_ES_PROPIETARIO");
});

test("un receptor ajeno a la reserva no puede confirmar la recepción", () => {
  const otro = actor(ROLES.RECEIVER, { id: "usr_otro", organizacionId: "org_tercera" });
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.HANDED_OVER, reservadaPorId: "org_receptora" }),
    a: ESTADOS.RECEIVED,
    actor: otro,
    contexto: contextoBase({ acta: { cantidadRecibida: 10, conformidad: true } }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "NO_ES_PARTE");
});

test("el donante no puede confirmar la recepción por el receptor", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.HANDED_OVER, reservadaPorId: "org_receptora" }),
    a: ESTADOS.RECEIVED,
    actor: donante,
    contexto: contextoBase({ acta: { cantidadRecibida: 10, conformidad: true } }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "ROL_INSUFICIENTE");
});

test("un verificador sin MFA no puede moderar", () => {
  const sinMfa = actor(ROLES.VERIFIER, { mfa: false });
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.PUBLISHED }),
    a: ESTADOS.REJECTED,
    actor: sinMfa,
    contexto: contextoBase({ motivo: "Producto inconsistente con el rotulado" }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "MFA_REQUERIDO");
});

test("una cuenta suspendida no puede hacer nada", () => {
  const r = evaluarTransicion({
    donacion: donacionApta(),
    a: ESTADOS.PUBLISHED,
    actor: actor(ROLES.DONOR, { suspendido: true }),
    contexto: contextoBase(),
  });
  assert.equal(r.codigo, "CUENTA_SUSPENDIDA");
});

/* ---------- Guardas de negocio ---------- */

test("no se publica una donación vencida aunque el actor tenga permiso", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ fechaVencimiento: enHoras(-2).toISOString() }),
    a: ESTADOS.PUBLISHED,
    actor: donante,
    contexto: contextoBase(),
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "INOCUIDAD");
  assert.ok(r.detalle.some((b) => b.codigo === "VENCIDO"));
});

test("no se publica sin consentimiento vigente", () => {
  const r = evaluarTransicion({
    donacion: donacionApta(),
    a: ESTADOS.PUBLISHED,
    actor: donante,
    contexto: contextoBase({ consentimientoVigente: false }),
  });
  assert.equal(r.codigo, "SIN_CONSENTIMIENTO");
});

test("no se publica si la organización donante no está verificada", () => {
  const r = evaluarTransicion({
    donacion: donacionApta(),
    a: ESTADOS.PUBLISHED,
    actor: donante,
    contexto: contextoBase({ organizacionDonante: orgVerificada({ estadoVerificacion: "PENDIENTE" }) }),
  });
  assert.equal(r.codigo, "DONANTE_NO_VERIFICADO");
});

test("una organización receptora sin verificar no puede reservar", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.PUBLISHED }),
    a: ESTADOS.RESERVED,
    actor: receptor,
    contexto: contextoBase({
      organizacionReceptora: orgVerificada({ id: "org_receptora", estadoVerificacion: "EN_REVISION" }),
    }),
  });
  assert.equal(r.codigo, "RECEPTOR_NO_VERIFICADO");
});

test("una organización suspendida no puede reservar", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.PUBLISHED }),
    a: ESTADOS.RESERVED,
    actor: receptor,
    contexto: contextoBase({ organizacionReceptora: orgVerificada({ id: "org_receptora", suspendida: true }) }),
  });
  assert.equal(r.codigo, "RECEPTOR_SUSPENDIDO");
});

test("no hay doble reserva sobre la misma donación", () => {
  const r = evaluarTransicion({
    donacion: donacionApta({ estado: ESTADOS.PUBLISHED, reservadaPorId: "org_previa" }),
    a: ESTADOS.RESERVED,
    actor: receptor,
    contexto: contextoBase(),
  });
  assert.equal(r.codigo, "YA_RESERVADA");
});

test("la entrega exige el código dictado por quien recibe", () => {
  const base = donacionApta({ estado: ESTADOS.RESERVED, reservadaPorId: "org_receptora", codigoEntrega: "XYZ-987" });
  const evidencia = { fotos: ["blob:e"], recibeNombre: "Auxiliar" };

  const malo = evaluarTransicion({
    donacion: base,
    a: ESTADOS.HANDED_OVER,
    actor: donante,
    contexto: contextoBase({ codigoEntrega: "AAA-111", evidencia }),
  });
  assert.equal(malo.codigo, "CODIGO_INVALIDO");

  const bueno = evaluarTransicion({
    donacion: base,
    a: ESTADOS.HANDED_OVER,
    actor: donante,
    contexto: contextoBase({ codigoEntrega: "XYZ-987", evidencia }),
  });
  assert.equal(bueno.ok, true, bueno.mensaje);
});

test("la entrega revalida inocuidad: si venció entre la reserva y el retiro, se detiene", () => {
  const d = donacionApta({
    estado: ESTADOS.RESERVED,
    reservadaPorId: "org_receptora",
    codigoEntrega: "XYZ-987",
  });
  const r = evaluarTransicion({
    donacion: d,
    a: ESTADOS.HANDED_OVER,
    actor: donante,
    contexto: contextoBase({
      ahora: enHoras(96),
      codigoEntrega: "XYZ-987",
      evidencia: { fotos: ["blob:e"], recibeNombre: "Auxiliar" },
    }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, "INOCUIDAD_ENTREGA");
});

test("la entrega exige evidencia y nombre de quien recibe", () => {
  const d = donacionApta({ estado: ESTADOS.RESERVED, reservadaPorId: "org_receptora", codigoEntrega: "XYZ-987" });
  assert.equal(
    evaluarTransicion({
      donacion: d,
      a: ESTADOS.HANDED_OVER,
      actor: donante,
      contexto: contextoBase({ codigoEntrega: "XYZ-987", evidencia: { fotos: [] } }),
    }).codigo,
    "SIN_EVIDENCIA_ENTREGA"
  );
  assert.equal(
    evaluarTransicion({
      donacion: d,
      a: ESTADOS.HANDED_OVER,
      actor: donante,
      contexto: contextoBase({ codigoEntrega: "XYZ-987", evidencia: { fotos: ["blob:x"] } }),
    }).codigo,
    "SIN_RECEPTOR_FISICO"
  );
});

test("una recepción no conforme exige observaciones", () => {
  const d = donacionApta({ estado: ESTADOS.HANDED_OVER, reservadaPorId: "org_receptora" });
  const r = evaluarTransicion({
    donacion: d,
    a: ESTADOS.RECEIVED,
    actor: receptor,
    contexto: contextoBase({ acta: { cantidadRecibida: 12, conformidad: false } }),
  });
  assert.equal(r.codigo, "SIN_OBSERVACIONES");
});

test("cancelar y rechazar exigen motivo escrito", () => {
  assert.equal(
    evaluarTransicion({
      donacion: donacionApta(),
      a: ESTADOS.CANCELLED,
      actor: donante,
      contexto: contextoBase({ motivo: "no" }),
    }).codigo,
    "SIN_MOTIVO"
  );

  const ok = aplicarTransicion({
    donacion: donacionApta(),
    a: ESTADOS.CANCELLED,
    actor: donante,
    contexto: contextoBase({ motivo: "El lote se destinó a consumo interno del casino." }),
  });
  assert.equal(ok.ok, true);
  assert.ok(ok.donacion.motivoFinal.length > 10);
});

test("soporte puede liberar una reserva y la donación vuelve a estar disponible", () => {
  const d = donacionApta({
    estado: ESTADOS.RESERVED,
    reservadaPorId: "org_receptora",
    codigoEntrega: "XYZ-987",
  });
  const r = aplicarTransicion({
    donacion: d,
    a: ESTADOS.PUBLISHED,
    actor: soporte,
    contexto: contextoBase({ motivo: "La organización avisó que no alcanza a recoger hoy." }),
  });
  assert.equal(r.ok, true, r.mensaje);
  assert.equal(r.donacion.reservadaPorId, null);
  assert.equal(r.donacion.codigoEntrega, null);
});

/* ---------- Integridad de la tabla ---------- */

test("aplicarTransicion no muta la donación original", () => {
  const d = donacionApta();
  const copia = JSON.parse(JSON.stringify(d));
  aplicarTransicion({ donacion: d, a: ESTADOS.PUBLISHED, actor: donante, contexto: contextoBase() });
  assert.deepEqual(d, copia);
});

test("cada transición declara acción de auditoría y permiso conocidos", () => {
  for (const t of TRANSICIONES) {
    assert.ok(t.accion, `transición ${t.de}→${t.a} sin acción de auditoría`);
    assert.ok(t.permiso, `transición ${t.de}→${t.a} sin permiso`);
    assert.ok(Object.values(ESTADOS).includes(t.de) && Object.values(ESTADOS).includes(t.a));
  }
});

test("ningún estado terminal tiene transiciones de salida", () => {
  for (const terminal of [ESTADOS.CLOSED, ESTADOS.CANCELLED, ESTADOS.REJECTED]) {
    assert.equal(transicionesDesde(terminal).length, 0);
  }
});
