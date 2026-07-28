import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluar, evaluarParaEntrega } from "../app/js/core/inocuidad.js";
import { AHORA, enHoras, donacionApta } from "./ayuda.js";

const codigos = (r) => r.bloqueos.map((b) => b.codigo);

test("una donación completa y vigente es apta", () => {
  const r = evaluar(donacionApta(), AHORA);
  assert.equal(r.apta, true, `bloqueos inesperados: ${codigos(r).join(", ")}`);
});

test("bloquea alimento vencido — regla central del piloto", () => {
  const r = evaluar(donacionApta({ fechaVencimiento: enHoras(-1).toISOString() }), AHORA);
  assert.equal(r.apta, false);
  assert.ok(codigos(r).includes("VENCIDO"));
  assert.ok(r.bloqueos.find((b) => b.codigo === "VENCIDO").norma.includes("1990"));
});

test("bloquea vencimiento exactamente en el instante actual", () => {
  const r = evaluar(donacionApta({ fechaVencimiento: AHORA.toISOString() }), AHORA);
  assert.ok(codigos(r).includes("VENCIDO"));
});

test("bloquea empaque abierto o dañado", () => {
  assert.ok(codigos(evaluar(donacionApta({ estadoEmpaque: "ABIERTO" }), AHORA)).includes("EMPAQUE_COMPROMETIDO"));
  assert.ok(codigos(evaluar(donacionApta({ estadoEmpaque: "DANADO" }), AHORA)).includes("EMPAQUE_COMPROMETIDO"));
});

test("bloquea si falta la declaración de aptitud del donante", () => {
  const r = evaluar(donacionApta({ declaracionAptitud: false }), AHORA);
  assert.ok(codigos(r).includes("SIN_DECLARACION"));
});

test("lácteos exigen fecha, lote y responsable técnico", () => {
  const r = evaluar(
    donacionApta({
      categoria: "LACTEOS",
      conservacion: "REFRIGERADO",
      temperaturaC: 3,
      fechaVencimiento: null,
      lote: null,
      responsableTecnico: null,
    }),
    AHORA
  );
  const c = codigos(r);
  assert.ok(c.includes("SIN_FECHA"));
  assert.ok(c.includes("SIN_LOTE"));
  assert.ok(c.includes("SIN_RESPONSABLE"));
});

test("bloquea ruptura de cadena de frío", () => {
  const base = {
    categoria: "LACTEOS",
    conservacion: "REFRIGERADO",
    lote: "L-2201",
    responsableTecnico: "Jefe de calidad",
    registroSanitario: "RSA-0001",
  };
  assert.ok(codigos(evaluar(donacionApta({ ...base, temperaturaC: 9 }), AHORA)).includes("CADENA_FRIO"));
  assert.equal(evaluar(donacionApta({ ...base, temperaturaC: 3 }), AHORA).apta, true);
});

test("exige temperatura medida cuando la conservación lo requiere", () => {
  const r = evaluar(
    donacionApta({ categoria: "LACTEOS", conservacion: "REFRIGERADO", temperaturaC: null, lote: "L1", responsableTecnico: "X", registroSanitario: "R1" }),
    AHORA
  );
  assert.ok(codigos(r).includes("SIN_TEMPERATURA"));
});

test("rechaza conservación incompatible con la categoría", () => {
  const r = evaluar(donacionApta({ categoria: "CONGELADOS", conservacion: "AMBIENTE" }), AHORA);
  assert.ok(codigos(r).includes("CONSERVACION_INCOMPATIBLE"));
});

test("preparado sin trazabilidad ni hora de preparación no pasa", () => {
  const r = evaluar(donacionApta({ categoria: "PREPARADO", conservacion: "CALIENTE", temperaturaC: 65 }), AHORA);
  const c = codigos(r);
  assert.ok(c.includes("PREPARADO_SIN_HORA"));
  assert.ok(c.includes("SIN_LOTE"));
  assert.ok(c.includes("SIN_RESPONSABLE"));
});

test("preparado fuera de la ventana de 4 horas se bloquea", () => {
  const comun = {
    categoria: "PREPARADO",
    conservacion: "CALIENTE",
    temperaturaC: 65,
    lote: "PREP-01",
    responsableTecnico: "Chef de producción",
  };
  const dentro = evaluar(donacionApta({ ...comun, preparadoEn: enHoras(-2).toISOString() }), AHORA);
  assert.equal(dentro.apta, true, codigos(dentro).join(", "));

  const fuera = evaluar(donacionApta({ ...comun, preparadoEn: enHoras(-9).toISOString() }), AHORA);
  assert.ok(codigos(fuera).includes("PREPARADO_FUERA_DE_VENTANA"));
});

test("exige declarar alérgenos o marcar que no aplican", () => {
  const r = evaluar(donacionApta({ sinAlergenosDeclarados: false, alergenos: [] }), AHORA);
  assert.ok(codigos(r).includes("ALERGENOS_NO_DECLARADOS"));
  assert.equal(evaluar(donacionApta({ sinAlergenosDeclarados: false, alergenos: ["LECHE"] }), AHORA).apta, true);
});

test("alerta sanitaria vigente bloquea siempre", () => {
  assert.ok(codigos(evaluar(donacionApta({ alertaSanitaria: true }), AHORA)).includes("ALERTA_SANITARIA"));
});

test("la ventana de retiro no puede exceder el vencimiento", () => {
  const r = evaluar(
    donacionApta({ fechaVencimiento: enHoras(5).toISOString(), retiroHasta: enHoras(10).toISOString() }),
    AHORA
  );
  assert.ok(codigos(r).includes("RETIRO_DESPUES_DE_VENCER"));
});

test("ventana de retiro cerrada bloquea", () => {
  const r = evaluar(donacionApta({ retiroHasta: enHoras(-1).toISOString() }), AHORA);
  assert.ok(codigos(r).includes("VENTANA_VENCIDA"));
});

test("exige al menos una foto", () => {
  assert.ok(codigos(evaluar(donacionApta({ fotos: [] }), AHORA)).includes("SIN_EVIDENCIA"));
});

test("advierte sin bloquear cuando vence en menos de 24 h", () => {
  const r = evaluar(donacionApta({ fechaVencimiento: enHoras(10).toISOString(), retiroHasta: enHoras(8).toISOString() }), AHORA);
  assert.equal(r.apta, true);
  assert.ok(r.advertencias.some((a) => a.codigo === "VENCE_PRONTO"));
});

test("la evaluación es pura: no muta la donación", () => {
  const d = donacionApta();
  const copia = JSON.parse(JSON.stringify(d));
  evaluar(d, AHORA);
  assert.deepEqual(d, copia);
});

test("lo apto hoy puede dejar de serlo mañana", () => {
  const d = donacionApta();
  assert.equal(evaluar(d, AHORA).apta, true);
  assert.equal(evaluar(d, enHoras(80)).apta, false);
});

test("evaluarParaEntrega advierte margen crítico de vida útil", () => {
  const d = donacionApta({ fechaVencimiento: enHoras(1).toISOString(), retiroHasta: enHoras(0.5).toISOString() });
  const r = evaluarParaEntrega(d, AHORA);
  assert.equal(r.apta, true);
  assert.ok(r.advertencias.some((a) => a.codigo === "MARGEN_CRITICO"));
});
