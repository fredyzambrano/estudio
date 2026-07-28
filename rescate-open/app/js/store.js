/* ============================================================
   RESCATE OPEN — Capa de estado del piloto local
   IMPORTANTE: esta capa vive en localStorage y solo sirve para el
   modo demostración del subdominio. En producción, el mismo núcleo
   (app/js/core) debe ejecutarse en el servidor — ver api/worker.js.
   El navegador nunca puede ser la autoridad de autorización.
   ============================================================ */

import { crearEvento, verificarCadena } from "./core/auditoria.js";
import { vigente as consentimientoVigente } from "./core/consentimiento.js";

const CLAVE = "rescate_open_v1";
const VERSION = 1;

const BASE = () => ({
  v: VERSION,
  sesion: null,               // {usuarioId, rol, organizacionId, mfa}
  usuarios: [],
  organizaciones: [],
  donaciones: [],
  consentimientos: [],        // registros de autorización de tratamiento
  incidentes: [],
  auditoria: [],              // cadena encadenada por hash
  sembrado: false,
});

let estado = cargar();
const oyentes = new Set();

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return BASE();
    const leido = JSON.parse(crudo);
    return migrar(leido);
  } catch (e) {
    console.warn("Estado local ilegible, se reinicia:", e);
    return BASE();
  }
}

/* Punto único de migración de esquema local. */
function migrar(s) {
  const base = BASE();
  if (!s || typeof s !== "object") return base;
  const salida = { ...base, ...s, v: VERSION };
  for (const lista of ["usuarios", "organizaciones", "donaciones", "consentimientos", "incidentes", "auditoria"]) {
    if (!Array.isArray(salida[lista])) salida[lista] = [];
  }
  return salida;
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) {
    console.error("No se pudo guardar el estado local:", e);
  }
  for (const fn of oyentes) fn(estado);
}

export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export const store = {
  get estado() {
    return estado;
  },

  /* ---------- Sesión (demostración) ---------- */

  sesion() {
    if (!estado.sesion) return null;
    const usuario = estado.usuarios.find((u) => u.id === estado.sesion.usuarioId);
    if (!usuario) return null;
    return { ...usuario, ...estado.sesion };
  },

  entrar(usuarioId) {
    const u = estado.usuarios.find((x) => x.id === usuarioId);
    if (!u) return { ok: false, mensaje: "Usuario no encontrado." };
    estado.sesion = { usuarioId: u.id, rol: u.rol, organizacionId: u.organizacionId, mfa: u.mfa === true };
    guardar();
    return { ok: true, sesion: this.sesion() };
  },

  salir() {
    estado.sesion = null;
    guardar();
  },

  /* ---------- Consultas ---------- */

  organizacion(id) {
    return estado.organizaciones.find((o) => o.id === id) || null;
  },

  donacion(id) {
    return estado.donaciones.find((d) => d.id === id) || null;
  },

  donacionesDe(organizacionId) {
    return estado.donaciones.filter((d) => d.organizacionId === organizacionId);
  },

  reservadasPor(organizacionId) {
    return estado.donaciones.filter((d) => d.reservadaPorId === organizacionId);
  },

  consentimientoDe(usuarioId) {
    return [...estado.consentimientos].reverse().find((c) => c.usuarioId === usuarioId) || null;
  },

  tieneConsentimientoVigente(usuarioId) {
    return consentimientoVigente(this.consentimientoDe(usuarioId));
  },

  auditoriaDe(recursoId) {
    return estado.auditoria.filter((e) => e.recursoId === recursoId);
  },

  /* ---------- Mutaciones ---------- */

  guardarOrganizacion(org) {
    const i = estado.organizaciones.findIndex((o) => o.id === org.id);
    if (i >= 0) estado.organizaciones[i] = org;
    else estado.organizaciones.push(org);
    guardar();
    return org;
  },

  guardarUsuario(usuario) {
    const i = estado.usuarios.findIndex((u) => u.id === usuario.id);
    if (i >= 0) estado.usuarios[i] = usuario;
    else estado.usuarios.push(usuario);
    guardar();
    return usuario;
  },

  guardarDonacion(donacion) {
    const i = estado.donaciones.findIndex((d) => d.id === donacion.id);
    if (i >= 0) estado.donaciones[i] = donacion;
    else estado.donaciones.unshift(donacion);
    guardar();
    return donacion;
  },

  guardarConsentimiento(registro) {
    estado.consentimientos.push(registro);
    guardar();
    return registro;
  },

  guardarIncidente(incidente) {
    estado.incidentes.unshift(incidente);
    guardar();
    return incidente;
  },

  /* ---------- Auditoría encadenada ---------- */

  ultimoHash() {
    return estado.auditoria.length ? estado.auditoria[estado.auditoria.length - 1].hash : null;
  },

  async registrar({ accion, actor, recurso = null, recursoId = null, antes = null, despues = null, motivo = null, ahora = new Date() }) {
    const evento = await crearEvento({
      accion,
      actor,
      recurso,
      recursoId,
      antes,
      despues,
      motivo,
      /* En el navegador no hay IP: el servidor la seudonimiza. */
      ipSeudonima: null,
      hashAnterior: this.ultimoHash(),
      ahora,
    });
    estado.auditoria.push(evento);
    guardar();
    return evento;
  },

  verificarAuditoria() {
    return verificarCadena(estado.auditoria);
  },

  /* ---------- Datos del usuario ---------- */

  exportar() {
    return JSON.stringify({ exportadoEn: new Date().toISOString(), datos: estado }, null, 2);
  },

  importar(texto) {
    try {
      const leido = JSON.parse(texto);
      const datos = leido.datos || leido;
      estado = migrar(datos);
      guardar();
      return { ok: true };
    } catch (e) {
      return { ok: false, mensaje: "Archivo inválido: " + e.message };
    }
  },

  reiniciar() {
    estado = BASE();
    guardar();
  },

  sembrar(datos) {
    estado = { ...BASE(), ...datos, sembrado: true, v: VERSION };
    guardar();
  },
};
