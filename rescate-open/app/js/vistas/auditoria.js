/* ============================================================
   RESCATE OPEN — Auditoría
   Quién hizo qué, cuándo y sobre qué recurso. Incluye los intentos
   BLOQUEADOS: saber qué se quiso publicar es tan importante como
   saber qué se publicó.
   ============================================================ */

import { store } from "../store.js";
import { puede } from "../core/rbac.js";
import { ACCIONES } from "../core/auditoria.js";
import { esc, vacio, fechaHora, numero, toast } from "../ui.js";
import { ETIQUETA_ACCION } from "./detalle.js";

let filtroAccion = "";

export async function render(contenedor) {
  const sesion = store.sesion();
  const permiso = puede(sesion, "auditoria:leer");

  if (!permiso.ok) {
    contenedor.innerHTML = `
      <h1 id="t-auditoria">Auditoría</h1>
      <div class="alerta aviso"><strong>Sin acceso</strong> ${esc(permiso.mensaje)}</div>
      <p class="pequeno tenue">La auditoría completa la ven soporte, verificación y administración.
        Cada organización sí puede exportar sus propios datos desde “Cuenta”.</p>`;
    return;
  }

  const eventos = [...store.estado.auditoria].reverse();
  const lista = filtroAccion ? eventos.filter((e) => e.accion === filtroAccion) : eventos;
  const cadena = await store.verificarAuditoria();
  const bloqueos = eventos.filter((e) => e.accion === "INOCUIDAD_BLOQUEO");

  contenedor.innerHTML = `
    <h1 id="t-auditoria">Auditoría</h1>
    <p>${numero(eventos.length)} eventos encadenados por hash. Los registros no se editan ni se borran.</p>

    ${cadena.ok
      ? `<div class="alerta ok"><strong>Integridad verificada</strong> La cadena completa recalcula correctamente.</div>`
      : `<div class="alerta bloqueo"><strong>Cadena rota en el evento ${esc(cadena.rotoEn)}</strong> ${esc(cadena.motivo)}</div>`}

    ${bloqueos.length
      ? `<div class="alerta aviso"><strong>${bloqueos.length} intento(s) bloqueado(s) por inocuidad</strong>
           Publicaciones o entregas detenidas por la regla sanitaria. Revisar si se repiten en la misma organización.</div>`
      : ""}

    <div class="campo">
      <label for="f-accion">Filtrar por acción</label>
      <select id="f-accion">
        <option value="">Todas</option>
        ${ACCIONES.map((a) => `<option value="${esc(a)}" ${filtroAccion === a ? "selected" : ""}>${esc(ETIQUETA_ACCION[a] || a)}</option>`).join("")}
      </select>
    </div>

    ${lista.length
      ? `<div class="tabla-envoltura">
          <table>
            <thead>
              <tr><th>Cuándo</th><th>Acción</th><th>Actor</th><th>Recurso</th><th>Motivo</th><th>Hash</th></tr>
            </thead>
            <tbody>
              ${lista
                .map(
                  (e) => `<tr>
                    <td>${fechaHora(e.ts)}</td>
                    <td>${esc(ETIQUETA_ACCION[e.accion] || e.accion)}</td>
                    <td>${esc(e.actorRol || "—")}<br><span class="tenue mono pequeno">${esc(e.actorId || "")}</span></td>
                    <td class="mono">${esc(e.recursoId || "—")}</td>
                    <td>${esc(e.motivo || "—")}</td>
                    <td class="mono">${esc((e.hash || "").slice(0, 10))}…</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="pequeno tenue" style="margin-top:.6rem">
          La IP no se almacena completa: en el servidor se recorta a /24 (o /48 en IPv6) y se seudonimiza con sal.
        </p>`
      : vacio("🔍", "Sin eventos para ese filtro")}

    <div class="acciones" style="margin:1rem 0 2rem">
      <button class="btn pequeno" id="btn-verificar-cadena">Reverificar integridad</button>
    </div>
  `;

  contenedor.querySelector("#f-accion").addEventListener("change", (e) => {
    filtroAccion = e.target.value;
    render(contenedor);
  });

  contenedor.querySelector("#btn-verificar-cadena").addEventListener("click", async () => {
    const r = await store.verificarAuditoria();
    toast(r.ok ? "Cadena íntegra." : `Cadena rota en el evento ${r.rotoEn}.`, r.ok ? "ok" : "error");
  });
}
