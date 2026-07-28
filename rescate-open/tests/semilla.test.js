import { test } from "node:test";
import assert from "node:assert/strict";

import { construirSemilla } from "../app/js/datos/semilla.js";
import { crearEvento, verificarCadena } from "../app/js/core/auditoria.js";
import { evaluar } from "../app/js/core/inocuidad.js";
import { ESTADOS } from "../app/js/core/estados.js";
import { vigente } from "../app/js/core/consentimiento.js";

async function sembrar() {
  const auditoria = [];
  const registrar = async (evento) => {
    const e = await crearEvento({
      ...evento,
      hashAnterior: auditoria.length ? auditoria[auditoria.length - 1].hash : null,
    });
    auditoria.push(e);
    return e;
  };
  const datos = await construirSemilla(registrar);
  return { ...datos, auditoria };
}

test("la semilla se construye pasando por la máquina de estados real", async () => {
  const { donaciones } = await sembrar();
  assert.equal(donaciones.length, 6, "deben crearse las 6 donaciones de demostración");

  const estados = donaciones.map((d) => d.estado);
  assert.ok(estados.includes(ESTADOS.PUBLISHED));
  assert.ok(estados.includes(ESTADOS.RESERVED));
  assert.ok(estados.includes(ESTADOS.HANDED_OVER));
  assert.ok(estados.includes(ESTADOS.CLOSED));
  assert.ok(estados.includes(ESTADOS.DRAFT));
});

test("ninguna donación queda atascada antes de su estado objetivo", async () => {
  const { donaciones } = await sembrar();
  const cerrada = donaciones.find((d) => d.titulo.startsWith("Arroz"));
  assert.equal(cerrada.estado, ESTADOS.CLOSED, "el caso histórico debe llegar a CLOSED");
  assert.ok(cerrada.acta && cerrada.recibidaEn);

  const enCustodia = donaciones.find((d) => d.titulo.startsWith("Almuerzos"));
  assert.equal(enCustodia.estado, ESTADOS.HANDED_OVER);
  assert.ok(enCustodia.evidenciaEntrega);
});

test("el borrador de demostración es justamente el que no pasa inocuidad", async () => {
  const { donaciones } = await sembrar();
  const borrador = donaciones.find((d) => d.estado === ESTADOS.DRAFT);
  const r = evaluar(borrador, new Date());
  assert.equal(r.apta, false);
  const codigos = r.bloqueos.map((b) => b.codigo);
  assert.ok(codigos.includes("VENCIDO"));
  assert.ok(codigos.includes("EMPAQUE_COMPROMETIDO"));
  assert.ok(codigos.includes("SIN_DECLARACION"));
});

test("las donaciones publicadas o reservadas cumplen inocuidad al momento de sembrar", async () => {
  const { donaciones } = await sembrar();
  const activas = donaciones.filter((d) => [ESTADOS.PUBLISHED, ESTADOS.RESERVED].includes(d.estado));
  assert.ok(activas.length >= 3);
  for (const d of activas) {
    const r = evaluar(d, new Date());
    assert.equal(r.apta, true, `${d.titulo}: ${r.bloqueos.map((b) => b.codigo).join(", ")}`);
  }
});

test("la cadena de auditoría de la semilla es válida", async () => {
  const { auditoria } = await sembrar();
  assert.ok(auditoria.length >= 15, `pocos eventos: ${auditoria.length}`);
  assert.deepEqual(await verificarCadena(auditoria), { ok: true });
});

test("todos los usuarios de demostración tienen consentimiento vigente", async () => {
  const { usuarios, consentimientos } = await sembrar();
  for (const u of usuarios) {
    const c = consentimientos.find((x) => x.usuarioId === u.id);
    assert.ok(c, `falta consentimiento de ${u.id}`);
    assert.equal(vigente(c), true);
  }
});

test("la semilla no contiene datos de contacto con apariencia real", async () => {
  const { organizaciones, donaciones } = await sembrar();
  const texto = JSON.stringify({ organizaciones, donaciones });
  assert.ok(texto.includes("ejemplo.test"), "los correos deben usar un dominio reservado");
  assert.ok(!/@(gmail|hotmail|outlook|yahoo)\./i.test(texto), "no debe haber correos personales");
  assert.ok(/ficticia|ficticio/i.test(texto), "las organizaciones deben marcarse como ficticias");
});
