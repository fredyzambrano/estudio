/* ============================================================
   RESCATE OPEN — Utilidades de interfaz
   `esc` es obligatorio para TODO texto que provenga de un usuario.
   Si un valor llega a innerHTML sin pasar por aquí, es un bug.
   ============================================================ */

import { ETIQUETA_ESTADO } from "./datos/catalogos.js";

let temporizadorToast = null;

export function $(id) {
  return document.getElementById(id);
}

export function esc(v) {
  return String(v == null ? "" : v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toast(mensaje, tipo = "") {
  const el = $("toast");
  if (!el) return;
  el.textContent = mensaje;
  el.className = tipo;
  el.classList.add("visible");
  /* Lectores de pantalla: el toast es una región viva. */
  el.setAttribute("role", tipo === "error" ? "alert" : "status");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => el.classList.remove("visible"), 3600);
}

/* ---------- Modal accesible ---------- */

let ultimoFoco = null;

export function abrirModal(titulo, contenidoHtml, { onAbrir } = {}) {
  const modal = $("modal");
  ultimoFoco = document.activeElement;
  $("modal-titulo").textContent = titulo;
  $("modal-cuerpo").innerHTML = contenidoHtml;
  modal.classList.add("abierto");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const primero = modal.querySelector("input, select, textarea, button");
  if (primero) primero.focus();
  if (onAbrir) onAbrir(modal);
}

export function cerrarModal() {
  const modal = $("modal");
  modal.classList.remove("abierto");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  $("modal-cuerpo").innerHTML = "";
  if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
}

export function confirmar(titulo, mensaje, { textoOk = "Confirmar", peligro = false } = {}) {
  return new Promise((resolver) => {
    abrirModal(
      titulo,
      `<p>${esc(mensaje)}</p>
       <div class="acciones" style="justify-content:flex-end">
         <button class="btn fantasma" data-confirmar="no">Cancelar</button>
         <button class="btn ${peligro ? "peligro" : "primario"}" data-confirmar="si">${esc(textoOk)}</button>
       </div>`,
      {
        onAbrir(modal) {
          modal.querySelectorAll("[data-confirmar]").forEach((b) =>
            b.addEventListener("click", () => {
              cerrarModal();
              resolver(b.dataset.confirmar === "si");
            })
          );
        },
      }
    );
  });
}

/* ---------- Formato ---------- */

const RELATIVO = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });

export function fechaCorta(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function fechaHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function relativo(iso, base = new Date()) {
  if (!iso) return "—";
  const dif = (new Date(iso) - base) / 1000;
  const abs = Math.abs(dif);
  if (abs < 60) return "ahora";
  if (abs < 3600) return RELATIVO.format(Math.round(dif / 60), "minute");
  if (abs < 86400) return RELATIVO.format(Math.round(dif / 3600), "hour");
  return RELATIVO.format(Math.round(dif / 86400), "day");
}

export function numero(n) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(Number(n) || 0);
}

export function insignia(estado) {
  return `<span class="insignia ${esc(estado)}">${esc(ETIQUETA_ESTADO[estado] || estado)}</span>`;
}

/** Convierte la lista de bloqueos de inocuidad en una alerta lista para pintar. */
export function alertaBloqueos(sanidad) {
  if (!sanidad) return "";
  let html = "";
  if (sanidad.bloqueos.length) {
    html += `<div class="alerta bloqueo" role="alert">
      <strong>No se puede publicar (${sanidad.bloqueos.length})</strong>
      <ul>${sanidad.bloqueos
        .map((b) => `<li>${esc(b.mensaje)}${b.norma ? ` <span class="norma">${esc(b.norma)}</span>` : ""}</li>`)
        .join("")}</ul>
    </div>`;
  }
  if (sanidad.advertencias.length) {
    html += `<div class="alerta aviso">
      <strong>Revisar antes de continuar</strong>
      <ul>${sanidad.advertencias.map((a) => `<li>${esc(a.mensaje)}</li>`).join("")}</ul>
    </div>`;
  }
  if (!html) {
    html = `<div class="alerta ok"><strong>Cumple los criterios sanitarios del piloto</strong>
      La responsabilidad de la aptitud sigue siendo del donante.</div>`;
  }
  return html;
}

export function vacio(emoji, titulo, detalle = "") {
  return `<div class="vacio"><span class="emoji" aria-hidden="true">${emoji}</span>
    <p><strong>${esc(titulo)}</strong></p>${detalle ? `<p class="pequeno">${esc(detalle)}</p>` : ""}</div>`;
}

/** Lee un formulario a objeto plano, respetando checkboxes y multi-selección. */
export function leerFormulario(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") {
      if (el.dataset.lista) {
        datos[el.name] = datos[el.name] || [];
        if (el.checked) datos[el.name].push(el.value);
      } else {
        datos[el.name] = el.checked;
      }
    } else if (el.type === "radio") {
      if (el.checked) datos[el.name] = el.value;
    } else if (el.value !== "") {
      datos[el.name] = el.value;
    }
  }
  return datos;
}

export function pintarErrores(form, errores = []) {
  form.querySelectorAll(".campo.error").forEach((c) => {
    c.classList.remove("error");
    const m = c.querySelector(".mensaje-error");
    if (m) m.remove();
  });
  for (const e of errores) {
    const campo = form.querySelector(`[name="${CSS.escape(e.campo)}"]`)?.closest(".campo");
    if (!campo) continue;
    campo.classList.add("error");
    const p = document.createElement("p");
    p.className = "mensaje-error";
    p.textContent = e.mensaje;
    campo.appendChild(p);
  }
  const primero = form.querySelector(".campo.error [name]");
  if (primero) primero.focus();
}

/** Fecha ISO → valor para <input type="datetime-local"> en hora local. */
export function paraInputFechaHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
