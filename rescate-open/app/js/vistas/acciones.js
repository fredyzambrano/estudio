/* ============================================================
   RESCATE OPEN — Acciones sobre donaciones
   Único lugar donde la interfaz cambia el estado de una donación.
   Siempre: construir contexto → aplicar transición → persistir →
   registrar auditoría. Si algo falla, se informa el motivo exacto.
   ============================================================ */

import { store } from "../store.js";
import { aplicarTransicion, ESTADOS } from "../core/estados.js";
import { codigoEntrega } from "../core/ids.js";
import { abrirModal, cerrarModal, toast, esc, leerFormulario } from "../ui.js";

export function contextoPara(donacion, extra = {}) {
  const sesion = store.sesion();
  return {
    ahora: new Date(),
    consentimientoVigente: store.tieneConsentimientoVigente(sesion?.id),
    organizacionDonante: store.organizacion(donacion.organizacionId),
    organizacionReceptora: store.organizacion(donacion.reservadaPorId || sesion?.organizacionId),
    ...extra,
  };
}

/**
 * @returns {Promise<boolean>} true si la transición se aplicó
 */
export async function ejecutar(donacion, destino, extra = {}) {
  const actor = store.sesion();
  const r = aplicarTransicion({ donacion, a: destino, actor, contexto: contextoPara(donacion, extra) });

  if (!r.ok) {
    toast(r.mensaje || `Acción bloqueada (${r.codigo})`, "error");
    /* Los bloqueos sanitarios se registran también cuando fallan:
       saber qué se intentó publicar es parte de la trazabilidad. */
    if (r.codigo === "INOCUIDAD" || r.codigo === "INOCUIDAD_ENTREGA") {
      await store.registrar({
        accion: "INOCUIDAD_BLOQUEO",
        actor,
        recurso: "donacion",
        recursoId: donacion.id,
        despues: { intento: destino, codigos: (r.detalle || []).map((b) => b.codigo) },
      });
    }
    return false;
  }

  store.guardarDonacion(r.donacion);
  await store.registrar({ ...r.evento, actor });
  return true;
}

/* ---------- Diálogos de las acciones que exigen datos ---------- */

export function pedirMotivo(titulo, textoBoton = "Confirmar") {
  return new Promise((resolver) => {
    abrirModal(
      titulo,
      `<form id="f-motivo">
         <div class="campo">
           <label for="motivo">Motivo (queda en la auditoría, mínimo 10 caracteres)</label>
           <textarea id="motivo" name="motivo" required minlength="10"
             placeholder="Describa qué ocurrió y por qué se toma esta decisión."></textarea>
         </div>
         <div class="acciones" style="justify-content:flex-end">
           <button type="button" class="btn fantasma" data-cancelar>Cancelar</button>
           <button type="submit" class="btn primario">${esc(textoBoton)}</button>
         </div>
       </form>`,
      {
        onAbrir(modal) {
          modal.querySelector("[data-cancelar]").addEventListener("click", () => {
            cerrarModal();
            resolver(null);
          });
          modal.querySelector("#f-motivo").addEventListener("submit", (ev) => {
            ev.preventDefault();
            const motivo = modal.querySelector("#motivo").value.trim();
            if (motivo.length < 10) return toast("El motivo es muy corto.", "error");
            cerrarModal();
            resolver(motivo);
          });
        },
      }
    );
  });
}

export function pedirDatosEntrega(donacion) {
  return new Promise((resolver) => {
    abrirModal(
      "Registrar entrega física",
      `<div class="alerta info">
         Quien recibe debe dictarle el <strong>código de entrega</strong> que ve en su aplicación.
         Sin ese código no se registra la entrega.
       </div>
       <form id="f-entrega">
         <div class="campo">
           <label for="codigoEntrega">Código dictado por quien recibe</label>
           <input id="codigoEntrega" name="codigoEntrega" required autocomplete="off"
                  placeholder="XXX-XXX" style="text-transform:uppercase" class="mono">
         </div>
         <div class="campo">
           <label for="recibeNombre">Nombre de quien recibe</label>
           <input id="recibeNombre" name="recibeNombre" required maxlength="90"
                  placeholder="Nombre y cargo de la persona que retira">
         </div>
         <div class="campo">
           <label for="placa">Vehículo o medio de transporte (opcional)</label>
           <input id="placa" name="placa" maxlength="30" placeholder="Placa o descripción">
         </div>
         <div class="campo">
           <label>Evidencia de la entrega</label>
           <label class="chequeo">
             <input type="checkbox" name="foto" value="1" required>
             <span>
               <span class="detalle">
                 Confirmo que tomé la foto del lote entregado y la conservo según la política de evidencias.
                 En el piloto local no se cargan imágenes al servidor.
               </span>
             </span>
           </label>
         </div>
         <div class="acciones" style="justify-content:flex-end">
           <button type="button" class="btn fantasma" data-cancelar>Cancelar</button>
           <button type="submit" class="btn primario">Registrar entrega</button>
         </div>
       </form>`,
      {
        onAbrir(modal) {
          modal.querySelector("[data-cancelar]").addEventListener("click", () => {
            cerrarModal();
            resolver(null);
          });
          modal.querySelector("#f-entrega").addEventListener("submit", (ev) => {
            ev.preventDefault();
            const d = leerFormulario(ev.target);
            cerrarModal();
            resolver({
              codigoEntrega: String(d.codigoEntrega || "").toUpperCase().trim(),
              evidencia: {
                fotos: ["local:evidencia-entrega"],
                recibeNombre: d.recibeNombre,
                transporte: d.placa || null,
                registradaEn: new Date().toISOString(),
              },
            });
          });
        },
      }
    );
  });
}

export function pedirActaRecepcion(donacion) {
  return new Promise((resolver) => {
    abrirModal(
      "Confirmar recepción",
      `<form id="f-acta">
         <div class="fila dos">
           <div class="campo">
             <label for="cantidadRecibida">Cantidad efectivamente recibida</label>
             <input id="cantidadRecibida" name="cantidadRecibida" type="number" step="0.1" min="0.1"
                    value="${esc(donacion.cantidad)}" required>
           </div>
           <div class="campo">
             <label for="unidad">Unidad</label>
             <input id="unidad" name="unidad" value="${esc(donacion.unidad)}" readonly>
           </div>
         </div>
         <div class="campo">
           <label class="chequeo">
             <input type="checkbox" name="conformidad" checked>
             <span><b>Recepción conforme</b>
               <span class="detalle">El lote llegó completo, en condiciones y con la temperatura declarada.</span>
             </span>
           </label>
         </div>
         <div class="campo">
           <label for="observaciones">Observaciones</label>
           <textarea id="observaciones" name="observaciones" maxlength="600"
             placeholder="Obligatorio si la recepción NO es conforme."></textarea>
         </div>
         <div class="acciones" style="justify-content:flex-end">
           <button type="button" class="btn fantasma" data-cancelar>Cancelar</button>
           <button type="submit" class="btn primario">Confirmar recepción</button>
         </div>
       </form>`,
      {
        onAbrir(modal) {
          modal.querySelector("[data-cancelar]").addEventListener("click", () => {
            cerrarModal();
            resolver(null);
          });
          modal.querySelector("#f-acta").addEventListener("submit", (ev) => {
            ev.preventDefault();
            const d = leerFormulario(ev.target);
            const acta = {
              cantidadRecibida: Number(d.cantidadRecibida),
              unidad: d.unidad,
              conformidad: d.conformidad === true,
              observaciones: d.observaciones || "",
              registradaEn: new Date().toISOString(),
            };
            if (!acta.conformidad && !acta.observaciones.trim()) {
              return toast("Describa la novedad de la recepción.", "error");
            }
            cerrarModal();
            resolver({ acta });
          });
        },
      }
    );
  });
}

/* ---------- Envolturas de alto nivel usadas por las vistas ---------- */

export async function publicar(donacion) {
  return ejecutar(donacion, ESTADOS.PUBLISHED);
}

export async function reservar(donacion) {
  return ejecutar(donacion, ESTADOS.RESERVED, { codigoEntregaGenerado: codigoEntrega() });
}

export async function liberarReserva(donacion) {
  const motivo = await pedirMotivo("Liberar la reserva");
  if (!motivo) return false;
  return ejecutar(donacion, ESTADOS.PUBLISHED, { motivo });
}

export async function cancelar(donacion) {
  const motivo = await pedirMotivo("Cancelar la donación", "Cancelar donación");
  if (!motivo) return false;
  return ejecutar(donacion, ESTADOS.CANCELLED, { motivo });
}

export async function rechazar(donacion) {
  const motivo = await pedirMotivo("Rechazar por moderación", "Rechazar");
  if (!motivo) return false;
  return ejecutar(donacion, ESTADOS.REJECTED, { motivo });
}

export async function registrarEntrega(donacion) {
  const datos = await pedirDatosEntrega(donacion);
  if (!datos) return false;
  return ejecutar(donacion, ESTADOS.HANDED_OVER, datos);
}

export async function confirmarRecepcion(donacion) {
  const datos = await pedirActaRecepcion(donacion);
  if (!datos) return false;
  return ejecutar(donacion, ESTADOS.RECEIVED, datos);
}

export async function cerrar(donacion) {
  return ejecutar(donacion, ESTADOS.CLOSED);
}
