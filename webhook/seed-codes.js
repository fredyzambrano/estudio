#!/usr/bin/env node
/* ============================================================
   Carga los códigos de activación en Cloudflare KV
   Corre UNA SOLA VEZ antes de lanzar (o cuando agregues más).

   Uso:
     CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx KV_ID=xxx node seed-codes.js

   Variables:
     CF_ACCOUNT_ID  → tu Account ID en Cloudflare (dashboard → barra lateral)
     CF_API_TOKEN   → token con permisos "Workers KV Storage: Edit"
     KV_ID          → el ID del namespace CODES_KV de wrangler.toml
   ============================================================ */

// ─── PEGA AQUÍ TUS CÓDIGOS (de CODES.md) ──────────────────────

const PRO_CODES = [
  "DSPG-PRO-31TL-WNW8",
  "DSPG-PRO-AW8S-LHSH",
  "DSPG-PRO-BHIG-33ZO",
  "DSPG-PRO-E6GG-KTZ8",
  "DSPG-PRO-6LJN-0DZG",
  "DSPG-PRO-JTF3-2A56",
  "DSPG-PRO-399Q-XWR8",
  "DSPG-PRO-WNZX-XHQX",
  "DSPG-PRO-ALT8-ZWQ7",
  "DSPG-PRO-3IY5-H6A3",
];

const ELITE_CODES = [
  "DSPG-ELITE-LGB7-HT0Z",
  "DSPG-ELITE-O1E9-B3QL",
  "DSPG-ELITE-TEVU-BLS4",
  "DSPG-ELITE-7S5O-HZYY",
  "DSPG-ELITE-U1R5-LDV8",
];

// ──────────────────────────────────────────────────────────────

const { CF_ACCOUNT_ID, CF_API_TOKEN, KV_ID } = process.env;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !KV_ID) {
  console.error("Faltan variables de entorno: CF_ACCOUNT_ID, CF_API_TOKEN, KV_ID");
  process.exit(1);
}

const BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}`;
const HEADERS = { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" };

async function putKey(key, value) {
  const res = await fetch(`${BASE}/values/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al subir "${key}": ${res.status} ${err}`);
  }
  console.log(`✅ ${key} → ${Array.isArray(value) ? value.length + " códigos" : value}`);
}

async function checkRemaining() {
  const res = await fetch(`${BASE}/values/${encodeURIComponent("pool:pro")}`, { headers: HEADERS });
  if (!res.ok) return;
  const pool = await res.json();
  if (pool.length < PRO_CODES.length) {
    const used = PRO_CODES.length - pool.length;
    console.log(`\nℹ️  Ya hay ${used} código(s) PRO entregados — solo se van a cargar los nuevos.`);
    // No sobreescribas si ya hay un pool activo — el pool actual tiene los NO entregados
    console.log("   Para recargar el pool completo agrega el flag --reset");
    const reset = process.argv.includes("--reset");
    if (!reset) {
      console.log("   Cancelando (usa --reset para forzar recarga completa).");
      return false;
    }
  }
  return true;
}

(async () => {
  console.log("Cargando códigos en Cloudflare KV...\n");
  await putKey("pool:pro",   PRO_CODES);
  await putKey("pool:elite", ELITE_CODES);
  console.log("\n🎉 Listo. El worker ya puede entregar códigos automáticamente.");
})().catch((err) => { console.error(err.message); process.exit(1); });
