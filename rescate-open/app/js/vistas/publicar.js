/* ============================================================
   RESCATE OPEN — Publicar donación
   El formulario evalúa inocuidad EN VIVO: el donante ve por qué su
   publicación sería rechazada antes de intentarlo. La evaluación de
   pantalla es una cortesía; la que decide es la del núcleo al aplicar
   la transición (y, en producción, la del servidor).
   ============================================================ */

import { store } from "../store.js";
import { nuevaDonacion } from "../core/donacion.js";
import { evaluar } from "../core/inocuidad.js";
import { publicar as publicarDonacion } from "./acciones.js";
import { CATEGORIAS, CONSERVACION, ESTADO_EMPAQUE, UNIDADES, ALERGENOS } from "../datos/catalogos.js";
import { CIUDADES } from "../core/geo.js";
import { puedeOperar } from "../core/organizacion.js";
import {
  esc, toast, leerFormulario, pintarErrores, alertaBloqueos, paraInputFechaHora,
} from "../ui.js";

const enHoras = (h) => new Date(Date.now() + h * 3600000).toISOString();

export function render(contenedor, refrescar) {
  const sesion = store.sesion();
  const org = sesion?.organizacionId ? store.organizacion(sesion.organizacionId) : null;

  if (!org || !puedeOperar(org)) {
    contenedor.innerHTML = `
      <h1 id="t-publicar">Publicar donación</h1>
      <div class="alerta aviso">
        <strong>Organización no habilitada</strong>
        Solo organizaciones donantes verificadas pueden publicar. Estado actual:
        <em>${esc(org?.estadoVerificacion || "sin organización")}</em>.
      </div>`;
    return;
  }

  contenedor.innerHTML = `
    <h1 id="t-publicar">Publicar donación</h1>
    <p>Declara el excedente con la información que la organización receptora necesita para decidir y retirar.
       Rescate Open no verifica la aptitud del alimento: la declara y responde el donante.</p>

    <form id="f-donacion" novalidate>
      <div class="tarjeta">
        <h3>Qué se dona</h3>
        <div class="campo">
          <label for="titulo">Título</label>
          <input id="titulo" name="titulo" required maxlength="90" placeholder="Ej.: Yogur bebible, referencia descontinuada">
        </div>
        <div class="campo">
          <label for="descripcion">Descripción</label>
          <textarea id="descripcion" name="descripcion" maxlength="800"
            placeholder="Motivo del excedente, condiciones de entrega, si se requiere canastilla propia…"></textarea>
        </div>
        <div class="campo">
          <label for="categoria">Categoría</label>
          <select id="categoria" name="categoria" required>
            ${Object.entries(CATEGORIAS).map(([id, c]) => `<option value="${esc(id)}">${esc(c.icono)} ${esc(c.etiqueta)}</option>`).join("")}
          </select>
          <p class="ayuda" id="ayuda-categoria"></p>
        </div>
        <div class="fila dos">
          <div class="campo">
            <label for="cantidad">Cantidad</label>
            <input id="cantidad" name="cantidad" type="number" step="0.1" min="0.1" required value="10">
          </div>
          <div class="campo">
            <label for="unidad">Unidad</label>
            <select id="unidad" name="unidad" required>
              ${Object.entries(UNIDADES).map(([id, u]) => `<option value="${esc(id)}">${esc(u.etiqueta)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>

      <div class="tarjeta">
        <h3>Conservación y trazabilidad</h3>
        <div class="fila dos">
          <div class="campo">
            <label for="conservacion">Condición de conservación</label>
            <select id="conservacion" name="conservacion" required>
              ${Object.entries(CONSERVACION).map(([id, c]) => `<option value="${esc(id)}">${esc(c.icono)} ${esc(c.etiqueta)}</option>`).join("")}
            </select>
          </div>
          <div class="campo">
            <label for="temperaturaC">Temperatura medida (°C)</label>
            <input id="temperaturaC" name="temperaturaC" type="number" step="0.1" placeholder="Ej.: 3">
            <p class="ayuda">Obligatoria si hay cadena de frío o mantenimiento en caliente.</p>
          </div>
        </div>
        <div class="campo">
          <label for="estadoEmpaque">Estado del empaque</label>
          <select id="estadoEmpaque" name="estadoEmpaque" required>
            ${Object.entries(ESTADO_EMPAQUE).map(([id, e]) => `<option value="${esc(id)}">${esc(e.etiqueta)}${e.aceptado ? "" : " — no admitido"}</option>`).join("")}
          </select>
        </div>
        <div class="fila dos">
          <div class="campo">
            <label for="fechaVencimiento">Vencimiento o consumo preferente</label>
            <input id="fechaVencimiento" name="fechaVencimiento" type="datetime-local" value="${paraInputFechaHora(enHoras(48))}">
          </div>
          <div class="campo">
            <label for="preparadoEn">Fecha y hora de preparación</label>
            <input id="preparadoEn" name="preparadoEn" type="datetime-local">
            <p class="ayuda">Solo para alimento preparado.</p>
          </div>
        </div>
        <div class="fila dos">
          <div class="campo">
            <label for="lote">Lote</label>
            <input id="lote" name="lote" maxlength="60" placeholder="Identificación del lote">
          </div>
          <div class="campo">
            <label for="registroSanitario">Registro / permiso sanitario</label>
            <input id="registroSanitario" name="registroSanitario" maxlength="60">
          </div>
        </div>
        <div class="campo">
          <label for="responsableTecnico">Responsable técnico o de manipulación</label>
          <input id="responsableTecnico" name="responsableTecnico" maxlength="90" placeholder="Cargo del responsable en origen">
        </div>
        <div class="campo">
          <label>Alérgenos declarados</label>
          <div class="chips">
            ${ALERGENOS.map(
              (a) => `<label class="chip"><input type="checkbox" name="alergenos" data-lista="1" value="${esc(a.id)}">${esc(a.etiqueta)}</label>`
            ).join("")}
          </div>
          <label class="chequeo" style="margin-top:.4rem">
            <input type="checkbox" name="sinAlergenosDeclarados">
            <span><b>No aplican alérgenos de declaración</b>
              <span class="detalle">Marcar solo si el producto no contiene ninguno de los anteriores.</span></span>
          </label>
        </div>
      </div>

      <div class="tarjeta">
        <h3>Retiro</h3>
        <div class="fila dos">
          <div class="campo">
            <label for="retiroDesde">Disponible desde</label>
            <input id="retiroDesde" name="retiroDesde" type="datetime-local" required value="${paraInputFechaHora(enHoras(0))}">
          </div>
          <div class="campo">
            <label for="retiroHasta">Hasta</label>
            <input id="retiroHasta" name="retiroHasta" type="datetime-local" required value="${paraInputFechaHora(enHoras(12))}">
          </div>
        </div>
        <div class="fila dos">
          <div class="campo">
            <label for="ciudadId">Ciudad</label>
            <select id="ciudadId" name="ciudadId" required>
              ${CIUDADES.map((c) => `<option value="${esc(c.id)}" ${c.id === org.ciudadId ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}
            </select>
          </div>
          <div class="campo">
            <label for="zona">Zona o localidad</label>
            <input id="zona" name="zona" maxlength="60" placeholder="Ej.: Kennedy">
          </div>
        </div>
        <div class="campo">
          <label for="direccionExacta">Dirección exacta de retiro</label>
          <input id="direccionExacta" name="direccionExacta" required maxlength="160"
                 value="${esc(org.direccion || "")}">
          <p class="ayuda">Solo la ve la organización que reserve. En el listado público se muestra una zona aproximada.</p>
        </div>
        <div class="campo">
          <label for="indicacionesRetiro">Indicaciones para el retiro</label>
          <textarea id="indicacionesRetiro" name="indicacionesRetiro" maxlength="400"
            placeholder="Portería, muelle de cargue, documentos requeridos, horario del personal…"></textarea>
        </div>
        <div class="fila dos">
          <div class="campo">
            <label for="contactoNombre">Contacto en sitio</label>
            <input id="contactoNombre" name="contactoNombre" required maxlength="90" value="${esc(org.responsableNombre || "")}">
          </div>
          <div class="campo">
            <label for="contactoTelefono">Teléfono (57 + 10 dígitos)</label>
            <input id="contactoTelefono" name="contactoTelefono" required inputmode="numeric"
                   value="${esc(org.telefonoContacto || "")}">
          </div>
        </div>
        <label class="chequeo">
          <input type="checkbox" name="requiereTransporteReceptor" checked>
          <span><b>El transporte lo asume la organización receptora</b>
            <span class="detalle">Rescate Open no transporta ni contrata transporte.</span></span>
        </label>
      </div>

      <div class="tarjeta">
        <h3>Evidencia y declaración</h3>
        <div class="campo">
          <label>Evidencia fotográfica</label>
          <label class="chequeo">
            <input type="checkbox" name="fotoProducto" value="1">
            <span>Foto del producto y del lote</span>
          </label>
          <label class="chequeo">
            <input type="checkbox" name="fotoRotulado" value="1">
            <span>Foto del rotulado con la fecha legible</span>
          </label>
          <p class="ayuda">
            En el piloto local las fotos no se suben: se registra que existen y quedan bajo custodia del donante.
            El despliegue con backend debe almacenarlas cifradas y con URLs temporales.
          </p>
        </div>
        <label class="chequeo">
          <input type="checkbox" name="alertaSanitaria">
          <span><b>El producto tiene alerta sanitaria o retiro en curso</b>
            <span class="detalle">Si marcas esto, la donación no podrá publicarse.</span></span>
        </label>
        <label class="chequeo">
          <input type="checkbox" name="declaracionAptitud" required>
          <span><b>Declaro que el alimento es apto para consumo humano</b>
            <span class="detalle">
              Declaro titularidad sobre el producto, que se conservó según lo indicado y que la información es veraz.
              Esta declaración queda registrada con mi usuario y la hora.
            </span></span>
        </label>
      </div>

      <div id="evaluacion-viva" aria-live="polite"></div>

      <div class="acciones" style="margin-bottom:2rem">
        <button type="submit" class="btn primario" name="accion" value="publicar">Guardar y publicar</button>
        <button type="submit" class="btn fantasma" name="accion" value="borrador">Guardar como borrador</button>
      </div>
    </form>
  `;

  const form = contenedor.querySelector("#f-donacion");
  const evaluacion = contenedor.querySelector("#evaluacion-viva");

  function datosDelFormulario() {
    const d = leerFormulario(form);
    d.cantidad = Number(d.cantidad || 0);
    d.temperaturaC = d.temperaturaC === undefined || d.temperaturaC === "" ? null : Number(d.temperaturaC);
    d.alergenos = d.alergenos || [];
    d.fotos = [];
    if (d.fotoProducto) d.fotos.push("local:foto-producto");
    if (d.fotoRotulado) d.fotos.push("local:foto-rotulado");
    for (const campo of ["fechaVencimiento", "preparadoEn", "retiroDesde", "retiroHasta"]) {
      if (d[campo]) d[campo] = new Date(d[campo]).toISOString();
    }
    delete d.fotoProducto;
    delete d.fotoRotulado;
    delete d.accion;
    return d;
  }

  function evaluarEnVivo() {
    const d = datosDelFormulario();
    const cat = CATEGORIAS[d.categoria];
    contenedor.querySelector("#ayuda-categoria").textContent = cat
      ? `Riesgo ${cat.riesgo}. Conservación admitida: ${cat.conservaciones.join(", ")}. ` +
        `${cat.requiereLote ? "Exige lote. " : ""}${cat.requiereTrazabilidad ? "Exige responsable técnico. " : ""}` +
        `Ventana máxima sugerida: ${cat.ventanaMaxHoras} h.`
      : "";
    evaluacion.innerHTML = alertaBloqueos(evaluar(d, new Date()));
  }

  form.addEventListener("input", evaluarEnVivo);
  form.addEventListener("change", (e) => {
    if (e.target.closest(".chip")) e.target.closest(".chip").classList.toggle("marcado", e.target.checked);
    evaluarEnVivo();
  });
  evaluarEnVivo();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const quiereEnviar = ev.submitter?.value === "publicar";
    const datos = datosDelFormulario();

    const creada = nuevaDonacion(datos, sesion, new Date());
    if (!creada.ok) {
      pintarErrores(form, creada.errores);
      toast("Revisa los campos marcados.", "error");
      return;
    }

    store.guardarDonacion(creada.donacion);
    await store.registrar({
      accion: "DONACION_CREADA",
      actor: sesion,
      recurso: "donacion",
      recursoId: creada.donacion.id,
      despues: { estado: creada.donacion.estado, titulo: creada.donacion.titulo },
    });

    if (!quiereEnviar) {
      toast("Guardada como borrador.", "ok");
      refrescar("operacion");
      return;
    }

    const publicada = await publicarDonacion(creada.donacion);
    if (publicada) {
      toast("Donación publicada. Las organizaciones verificadas ya pueden reservarla.", "ok");
      refrescar("operacion");
    } else {
      toast("Se guardó como borrador: revisa los bloqueos sanitarios.", "error");
      refrescar("operacion");
    }
  });
}
