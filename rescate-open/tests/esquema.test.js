import { test } from "node:test";
import assert from "node:assert/strict";

import { s, validar, esValido } from "../app/js/core/esquema.js";
import { nuevaDonacion, vistaPublica, vistaParaReserva, urgencia } from "../app/js/core/donacion.js";
import { ROLES } from "../app/js/core/rbac.js";
import { AHORA, enHoras, actor } from "./ayuda.js";

test("texto respeta mínimos, máximos y recorte", () => {
  const v = s.texto({ min: 3, max: 6 });
  assert.equal(v("  hola  ").value, "hola");
  assert.equal(v("ab").ok, false);
  assert.equal(v("abcdefgh").ok, false);
  assert.equal(v(42).ok, false);
});

test("número acepta coma decimal y rechaza fuera de rango", () => {
  const v = s.numero({ min: 0, max: 10 });
  assert.equal(v("3,5").value, 3.5);
  assert.equal(v(-1).ok, false);
  assert.equal(v("abc").ok, false);
});

test("opcion rechaza valores fuera del catálogo", () => {
  const v = s.opcion(["A", "B"]);
  assert.equal(v("A").ok, true);
  assert.equal(v("C").ok, false);
});

test("teléfono colombiano normaliza y valida", () => {
  const v = s.telefonoCo();
  assert.equal(v("+57 300 123 4567").value, "573001234567");
  assert.equal(v("3001234567").ok, false);
  assert.equal(v("57300123").ok, false);
});

test("objeto descarta campos desconocidos en modo estricto", () => {
  const v = s.objeto({ a: s.texto({ min: 1 }) });
  const r = v({ a: "x", rolInyectado: "ADMIN" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { a: "x" });
});

test("los errores identifican el campo anidado", () => {
  const v = s.objeto({ interno: s.objeto({ valor: s.numero({ min: 5 }) }) });
  const r = v({ interno: { valor: 1 } });
  assert.equal(r.ok, false);
  assert.equal(r.errores[0].campo, "interno.valor");
});

test("validar() lanza error tipado y esValido() no", () => {
  const v = s.objeto({ a: s.texto({ min: 2 }) });
  assert.throws(() => validar(v, { a: "" }), (e) => e.codigo === "VALIDACION");
  assert.equal(esValido(v, { a: "ok" }), true);
});

/* ---------- Entidad donación ---------- */

const datosValidos = {
  titulo: "Yogur de referencia descontinuada",
  categoria: "LACTEOS",
  cantidad: 60,
  unidad: "UNIDAD",
  conservacion: "REFRIGERADO",
  temperaturaC: 3,
  estadoEmpaque: "SELLADO_ORIGINAL",
  fechaVencimiento: enHoras(60).toISOString(),
  lote: "L-778",
  registroSanitario: "RSA-123",
  responsableTecnico: "Jefatura de calidad",
  alergenos: ["LECHE"],
  declaracionAptitud: true,
  retiroDesde: AHORA.toISOString(),
  retiroHasta: enHoras(24).toISOString(),
  ciudadId: "BOG",
  zona: "Zona industrial norte",
  direccionExacta: "Bodega 12, parque logístico ficticio",
  contactoNombre: "Coordinación de bodega",
  contactoTelefono: "573001234567",
  lat: 4.7305,
  lon: -74.0669,
  fotos: ["blob:a", "blob:b"],
};

test("una donación nace en DRAFT, nunca publicada", () => {
  const r = nuevaDonacion(datosValidos, actor(ROLES.DONOR), AHORA);
  assert.equal(r.ok, true, JSON.stringify(r.errores));
  assert.equal(r.donacion.estado, "DRAFT");
  assert.equal(r.donacion.publicadaEn, null);
  assert.equal(r.sanidad.apta, true);
});

test("no se guardan las coordenadas exactas, solo la celda aproximada", () => {
  const { donacion } = nuevaDonacion(datosValidos, actor(ROLES.DONOR), AHORA);
  assert.equal(donacion.lat, undefined);
  assert.equal(donacion.lon, undefined);
  assert.ok(donacion.latAprox !== null && donacion.celda);
  assert.notEqual(donacion.latAprox, datosValidos.lat);
});

test("rechaza ventana de retiro invertida", () => {
  const r = nuevaDonacion({ ...datosValidos, retiroHasta: enHoras(-5).toISOString() }, actor(ROLES.DONOR), AHORA);
  assert.equal(r.ok, false);
  assert.equal(r.errores[0].campo, "retiroHasta");
});

test("la vista pública nunca expone dirección, contacto ni código de entrega", () => {
  const { donacion } = nuevaDonacion(datosValidos, actor(ROLES.DONOR), AHORA);
  const publica = vistaPublica({ ...donacion, codigoEntrega: "ABC-123" });
  for (const campo of ["direccionExacta", "contactoTelefono", "contactoNombre", "codigoEntrega", "indicacionesRetiro"]) {
    assert.equal(publica[campo], undefined, `filtró ${campo}`);
  }
  assert.match(publica.ubicacionTexto, /aprox\./);
});

test("solo la organización que reservó ve la dirección exacta", () => {
  const { donacion } = nuevaDonacion(datosValidos, actor(ROLES.DONOR), AHORA);
  const reservada = { ...donacion, reservadaPorId: "org_receptora" };

  assert.equal(vistaParaReserva(reservada, "org_tercera").direccionExacta, undefined);
  assert.equal(vistaParaReserva(reservada, "org_receptora").direccionExacta, datosValidos.direccionExacta);
});

test("la urgencia escala según la ventana restante", () => {
  const base = { retiroHasta: enHoras(2).toISOString() };
  assert.equal(urgencia(base, AHORA).nivel, "critica");
  assert.equal(urgencia({ retiroHasta: enHoras(8).toISOString() }, AHORA).nivel, "alta");
  assert.equal(urgencia({ retiroHasta: enHoras(30).toISOString() }, AHORA).nivel, "media");
  assert.equal(urgencia({ retiroHasta: enHoras(-1).toISOString() }, AHORA).nivel, "vencida");
});
