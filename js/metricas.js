/* ============================================================
   DESPEGA — Paso 5: Métricas, hitos de despegue e insights
   La métrica #1 no son las vistas: son los comentarios
   preguntando por la app (señal de conversión del método).
   ============================================================ */

const Metricas = (() => {
  const BREAKOUT = 10000;
  const VIRAL = 100000;
  const MEGA = 1000000;
  let editingId = null;

  function $(id) { return document.getElementById(id); }

  function statusOf(views) {
    if (views >= MEGA) return { key: "st_mega", cls: "fire" };
    if (views >= VIRAL) return { key: "st_viral", cls: "red" };
    if (views >= BREAKOUT) return { key: "st_breakout", cls: "green" };
    return { key: "st_seed", cls: "gray" };
  }

  function openEdit(id) {
    const p = Store.state.posts.find((x) => x.id === id);
    if (!p) return;
    editingId = id;
    $("met-views").value = p.views || 0;
    $("met-likes").value = p.likes || 0;
    $("met-comments").value = p.comments || 0;
    $("met-asks").value = p.asks || 0;
    $("met-notes").value = p.notes || "";
    UI.openModal("metric-modal");
  }

  function saveEdit() {
    const p = Store.state.posts.find((x) => x.id === editingId);
    if (!p) return;
    p.views = Math.max(0, parseInt($("met-views").value, 10) || 0);
    p.likes = Math.max(0, parseInt($("met-likes").value, 10) || 0);
    p.comments = Math.max(0, parseInt($("met-comments").value, 10) || 0);
    p.asks = Math.max(0, parseInt($("met-asks").value, 10) || 0);
    p.notes = $("met-notes").value.trim();
    Store.save();
    UI.closeModal("metric-modal");
    UI.toast(I18N.t("toast_saved"), "success");
    App.refresh();
  }

  function deletePost() {
    if (!confirm(I18N.t("confirm_delete"))) return;
    Store.state.posts = Store.state.posts.filter((x) => x.id !== editingId);
    Store.save();
    UI.closeModal("metric-modal");
    UI.toast(I18N.t("toast_deleted"));
    App.refresh();
  }

  function renderTable() {
    const box = $("metrics-table");
    const posts = [...Store.state.posts].sort((a, b) => b.ts - a.ts);
    if (!posts.length) {
      box.innerHTML = '<div class="empty"><span class="e-icon">📈</span>' + UI.esc(I18N.t("met_empty")) + "</div>";
      return;
    }
    box.innerHTML =
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      "<th>" + UI.esc(I18N.t("th_date")) + "</th>" +
      "<th>" + UI.esc(I18N.t("th_format")) + "</th>" +
      "<th>" + UI.esc(I18N.t("th_hook")) + "</th>" +
      "<th>" + UI.esc(I18N.t("th_views")) + "</th>" +
      "<th>" + UI.esc(I18N.t("th_asks")) + "</th>" +
      "<th>" + UI.esc(I18N.t("th_status")) + "</th>" +
      "</tr></thead><tbody>" +
      posts.map((p) => {
        const st = statusOf(p.views || 0);
        return (
          '<tr style="cursor:pointer" onclick="Metricas.openEdit(\'' + p.id + '\')">' +
            "<td>" + UI.fmtDate(p.ts) + "</td>" +
            '<td><span class="badge gray">' + UI.esc(I18N.t("fmt_" + p.format)) + "</span></td>" +
            '<td class="muted">“' + UI.esc((p.hook || "").length > 46 ? p.hook.slice(0, 46) + "…" : (p.hook || "—")) + "”</td>" +
            "<td><strong>" + UI.fmtNum(p.views || 0) + "</strong></td>" +
            "<td>" + (p.asks ? "💬 " + p.asks : '<span class="muted">0</span>') + "</td>" +
            '<td><span class="badge ' + st.cls + '">' + UI.esc(I18N.t(st.key)) + "</span></td>" +
          "</tr>"
        );
      }).join("") +
      "</tbody></table></div>";
  }

  function milestoneStates() {
    const posts = Store.state.posts;
    const totalAsks = posts.reduce((a, p) => a + (p.asks || 0), 0);
    const breakouts = posts.filter((p) => (p.views || 0) >= BREAKOUT).length;
    return [
      { key: "ms1", week: "1", done: posts.length > 0, icon: "🎬" },
      { key: "ms2", week: "1–2", done: totalAsks > 0, icon: "💬" },
      { key: "ms3", week: "3", done: breakouts >= 1, icon: "📈" },
      { key: "ms4", week: "4", done: breakouts >= 3, icon: "📊" },
      { key: "ms5", week: "5", done: posts.some((p) => (p.views || 0) >= VIRAL), icon: "🔥" },
      { key: "ms6", week: "8", done: posts.some((p) => (p.views || 0) >= MEGA), icon: "🚀" },
    ];
  }

  function renderMilestones() {
    const box = $("milestones");
    box.innerHTML = milestoneStates().map((m) =>
      '<div class="milestone' + (m.done ? " done" : "") + '">' +
        '<div class="dot">' + (m.done ? "✓" : m.icon) + "</div>" +
        '<div class="m-body">' +
          '<div class="m-week">' + UI.esc(I18N.t("week_label")) + " " + m.week + "</div>" +
          "<h4>" + UI.esc(I18N.t(m.key + "_t")) + "</h4>" +
          "<p>" + UI.esc(I18N.t(m.key + "_d")) + "</p>" +
        "</div>" +
      "</div>"
    ).join("");
  }

  function renderInsights() {
    const box = $("insights");
    const posts = Store.state.posts.filter((p) => (p.views || 0) > 0);
    const totalAsks = Store.state.posts.reduce((a, p) => a + (p.asks || 0), 0);

    let html = "";

    if (totalAsks > 0) {
      html += '<div class="card" style="border-color:rgba(52,211,153,0.35)">' +
        '<div style="font-size:1.6rem;font-weight:900">💬 ' + totalAsks + "</div>" +
        '<div class="muted small">' + UI.esc(I18N.t("ins_asks_total")) + "</div>" +
        '<div class="small mt-1">✅ ' + UI.esc(I18N.t("ins_conv_tip")) + "</div>" +
      "</div>";
    }

    if (posts.length < 3) {
      html += '<div class="empty">' + UI.esc(I18N.t("ins_no_data")) + "</div>";
      box.innerHTML = html;
      return;
    }

    /* Mejor formato por promedio de vistas — insight PRO */
    if (!Store.isPro()) {
      html += '<div class="card center" style="border-style:dashed">🔒 <strong>' +
        UI.esc(I18N.t("ins_best_format")) + "</strong> · PRO " +
        '<div class="mt-1"><button class="btn sm primary" onclick="App.show(\'pro\')">⚡ PRO</button></div></div>';
      box.innerHTML = html;
      return;
    }

    const byFormat = {};
    posts.forEach((p) => {
      if (!byFormat[p.format]) byFormat[p.format] = { views: 0, n: 0 };
      byFormat[p.format].views += p.views || 0;
      byFormat[p.format].n++;
    });
    let best = null;
    Object.keys(byFormat).forEach((f) => {
      const avg = byFormat[f].views / byFormat[f].n;
      if (!best || avg > best.avg) best = { format: f, avg };
    });
    if (best) {
      html += '<div class="card" style="border-color:rgba(255,138,42,0.4)">' +
        '<div class="small muted">' + UI.esc(I18N.t("ins_best_format")) + "</div>" +
        '<div style="font-size:1.3rem;font-weight:900">🏆 ' + UI.esc(I18N.t("fmt_" + best.format)) + "</div>" +
        '<div class="muted small">' + UI.fmtNum(Math.round(best.avg)) + " " + UI.esc(I18N.t("ins_avg_views")) + "</div>" +
      "</div>";
    }
    box.innerHTML = html;
  }

  function render() {
    renderTable();
    renderMilestones();
    renderInsights();
  }

  return { render, openEdit, saveEdit, deletePost, statusOf, milestoneStates };
})();
