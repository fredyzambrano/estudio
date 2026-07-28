/* ============================================================
   RESCATE OPEN — Identificadores y hashing isomórfico
   Funciona igual en navegador (WebCrypto) y en Node ≥ 20.
   ============================================================ */

const ALFABETO_HUMANO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin I, L, O, 0, 1

function aleatorios(n) {
  const buf = new Uint8Array(n);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

/** Id opaco con prefijo legible: don_8f3a…  org_2b91… */
export function nuevoId(prefijo) {
  const uuid = globalThis.crypto.randomUUID().replace(/-/g, "");
  return `${prefijo}_${uuid.slice(0, 20)}`;
}

/**
 * Código corto que el receptor dicta al donante en el momento de la entrega.
 * No es un secreto criptográfico: es una prueba de presencia física.
 */
export function codigoEntrega(longitud = 6) {
  const bytes = aleatorios(longitud);
  let out = "";
  for (const b of bytes) out += ALFABETO_HUMANO[b % ALFABETO_HUMANO.length];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

export async function sha256Hex(texto) {
  const datos = new TextEncoder().encode(String(texto));
  const buf = await globalThis.crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Comparación en tiempo constante para códigos y tokens.
 * Evita filtrar por timing cuál carácter falló.
 */
export function igualSeguro(a, b) {
  const x = String(a ?? "");
  const y = String(b ?? "");
  if (x.length !== y.length) return false;
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return dif === 0;
}
