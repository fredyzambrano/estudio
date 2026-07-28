/* ============================================================
   RESCATE OPEN — Validador de esquemas (0 dependencias)
   Sustituto mínimo de Zod con el MISMO contrato en navegador,
   Worker y pruebas de Node. La validación de servidor manda:
   el navegador valida para dar buena UX, nunca para autorizar.
   ============================================================ */

const ok = (value) => ({ ok: true, value, errores: [] });
const err = (campo, mensaje) => ({ ok: false, value: undefined, errores: [{ campo, mensaje }] });

function conCampo(resultado, campo) {
  if (resultado.ok) return resultado;
  return {
    ok: false,
    value: undefined,
    errores: resultado.errores.map((e) => ({
      campo: e.campo ? `${campo}.${e.campo}` : campo,
      mensaje: e.mensaje,
    })),
  };
}

/* Un validador es (valor) => {ok, value, errores}. Los combinadores
   devuelven validadores decorados con .opcional() y .conDefecto(). */
function crear(fn) {
  const v = (valor) => fn(valor);
  v.opcional = () => crear((x) => (x === undefined || x === null || x === "" ? ok(undefined) : fn(x)));
  v.conDefecto = (d) => crear((x) => (x === undefined || x === null || x === "" ? ok(typeof d === "function" ? d() : d) : fn(x)));
  v.refinar = (test, mensaje) =>
    crear((x) => {
      const r = fn(x);
      if (!r.ok) return r;
      return test(r.value) ? r : err("", mensaje);
    });
  return v;
}

export const s = {
  texto({ min = 0, max = 5000, patron = null, recorta = true } = {}) {
    return crear((x) => {
      if (typeof x !== "string") return err("", "debe ser texto");
      const v = recorta ? x.trim() : x;
      if (v.length < min) return err("", `mínimo ${min} caracteres`);
      if (v.length > max) return err("", `máximo ${max} caracteres`);
      if (patron && !patron.test(v)) return err("", "formato inválido");
      return ok(v);
    });
  },

  numero({ min = -Infinity, max = Infinity, entero = false } = {}) {
    return crear((x) => {
      const n = typeof x === "string" ? Number(x.replace(",", ".")) : x;
      if (typeof n !== "number" || !Number.isFinite(n)) return err("", "debe ser un número");
      if (entero && !Number.isInteger(n)) return err("", "debe ser un número entero");
      if (n < min) return err("", `mínimo ${min}`);
      if (n > max) return err("", `máximo ${max}`);
      return ok(n);
    });
  },

  booleano() {
    return crear((x) => {
      if (typeof x === "boolean") return ok(x);
      if (x === "true" || x === "on" || x === "1") return ok(true);
      if (x === "false" || x === "0") return ok(false);
      return err("", "debe ser verdadero o falso");
    });
  },

  opcion(valores) {
    return crear((x) =>
      valores.includes(x) ? ok(x) : err("", `valor no permitido (use: ${valores.join(", ")})`)
    );
  },

  /* ISO 8601. Devuelve la cadena normalizada, no un Date, para que
     el mismo objeto viaje intacto a JSON, base de datos y auditoría. */
  fechaIso() {
    return crear((x) => {
      if (typeof x !== "string" || !x) return err("", "fecha requerida");
      const d = new Date(x.length === 10 ? `${x}T00:00:00.000Z` : x);
      if (Number.isNaN(d.getTime())) return err("", "fecha inválida");
      return ok(d.toISOString());
    });
  },

  correo() {
    return s.texto({ min: 5, max: 254, patron: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ });
  },

  /* Teléfono colombiano en formato E.164 sin '+' (57XXXXXXXXXX). */
  telefonoCo() {
    return crear((x) => {
      const limpio = String(x || "").replace(/[\s()+-]/g, "");
      if (!/^57\d{10}$/.test(limpio)) return err("", "use formato 57 + 10 dígitos");
      return ok(limpio);
    });
  },

  lista(interno, { min = 0, max = 200 } = {}) {
    return crear((x) => {
      if (!Array.isArray(x)) return err("", "debe ser una lista");
      if (x.length < min) return err("", `mínimo ${min} elemento(s)`);
      if (x.length > max) return err("", `máximo ${max} elementos`);
      const salida = [];
      const errores = [];
      x.forEach((item, i) => {
        const r = conCampo(interno(item), `[${i}]`);
        if (r.ok) salida.push(r.value);
        else errores.push(...r.errores);
      });
      return errores.length ? { ok: false, value: undefined, errores } : ok(salida);
    });
  },

  objeto(forma, { estricto = true } = {}) {
    return crear((x) => {
      if (!x || typeof x !== "object" || Array.isArray(x)) return err("", "debe ser un objeto");
      const salida = {};
      const errores = [];
      for (const [clave, validador] of Object.entries(forma)) {
        const r = conCampo(validador(x[clave]), clave);
        if (r.ok) {
          if (r.value !== undefined) salida[clave] = r.value;
        } else {
          errores.push(...r.errores);
        }
      }
      /* Modo estricto: campos desconocidos se descartan en silencio.
         Nunca se propagan al almacenamiento — evita inyectar columnas. */
      if (!estricto) {
        for (const [clave, valor] of Object.entries(x)) {
          if (!(clave in forma)) salida[clave] = valor;
        }
      }
      return errores.length ? { ok: false, value: undefined, errores } : ok(salida);
    });
  },
};

/* Azúcar para las capas de API/UI: lanza un objeto de error uniforme. */
export function validar(validador, datos) {
  const r = validador(datos);
  if (r.ok) return r.value;
  const e = new Error("Datos inválidos");
  e.codigo = "VALIDACION";
  e.errores = r.errores;
  throw e;
}

export function esValido(validador, datos) {
  return validador(datos).ok;
}
