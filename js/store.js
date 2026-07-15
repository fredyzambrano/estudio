/* ============================================================
   DESPEGA — Capa de estado
   Persistencia en localStorage con esquema versionado y
   respaldo export/import (los datos son del usuario, siempre).
   ============================================================ */

const Store = (() => {
  const LS_KEY = "despega_state_v1";
  const SCHEMA_VERSION = 1;

  const DEFAULTS = () => ({
    v: SCHEMA_VERSION,
    plan: "free",               // free | pro | elite
    activationCode: null,
    product: { name: "", desc: "", cat: "" },
    personas: [],               // {id, name, age, occupation, pains[], wants[], platforms[], content, notes}
    activePersonaId: null,
    warmup: {
      days: {},                 // 'YYYY-MM-DD' -> {scroll,like,comment,share,save,follow}
      customTerms: [],          // strings agregadas por el usuario
      jargon: [],               // {id, term, ctx, date}
    },
    scripts: [],                // {id, date, personaId, format, hook, overlay, beats[], reply}
    genLog: {},                 // 'YYYY-MM-DD' -> número de generaciones (límite free)
    posts: [],                  // {id, ts, platform, format, hook, views, likes, comments, asks, notes}
    ritual: {},                 // 'YYYY-MM-DD' -> {scroll,like,comment,saveshare}
    startedAt: null,            // ISO del primer post registrado
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return DEFAULTS();
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch (e) {
      console.warn("Estado corrupto, empezando limpio:", e);
      return DEFAULTS();
    }
  }

  /* Punto único para migraciones futuras de esquema */
  function migrate(s) {
    const base = DEFAULTS();
    if (!s || typeof s !== "object") return base;
    const merged = { ...base, ...s };
    merged.product = { ...base.product, ...(s.product || {}) };
    merged.warmup = { ...base.warmup, ...(s.warmup || {}) };
    merged.v = SCHEMA_VERSION;
    return merged;
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("No se pudo guardar:", e);
    }
  }

  function reset() {
    state = DEFAULTS();
    save();
  }

  /* ---------- Respaldo ---------- */
  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ app: "despega", exportedAt: new Date().toISOString(), data: state }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "despega-respaldo-" + todayKey() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(obj) {
    if (!obj || obj.app !== "despega" || !obj.data || typeof obj.data !== "object") return false;
    state = migrate(obj.data);
    save();
    return true;
  }

  /* ---------- Utilidades ---------- */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayKey(d) {
    const dt = d || new Date();
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }

  function activePersona() {
    return state.personas.find((p) => p.id === state.activePersonaId) || state.personas[0] || null;
  }

  function isPro() { return state.plan === "pro" || state.plan === "elite"; }

  /* Días de calentamiento con TODAS las tareas completas */
  function warmupDaysDone() {
    const TASKS = ["scroll", "like", "comment", "share", "save", "follow"];
    return Object.values(state.warmup.days).filter((d) => TASKS.every((t) => d[t])).length;
  }

  /* Racha: días consecutivos (hasta hoy o ayer) con al menos 1 post */
  function streak() {
    const days = new Set(state.posts.map((p) => todayKey(new Date(p.ts))));
    if (!days.size) return 0;
    let count = 0;
    const cursor = new Date();
    if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // hoy aún no publica: la racha sigue viva desde ayer
    while (days.has(todayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  /* Semana del método (1-indexada) desde el primer post */
  function methodWeek() {
    if (!state.startedAt) return 0;
    const ms = Date.now() - new Date(state.startedAt).getTime();
    return Math.max(1, Math.floor(ms / (7 * 24 * 3600 * 1000)) + 1);
  }

  return {
    get state() { return state; },
    save, reset, exportJson, importJson,
    uid, todayKey, activePersona, isPro,
    warmupDaysDone, streak, methodWeek,
  };
})();
