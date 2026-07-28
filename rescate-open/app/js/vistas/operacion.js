/* ============================================================
   RESCATE OPEN — Mi operación
   Donante: sus donaciones y lo que debe entregar.
   Receptora: lo que reservó y debe retirar/confirmar.
   Soporte/Admin: todo lo que está en movimiento.
   ============================================================ */

import { store } from "../store.js";
import { ESTADOS } from "../core/estados.js";
import { ROLES } from "../core/rbac.js";
import { esc, vacio, numero, insignia, fechaHora } from "../ui.js";
import { tarjetaDonacion, conectarTarjetas } from "./tarjeta.js";
import { abrirDetalle } from "./detalle.js";

const GRUPOS = [
  { estado: ESTADOS.DRAFT, titulo: "Borradores", nota: "Sin publicar. Revisa los bloqueos sanitarios antes de enviarlas." },
  { estado: ESTADOS.PUBLISHED, titulo: "Publicadas", nota: "Visibles para organizaciones verificadas." },
  { estado: ESTADOS.RESERVED, titulo: "Reservadas", nota: "Hay un compromiso de retiro dentro de la ventana." },
  { estado: ESTADOS.HANDED_OVER, titulo: "En custodia", nota: "Entregadas físicamente, pendientes de confirmación de recepción." },
  { estado: ESTADOS.RECEIVED, titulo: "Recibidas", nota: "Falta cerrar la operación." },
  { estado: ESTADOS.CLOSED, titulo: "Cerradas", nota: "" },
  { estado: ESTADOS.CANCELLED, titulo: "Canceladas", nota: "" },
  { estado: ESTADOS.REJECTED, titulo: "Rechazadas", nota: "" },
];

function donacionesSegunRol(sesion) {
  if (!sesion) return [];
  if (sesion.rol === ROLES.DONOR) return store.donacionesDe(sesion.organizacionId);
  if (sesion.rol === ROLES.RECEIVER) return store.reservadasPor(sesion.organizacionId);
  return store.estado.donaciones;
}

export function render(contenedor, refrescar) {
  const sesion = store.sesion();
  const lista = donacionesSegunRol(sesion);

  const pendientes = lista.filter((d) =>
    [ESTADOS.DRAFT, ESTADOS.RESERVED, ESTADOS.HANDED_OVER, ESTADOS.RECEIVED].includes(d.estado)
  );

  const titulo =
    sesion?.rol === ROLES.RECEIVER ? "Mis reservas"
    : sesion?.rol === ROLES.DONOR ? "Mis donaciones"
    : "Operación completa";

  contenedor.innerHTML = `
    <h1 id="t-operacion">${esc(titulo)}</h1>
    <p>${numero(lista.length)} registro(s) · ${numero(pendientes.length)} requieren acción.</p>

    ${pendientes.length
      ? `<div class="tarjeta">
           <h3>Requieren tu acción</h3>
           <ul class="linea-tiempo">
             ${pendientes
               .map(
                 (d) => `<li>
                   <div class="que">${esc(d.titulo)}</div>
                   <div class="quien">${insignia(d.estado)} ${esc(siguientePaso(d, sesion))}</div>
                   <div class="cuando">Ventana hasta ${fechaHora(d.retiroHasta)}</div>
                 </li>`
               )
               .join("")}
           </ul>
         </div>`
      : ""}

    ${GRUPOS.map((g) => {
      const items = lista.filter((d) => d.estado === g.estado);
      if (!items.length) return "";
      return `
        <h3 style="margin-top:1.2rem">${esc(g.titulo)} <span class="tenue pequeno">(${items.length})</span></h3>
        ${g.nota ? `<p class="pequeno tenue">${esc(g.nota)}</p>` : ""}
        ${items.map((d) => tarjetaDonacion(d, { mostrarOrganizacion: sesion?.rol !== ROLES.DONOR })).join("")}`;
    }).join("")}

    ${lista.length ? "" : vacio("📭", "Todavía no hay movimiento", "Publica una donación o reserva una oportunidad para empezar.")}
  `;

  conectarTarjetas(contenedor, (id) => abrirDetalle(id, refrescar));
}

function siguientePaso(d, sesion) {
  const soyDonante = d.organizacionId === sesion?.organizacionId;
  switch (d.estado) {
    case ESTADOS.DRAFT:
      return "Completar y publicar";
    case ESTADOS.PUBLISHED:
      return "Esperando reserva";
    case ESTADOS.RESERVED:
      return soyDonante ? "Entregar y registrar el código" : "Retirar dentro de la ventana";
    case ESTADOS.HANDED_OVER:
      return soyDonante ? "Esperando confirmación de recepción" : "Confirmar recepción con acta";
    case ESTADOS.RECEIVED:
      return "Cerrar la operación";
    default:
      return "";
  }
}
