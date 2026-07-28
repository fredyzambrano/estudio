/* ============================================================
   RESCATE OPEN — Oportunidades disponibles
   Lo que ve una organización receptora verificada: donaciones
   publicadas, ordenadas por urgencia real (ventana de retiro).
   ============================================================ */

import { store } from "../store.js";
import { ESTADOS } from "../core/estados.js";
import { urgencia } from "../core/donacion.js";
import { CATEGORIAS } from "../datos/catalogos.js";
import { CIUDADES } from "../core/geo.js";
import { puedeOperar } from "../core/organizacion.js";
import { esc, vacio, numero } from "../ui.js";
import { tarjetaDonacion, conectarTarjetas } from "./tarjeta.js";
import { abrirDetalle } from "./detalle.js";

const filtros = { ciudad: "", categoria: "", soloUrgentes: false, texto: "" };

export function render(contenedor, refrescar) {
  const sesion = store.sesion();
  const org = sesion?.organizacionId ? store.organizacion(sesion.organizacionId) : null;

  let lista = store.estado.donaciones.filter((d) => d.estado === ESTADOS.PUBLISHED);

  if (filtros.ciudad) lista = lista.filter((d) => d.ciudadId === filtros.ciudad);
  if (filtros.categoria) lista = lista.filter((d) => d.categoria === filtros.categoria);
  if (filtros.soloUrgentes) lista = lista.filter((d) => ["critica", "alta"].includes(urgencia(d).nivel));
  if (filtros.texto) {
    const q = filtros.texto.toLowerCase();
    lista = lista.filter((d) => `${d.titulo} ${d.descripcion || ""}`.toLowerCase().includes(q));
  }

  /* Orden: lo que se pierde primero, primero. */
  lista.sort((a, b) => new Date(a.retiroHasta) - new Date(b.retiroHasta));

  const avisoVerificacion =
    sesion?.rol === "RECEIVER" && !puedeOperar(org)
      ? `<div class="alerta aviso">
           <strong>Tu organización aún no está verificada</strong>
           Puedes explorar las oportunidades, pero no reservar hasta que verificación documental apruebe
           a <em>${esc(org?.nombre || "tu organización")}</em>.
         </div>`
      : "";

  contenedor.innerHTML = `
    <h1 id="t-oportunidades">Oportunidades</h1>
    <p>Donaciones publicadas por donantes verificados. Reservar implica comprometerse a retirar dentro de la ventana.</p>
    ${avisoVerificacion}

    <div class="tarjeta">
      <div class="campo" style="margin-bottom:.6rem">
        <label for="f-texto" class="solo-lectores">Buscar</label>
        <input id="f-texto" placeholder="Buscar por producto…" value="${esc(filtros.texto)}">
      </div>
      <div class="fila dos">
        <div class="campo" style="margin:0">
          <label for="f-ciudad">Ciudad</label>
          <select id="f-ciudad">
            <option value="">Todas</option>
            ${CIUDADES.map((c) => `<option value="${esc(c.id)}" ${filtros.ciudad === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}
          </select>
        </div>
        <div class="campo" style="margin:0">
          <label for="f-categoria">Categoría</label>
          <select id="f-categoria">
            <option value="">Todas</option>
            ${Object.entries(CATEGORIAS).map(([id, c]) => `<option value="${esc(id)}" ${filtros.categoria === id ? "selected" : ""}>${esc(c.icono)} ${esc(c.etiqueta)}</option>`).join("")}
          </select>
        </div>
      </div>
      <label class="chequeo" style="margin-top:.4rem">
        <input type="checkbox" id="f-urgentes" ${filtros.soloUrgentes ? "checked" : ""}>
        <span><b>Solo urgentes</b><span class="detalle">Ventana de retiro de 12 horas o menos.</span></span>
      </label>
    </div>

    <p class="pequeno tenue">${numero(lista.length)} donación(es) disponible(s)</p>
    <div id="lista-oportunidades">
      ${lista.length ? lista.map((d) => tarjetaDonacion(d)).join("") : vacio("🍃", "No hay donaciones que coincidan", "Ajusta los filtros o vuelve más tarde: las publicaciones cambian durante el día.")}
    </div>
  `;

  const rerender = () => render(contenedor, refrescar);

  contenedor.querySelector("#f-texto").addEventListener("input", (e) => {
    filtros.texto = e.target.value;
    rerender();
    const campo = contenedor.querySelector("#f-texto");
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  });
  contenedor.querySelector("#f-ciudad").addEventListener("change", (e) => {
    filtros.ciudad = e.target.value;
    rerender();
  });
  contenedor.querySelector("#f-categoria").addEventListener("change", (e) => {
    filtros.categoria = e.target.value;
    rerender();
  });
  contenedor.querySelector("#f-urgentes").addEventListener("change", (e) => {
    filtros.soloUrgentes = e.target.checked;
    rerender();
  });

  conectarTarjetas(contenedor, (id) => abrirDetalle(id, refrescar));
}
