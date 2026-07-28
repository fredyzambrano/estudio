import { test } from "node:test";
import assert from "node:assert/strict";

import { resumen, embudo, serieDiaria, tiempoMedianoHoras, kilosDe } from "../app/js/core/impacto.js";
import { aproximar, celda, distanciaKm, descripcionPublica, ciudad } from "../app/js/core/geo.js";
import { aKilos } from "../app/js/datos/catalogos.js";
import { ESTADOS } from "../app/js/core/estados.js";
import { AHORA, enHoras } from "./ayuda.js";

const d = (over) => ({ estado: ESTADOS.RECEIVED, cantidad: 10, unidad: "KG", ...over });

test("solo cuentan las donaciones efectivamente recibidas o cerradas", () => {
  const r = resumen([
    d({ estado: ESTADOS.PUBLISHED, cantidad: 100 }),
    d({ estado: ESTADOS.RESERVED, cantidad: 100 }),
    d({ estado: ESTADOS.CANCELLED, cantidad: 100 }),
    d({ estado: ESTADOS.RECEIVED, cantidad: 20 }),
    d({ estado: ESTADOS.CLOSED, cantidad: 30 }),
  ]);
  assert.equal(r.entregas, 2);
  assert.equal(r.kg, 50);
});

test("el acta manda sobre la cantidad publicada", () => {
  assert.equal(kilosDe(d({ cantidad: 50, acta: { cantidadRecibida: 42, unidad: "KG" } })), 42);
  assert.equal(kilosDe(d({ cantidad: 50 })), 50);
});

test("las unidades se convierten a kilos con el factor del catálogo", () => {
  assert.equal(aKilos(4, "CANASTA"), 48);
  assert.equal(aKilos(10, "PORCION"), 4);
  assert.equal(aKilos(3, "INVENTADA"), 0);
});

test("el embudo calcula la tasa de rescate sobre lo publicado", () => {
  const e = embudo([
    d({ estado: ESTADOS.DRAFT }),
    d({ estado: ESTADOS.PUBLISHED }),
    d({ estado: ESTADOS.RESERVED }),
    d({ estado: ESTADOS.RECEIVED }),
    d({ estado: ESTADOS.CLOSED }),
  ]);
  assert.equal(e.borradores, 1);
  assert.equal(e.recibidas, 2);
  assert.equal(e.tasaRescate, 50); // 2 de 4 publicadas
});

test("el embudo no divide por cero sin datos", () => {
  assert.equal(embudo([]).tasaRescate, 0);
});

test("la serie diaria agrupa por fecha de recepción", () => {
  const serie = serieDiaria(
    [
      d({ recibidaEn: AHORA.toISOString(), cantidad: 12 }),
      d({ recibidaEn: AHORA.toISOString(), cantidad: 8 }),
      d({ recibidaEn: enHoras(-48).toISOString(), cantidad: 5 }),
    ],
    3,
    AHORA
  );
  assert.equal(serie.length, 3);
  assert.equal(serie.at(-1).kg, 20);
  assert.equal(serie[0].kg, 5);
});

test("el tiempo mediano de rescate se calcula solo con entregas completas", () => {
  const donaciones = [
    d({ publicadaEn: AHORA.toISOString(), recibidaEn: enHoras(2).toISOString() }),
    d({ publicadaEn: AHORA.toISOString(), recibidaEn: enHoras(6).toISOString() }),
    d({ estado: ESTADOS.PUBLISHED, publicadaEn: AHORA.toISOString() }),
  ];
  assert.equal(tiempoMedianoHoras(donaciones), 4);
  assert.equal(tiempoMedianoHoras([]), null);
});

/* ---------- Geo ---------- */

test("aproximar reduce la precisión a la cuadrícula pedida", () => {
  const exacto = { lat: 4.730512, lon: -74.066912 };
  const aprox = aproximar(exacto, 1);
  assert.notEqual(aprox.lat, exacto.lat);
  assert.ok(distanciaKm(exacto, aprox) <= 1.1, "la celda no debe alejarse más de ~1 km");
});

test("dos puntos cercanos caen en la misma celda", () => {
  const a = celda({ lat: 4.7305, lon: -74.0669 }, 1);
  const b = celda({ lat: 4.7308, lon: -74.0671 }, 1);
  assert.equal(a, b);
});

test("la distancia entre Bogotá y Medellín es del orden esperado", () => {
  const km = distanciaKm(ciudad("BOG"), ciudad("MDE"));
  assert.ok(km > 200 && km < 300, `distancia inesperada: ${km} km`);
});

test("la descripción pública nunca incluye la dirección", () => {
  const texto = descripcionPublica({ ciudadId: "BOG", zona: "Zona centro", precisionKm: 1, direccionExacta: "Calle secreta 1" });
  assert.match(texto, /Bogotá/);
  assert.ok(!texto.includes("Calle secreta"));
});
