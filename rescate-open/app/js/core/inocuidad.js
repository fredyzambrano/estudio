/* ============================================================
   RESCATE OPEN — Reglas de inocuidad (bloqueo duro)
   Traducen a producto el principio de la Ley 1990 de 2019: no se
   donan alimentos vencidos ni en condiciones que comprometan la
   salud. Si una regla dispara BLOQUEO, la donación no se publica
   ni se entrega — no hay "publicar de todas formas".
   La plataforma no certifica aptitud: la declara el donante.
   ============================================================ */

import { CATEGORIAS, CONSERVACION, ESTADO_EMPAQUE } from "../datos/catalogos.js";

const HORA = 3600 * 1000;

const bloqueo = (codigo, mensaje, norma = null) => ({ nivel: "BLOQUEO", codigo, mensaje, norma });
const alerta = (codigo, mensaje) => ({ nivel: "ADVERTENCIA", codigo, mensaje });

/**
 * Evalúa una donación contra las reglas sanitarias.
 * Pura: no lee reloj global ni almacenamiento. `ahora` siempre entra por parámetro
 * para que las pruebas puedan viajar en el tiempo.
 *
 * @returns {{apta:boolean, bloqueos:Array, advertencias:Array, evaluadaEn:string}}
 */
export function evaluar(donacion, ahora = new Date()) {
  const t = ahora instanceof Date ? ahora.getTime() : new Date(ahora).getTime();
  const hallazgos = [];
  const d = donacion || {};
  const cat = CATEGORIAS[d.categoria];

  if (!cat) {
    hallazgos.push(bloqueo("CATEGORIA_INVALIDA", "La categoría de alimento no está permitida en el piloto."));
    return resumen(hallazgos, t);
  }

  /* 1. Declaración de aptitud del donante — responsabilidad explícita. */
  if (d.declaracionAptitud !== true) {
    hallazgos.push(
      bloqueo(
        "SIN_DECLARACION",
        "Falta la declaración de aptitud y titularidad firmada por el donante."
      )
    );
  }

  /* 2. Vencimiento. Regla central: nunca se publica ni entrega vencido. */
  const venceEn = d.fechaVencimiento ? new Date(d.fechaVencimiento).getTime() : null;
  if (cat.requiereFecha && !venceEn) {
    hallazgos.push(
      bloqueo("SIN_FECHA", `“${cat.etiqueta}” exige fecha de vencimiento o consumo preferente.`)
    );
  }
  if (venceEn && venceEn <= t) {
    hallazgos.push(
      bloqueo(
        "VENCIDO",
        "El alimento está vencido. No es donable.",
        "Ley 1990 de 2019"
      )
    );
  }
  if (venceEn && venceEn > t && venceEn - t <= 24 * HORA) {
    hallazgos.push(alerta("VENCE_PRONTO", "Vence en menos de 24 horas: priorizar retiro inmediato."));
  }

  /* 3. Integridad del empaque. */
  const empaque = ESTADO_EMPAQUE[d.estadoEmpaque];
  if (!empaque) {
    hallazgos.push(bloqueo("EMPAQUE_NO_DECLARADO", "Debe declarar el estado del empaque."));
  } else if (!empaque.aceptado) {
    hallazgos.push(
      bloqueo("EMPAQUE_COMPROMETIDO", `Empaque no admitido: ${empaque.etiqueta.toLowerCase()}.`)
    );
  }

  /* 4. Trazabilidad: lote y responsable donde la categoría lo exige. */
  if (cat.requiereLote && !limpio(d.lote)) {
    hallazgos.push(bloqueo("SIN_LOTE", `“${cat.etiqueta}” exige número de lote o identificación equivalente.`));
  }
  if (cat.requiereTrazabilidad) {
    if (!limpio(d.responsableTecnico)) {
      hallazgos.push(
        bloqueo("SIN_RESPONSABLE", "Debe registrar el responsable técnico o de manipulación en origen.")
      );
    }
    if (!limpio(d.registroSanitario) && d.categoria !== "PREPARADO") {
      hallazgos.push(
        alerta("SIN_REGISTRO_SANITARIO", "No se registró el número de registro o permiso sanitario del producto.")
      );
    }
  }

  /* 5. Cadena de frío / mantenimiento en caliente. */
  const cons = CONSERVACION[d.conservacion];
  if (!cons) {
    hallazgos.push(bloqueo("CONSERVACION_NO_DECLARADA", "Debe declarar la condición de conservación."));
  } else {
    if (!cat.conservaciones.includes(d.conservacion)) {
      hallazgos.push(
        bloqueo(
          "CONSERVACION_INCOMPATIBLE",
          `“${cat.etiqueta}” no admite conservación “${cons.etiqueta}”.`
        )
      );
    }
    const exigeTemp = cons.min !== null || cons.max !== null;
    if (exigeTemp) {
      const temp = d.temperaturaC;
      if (temp === null || temp === undefined || Number.isNaN(Number(temp))) {
        hallazgos.push(
          bloqueo("SIN_TEMPERATURA", `“${cons.etiqueta}” exige registrar la temperatura medida.`)
        );
      } else {
        const n = Number(temp);
        const bajo = cons.min !== null && n < cons.min;
        const alto = cons.max !== null && n > cons.max;
        if (bajo || alto) {
          hallazgos.push(
            bloqueo(
              "CADENA_FRIO",
              `Temperatura ${n} °C fuera del criterio para “${cons.etiqueta}”.`
            )
          );
        }
      }
    }
  }

  /* 6. Preparados: ventana de vida útil desde la preparación. */
  if (d.categoria === "PREPARADO") {
    const prep = d.preparadoEn ? new Date(d.preparadoEn).getTime() : null;
    if (!prep) {
      hallazgos.push(
        bloqueo("PREPARADO_SIN_HORA", "El alimento preparado exige fecha y hora de preparación.")
      );
    } else {
      const horas = (t - prep) / HORA;
      if (horas < 0) {
        hallazgos.push(bloqueo("PREPARADO_FUTURO", "La hora de preparación está en el futuro."));
      } else if (horas > cat.ventanaMaxHoras) {
        hallazgos.push(
          bloqueo(
            "PREPARADO_FUERA_DE_VENTANA",
            `Han pasado ${horas.toFixed(1)} h desde la preparación (máximo ${cat.ventanaMaxHoras} h).`
          )
        );
      }
    }
  }

  /* 7. Alérgenos: se exige declaración explícita, incluso para declarar que no aplica. */
  const declaroAlergenos = Array.isArray(d.alergenos) && d.alergenos.length > 0;
  if (!declaroAlergenos && d.sinAlergenosDeclarados !== true) {
    hallazgos.push(
      bloqueo("ALERGENOS_NO_DECLARADOS", "Declare los alérgenos presentes o marque que no aplican.")
    );
  }

  /* 8. Alerta sanitaria o retiro de producto en curso. */
  if (d.alertaSanitaria === true) {
    hallazgos.push(
      bloqueo("ALERTA_SANITARIA", "El producto tiene alerta sanitaria o retiro en curso.")
    );
  }

  /* 9. Ventana de retiro vigente. */
  const retiroHasta = d.retiroHasta ? new Date(d.retiroHasta).getTime() : null;
  if (!retiroHasta) {
    hallazgos.push(bloqueo("SIN_VENTANA_RETIRO", "Defina hasta cuándo se puede retirar la donación."));
  } else if (retiroHasta <= t) {
    hallazgos.push(bloqueo("VENTANA_VENCIDA", "La ventana de retiro ya se cerró."));
  } else if (venceEn && retiroHasta > venceEn) {
    hallazgos.push(
      bloqueo("RETIRO_DESPUES_DE_VENCER", "La ventana de retiro termina después de la fecha de vencimiento.")
    );
  }

  /* 10. Evidencia fotográfica mínima. */
  const fotos = Array.isArray(d.fotos) ? d.fotos.length : 0;
  if (fotos < 1) {
    hallazgos.push(bloqueo("SIN_EVIDENCIA", "Adjunte al menos una foto del lote y su rotulado."));
  } else if (fotos < 2 && cat.riesgo !== "bajo") {
    hallazgos.push(alerta("EVIDENCIA_MINIMA", "Recomendado: foto del producto y foto del rotulado/fecha."));
  }

  return resumen(hallazgos, t);
}

function resumen(hallazgos, t) {
  const bloqueos = hallazgos.filter((h) => h.nivel === "BLOQUEO");
  return {
    apta: bloqueos.length === 0,
    bloqueos,
    advertencias: hallazgos.filter((h) => h.nivel === "ADVERTENCIA"),
    evaluadaEn: new Date(t).toISOString(),
  };
}

function limpio(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Revalidación en el momento de la entrega física: el tiempo pasa y una
 * donación apta al publicar puede dejar de serlo. Se llama otra vez, sin excusas.
 */
export function evaluarParaEntrega(donacion, ahora = new Date()) {
  const base = evaluar(donacion, ahora);
  if (!base.apta) return base;
  const t = ahora instanceof Date ? ahora.getTime() : new Date(ahora).getTime();
  const venceEn = donacion.fechaVencimiento ? new Date(donacion.fechaVencimiento).getTime() : null;
  if (venceEn && venceEn - t < 2 * HORA) {
    base.advertencias.push(
      alerta("MARGEN_CRITICO", "Quedan menos de 2 horas de vida útil: confirmar consumo inmediato.")
    );
  }
  return base;
}

export const CODIGOS_BLOQUEO = [
  "CATEGORIA_INVALIDA", "SIN_DECLARACION", "SIN_FECHA", "VENCIDO", "EMPAQUE_NO_DECLARADO",
  "EMPAQUE_COMPROMETIDO", "SIN_LOTE", "SIN_RESPONSABLE", "CONSERVACION_NO_DECLARADA",
  "CONSERVACION_INCOMPATIBLE", "SIN_TEMPERATURA", "CADENA_FRIO", "PREPARADO_SIN_HORA",
  "PREPARADO_FUTURO", "PREPARADO_FUERA_DE_VENTANA", "ALERGENOS_NO_DECLARADOS",
  "ALERTA_SANITARIA", "SIN_VENTANA_RETIRO", "VENTANA_VENCIDA", "RETIRO_DESPUES_DE_VENCER",
  "SIN_EVIDENCIA",
];
