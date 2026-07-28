/* Tarjeta compacta de donación, compartida por listados. */

import { esc, insignia, numero, relativo } from "../ui.js";
import { CATEGORIAS, UNIDADES, CONSERVACION } from "../datos/catalogos.js";
import { urgencia } from "../core/donacion.js";
import { descripcionPublica } from "../core/geo.js";
import { store } from "../store.js";

export function tarjetaDonacion(d, { mostrarOrganizacion = true } = {}) {
  const cat = CATEGORIAS[d.categoria];
  const u = urgencia(d);
  const org = mostrarOrganizacion ? store.organizacion(d.organizacionId) : null;
  const cons = CONSERVACION[d.conservacion];

  return `
    <button class="donacion" data-donacion="${esc(d.id)}" aria-label="Ver detalle de ${esc(d.titulo)}">
      <div class="cabeza">
        <span class="icono" aria-hidden="true">${esc(cat?.icono || "📦")}</span>
        <span class="titulo">${esc(d.titulo)}</span>
      </div>
      <div class="meta">
        <span>${numero(d.cantidad)} ${esc(UNIDADES[d.unidad]?.etiqueta || d.unidad)}</span>
        <span>${esc(cons?.icono || "")} ${esc(cons?.etiqueta || "")}</span>
        <span>${esc(descripcionPublica(d))}</span>
        ${org ? `<span>· ${esc(org.nombre)}</span>` : ""}
      </div>
      <div class="pie">
        ${insignia(d.estado)}
        ${u.nivel !== "normal"
          ? `<span class="insignia ${esc(u.nivel)}">${u.nivel === "vencida" ? "ventana cerrada" : `⏱ ${numero(u.horas)} h`}</span>`
          : `<span class="insignia">retiro hasta ${esc(relativo(d.retiroHasta))}</span>`}
      </div>
    </button>`;
}

/** Conecta los clics de una lista de tarjetas con el detalle. */
export function conectarTarjetas(contenedor, alAbrir) {
  contenedor.querySelectorAll("[data-donacion]").forEach((el) => {
    el.addEventListener("click", () => alAbrir(el.dataset.donacion));
  });
}
