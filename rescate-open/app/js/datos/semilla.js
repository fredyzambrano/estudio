/* ============================================================
   RESCATE OPEN — Datos de demostración
   TODO ES FICTICIO. Ninguna organización, dirección, teléfono o
   persona de este archivo existe. Nunca reemplaces esto con datos
   reales: el repositorio es público bajo AGPL.

   La semilla NO escribe estados a mano: construye las donaciones y
   las mueve con la misma máquina de estados que usa la aplicación,
   de modo que la auditoría del piloto sea coherente desde el inicio.
   ============================================================ */

import { nuevaDonacion } from "../core/donacion.js";
import { ESTADOS, aplicarTransicion } from "../core/estados.js";
import { ROLES } from "../core/rbac.js";
import { VERIFICACION, TIPOS } from "../core/organizacion.js";
import { otorgar, FINALIDADES_OBLIGATORIAS } from "../core/consentimiento.js";
import { codigoEntrega } from "../core/ids.js";

const h = (horas, base = Date.now()) => new Date(base + horas * 3600000);

const ORGANIZACIONES = [
  {
    id: "org_andina",
    nombre: "Distribuidora Andina (ficticia)",
    tipo: TIPOS.DONANTE,
    nit: "900.111.222-3",
    ciudadId: "BOG",
    direccion: "Centro de acopio ficticio 45",
    correoContacto: "operaciones@ejemplo.test",
    telefonoContacto: "573001110000",
    responsableNombre: "Jefatura de operaciones",
    tieneCadenaFrio: true,
    tieneTransporte: true,
    estadoVerificacion: VERIFICACION.VERIFICADA,
    suspendida: false,
    descripcion: "Distribuidora mayorista de frutas y abarrotes con excedentes por calibre y rotación.",
  },
  {
    id: "org_trigal",
    nombre: "Panadería El Trigal (ficticia)",
    tipo: TIPOS.DONANTE,
    nit: "901.333.444-5",
    ciudadId: "BOG",
    direccion: "Planta de producción ficticia 8",
    correoContacto: "calidad@ejemplo.test",
    telefonoContacto: "573002220000",
    responsableNombre: "Coordinación de calidad",
    tieneCadenaFrio: false,
    tieneTransporte: false,
    estadoVerificacion: VERIFICACION.VERIFICADA,
    suspendida: false,
    descripcion: "Producción diaria de panadería; excedente de horneo de la tarde.",
  },
  {
    id: "org_mesa",
    nombre: "Fundación Mesa Común (ficticia)",
    tipo: TIPOS.RECEPTORA,
    nit: "830.555.666-7",
    ciudadId: "BOG",
    direccion: "Sede operativa ficticia 12",
    correoContacto: "coordinacion@ejemplo.test",
    telefonoContacto: "573003330000",
    responsableNombre: "Coordinación de alimentos",
    capacidadKgMes: 4000,
    tieneCadenaFrio: true,
    tieneTransporte: true,
    estadoVerificacion: VERIFICACION.VERIFICADA,
    suspendida: false,
    descripcion: "Opera 4 comedores y un banco de alimentos con cadena de frío propia.",
  },
  {
    id: "org_esperanza",
    nombre: "Comedor La Esperanza (ficticio)",
    tipo: TIPOS.RECEPTORA,
    nit: "901.777.888-9",
    ciudadId: "BOG",
    direccion: "Salón comunal ficticio 3",
    correoContacto: "comedor@ejemplo.test",
    telefonoContacto: "573004440000",
    responsableNombre: "Junta de acción comunal",
    capacidadKgMes: 300,
    tieneCadenaFrio: false,
    tieneTransporte: false,
    estadoVerificacion: VERIFICACION.EN_REVISION,
    suspendida: false,
    descripcion: "Comedor barrial en proceso de verificación documental.",
  },
].map((o) => ({
  ...o,
  chequeo: o.estadoVerificacion === VERIFICACION.VERIFICADA ? { EXISTENCIA: true, REPRESENTANTE: true, RUT: true, DIRECCION: true, RESPONSABLE: true, CAPACIDAD: true, AUTORIZACION: true, DESTINO_GRATUITO: true } : {},
  motivoEstado: null,
  verificadaPorId: o.estadoVerificacion === VERIFICACION.VERIFICADA ? "usr_verificador" : null,
  verificadaEn: o.estadoVerificacion === VERIFICACION.VERIFICADA ? h(-720).toISOString() : null,
  creadaEn: h(-1000).toISOString(),
  actualizadaEn: h(-720).toISOString(),
}));

const USUARIOS = [
  { id: "usr_andina", nombre: "Camilo · Operaciones", rol: ROLES.DONOR, organizacionId: "org_andina", mfa: false },
  { id: "usr_trigal", nombre: "Marcela · Calidad", rol: ROLES.DONOR, organizacionId: "org_trigal", mfa: false },
  { id: "usr_mesa", nombre: "Yuli · Coordinación", rol: ROLES.RECEIVER, organizacionId: "org_mesa", mfa: false },
  { id: "usr_esperanza", nombre: "Don Jairo · Comedor", rol: ROLES.RECEIVER, organizacionId: "org_esperanza", mfa: false },
  { id: "usr_verificador", nombre: "Verificación documental", rol: ROLES.VERIFIER, organizacionId: null, mfa: true },
  { id: "usr_soporte", nombre: "Mesa de soporte", rol: ROLES.SUPPORT, organizacionId: null, mfa: true },
  { id: "usr_admin", nombre: "Administración", rol: ROLES.ADMIN, organizacionId: null, mfa: true },
];

const CONTACTO = {
  direccionExacta: "Muelle de cargue ficticio, portería 2",
  indicacionesRetiro: "Presentarse en portería con documento y placa del vehículo.",
  contactoNombre: "Coordinación de bodega",
  contactoTelefono: "573001110000",
};

function plantillas() {
  return [
    {
      objetivo: ESTADOS.PUBLISHED,
      orgId: "org_andina",
      usuarioId: "usr_andina",
      datos: {
        titulo: "Banano y plátano fuera de calibre comercial",
        descripcion: "Fruta apta, descartada por tamaño. Requiere retiro con canastillas propias.",
        categoria: "FRUTA_VERDURA",
        cantidad: 85, unidad: "KG",
        conservacion: "AMBIENTE",
        estadoEmpaque: "GRANEL_CONTROLADO",
        fechaVencimiento: h(60).toISOString(),
        sinAlergenosDeclarados: true,
        declaracionAptitud: true,
        retiroDesde: h(-2).toISOString(),
        retiroHasta: h(28).toISOString(),
        ciudadId: "BOG", zona: "Corabastos",
        lat: 4.6035, lon: -74.1637,
        fotos: ["demo:fruta-1", "demo:fruta-2"],
        ...CONTACTO,
      },
    },
    {
      objetivo: ESTADOS.PUBLISHED,
      orgId: "org_trigal",
      usuarioId: "usr_trigal",
      datos: {
        titulo: "Pan del día — horneo de la tarde",
        descripcion: "Pan blanco y integral empacado individualmente al cierre.",
        categoria: "PANADERIA",
        cantidad: 140, unidad: "UNIDAD",
        conservacion: "AMBIENTE",
        estadoEmpaque: "SELLADO_REEMPAQUE",
        fechaVencimiento: h(20).toISOString(),
        alergenos: ["GLUTEN", "HUEVO", "LECHE"],
        declaracionAptitud: true,
        retiroDesde: h(-1).toISOString(),
        retiroHasta: h(6).toISOString(),
        ciudadId: "BOG", zona: "Kennedy",
        lat: 4.6289, lon: -74.1465,
        fotos: ["demo:pan-1", "demo:pan-2"],
        ...CONTACTO,
        contactoNombre: "Marcela · Calidad",
        contactoTelefono: "573002220000",
      },
    },
    {
      objetivo: ESTADOS.RESERVED,
      orgId: "org_andina",
      usuarioId: "usr_andina",
      receptoraId: "org_mesa",
      usuarioReceptorId: "usr_mesa",
      datos: {
        titulo: "Yogur bebible — cambio de empaque",
        descripcion: "Referencia descontinuada por rediseño de etiqueta. Cadena de frío completa.",
        categoria: "LACTEOS",
        cantidad: 220, unidad: "UNIDAD",
        conservacion: "REFRIGERADO",
        temperaturaC: 3,
        estadoEmpaque: "SELLADO_ORIGINAL",
        fechaVencimiento: h(200).toISOString(),
        lote: "YB-2026-118",
        registroSanitario: "RSA-FICTICIO-001",
        responsableTecnico: "Dirección técnica de calidad",
        alergenos: ["LECHE"],
        declaracionAptitud: true,
        retiroDesde: h(-6).toISOString(),
        retiroHasta: h(18).toISOString(),
        ciudadId: "BOG", zona: "Fontibón",
        lat: 4.6786, lon: -74.1461,
        fotos: ["demo:yogur-1", "demo:yogur-2"],
        ...CONTACTO,
      },
    },
    {
      objetivo: ESTADOS.HANDED_OVER,
      orgId: "org_trigal",
      usuarioId: "usr_trigal",
      receptoraId: "org_mesa",
      usuarioReceptorId: "usr_mesa",
      /* La ruta completa toma ~2 h simuladas: la preparación debe ser
         anterior al inicio para no violar la ventana de 4 h. */
      desfaseHoras: -3,
      datos: {
        titulo: "Almuerzos preparados no servidos — evento cancelado",
        descripcion: "Producción de la mañana, mantenida en caliente y con registro de temperatura.",
        categoria: "PREPARADO",
        cantidad: 90, unidad: "PORCION",
        conservacion: "CALIENTE",
        temperaturaC: 64,
        estadoEmpaque: "SELLADO_REEMPAQUE",
        fechaVencimiento: h(4).toISOString(),
        preparadoEn: h(-4.5).toISOString(),
        lote: "PREP-2026-07-28-A",
        responsableTecnico: "Chef de producción",
        alergenos: ["GLUTEN", "LECHE"],
        declaracionAptitud: true,
        retiroDesde: h(-2).toISOString(),
        retiroHasta: h(3).toISOString(),
        ciudadId: "BOG", zona: "Teusaquillo",
        lat: 4.6339, lon: -74.0836,
        fotos: ["demo:prep-1", "demo:prep-2"],
        ...CONTACTO,
      },
    },
    {
      objetivo: ESTADOS.CLOSED,
      orgId: "org_andina",
      usuarioId: "usr_andina",
      receptoraId: "org_mesa",
      usuarioReceptorId: "usr_mesa",
      desfaseHoras: -30,
      datos: {
        titulo: "Arroz y lenteja — cambio de presentación",
        categoria: "ABARROTES",
        cantidad: 300, unidad: "KG",
        conservacion: "AMBIENTE",
        estadoEmpaque: "SELLADO_ORIGINAL",
        fechaVencimiento: h(8000).toISOString(),
        lote: "AB-4471",
        sinAlergenosDeclarados: true,
        declaracionAptitud: true,
        retiroDesde: h(-40).toISOString(),
        retiroHasta: h(-8).toISOString(),
        ciudadId: "BOG", zona: "Puente Aranda",
        lat: 4.6297, lon: -74.1122,
        fotos: ["demo:abarrotes-1", "demo:abarrotes-2"],
        ...CONTACTO,
      },
    },
    {
      objetivo: ESTADOS.DRAFT, // borrador con bloqueos: sirve para mostrar el muro sanitario
      orgId: "org_trigal",
      usuarioId: "usr_trigal",
      datos: {
        titulo: "Ponqués del mostrador — revisar antes de publicar",
        categoria: "PANADERIA",
        cantidad: 30, unidad: "UNIDAD",
        conservacion: "AMBIENTE",
        estadoEmpaque: "ABIERTO",
        fechaVencimiento: h(-12).toISOString(),
        declaracionAptitud: false,
        retiroDesde: h(-1).toISOString(),
        retiroHasta: h(10).toISOString(),
        ciudadId: "BOG", zona: "Kennedy",
        lat: 4.6289, lon: -74.1465,
        fotos: ["demo:ponque-1"],
        ...CONTACTO,
      },
    },
  ];
}

/**
 * Construye el estado inicial completo, incluida la cadena de auditoría.
 * @param {(evento:object)=>Promise<object>} registrar  callback que encadena y guarda el evento
 */
export async function construirSemilla(registrar) {
  const organizaciones = ORGANIZACIONES;
  const usuarios = USUARIOS;
  const donaciones = [];
  const consentimientos = [];

  for (const u of usuarios) {
    const r = await otorgar({
      usuarioId: u.id,
      finalidades: [...FINALIDADES_OBLIGATORIAS, "ESTADISTICA"],
      textoMostrado: "Texto de demostración del aviso de privacidad.",
      canal: "semilla-demo",
    });
    if (r.ok) consentimientos.push(r.registro);
  }

  for (const p of plantillas()) {
    const actorDonante = usuarios.find((u) => u.id === p.usuarioId);
    const base = new Date(Date.now() + (p.desfaseHoras || -3) * 3600000);

    const creada = nuevaDonacion(p.datos, actorDonante, base);
    if (!creada.ok) {
      console.warn("Semilla inválida:", p.datos.titulo, creada.errores);
      continue;
    }
    let donacion = creada.donacion;
    await registrar({
      accion: "DONACION_CREADA",
      actor: actorDonante,
      recurso: "donacion",
      recursoId: donacion.id,
      despues: { estado: donacion.estado },
      ahora: base,
    });

    const ctx = (extra = {}, minutos = 0) => ({
      ahora: new Date(base.getTime() + minutos * 60000),
      consentimientoVigente: true,
      organizacionDonante: organizaciones.find((o) => o.id === p.orgId),
      organizacionReceptora: organizaciones.find((o) => o.id === p.receptoraId),
      ...extra,
    });

    const ruta = {
      [ESTADOS.DRAFT]: [],
      [ESTADOS.PUBLISHED]: [ESTADOS.PUBLISHED],
      [ESTADOS.RESERVED]: [ESTADOS.PUBLISHED, ESTADOS.RESERVED],
      [ESTADOS.HANDED_OVER]: [ESTADOS.PUBLISHED, ESTADOS.RESERVED, ESTADOS.HANDED_OVER],
      [ESTADOS.CLOSED]: [ESTADOS.PUBLISHED, ESTADOS.RESERVED, ESTADOS.HANDED_OVER, ESTADOS.RECEIVED, ESTADOS.CLOSED],
    }[p.objetivo] || [];

    let minutos = 5;
    let codigo = null;
    for (const destino of ruta) {
      const actorReceptor = usuarios.find((u) => u.id === p.usuarioReceptorId);
      let actor = actorDonante;
      let extra = {};

      if (destino === ESTADOS.RESERVED) {
        actor = actorReceptor;
        codigo = codigoEntrega();
        extra = { codigoEntregaGenerado: codigo };
      }
      if (destino === ESTADOS.HANDED_OVER) {
        extra = {
          codigoEntrega: codigo,
          evidencia: { fotos: ["demo:entrega"], recibeNombre: "Auxiliar de logística" },
        };
      }
      if (destino === ESTADOS.RECEIVED) {
        actor = actorReceptor;
        extra = {
          acta: {
            cantidadRecibida: p.datos.cantidad,
            unidad: p.datos.unidad,
            conformidad: true,
            observaciones: "Recepción conforme.",
          },
        };
      }
      if (destino === ESTADOS.CLOSED) actor = actorReceptor;

      const r = aplicarTransicion({ donacion, a: destino, actor, contexto: ctx(extra, minutos) });
      if (!r.ok) {
        console.warn(`Semilla: ${donacion.titulo} no pudo pasar a ${destino}:`, r.codigo, r.mensaje);
        break;
      }
      donacion = r.donacion;
      await registrar({ ...r.evento, actor, ahora: new Date(base.getTime() + minutos * 60000) });
      minutos += 45;
    }

    donaciones.push(donacion);
  }

  return { organizaciones, usuarios, donaciones, consentimientos, incidentes: [] };
}
