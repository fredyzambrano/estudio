import { test } from "node:test";
import assert from "node:assert/strict";

import { crearEvento, verificarCadena, canonico, recortarIp, seudonimizarIp, diferencia } from "../app/js/core/auditoria.js";
import { igualSeguro, codigoEntrega } from "../app/js/core/ids.js";
import { ROLES } from "../app/js/core/rbac.js";
import { actor, AHORA } from "./ayuda.js";

async function cadenaDe(n) {
  const eventos = [];
  let anterior = null;
  for (let i = 0; i < n; i++) {
    const e = await crearEvento({
      accion: "DONACION_PUBLICADA",
      actor: actor(ROLES.DONOR),
      recurso: "donacion",
      recursoId: `don_${i}`,
      despues: { estado: "PUBLISHED" },
      hashAnterior: anterior,
      ahora: new Date(AHORA.getTime() + i * 1000),
    });
    eventos.push(e);
    anterior = e.hash;
  }
  return eventos;
}

test("la cadena de auditoría se verifica de punta a punta", async () => {
  const eventos = await cadenaDe(5);
  assert.deepEqual(await verificarCadena(eventos), { ok: true });
});

test("alterar el contenido de un evento rompe la cadena", async () => {
  const eventos = await cadenaDe(5);
  eventos[2].despues = { estado: "CLOSED" };
  const r = await verificarCadena(eventos);
  assert.equal(r.ok, false);
  assert.equal(r.rotoEn, 2);
});

test("borrar un evento intermedio rompe la cadena", async () => {
  const eventos = await cadenaDe(5);
  eventos.splice(2, 1);
  const r = await verificarCadena(eventos);
  assert.equal(r.ok, false);
  assert.equal(r.rotoEn, 2);
});

test("reordenar eventos rompe la cadena", async () => {
  const eventos = await cadenaDe(4);
  [eventos[1], eventos[2]] = [eventos[2], eventos[1]];
  assert.equal((await verificarCadena(eventos)).ok, false);
});

test("la serialización canónica no depende del orden de las claves", () => {
  assert.equal(canonico({ a: 1, b: [2, { d: 4, c: 3 }] }), canonico({ b: [2, { c: 3, d: 4 }], a: 1 }));
});

test("la IP se recorta antes de cualquier persistencia", () => {
  assert.equal(recortarIp("190.85.12.201"), "190.85.12.0/24");
  assert.equal(recortarIp("2801:14b:1000:abcd::1"), "2801:14b:1000::/48");
  assert.equal(recortarIp(""), null);
});

test("la IP seudonimizada es estable, corta y no reversible por comparación directa", async () => {
  const a = await seudonimizarIp("190.85.12.201", "sal");
  const b = await seudonimizarIp("190.85.12.55", "sal");
  const c = await seudonimizarIp("190.85.99.1", "sal");
  assert.equal(a, b, "la misma /24 debe colapsar al mismo valor");
  assert.notEqual(a, c);
  assert.equal(a.length, 16);
  assert.ok(!a.includes("190"));
});

test("la sal cambia el seudónimo", async () => {
  assert.notEqual(await seudonimizarIp("190.85.12.201", "s1"), await seudonimizarIp("190.85.12.201", "s2"));
});

test("la diferencia oculta campos sensibles", () => {
  const d = diferencia({ contactoTelefono: "573001112233", estado: "DRAFT" }, { contactoTelefono: "573009998877", estado: "PUBLISHED" });
  const tel = d.find((x) => x.campo === "contactoTelefono");
  assert.equal(tel.antes, "«oculto»");
  assert.equal(tel.despues, "«oculto»");
  assert.equal(d.find((x) => x.campo === "estado").despues, "PUBLISHED");
});

test("el código de entrega es legible y sin caracteres ambiguos", () => {
  for (let i = 0; i < 50; i++) {
    const c = codigoEntrega();
    assert.match(c, /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
  }
});

test("igualSeguro compara sin cortocircuito por contenido", () => {
  assert.equal(igualSeguro("ABC-123", "ABC-123"), true);
  assert.equal(igualSeguro("ABC-123", "ABC-124"), false);
  assert.equal(igualSeguro("ABC", "ABCD"), false);
  assert.equal(igualSeguro(null, undefined), true);
});
