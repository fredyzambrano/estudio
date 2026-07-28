/* ============================================================
   RESCATE OPEN — Bandeja de verificación documental
   Decisión humana, con lista de chequeo completa y motivo escrito.
   Ninguna aprobación es automática: es la barrera antifraude.
   ============================================================ */

import { store } from "../store.js";
import {
  CHEQUEO_VERIFICACION, VERIFICACION, ETIQUETA_VERIFICACION, decidirVerificacion, suspender,
} from "../core/organizacion.js";
import { puede } from "../core/rbac.js";
import { esc, toast, abrirModal, cerrarModal, vacio, fechaHora, numero, leerFormulario } from "../ui.js";

export function render(contenedor, refrescar) {
  const sesion = store.sesion();
  const permiso = puede(sesion, "organizacion:verificar");

  if (!permiso.ok) {
    contenedor.innerHTML = `
      <h1 id="t-verificacion">Verificación</h1>
      <div class="alerta aviso"><strong>Sin acceso</strong> ${esc(permiso.mensaje)}</div>`;
    return;
  }

  const orgs = [...store.estado.organizaciones].sort((a, b) => {
    const orden = { EN_REVISION: 0, PENDIENTE: 1, RECHAZADA: 2, VERIFICADA: 3 };
    return (orden[a.estadoVerificacion] ?? 9) - (orden[b.estadoVerificacion] ?? 9);
  });

  contenedor.innerHTML = `
    <h1 id="t-verificacion">Verificación documental</h1>
    <p>Solo organizaciones legalmente constituidas y verificadas participan en el piloto.
       Registra el sustento de cada decisión: queda en la auditoría con tu usuario.</p>

    ${orgs.length
      ? orgs.map((o) => tarjetaOrganizacion(o)).join("")
      : vacio("🗂️", "No hay organizaciones registradas")}
  `;

  contenedor.querySelectorAll("[data-revisar]").forEach((b) =>
    b.addEventListener("click", () => abrirRevision(b.dataset.revisar, refrescar))
  );
  contenedor.querySelectorAll("[data-suspender]").forEach((b) =>
    b.addEventListener("click", () => abrirSuspension(b.dataset.suspender, refrescar))
  );
}

function tarjetaOrganizacion(o) {
  const marcados = Object.values(o.chequeo || {}).filter(Boolean).length;
  const obligatorios = CHEQUEO_VERIFICACION.filter((c) => c.obligatorio).length;
  return `
    <div class="tarjeta">
      <div class="tarjeta-titulo">
        <h3 style="flex:1">${esc(o.nombre)}</h3>
        <span class="insignia ${esc(o.estadoVerificacion)}">${esc(ETIQUETA_VERIFICACION[o.estadoVerificacion])}</span>
        ${o.suspendida ? `<span class="insignia REJECTED">suspendida</span>` : ""}
      </div>
      <dl>
        <div class="dato"><dt>Tipo</dt><dd>${esc(o.tipo)}</dd></div>
        <div class="dato"><dt>NIT</dt><dd class="mono">${esc(o.nit)}</dd></div>
        <div class="dato"><dt>Contacto</dt><dd>${esc(o.correoContacto)}</dd></div>
        <div class="dato"><dt>Capacidad declarada</dt><dd>${o.capacidadKgMes ? `${numero(o.capacidadKgMes)} kg/mes` : "—"}${o.tieneCadenaFrio ? " · frío" : ""}${o.tieneTransporte ? " · transporte" : ""}</dd></div>
        <div class="dato"><dt>Chequeo</dt><dd>${marcados}/${obligatorios} obligatorios</dd></div>
        ${o.verificadaEn ? `<div class="dato"><dt>Última decisión</dt><dd>${fechaHora(o.verificadaEn)}</dd></div>` : ""}
      </dl>
      ${o.motivoEstado ? `<p class="pequeno tenue">Sustento: ${esc(o.motivoEstado)}</p>` : ""}
      <div class="acciones" style="margin-top:.7rem">
        <button class="btn pequeno primario" data-revisar="${esc(o.id)}">Revisar documentación</button>
        ${o.estadoVerificacion === VERIFICACION.VERIFICADA && !o.suspendida
          ? `<button class="btn pequeno peligro" data-suspender="${esc(o.id)}">Suspender</button>`
          : ""}
      </div>
    </div>`;
}

function abrirRevision(orgId, refrescar) {
  const org = store.organizacion(orgId);
  if (!org) return;

  abrirModal(
    `Revisar: ${org.nombre}`,
    `<div class="alerta info">
       Verifica los documentos por fuera de la plataforma y marca solo lo que confirmaste tú.
       Los documentos no se almacenan junto a la aplicación.
     </div>
     <form id="f-verificar">
       ${CHEQUEO_VERIFICACION.map(
         (c) => `<label class="chequeo">
           <input type="checkbox" name="chequeo" data-lista="1" value="${esc(c.id)}" ${org.chequeo?.[c.id] ? "checked" : ""}>
           <span>${esc(c.etiqueta)}${c.obligatorio ? "" : ` <span class="detalle">(opcional)</span>`}</span>
         </label>`
       ).join("")}
       <div class="campo" style="margin-top:.8rem">
         <label for="motivo">Sustento de la decisión</label>
         <textarea id="motivo" name="motivo" required minlength="10"
           placeholder="Qué documentos revisaste, con quién hablaste y qué concluyes."></textarea>
       </div>
       <div class="acciones" style="justify-content:flex-end">
         <button type="button" class="btn fantasma" data-cancelar>Cancelar</button>
         <button type="submit" class="btn peligro" name="decision" value="RECHAZADA">Rechazar</button>
         <button type="submit" class="btn primario" name="decision" value="VERIFICADA">Verificar</button>
       </div>
     </form>`,
    {
      onAbrir(modal) {
        modal.querySelector("[data-cancelar]").addEventListener("click", cerrarModal);
        modal.querySelector("#f-verificar").addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const datos = leerFormulario(ev.target);
          const chequeo = Object.fromEntries((datos.chequeo || []).map((id) => [id, true]));
          const decision = ev.submitter?.value;
          const sesion = store.sesion();

          const r = decidirVerificacion({
            organizacion: org,
            actor: sesion,
            decision,
            chequeo,
            motivo: datos.motivo || "",
          });

          if (!r.ok) return toast(r.mensaje, "error");

          store.guardarOrganizacion(r.organizacion);
          await store.registrar({ ...r.evento, actor: sesion });
          cerrarModal();
          toast(decision === "VERIFICADA" ? "Organización verificada." : "Organización rechazada.", "ok");
          refrescar();
        });
      },
    }
  );
}

function abrirSuspension(orgId, refrescar) {
  const org = store.organizacion(orgId);
  abrirModal(
    `Suspender: ${org.nombre}`,
    `<form id="f-suspender">
       <div class="campo">
         <label for="motivo-s">Motivo de la suspensión</label>
         <textarea id="motivo-s" name="motivo" required minlength="10"
           placeholder="Incidente, incumplimiento o alerta que justifica la suspensión."></textarea>
       </div>
       <div class="acciones" style="justify-content:flex-end">
         <button type="button" class="btn fantasma" data-cancelar>Cancelar</button>
         <button type="submit" class="btn peligro">Suspender</button>
       </div>
     </form>`,
    {
      onAbrir(modal) {
        modal.querySelector("[data-cancelar]").addEventListener("click", cerrarModal);
        modal.querySelector("#f-suspender").addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const sesion = store.sesion();
          const r = suspender({ organizacion: org, actor: sesion, motivo: ev.target.motivo.value });
          if (!r.ok) return toast(r.mensaje, "error");
          store.guardarOrganizacion(r.organizacion);
          await store.registrar({ ...r.evento, actor: sesion });
          cerrarModal();
          toast("Organización suspendida.", "ok");
          refrescar();
        });
      },
    }
  );
}
