/* ============================================================
   RESCATE OPEN — Panel
   Una sola pregunta por rol: ¿qué debo hacer ahora?
   Debajo, el impacto del piloto y la salud de la trazabilidad.
   ============================================================ */

import { store } from "../store.js";
import { ESTADOS } from "../core/estados.js";
import { ROLES, ETIQUETA_ROL } from "../core/rbac.js";
import { resumen, embudo, serieDiaria, tiempoMedianoHoras } from "../core/impacto.js";
import { urgencia } from "../core/donacion.js";
import { puedeOperar, VERIFICACION } from "../core/organizacion.js";
import { esc, numero, insignia, vacio } from "../ui.js";
import { tarjetaDonacion, conectarTarjetas } from "./tarjeta.js";
import { abrirDetalle } from "./detalle.js";

export async function render(contenedor, refrescar) {
  const sesion = store.sesion();
  const todas = store.estado.donaciones;
  const org = sesion?.organizacionId ? store.organizacion(sesion.organizacionId) : null;

  const imp = resumen(todas);
  const emb = embudo(todas);
  const serie = serieDiaria(todas, 14);
  const mediana = tiempoMedianoHoras(todas);
  const maxKg = Math.max(1, ...serie.map((s) => s.kg));

  const urgentes = todas
    .filter((d) => d.estado === ESTADOS.PUBLISHED && ["critica", "alta"].includes(urgencia(d).nivel))
    .sort((a, b) => new Date(a.retiroHasta) - new Date(b.retiroHasta))
    .slice(0, 4);

  const cadena = await store.verificarAuditoria();

  contenedor.innerHTML = `
    <div class="aviso-piloto">
      <strong>Modo piloto local.</strong> Los datos viven solo en este navegador y son de demostración.
      Rescate Open coordina: no vende, no transporta ni manipula alimentos.
    </div>

    <h1 id="t-panel">Hola, ${esc(sesion?.nombre || "invitado")}</h1>
    <p>${esc(ETIQUETA_ROL[sesion?.rol] || "Sin sesión")}${org ? ` · ${esc(org.nombre)}` : ""}</p>

    ${avisoOrganizacion(org, sesion)}

    <div class="tarjeta">
      <div class="tarjeta-titulo"><h2>Tu siguiente paso</h2></div>
      ${pasosDeRol(sesion, todas, org).map(paso).join("")}
    </div>

    <h2 style="margin-top:1.3rem">Impacto del piloto</h2>
    <p class="pequeno tenue">Solo cuenta lo efectivamente recibido. Las conversiones son estimaciones de comunicación.</p>
    <div class="kpis">
      <div class="kpi"><div class="etiqueta">Rescatado</div><div class="valor">${numero(imp.kg)} kg</div><div class="nota">${numero(imp.entregas)} entregas</div></div>
      <div class="kpi"><div class="etiqueta">Raciones</div><div class="valor">${numero(imp.raciones)}</div><div class="nota">estimadas</div></div>
      <div class="kpi"><div class="etiqueta">CO₂e evitado</div><div class="valor">${numero(imp.co2eKg)} kg</div><div class="nota">estimado</div></div>
      <div class="kpi"><div class="etiqueta">Tasa de rescate</div><div class="valor">${numero(emb.tasaRescate)}%</div><div class="nota">de lo publicado</div></div>
    </div>

    <div class="tarjeta" style="margin-top:.85rem">
      <div class="tarjeta-titulo"><h3>Kilos recibidos · últimos 14 días</h3></div>
      <div class="grafico" role="img" aria-label="Kilos rescatados por día en los últimos 14 días">
        ${serie
          .map(
            (s) => `<div class="barra ${s.kg > 0 ? "tiene" : ""}" style="height:${Math.max(3, (s.kg / maxKg) * 100)}%" title="${esc(s.dia)}: ${numero(s.kg)} kg"></div>`
          )
          .join("")}
      </div>
      <div class="grafico-pie"><span>${esc(serie[0]?.dia || "")}</span><span>${esc(serie.at(-1)?.dia || "")}</span></div>
      ${mediana != null ? `<p class="pequeno tenue" style="margin:.5rem 0 0">Tiempo mediano entre publicar y recibir: <strong>${numero(mediana)} h</strong>.</p>` : ""}
    </div>

    <div class="rejilla dos" style="margin-top:.85rem">
      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Embudo</h3></div>
        <dl>
          <div class="dato"><dt>Borradores</dt><dd>${numero(emb.borradores)}</dd></div>
          <div class="dato"><dt>Publicadas</dt><dd>${numero(emb.publicadas)}</dd></div>
          <div class="dato"><dt>Reservadas</dt><dd>${numero(emb.reservadas)}</dd></div>
          <div class="dato"><dt>En custodia</dt><dd>${numero(emb.enCustodia)}</dd></div>
          <div class="dato"><dt>Recibidas</dt><dd>${numero(emb.recibidas)}</dd></div>
          <div class="dato"><dt>Canceladas / rechazadas</dt><dd>${numero(emb.canceladas + emb.rechazadas)}</dd></div>
        </dl>
      </div>
      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Integridad de la auditoría</h3></div>
        ${cadena.ok
          ? `<div class="alerta ok"><strong>Cadena verificada</strong>
               ${numero(store.estado.auditoria.length)} eventos enlazados por hash, sin alteraciones.</div>`
          : `<div class="alerta bloqueo"><strong>Cadena rota</strong>
               Evento ${esc(cadena.rotoEn)}: ${esc(cadena.motivo)}</div>`}
        <p class="pequeno tenue">Cada evento incluye el hash del anterior: modificar o borrar uno rompe la verificación.</p>
      </div>
    </div>

    <h2 style="margin-top:1.3rem">Se pierde primero</h2>
    <p class="pequeno tenue">Publicaciones con ventana de retiro de 12 horas o menos.</p>
    <div id="urgentes">
      ${urgentes.length ? urgentes.map((d) => tarjetaDonacion(d)).join("") : vacio("✅", "Nada urgente ahora mismo")}
    </div>
  `;

  conectarTarjetas(contenedor, (id) => abrirDetalle(id, refrescar));
  contenedor.querySelectorAll("[data-ir]").forEach((b) =>
    b.addEventListener("click", () => refrescar(b.dataset.ir))
  );
}

function avisoOrganizacion(org, sesion) {
  if (!sesion || !org) return "";
  if (puedeOperar(org)) return "";
  const etiqueta = org.suspendida ? "suspendida" : org.estadoVerificacion;
  return `<div class="alerta aviso">
    <strong>Organización ${esc(etiqueta)}</strong>
    Mientras no esté verificada y activa, ${sesion.rol === ROLES.DONOR ? "no puedes publicar donaciones" : "no puedes reservar donaciones"}.
    ${org.estadoVerificacion === VERIFICACION.EN_REVISION ? "La verificación documental es manual y la realiza una persona." : ""}
  </div>`;
}

function paso({ hecho, titulo, detalle, ir, textoBoton }) {
  return `<div class="paso ${hecho ? "hecho" : ""}">
    <span class="num" aria-hidden="true">${hecho ? "✓" : "→"}</span>
    <span class="texto">
      <b>${esc(titulo)}</b>
      <span class="tenue">${esc(detalle)}</span>
      ${ir ? `<br><button class="btn pequeno ${hecho ? "fantasma" : "primario"}" data-ir="${esc(ir)}" style="margin-top:.4rem">${esc(textoBoton || "Ir")}</button>` : ""}
    </span>
  </div>`;
}

function pasosDeRol(sesion, todas, org) {
  if (!sesion) {
    return [{ hecho: false, titulo: "Elige un rol para explorar el piloto", detalle: "Cada rol ve y puede cosas distintas.", ir: "cuenta", textoBoton: "Entrar" }];
  }

  const mias = store.donacionesDe(sesion.organizacionId);
  const reservadas = store.reservadasPor(sesion.organizacionId);

  if (sesion.rol === ROLES.DONOR) {
    return [
      {
        hecho: puedeOperar(org),
        titulo: "Organización verificada",
        detalle: puedeOperar(org) ? "Puedes publicar excedentes." : "Verificación documental pendiente.",
      },
      {
        hecho: mias.some((d) => d.estado !== ESTADOS.DRAFT),
        titulo: "Publicar un excedente",
        detalle: "Con fecha, conservación, evidencia y declaración de aptitud.",
        ir: "publicar",
        textoBoton: "Publicar donación",
      },
      {
        hecho: mias.some((d) => [ESTADOS.HANDED_OVER, ESTADOS.RECEIVED, ESTADOS.CLOSED].includes(d.estado)),
        titulo: "Entregar contra código",
        detalle: "La organización receptora dicta el código al momento del retiro.",
        ir: "operacion",
        textoBoton: "Ver mis donaciones",
      },
    ];
  }

  if (sesion.rol === ROLES.RECEIVER) {
    return [
      {
        hecho: puedeOperar(org),
        titulo: "Organización verificada",
        detalle: puedeOperar(org) ? "Puedes reservar donaciones." : "Envía la documentación y espera la revisión manual.",
      },
      {
        hecho: reservadas.length > 0,
        titulo: "Reservar una oportunidad",
        detalle: "Reservar es un compromiso de retiro dentro de la ventana.",
        ir: "oportunidades",
        textoBoton: "Ver oportunidades",
      },
      {
        hecho: reservadas.some((d) => [ESTADOS.RECEIVED, ESTADOS.CLOSED].includes(d.estado)),
        titulo: "Confirmar recepción con acta",
        detalle: "Cantidad recibida, conformidad y observaciones.",
        ir: "operacion",
        textoBoton: "Ver mis reservas",
      },
    ];
  }

  if (sesion.rol === ROLES.VERIFIER) {
    const pendientes = store.estado.organizaciones.filter((o) => o.estadoVerificacion !== VERIFICACION.VERIFICADA);
    return [
      {
        hecho: pendientes.length === 0,
        titulo: `${pendientes.length} organización(es) por revisar`,
        detalle: "La aprobación exige lista de chequeo completa y motivo escrito.",
        ir: "verificacion",
        textoBoton: "Abrir bandeja",
      },
    ];
  }

  const enMovimiento = todas.filter((d) => [ESTADOS.RESERVED, ESTADOS.HANDED_OVER].includes(d.estado));
  return [
    {
      hecho: false,
      titulo: `${enMovimiento.length} operación(es) en curso`,
      detalle: "Reservas y entregas pendientes de cierre.",
      ir: "operacion",
      textoBoton: "Ver operación",
    },
    {
      hecho: false,
      titulo: "Revisar la auditoría",
      detalle: "Verifica la integridad de la cadena y los intentos bloqueados.",
      ir: "auditoria",
      textoBoton: "Abrir auditoría",
    },
  ];
}
