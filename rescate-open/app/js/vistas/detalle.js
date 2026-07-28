/* ============================================================
   RESCATE OPEN — Detalle de donación
   La vista decide qué mostrar consultando SIEMPRE las mismas
   funciones de autorización que la máquina de estados. Si algo se
   ve en pantalla pero el núcleo lo niega, el núcleo gana.
   ============================================================ */

import { store } from "../store.js";
import { ESTADOS, evaluarTransicion, transicionesDesde } from "../core/estados.js";
import { evaluar } from "../core/inocuidad.js";
import { vistaParaReserva, urgencia, etiquetaCategoria } from "../core/donacion.js";
import { descripcionPublica } from "../core/geo.js";
import { CONSERVACION, ESTADO_EMPAQUE, ALERGENOS, UNIDADES, ETIQUETA_ESTADO } from "../datos/catalogos.js";
import {
  abrirModal, cerrarModal, esc, insignia, fechaHora, relativo, numero, alertaBloqueos, toast,
} from "../ui.js";
import * as acciones from "./acciones.js";

const ETIQUETA_ACCION = {
  DONACION_CREADA: "Donación creada",
  DONACION_PUBLICADA: "Publicada",
  DONACION_RESERVADA: "Reservada",
  RESERVA_LIBERADA: "Reserva liberada",
  DONACION_ENTREGADA: "Entregada en custodia",
  DONACION_RECIBIDA: "Recibida",
  DONACION_CERRADA: "Cerrada",
  DONACION_CANCELADA: "Cancelada",
  DONACION_RECHAZADA_MODERACION: "Rechazada por moderación",
  DONACION_RECHAZADA_INCIDENTE: "Rechazada por incidente",
  INOCUIDAD_BLOQUEO: "Intento bloqueado por inocuidad",
};

/** Botones disponibles: se consulta el núcleo, no el rol a ojo. */
function botonesDisponibles(donacion, actor) {
  const posibles = [
    { a: ESTADOS.PUBLISHED, texto: "Publicar", clase: "primario", fn: acciones.publicar, desde: ESTADOS.DRAFT },
    { a: ESTADOS.RESERVED, texto: "Reservar esta donación", clase: "primario", fn: acciones.reservar },
    { a: ESTADOS.HANDED_OVER, texto: "Registrar entrega", clase: "primario", fn: acciones.registrarEntrega },
    { a: ESTADOS.RECEIVED, texto: "Confirmar recepción", clase: "primario", fn: acciones.confirmarRecepcion },
    { a: ESTADOS.CLOSED, texto: "Cerrar operación", clase: "", fn: acciones.cerrar },
    { a: ESTADOS.PUBLISHED, texto: "Liberar reserva", clase: "fantasma", fn: acciones.liberarReserva, desde: ESTADOS.RESERVED },
    { a: ESTADOS.REJECTED, texto: "Rechazar", clase: "peligro", fn: acciones.rechazar },
    { a: ESTADOS.CANCELLED, texto: "Cancelar", clase: "peligro", fn: acciones.cancelar },
  ];

  const salidas = transicionesDesde(donacion.estado).map((t) => t.a);

  return posibles
    .filter((b) => salidas.includes(b.a))
    .filter((b) => !b.desde || b.desde === donacion.estado)
    .map((b) => {
      /* Se evalúa con datos "de mentira" solo para saber si el actor
         tiene competencia; las guardas de datos se validan al ejecutar. */
      const prueba = evaluarTransicion({
        donacion,
        a: b.a,
        actor,
        contexto: {
          consentimientoVigente: store.tieneConsentimientoVigente(actor?.id),
          organizacionDonante: store.organizacion(donacion.organizacionId),
          organizacionReceptora: store.organizacion(donacion.reservadaPorId || actor?.organizacionId),
          motivo: "verificación previa de competencia",
          codigoEntrega: donacion.codigoEntrega,
          evidencia: { fotos: ["x"], recibeNombre: "x" },
          acta: { cantidadRecibida: 1, conformidad: true },
        },
      });
      const bloqueoDeRol = !prueba.ok && [
        "ROL_INSUFICIENTE", "NO_ES_PROPIETARIO", "NO_ES_PARTE", "MFA_REQUERIDO",
        "CUENTA_SUSPENDIDA", "SIN_SESION", "TRANSICION_NO_PERMITIDA",
      ].includes(prueba.codigo);
      return { ...b, visible: !bloqueoDeRol, aviso: prueba.ok ? null : prueba.mensaje };
    })
    .filter((b) => b.visible);
}

export function abrirDetalle(donacionId, alCambiar) {
  const actor = store.sesion();
  const original = store.donacion(donacionId);
  if (!original) return toast("La donación ya no existe.", "error");

  const d = vistaParaReserva(original, actor?.organizacionId);
  const org = store.organizacion(original.organizacionId);
  const receptora = original.reservadaPorId ? store.organizacion(original.reservadaPorId) : null;
  const sanidad = evaluar(original, new Date());
  const u = urgencia(original);
  const cons = CONSERVACION[original.conservacion];
  const eventos = store.auditoriaDe(original.id);

  const puedeVerDireccion = d.direccionExacta !== undefined;
  const esReceptorDeEstaReserva = actor?.organizacionId && actor.organizacionId === original.reservadaPorId;

  const alergenos = (original.alergenos || [])
    .map((id) => ALERGENOS.find((a) => a.id === id)?.etiqueta || id);

  const html = `
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.7rem">
      ${insignia(original.estado)}
      ${u.nivel !== "normal" ? `<span class="insignia ${esc(u.nivel)}">⏱ ${u.nivel === "vencida" ? "ventana cerrada" : `quedan ${numero(u.horas)} h`}</span>` : ""}
      <span class="insignia">${esc(etiquetaCategoria(original.categoria))}</span>
    </div>

    <p class="tenue pequeno" style="margin-top:-.3rem">
      Publicada por <strong>${esc(org?.nombre || "—")}</strong>
      ${receptora ? ` · reservada por <strong>${esc(receptora.nombre)}</strong>` : ""}
    </p>

    ${original.descripcion ? `<p>${esc(original.descripcion)}</p>` : ""}

    ${esReceptorDeEstaReserva && original.codigoEntrega && original.estado === ESTADOS.RESERVED
      ? `<div class="campo">
           <label>Código de entrega — dígalo al donante en el retiro</label>
           <div class="codigo-entrega">${esc(original.codigoEntrega)}</div>
           <p class="ayuda">No lo comparta por adelantado: es la prueba de que el retiro ocurrió.</p>
         </div>`
      : ""}

    <dl>
      <div class="dato"><dt>Cantidad</dt><dd>${numero(original.cantidad)} ${esc(UNIDADES[original.unidad]?.etiqueta || original.unidad)}</dd></div>
      <div class="dato"><dt>Conservación</dt><dd>${esc(cons?.icono || "")} ${esc(cons?.etiqueta || original.conservacion)}${original.temperaturaC != null ? ` · ${numero(original.temperaturaC)} °C` : ""}</dd></div>
      <div class="dato"><dt>Empaque</dt><dd>${esc(ESTADO_EMPAQUE[original.estadoEmpaque]?.etiqueta || "—")}</dd></div>
      <div class="dato"><dt>Vence</dt><dd>${fechaHora(original.fechaVencimiento)}</dd></div>
      ${original.preparadoEn ? `<div class="dato"><dt>Preparado</dt><dd>${fechaHora(original.preparadoEn)}</dd></div>` : ""}
      <div class="dato"><dt>Ventana de retiro</dt><dd>${fechaHora(original.retiroDesde)} → ${fechaHora(original.retiroHasta)}</dd></div>
      ${original.lote ? `<div class="dato"><dt>Lote</dt><dd class="mono">${esc(original.lote)}</dd></div>` : ""}
      ${original.registroSanitario ? `<div class="dato"><dt>Registro sanitario</dt><dd class="mono">${esc(original.registroSanitario)}</dd></div>` : ""}
      ${original.responsableTecnico ? `<div class="dato"><dt>Responsable técnico</dt><dd>${esc(original.responsableTecnico)}</dd></div>` : ""}
      <div class="dato"><dt>Alérgenos</dt><dd>${alergenos.length ? esc(alergenos.join(", ")) : "Declarados como no aplicables"}</dd></div>
      <div class="dato"><dt>Transporte</dt><dd>${original.requiereTransporteReceptor === false ? "Lo asume el donante" : "Lo asume la organización receptora"}</dd></div>
      <div class="dato"><dt>Ubicación</dt><dd>${esc(descripcionPublica(original))}</dd></div>
    </dl>

    ${puedeVerDireccion
      ? `<div class="alerta info" style="margin-top:.8rem">
           <strong>Datos de retiro (visibles por la reserva activa)</strong>
           ${esc(d.direccionExacta)}<br>
           ${d.indicacionesRetiro ? `${esc(d.indicacionesRetiro)}<br>` : ""}
           Contacto: ${esc(d.contactoNombre)} · ${esc(d.contactoTelefono)}
           <p class="pequeno tenue" style="margin:.4rem 0 0">Este acceso queda registrado en la auditoría.</p>
         </div>`
      : `<p class="pequeno tenue">La dirección exacta y el contacto se revelan solo a la organización que reserve.</p>`}

    <h4 style="margin-top:1rem">Estado sanitario</h4>
    ${alertaBloqueos(sanidad)}

    <h4 style="margin-top:1rem">Cadena de custodia</h4>
    ${eventos.length
      ? `<ul class="linea-tiempo">${eventos
          .map(
            (e) => `<li>
              <div class="que">${esc(ETIQUETA_ACCION[e.accion] || e.accion)}</div>
              <div class="quien">${esc(e.actorRol || "—")}${e.motivo ? ` · ${esc(e.motivo)}` : ""}</div>
              <div class="cuando">${fechaHora(e.ts)} · ${relativo(e.ts)}</div>
            </li>`
          )
          .join("")}</ul>`
      : `<p class="pequeno tenue">Sin eventos registrados.</p>`}

    <div class="acciones" id="acciones-detalle" style="margin-top:1.1rem"></div>
  `;

  abrirModal(original.titulo, html, {
    onAbrir(modal) {
      const cont = modal.querySelector("#acciones-detalle");
      const botones = botonesDisponibles(original, actor);

      if (!botones.length) {
        cont.innerHTML = `<p class="pequeno tenue">No hay acciones disponibles para tu rol en este estado.</p>`;
        return;
      }

      for (const b of botones) {
        const btn = document.createElement("button");
        btn.className = `btn ${b.clase}`;
        btn.textContent = b.texto;
        if (b.aviso) btn.title = b.aviso;
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          const hecho = await b.fn(store.donacion(original.id));
          btn.disabled = false;
          if (hecho) {
            toast(`${b.texto}: listo.`, "ok");
            cerrarModal();
            if (alCambiar) alCambiar();
          }
        });
        cont.appendChild(btn);
      }
    },
  });
}

export { ETIQUETA_ACCION, ETIQUETA_ESTADO };
