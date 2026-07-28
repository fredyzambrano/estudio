/* ============================================================
   RESCATE OPEN — API (Cloudflare Worker + D1)
   La MISMA lógica que corre en el navegador, pero aquí es la que
   manda. El cliente valida para dar buena UX; este archivo decide.

   Reglas de este archivo:
   1. Ninguna ruta escribe `estado` directamente: todo pasa por
      aplicarTransicion(). Si aparece un UPDATE de estado a mano,
      es un bug de seguridad.
   2. Ninguna respuesta devuelve dirección exacta o contacto sin
      pasar por vistaParaReserva().
   3. Todo cambio deja un evento en la cadena de auditoría.

   TODO (autenticación): este Worker usa tokens opacos guardados
   por hash. Falta el registro con correo verificado y el segundo
   factor real para VERIFIER y ADMIN — hoy se exige la bandera
   mfa_activo, que debe poblarla el flujo de autenticación.
   ============================================================ */

import { aplicarTransicion, ESTADOS } from "../app/js/core/estados.js";
import { nuevaDonacion, vistaPublica, vistaParaReserva } from "../app/js/core/donacion.js";
import { decidirVerificacion, suspender, puedeOperar } from "../app/js/core/organizacion.js";
import { puede } from "../app/js/core/rbac.js";
import { vigente as consentimientoVigente } from "../app/js/core/consentimiento.js";
import { crearEvento, seudonimizarIp, canonico } from "../app/js/core/auditoria.js";
import { sha256Hex, codigoEntrega, nuevoId } from "../app/js/core/ids.js";

const CABECERAS_BASE = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

/* Límites por ventana de 60 s, por IP seudonimizada y ruta. */
const LIMITES = {
  "POST /api/donaciones": 20,
  "POST /api/transicion": 60,
  "POST /api/verificacion": 30,
  defecto: 120,
};

export default {
  async fetch(peticion, entorno) {
    const url = new URL(peticion.url);
    const origen = peticion.headers.get("Origin");

    if (peticion.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origen, entorno) });
    }

    try {
      const respuesta = await enrutar(peticion, entorno, url);
      for (const [k, v] of Object.entries(cors(origen, entorno))) respuesta.headers.set(k, v);
      return respuesta;
    } catch (e) {
      /* Nunca se filtra el detalle interno al cliente. */
      console.error("Error no controlado:", e);
      return json({ error: "ERROR_INTERNO", mensaje: "No se pudo procesar la solicitud." }, 500);
    }
  },
};

/* ---------- Enrutado ---------- */

async function enrutar(peticion, entorno, url) {
  const ruta = url.pathname.replace(/\/+$/, "") || "/";
  const metodo = peticion.method;

  if (ruta === "/api/salud") {
    return json({ ok: true, servicio: "rescate-open", ts: new Date().toISOString() });
  }

  const limite = await limitar(peticion, entorno, `${metodo} ${ruta}`);
  if (!limite.ok) return json({ error: "DEMASIADAS_SOLICITUDES" }, 429, { "Retry-After": "60" });

  /* Listado público: solo publicadas y solo con la proyección pública. */
  if (metodo === "GET" && ruta === "/api/donaciones") {
    const filas = await entorno.DB.prepare(
      `SELECT * FROM donaciones WHERE estado = ? AND retiro_hasta > ? ORDER BY retiro_hasta ASC LIMIT 100`
    ).bind(ESTADOS.PUBLISHED, new Date().toISOString()).all();
    return json({ donaciones: (filas.results || []).map((f) => vistaPublica(filaADonacion(f))) });
  }

  const sesion = await autenticar(peticion, entorno);
  if (!sesion.ok) return json({ error: sesion.codigo, mensaje: sesion.mensaje }, 401);
  const actor = sesion.actor;

  if (metodo === "GET" && ruta === "/api/yo") {
    return json({ actor: { id: actor.id, rol: actor.rol, organizacionId: actor.organizacionId, mfa: actor.mfa } });
  }

  if (metodo === "POST" && ruta === "/api/donaciones") {
    return crearDonacion(peticion, entorno, actor);
  }

  const detalle = ruta.match(/^\/api\/donaciones\/([\w-]+)$/);
  if (metodo === "GET" && detalle) {
    return verDonacion(entorno, actor, detalle[1]);
  }

  const transicion = ruta.match(/^\/api\/donaciones\/([\w-]+)\/transicion$/);
  if (metodo === "POST" && transicion) {
    return ejecutarTransicion(peticion, entorno, actor, transicion[1]);
  }

  const verificacion = ruta.match(/^\/api\/organizaciones\/([\w-]+)\/verificacion$/);
  if (metodo === "POST" && verificacion) {
    return verificarOrganizacion(peticion, entorno, actor, verificacion[1]);
  }

  if (metodo === "GET" && ruta === "/api/auditoria") {
    const permiso = puede(actor, "auditoria:leer");
    if (!permiso.ok) return json({ error: permiso.codigo, mensaje: permiso.mensaje }, 403);
    const filas = await entorno.DB.prepare(
      `SELECT * FROM auditoria ORDER BY id DESC LIMIT 200`
    ).all();
    return json({ eventos: filas.results || [] });
  }

  return json({ error: "NO_ENCONTRADO" }, 404);
}

/* ---------- Casos de uso ---------- */

async function crearDonacion(peticion, entorno, actor) {
  const permiso = puede(actor, "donacion:crear", { organizacionId: actor.organizacionId });
  if (!permiso.ok) return json({ error: permiso.codigo, mensaje: permiso.mensaje }, 403);

  const org = await organizacion(entorno, actor.organizacionId);
  if (!puedeOperar(org)) {
    return json({ error: "ORG_NO_HABILITADA", mensaje: "La organización no está verificada y activa." }, 403);
  }
  if (!(await tieneConsentimiento(entorno, actor.id))) {
    return json({ error: "SIN_CONSENTIMIENTO", mensaje: "Falta aceptar la versión vigente de los textos." }, 403);
  }

  const cuerpo = await leerJson(peticion);
  const creada = nuevaDonacion(cuerpo, actor, new Date());
  if (!creada.ok) return json({ error: creada.codigo, errores: creada.errores }, 422);

  await guardarDonacion(entorno, creada.donacion);
  await auditar(entorno, peticion, {
    accion: "DONACION_CREADA",
    actor,
    recurso: "donacion",
    recursoId: creada.donacion.id,
    despues: { estado: creada.donacion.estado },
  });

  return json({ donacion: vistaParaReserva(creada.donacion, actor.organizacionId), sanidad: creada.sanidad }, 201);
}

async function verDonacion(entorno, actor, id) {
  const d = await donacion(entorno, id);
  if (!d) return json({ error: "NO_ENCONTRADO" }, 404);

  const esPropia = d.organizacionId === actor.organizacionId;
  const esParte = esPropia || d.reservadaPorId === actor.organizacionId;
  const esStaff = ["SUPPORT", "ADMIN", "VERIFIER"].includes(actor.rol);

  if (d.estado !== ESTADOS.PUBLISHED && !esParte && !esStaff) {
    /* No se distingue "no existe" de "no puedes verla": no se filtra la existencia. */
    return json({ error: "NO_ENCONTRADO" }, 404);
  }

  const salida = esPropia || esStaff ? d : vistaParaReserva(d, actor.organizacionId);
  return json({ donacion: salida });
}

async function ejecutarTransicion(peticion, entorno, actor, id) {
  const d = await donacion(entorno, id);
  if (!d) return json({ error: "NO_ENCONTRADO" }, 404);

  const cuerpo = await leerJson(peticion);
  const destino = cuerpo.a;

  const contexto = {
    ahora: new Date(),
    consentimientoVigente: await tieneConsentimiento(entorno, actor.id),
    organizacionDonante: await organizacion(entorno, d.organizacionId),
    organizacionReceptora: await organizacion(entorno, d.reservadaPorId || actor.organizacionId),
    motivo: cuerpo.motivo,
    codigoEntrega: cuerpo.codigoEntrega,
    evidencia: cuerpo.evidencia,
    acta: cuerpo.acta,
    /* El código lo genera el servidor: el cliente no elige su propia prueba. */
    codigoEntregaGenerado: destino === ESTADOS.RESERVED ? codigoEntrega() : undefined,
  };

  const r = aplicarTransicion({ donacion: d, a: destino, actor, contexto });

  if (!r.ok) {
    if (r.codigo === "INOCUIDAD" || r.codigo === "INOCUIDAD_ENTREGA") {
      await auditar(entorno, peticion, {
        accion: "INOCUIDAD_BLOQUEO",
        actor,
        recurso: "donacion",
        recursoId: d.id,
        despues: { intento: destino, codigos: (r.detalle || []).map((b) => b.codigo) },
      });
    }
    const estado = ["ROL_INSUFICIENTE", "NO_ES_PROPIETARIO", "NO_ES_PARTE", "MFA_REQUERIDO"].includes(r.codigo) ? 403 : 409;
    return json({ error: r.codigo, mensaje: r.mensaje, detalle: r.detalle || null }, estado);
  }

  await guardarDonacion(entorno, r.donacion);
  await entorno.DB.prepare(
    `INSERT INTO eventos_custodia (id, donacion_id, estado_desde, estado_hasta, actor_id, actor_rol, motivo, datos_json, ocurrido_en)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(
    nuevoId("cus"), d.id, d.estado, destino, actor.id, actor.rol,
    cuerpo.motivo || null, JSON.stringify({ evidencia: cuerpo.evidencia || null, acta: cuerpo.acta || null }),
    new Date().toISOString()
  ).run();

  await auditar(entorno, peticion, { ...r.evento, actor });

  return json({ donacion: vistaParaReserva(r.donacion, actor.organizacionId) });
}

async function verificarOrganizacion(peticion, entorno, actor, id) {
  const org = await organizacion(entorno, id);
  if (!org) return json({ error: "NO_ENCONTRADO" }, 404);

  const cuerpo = await leerJson(peticion);

  const r = cuerpo.decision === "SUSPENDER"
    ? suspender({ organizacion: org, actor, motivo: cuerpo.motivo || "" })
    : decidirVerificacion({
        organizacion: org,
        actor,
        decision: cuerpo.decision,
        chequeo: cuerpo.chequeo || {},
        motivo: cuerpo.motivo || "",
      });

  if (!r.ok) {
    const estado = ["ROL_INSUFICIENTE", "MFA_REQUERIDO", "AUTOVERIFICACION"].includes(r.codigo) ? 403 : 422;
    return json({ error: r.codigo, mensaje: r.mensaje }, estado);
  }

  const o = r.organizacion;
  await entorno.DB.prepare(
    `UPDATE organizaciones SET estado_verificacion=?, chequeo_json=?, suspendida=?, motivo_estado=?,
       verificada_por_id=?, verificada_en=?, actualizada_en=? WHERE id=?`
  ).bind(
    o.estadoVerificacion, JSON.stringify(o.chequeo || {}), o.suspendida ? 1 : 0, o.motivoEstado,
    o.verificadaPorId, o.verificadaEn, o.actualizadaEn, o.id
  ).run();

  await auditar(entorno, peticion, { ...r.evento, actor });
  return json({ organizacion: { id: o.id, estadoVerificacion: o.estadoVerificacion, suspendida: o.suspendida } });
}

/* ---------- Autenticación por token opaco ---------- */

async function autenticar(peticion, entorno) {
  const cabecera = peticion.headers.get("Authorization") || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : null;
  if (!token) return { ok: false, codigo: "SIN_SESION", mensaje: "Falta el token de sesión." };

  const hash = await sha256Hex(`${entorno.SAL_TOKENS || ""}::${token}`);
  const fila = await entorno.DB.prepare(
    `SELECT t.expira_en, t.revocado_en, u.*
       FROM tokens t JOIN usuarios u ON u.id = t.usuario_id
      WHERE t.hash_token = ?`
  ).bind(hash).first();

  if (!fila) return { ok: false, codigo: "SIN_SESION", mensaje: "Token inválido." };
  if (fila.revocado_en) return { ok: false, codigo: "SIN_SESION", mensaje: "Token revocado." };
  if (new Date(fila.expira_en) <= new Date()) return { ok: false, codigo: "SIN_SESION", mensaje: "Token expirado." };
  if (!fila.correo_verificado) return { ok: false, codigo: "CORREO_NO_VERIFICADO", mensaje: "Verifica tu correo." };

  return {
    ok: true,
    actor: {
      id: fila.id,
      rol: fila.rol,
      organizacionId: fila.organizacion_id,
      mfa: fila.mfa_activo === 1,
      suspendido: fila.suspendido === 1,
    },
  };
}

/* ---------- Limitación de tasa ---------- */

async function limitar(peticion, entorno, clave) {
  const ip = peticion.headers.get("CF-Connecting-IP") || "";
  const seudo = (await seudonimizarIp(ip, entorno.SAL_AUDITORIA)) || "anon";
  const ventana = Math.floor(Date.now() / 60000);
  const id = `${seudo}:${clave}:${ventana}`;
  const maximo = LIMITES[clave] ?? LIMITES.defecto;

  const fin = new Date((ventana + 1) * 60000).toISOString();
  await entorno.DB.prepare(
    `INSERT INTO limites (clave, conteo, ventana_fin) VALUES (?, 1, ?)
       ON CONFLICT(clave) DO UPDATE SET conteo = conteo + 1`
  ).bind(id, fin).run();

  const fila = await entorno.DB.prepare(`SELECT conteo FROM limites WHERE clave = ?`).bind(id).first();
  return { ok: (fila?.conteo ?? 0) <= maximo };
}

/* ---------- Auditoría encadenada ---------- */

async function auditar(entorno, peticion, evento) {
  const ultimo = await entorno.DB.prepare(`SELECT hash FROM auditoria ORDER BY id DESC LIMIT 1`).first();
  const ip = peticion.headers.get("CF-Connecting-IP");
  const registro = await crearEvento({
    ...evento,
    ipSeudonima: await seudonimizarIp(ip, entorno.SAL_AUDITORIA),
    hashAnterior: ultimo?.hash || null,
  });

  await entorno.DB.prepare(
    `INSERT INTO auditoria (accion, actor_id, actor_rol, organizacion_id, recurso, recurso_id,
       antes_json, despues_json, motivo, ip_seudonima, ts, hash_anterior, hash)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    registro.accion, registro.actorId, registro.actorRol, registro.organizacionId,
    registro.recurso, registro.recursoId,
    registro.antes ? canonico(registro.antes) : null,
    registro.despues ? canonico(registro.despues) : null,
    registro.motivo, registro.ipSeudonima, registro.ts, registro.hashAnterior, registro.hash
  ).run();

  return registro;
}

/* ---------- Acceso a datos ---------- */

async function organizacion(entorno, id) {
  if (!id) return null;
  const f = await entorno.DB.prepare(`SELECT * FROM organizaciones WHERE id = ?`).bind(id).first();
  if (!f) return null;
  return {
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    nit: f.nit,
    ciudadId: f.ciudad_id,
    direccion: f.direccion,
    correoContacto: f.correo_contacto,
    telefonoContacto: f.telefono_contacto,
    responsableNombre: f.responsable_nombre,
    capacidadKgMes: f.capacidad_kg_mes,
    tieneCadenaFrio: f.tiene_cadena_frio === 1,
    tieneTransporte: f.tiene_transporte === 1,
    estadoVerificacion: f.estado_verificacion,
    chequeo: JSON.parse(f.chequeo_json || "{}"),
    suspendida: f.suspendida === 1,
    motivoEstado: f.motivo_estado,
    verificadaPorId: f.verificada_por_id,
    verificadaEn: f.verificada_en,
    creadaEn: f.creada_en,
    actualizadaEn: f.actualizada_en,
  };
}

async function donacion(entorno, id) {
  const f = await entorno.DB.prepare(`SELECT * FROM donaciones WHERE id = ?`).bind(id).first();
  return f ? filaADonacion(f) : null;
}

function filaADonacion(f) {
  return {
    id: f.id,
    estado: f.estado,
    organizacionId: f.organizacion_id,
    creadaPorId: f.creada_por_id,
    titulo: f.titulo,
    descripcion: f.descripcion,
    categoria: f.categoria,
    cantidad: f.cantidad,
    unidad: f.unidad,
    conservacion: f.conservacion,
    temperaturaC: f.temperatura_c,
    estadoEmpaque: f.estado_empaque,
    fechaVencimiento: f.fecha_vencimiento,
    preparadoEn: f.preparado_en,
    lote: f.lote,
    registroSanitario: f.registro_sanitario,
    responsableTecnico: f.responsable_tecnico,
    alergenos: JSON.parse(f.alergenos_json || "[]"),
    sinAlergenosDeclarados: f.sin_alergenos_declarados === 1,
    alertaSanitaria: f.alerta_sanitaria === 1,
    declaracionAptitud: f.declaracion_aptitud === 1,
    retiroDesde: f.retiro_desde,
    retiroHasta: f.retiro_hasta,
    requiereTransporteReceptor: f.requiere_transporte_receptor === 1,
    ciudadId: f.ciudad_id,
    zona: f.zona,
    latAprox: f.lat_aprox,
    lonAprox: f.lon_aprox,
    precisionKm: f.precision_km,
    celda: f.celda,
    direccionExacta: f.direccion_exacta,
    indicacionesRetiro: f.indicaciones_retiro,
    contactoNombre: f.contacto_nombre,
    contactoTelefono: f.contacto_telefono,
    fotos: JSON.parse(f.fotos_json || "[]"),
    reservadaPorId: f.reservada_por_id,
    reservadaEn: f.reservada_en,
    codigoEntrega: f.codigo_entrega,
    entregadaEn: f.entregada_en,
    evidenciaEntrega: f.evidencia_entrega_json ? JSON.parse(f.evidencia_entrega_json) : null,
    recibidaEn: f.recibida_en,
    acta: f.acta_json ? JSON.parse(f.acta_json) : null,
    cerradaEn: f.cerrada_en,
    finalizadaEn: f.finalizada_en,
    motivoFinal: f.motivo_final,
    publicadaEn: f.publicada_en,
    creadaEn: f.creada_en,
    actualizadaEn: f.actualizada_en,
  };
}

async function guardarDonacion(entorno, d) {
  await entorno.DB.prepare(
    `INSERT INTO donaciones (
       id, estado, organizacion_id, creada_por_id, titulo, descripcion, categoria, cantidad, unidad,
       conservacion, temperatura_c, estado_empaque, fecha_vencimiento, preparado_en, lote,
       registro_sanitario, responsable_tecnico, alergenos_json, sin_alergenos_declarados,
       alerta_sanitaria, declaracion_aptitud, retiro_desde, retiro_hasta, requiere_transporte_receptor,
       ciudad_id, zona, lat_aprox, lon_aprox, precision_km, celda, direccion_exacta, indicaciones_retiro,
       contacto_nombre, contacto_telefono, fotos_json, reservada_por_id, reservada_en, codigo_entrega,
       entregada_en, evidencia_entrega_json, recibida_en, acta_json, cerrada_en, finalizada_en,
       motivo_final, publicada_en, creada_en, actualizada_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       estado=excluded.estado, reservada_por_id=excluded.reservada_por_id,
       reservada_en=excluded.reservada_en, codigo_entrega=excluded.codigo_entrega,
       entregada_en=excluded.entregada_en, evidencia_entrega_json=excluded.evidencia_entrega_json,
       recibida_en=excluded.recibida_en, acta_json=excluded.acta_json,
       cerrada_en=excluded.cerrada_en, finalizada_en=excluded.finalizada_en,
       motivo_final=excluded.motivo_final, publicada_en=excluded.publicada_en,
       actualizada_en=excluded.actualizada_en`
  ).bind(
    d.id, d.estado, d.organizacionId, d.creadaPorId, d.titulo, d.descripcion || null, d.categoria,
    d.cantidad, d.unidad, d.conservacion, d.temperaturaC ?? null, d.estadoEmpaque,
    d.fechaVencimiento || null, d.preparadoEn || null, d.lote || null, d.registroSanitario || null,
    d.responsableTecnico || null, JSON.stringify(d.alergenos || []), d.sinAlergenosDeclarados ? 1 : 0,
    d.alertaSanitaria ? 1 : 0, d.declaracionAptitud ? 1 : 0, d.retiroDesde, d.retiroHasta,
    d.requiereTransporteReceptor === false ? 0 : 1, d.ciudadId, d.zona || null,
    d.latAprox ?? null, d.lonAprox ?? null, d.precisionKm ?? 1, d.celda || null,
    d.direccionExacta, d.indicacionesRetiro || null, d.contactoNombre, d.contactoTelefono,
    JSON.stringify(d.fotos || []), d.reservadaPorId || null, d.reservadaEn || null,
    d.codigoEntrega || null, d.entregadaEn || null,
    d.evidenciaEntrega ? JSON.stringify(d.evidenciaEntrega) : null, d.recibidaEn || null,
    d.acta ? JSON.stringify(d.acta) : null, d.cerradaEn || null, d.finalizadaEn || null,
    d.motivoFinal || null, d.publicadaEn || null, d.creadaEn, d.actualizadaEn
  ).run();
}

async function tieneConsentimiento(entorno, usuarioId) {
  const f = await entorno.DB.prepare(
    `SELECT * FROM consentimientos WHERE usuario_id = ? ORDER BY otorgado_en DESC LIMIT 1`
  ).bind(usuarioId).first();
  if (!f) return false;
  return consentimientoVigente({
    usuarioId: f.usuario_id,
    finalidades: JSON.parse(f.finalidades_json || "[]"),
    versionTerminos: f.version_terminos,
    versionPrivacidad: f.version_privacidad,
    revocadoEn: f.revocado_en,
  });
}

/* ---------- Utilidades HTTP ---------- */

function json(cuerpo, estado = 200, extra = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CABECERAS_BASE, ...extra },
  });
}

async function leerJson(peticion) {
  try {
    const texto = await peticion.text();
    if (texto.length > 100_000) return {};
    return JSON.parse(texto || "{}");
  } catch {
    return {};
  }
}

/* Lista blanca estricta: el origen se compara, nunca se refleja sin validar. */
function cors(origen, entorno) {
  const permitidos = String(entorno.ORIGENES_PERMITIDOS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const cabeceras = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
  };
  if (origen && permitidos.includes(origen)) {
    cabeceras["Access-Control-Allow-Origin"] = origen;
    cabeceras["Access-Control-Allow-Credentials"] = "true";
  }
  return cabeceras;
}
