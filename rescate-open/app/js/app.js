/* ============================================================
   RESCATE OPEN — Orquestador
   Router por hash, navegación dependiente del rol y arranque
   con datos de demostración. Sin build, sin framework: se
   despliega copiando esta carpeta al subdominio.
   ============================================================ */

import { store, suscribir } from "./store.js";
import { construirSemilla } from "./datos/semilla.js";
import { ROLES, ETIQUETA_ROL } from "./core/rbac.js";
import { $, toast, cerrarModal, esc } from "./ui.js";

import * as panel from "./vistas/panel.js";
import * as oportunidades from "./vistas/oportunidades.js";
import * as publicar from "./vistas/publicar.js";
import * as operacion from "./vistas/operacion.js";
import * as verificacion from "./vistas/verificacion.js";
import * as auditoria from "./vistas/auditoria.js";
import * as cuenta from "./vistas/cuenta.js";

const VISTAS = {
  panel: { modulo: panel, etiqueta: "Panel", icono: "🏠", roles: "todos" },
  oportunidades: { modulo: oportunidades, etiqueta: "Oportunidades", icono: "🥗", roles: [ROLES.RECEIVER, ROLES.SUPPORT, ROLES.ADMIN] },
  publicar: { modulo: publicar, etiqueta: "Publicar", icono: "➕", roles: [ROLES.DONOR, ROLES.ADMIN] },
  operacion: { modulo: operacion, etiqueta: "Operación", icono: "📦", roles: [ROLES.DONOR, ROLES.RECEIVER, ROLES.SUPPORT, ROLES.ADMIN] },
  verificacion: { modulo: verificacion, etiqueta: "Verificar", icono: "🛡️", roles: [ROLES.VERIFIER, ROLES.ADMIN] },
  auditoria: { modulo: auditoria, etiqueta: "Auditoría", icono: "🧾", roles: [ROLES.VERIFIER, ROLES.SUPPORT, ROLES.ADMIN] },
  cuenta: { modulo: cuenta, etiqueta: "Cuenta", icono: "👤", roles: "todos" },
};

let vistaActual = "panel";

function vistasVisibles() {
  const rol = store.sesion()?.rol;
  return Object.entries(VISTAS).filter(([, v]) => v.roles === "todos" || (rol && v.roles.includes(rol)));
}

function pintarNav() {
  const nav = $("nav");
  nav.innerHTML = vistasVisibles()
    .map(
      ([id, v]) => `<button data-nav="${esc(id)}" class="${id === vistaActual ? "activa" : ""}"
        aria-current="${id === vistaActual ? "page" : "false"}">
        <span class="ico" aria-hidden="true">${v.icono}</span><span>${esc(v.etiqueta)}</span>
      </button>`
    )
    .join("");
  nav.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => ir(b.dataset.nav)));
}

function pintarSesion() {
  const sesion = store.sesion();
  $("sesion-etiqueta").textContent = sesion ? `${sesion.nombre} · ${ETIQUETA_ROL[sesion.rol]}` : "Elegir rol";
}

async function pintarVista() {
  const disponibles = vistasVisibles().map(([id]) => id);
  if (!disponibles.includes(vistaActual)) vistaActual = "panel";

  for (const id of Object.keys(VISTAS)) {
    const seccion = $(`vista-${id}`);
    if (seccion) seccion.classList.toggle("activa", id === vistaActual);
  }

  const contenedor = $(`vista-${vistaActual}`);
  try {
    await VISTAS[vistaActual].modulo.render(contenedor, ir);
  } catch (e) {
    console.error("Error al pintar la vista", vistaActual, e);
    contenedor.innerHTML = `<div class="alerta bloqueo"><strong>Algo falló al mostrar esta sección</strong>
      ${esc(e.message)}</div>`;
  }
}

/** Navegación. Acepta el nombre de vista; sin argumento, repinta. */
export async function ir(vista) {
  if (vista && VISTAS[vista]) {
    vistaActual = vista;
    try {
      history.replaceState(null, "", `#${vista}`);
    } catch { /* file:// o navegación restringida */ }
  }
  pintarNav();
  pintarSesion();
  await pintarVista();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  $("principal").focus({ preventScroll: true });
}

async function primerArranque() {
  if (store.estado.sembrado && store.estado.usuarios.length) return;

  const datos = await construirSemilla((evento) => store.registrar(evento));
  store.sembrar({ ...datos, auditoria: store.estado.auditoria });
  store.entrar("usr_andina");
  await store.registrar({ accion: "SESION_INICIADA", actor: store.sesion() });
}

function conectarGlobales() {
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") cerrarModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("modal").classList.contains("abierto")) cerrarModal();
  });
  $("btn-sesion").addEventListener("click", () => ir("cuenta"));
  window.addEventListener("hashchange", () => {
    const destino = location.hash.replace("#", "");
    if (VISTAS[destino] && destino !== vistaActual) ir(destino);
  });
}

async function iniciar() {
  conectarGlobales();

  try {
    await primerArranque();
  } catch (e) {
    console.error("No se pudo preparar la demostración:", e);
    toast("No se pudo cargar la demostración. Revisa la consola.", "error");
  }

  const inicial = location.hash.replace("#", "");
  await ir(VISTAS[inicial] ? inicial : "panel");

  /* Repintar cuando otra pestaña modifique el estado del piloto. */
  window.addEventListener("storage", () => location.reload());
  suscribir(() => pintarSesion());
}

iniciar();
