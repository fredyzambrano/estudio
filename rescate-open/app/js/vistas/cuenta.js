/* ============================================================
   RESCATE OPEN — Cuenta, consentimiento y derechos del titular
   Aquí vive lo que la Ley 1581 de 2012 exige poder ejercer:
   conocer, actualizar, rectificar, revocar y suprimir.
   En el piloto local todo eso opera sobre localStorage.
   ============================================================ */

import { store } from "../store.js";
import { ETIQUETA_ROL } from "../core/rbac.js";
import { FINALIDADES, FINALIDADES_OBLIGATORIAS, VERSIONES, otorgar, revocar, vigente, AVISO_CORTO } from "../core/consentimiento.js";
import { ETIQUETA_VERIFICACION } from "../core/organizacion.js";
import { esc, toast, confirmar, fechaHora, leerFormulario } from "../ui.js";

export function render(contenedor, refrescar) {
  const sesion = store.sesion();
  const consentimiento = sesion ? store.consentimientoDe(sesion.id) : null;
  const alDia = vigente(consentimiento);

  contenedor.innerHTML = `
    <h1 id="t-cuenta">Cuenta</h1>

    <div class="aviso-piloto">
      <strong>Piloto de demostración.</strong> No hay registro ni contraseñas: eliges con qué rol explorar.
      En producción, la autenticación exige correo verificado y MFA para verificación y administración.
    </div>

    <div class="tarjeta">
      <div class="tarjeta-titulo"><h2>Sesión</h2></div>
      ${sesion
        ? `<dl>
             <div class="dato"><dt>Usuario</dt><dd>${esc(sesion.nombre)}</dd></div>
             <div class="dato"><dt>Rol</dt><dd>${esc(ETIQUETA_ROL[sesion.rol])}</dd></div>
             <div class="dato"><dt>Organización</dt><dd>${esc(store.organizacion(sesion.organizacionId)?.nombre || "—")}</dd></div>
             <div class="dato"><dt>Estado de verificación</dt><dd>${esc(ETIQUETA_VERIFICACION[store.organizacion(sesion.organizacionId)?.estadoVerificacion] || "—")}</dd></div>
             <div class="dato"><dt>Segundo factor</dt><dd>${sesion.mfa ? "activo" : "no aplica en este rol"}</dd></div>
           </dl>`
        : `<p>Sin sesión activa.</p>`}

      <h3 style="margin-top:1rem">Cambiar de rol</h3>
      <p class="pequeno tenue">Cada rol ve cosas distintas: es la forma más rápida de comprobar que la autorización funciona.</p>
      <div class="selector-rol" id="selector-rol">
        ${store.estado.usuarios
          .map(
            (u) => `<label class="chip ${sesion?.id === u.id ? "marcado" : ""}">
              <input type="radio" name="usuario" value="${esc(u.id)}" ${sesion?.id === u.id ? "checked" : ""}>
              ${esc(u.nombre)} · ${esc(ETIQUETA_ROL[u.rol])}
            </label>`
          )
          .join("")}
      </div>
    </div>

    <div class="tarjeta">
      <div class="tarjeta-titulo"><h2>Autorización de tratamiento de datos</h2></div>
      <p class="pequeno">${esc(AVISO_CORTO)}</p>
      ${alDia
        ? `<div class="alerta ok"><strong>Autorización vigente</strong>
             Otorgada el ${fechaHora(consentimiento.otorgadoEn)} · términos ${esc(consentimiento.versionTerminos)} ·
             privacidad ${esc(consentimiento.versionPrivacidad)}</div>`
        : `<div class="alerta aviso"><strong>Falta autorización vigente</strong>
             ${consentimiento ? "Los textos cambiaron de versión y debes autorizarlos de nuevo." : "Sin autorización no puedes publicar ni reservar."}</div>`}

      <form id="f-consentimiento">
        ${FINALIDADES.map(
          (f) => `<label class="chequeo">
            <input type="checkbox" name="finalidades" data-lista="1" value="${esc(f.id)}"
              ${f.obligatoria || consentimiento?.finalidades?.includes(f.id) ? "checked" : ""}
              ${f.obligatoria ? "data-obligatoria='1'" : ""}>
            <span><b>${esc(f.etiqueta)}${f.obligatoria ? " (esencial)" : ""}</b>
              <span class="detalle">${esc(f.detalle)}</span></span>
          </label>`
        ).join("")}
        <p class="pequeno tenue">Versiones vigentes: términos ${esc(VERSIONES.terminos)}, privacidad ${esc(VERSIONES.privacidad)}.
          Al cambiar de versión, la autorización se vuelve a pedir.</p>
        <div class="acciones">
          <button type="submit" class="btn primario">Guardar autorización</button>
          ${consentimiento && !consentimiento.revocadoEn
            ? `<button type="button" class="btn peligro" id="btn-revocar">Revocar</button>`
            : ""}
        </div>
      </form>
    </div>

    <div class="tarjeta">
      <div class="tarjeta-titulo"><h2>Tus datos</h2></div>
      <p class="pequeno">Puedes conocer, actualizar, rectificar y suprimir. En el piloto local, exportar entrega
        el archivo completo y suprimir borra todo de este navegador sin dejar copia.</p>
      <div class="acciones">
        <button class="btn" id="btn-exportar">Exportar mis datos (JSON)</button>
        <label class="btn fantasma" for="input-importar">Importar respaldo</label>
        <input type="file" id="input-importar" accept="application/json" class="oculto">
        <button class="btn peligro" id="btn-suprimir">Suprimir todo</button>
      </div>
    </div>

    <div class="tarjeta">
      <div class="tarjeta-titulo"><h2>Demostración</h2></div>
      <p class="pequeno">Vuelve a generar el escenario de prueba con organizaciones ficticias, donaciones en
        distintos estados y su cadena de auditoría.</p>
      <div class="acciones">
        <button class="btn fantasma" id="btn-resembrar">Regenerar datos de demostración</button>
      </div>
    </div>

    <div class="tarjeta">
      <div class="tarjeta-titulo"><h2>Documentos</h2></div>
      <ul class="pequeno">
        <li><a href="../legal/terminos-de-uso.md">Términos de uso</a></li>
        <li><a href="../legal/politica-tratamiento-datos.md">Política de tratamiento de datos personales</a></li>
        <li><a href="../legal/politica-inocuidad.md">Política de inocuidad y criterios de aceptación</a></li>
        <li><a href="../SECURITY.md">Reporte de vulnerabilidades</a></li>
        <li><a href="../LICENSE">Licencia AGPL-3.0-or-later</a></li>
      </ul>
      <p class="pequeno tenue">Plantillas editables. No constituyen asesoría jurídica ni sanitaria.</p>
    </div>
  `;

  /* ---------- Cambio de rol ---------- */
  contenedor.querySelectorAll('#selector-rol input[name="usuario"]').forEach((r) =>
    r.addEventListener("change", async () => {
      const anterior = store.sesion();
      if (anterior) await store.registrar({ accion: "SESION_CERRADA", actor: anterior });
      const res = store.entrar(r.value);
      if (!res.ok) return toast(res.mensaje, "error");
      await store.registrar({ accion: "SESION_INICIADA", actor: store.sesion() });
      toast(`Ahora exploras como ${ETIQUETA_ROL[res.sesion.rol]}.`, "ok");
      refrescar("panel");
    })
  );

  /* ---------- Consentimiento ---------- */
  contenedor.querySelector("#f-consentimiento").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!sesion) return toast("Elige un rol primero.", "error");
    const datos = leerFormulario(ev.target);
    const r = await otorgar({
      usuarioId: sesion.id,
      finalidades: datos.finalidades || [],
      textoMostrado: AVISO_CORTO,
      canal: "web-piloto",
      agenteUsuario: navigator.userAgent,
    });
    if (!r.ok) return toast(r.mensaje, "error");
    store.guardarConsentimiento(r.registro);
    await store.registrar({
      accion: "CONSENTIMIENTO_OTORGADO",
      actor: sesion,
      recurso: "consentimiento",
      recursoId: sesion.id,
      despues: { finalidades: r.registro.finalidades, versionPrivacidad: r.registro.versionPrivacidad },
    });
    toast("Autorización registrada.", "ok");
    refrescar();
  });

  const btnRevocar = contenedor.querySelector("#btn-revocar");
  if (btnRevocar) {
    btnRevocar.addEventListener("click", async () => {
      const seguro = await confirmar(
        "Revocar la autorización",
        "Sin las finalidades esenciales no puedes publicar ni reservar. ¿Continuar?",
        { textoOk: "Revocar", peligro: true }
      );
      if (!seguro) return;
      store.guardarConsentimiento(revocar(consentimiento));
      await store.registrar({
        accion: "CONSENTIMIENTO_REVOCADO",
        actor: sesion,
        recurso: "consentimiento",
        recursoId: sesion.id,
      });
      toast("Autorización revocada.", "ok");
      refrescar();
    });
  }

  /* ---------- Derechos sobre los datos ---------- */
  contenedor.querySelector("#btn-exportar").addEventListener("click", async () => {
    const blob = new Blob([store.exportar()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rescate-open-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (sesion) {
      await store.registrar({ accion: "DATOS_EXPORTADOS", actor: sesion, recurso: "estado" });
    }
    toast("Respaldo descargado.", "ok");
  });

  contenedor.querySelector("#input-importar").addEventListener("change", async (ev) => {
    const archivo = ev.target.files?.[0];
    if (!archivo) return;
    const texto = await archivo.text();
    const r = store.importar(texto);
    toast(r.ok ? "Respaldo restaurado." : r.mensaje, r.ok ? "ok" : "error");
    if (r.ok) refrescar("panel");
  });

  contenedor.querySelector("#btn-suprimir").addEventListener("click", async () => {
    const seguro = await confirmar(
      "Suprimir todos los datos",
      "Se borra todo lo almacenado en este navegador, incluida la auditoría local. No hay copia.",
      { textoOk: "Suprimir", peligro: true }
    );
    if (!seguro) return;
    store.reiniciar();
    toast("Datos suprimidos.", "ok");
    location.reload();
  });

  contenedor.querySelector("#btn-resembrar").addEventListener("click", async () => {
    const seguro = await confirmar(
      "Regenerar la demostración",
      "Se reemplaza el estado actual por el escenario de prueba.",
      { textoOk: "Regenerar" }
    );
    if (!seguro) return;
    store.reiniciar();
    location.reload();
  });
}
