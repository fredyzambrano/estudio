/* ============================================================
   DESPEGA — Orquestador: navegación, dashboard e inicio
   ============================================================ */

const App = (() => {
  const VIEWS = ["home", "persona", "warmup", "scripts", "protocol", "metrics", "pro"];
  let currentView = "home";

  function $(id) { return document.getElementById(id); }

  /* ---------- Navegación ---------- */
  function show(view) {
    if (!VIEWS.includes(view)) view = "home";
    currentView = view;
    VIEWS.forEach((v) => {
      const el = $("view-" + v);
      if (el) el.classList.toggle("active", v === view);
    });
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === view);
    });
    try { history.replaceState(null, "", "#" + view); } catch (e) { /* file:// */ }
    renderView(view);
    window.scrollTo({ top: 0 });
  }

  function renderView(view) {
    if (view === "home") renderDashboard();
    else if (view === "persona") Persona.render();
    else if (view === "warmup") Warmup.render();
    else if (view === "scripts") Guiones.render();
    else if (view === "protocol") Protocolo.render();
    else if (view === "metrics") Metricas.render();
    else if (view === "pro") Pro.render();
  }

  /* Re-render global tras cualquier mutación */
  function refresh() {
    renderPlanBadge();
    renderView(currentView);
    if (currentView !== "home") renderDashboard(); /* KPIs siempre frescos al volver */
  }

  /* ---------- Dashboard ---------- */
  function nextAction() {
    const s = Store.state;
    if (!s.personas.length) return { key: "na_persona", view: "persona", icon: "👤" };
    if (!s.product.name) return { key: "na_product", view: "persona", icon: "📱" };
    if (Store.warmupDaysDone() < 3) return { key: "na_warmup", view: "warmup", icon: "🔥" };
    if (!s.scripts.length) return { key: "na_script", view: "scripts", icon: "🎬" };
    if (!s.posts.length) return { key: "na_post", view: "protocol", icon: "📤" };
    if (s.posts.some((p) => !p.views)) return { key: "na_metrics", view: "metrics", icon: "📈" };
    return { key: "na_keep", view: "protocol", icon: "🚀" };
  }

  function progressItems() {
    const s = Store.state;
    const totalAsks = s.posts.reduce((a, p) => a + (p.asks || 0), 0);
    return [
      { key: "prog_persona", done: s.personas.length > 0 },
      { key: "prog_product", done: !!s.product.name },
      { key: "prog_warmup", done: Store.warmupDaysDone() >= 3 },
      { key: "prog_script", done: s.scripts.length > 0 },
      { key: "prog_post", done: s.posts.length > 0 },
      { key: "prog_ask", done: totalAsks > 0 },
      { key: "prog_breakout", done: s.posts.some((p) => (p.views || 0) >= 10000) },
    ];
  }

  function renderDashboard() {
    const s = Store.state;

    /* Siguiente acción */
    const na = nextAction();
    const naEl = $("next-action");
    naEl.innerHTML =
      '<div class="na-icon">' + na.icon + "</div>" +
      "<div><div class='na-label'>" + UI.esc(I18N.t("na_label")) + "</div>" +
      "<div class='na-text'>" + UI.esc(I18N.t(na.key)) + "</div></div>";
    naEl.onclick = () => show(na.view);

    /* KPIs */
    const week = Store.methodWeek();
    const totalViews = s.posts.reduce((a, p) => a + (p.views || 0), 0);
    const totalAsks = s.posts.reduce((a, p) => a + (p.asks || 0), 0);
    const breakouts = s.posts.filter((p) => (p.views || 0) >= 10000).length;
    const kpis = [
      { num: week ? week : "—", lbl: "kpi_week" },
      { num: Store.streak() + " 🔥", lbl: "kpi_streak" },
      { num: s.posts.length, lbl: "kpi_posts" },
      { num: UI.fmtNum(totalViews), lbl: "kpi_views" },
      { num: "💬 " + totalAsks, lbl: "kpi_asks" },
      { num: breakouts, lbl: "kpi_breakouts" },
    ];
    $("dash-kpis").innerHTML = kpis.map((k) =>
      '<div class="stat-tile"><div class="num">' + k.num + '</div><div class="lbl">' + UI.esc(I18N.t(k.lbl)) + "</div></div>"
    ).join("");

    /* Progreso del método */
    const items = progressItems();
    const doneN = items.filter((i) => i.done).length;
    const pct = Math.round((doneN / items.length) * 100);
    $("dash-progress-bar").style.width = pct + "%";
    $("dash-progress-pct").textContent = pct + "%";
    $("dash-progress-list").innerHTML = items.map((i) =>
      '<div class="check-item' + (i.done ? " done" : "") + '" style="cursor:default">' +
        '<div class="box">✓</div>' +
        '<div class="check-label">' + UI.esc(I18N.t(i.key)) + "</div>" +
      "</div>"
    ).join("");
  }

  /* ---------- Header ---------- */
  function renderPlanBadge() {
    const el = $("plan-badge");
    const plan = Store.state.plan;
    el.textContent = I18N.t("plan_" + plan + "_t");
    el.className = "plan-badge" + (plan === "pro" ? " pro" : plan === "elite" ? " elite" : "");
  }

  function setLang(l) {
    I18N.setLang(l);
    document.querySelectorAll(".lang-switch button").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === l);
    });
    refresh();
  }

  /* ---------- Init ---------- */
  function init() {
    document.documentElement.lang = I18N.lang;
    I18N.apply();
    document.querySelectorAll(".lang-switch button").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === I18N.lang);
    });
    renderPlanBadge();
    const hash = (location.hash || "").replace("#", "");
    show(VIEWS.includes(hash) ? hash : "home");
  }

  document.addEventListener("DOMContentLoaded", init);

  return { show, refresh, setLang };
})();
