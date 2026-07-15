/* ============================================================
   DESPEGA — Paso 2: Calentamiento del algoritmo
   Búsquedas sugeridas + rutina diaria (2–3 días) + diario de jerga
   ============================================================ */

const Warmup = (() => {
  const TASKS = ["scroll", "like", "comment", "share", "save", "follow"];
  const TASK_LABELS = { scroll: "wt_scroll", like: "wt_like", comment: "wt_comment", share: "wt_share", save: "wt_save", follow: "wt_follow" };
  const GOAL_DAYS = 3;

  function $(id) { return document.getElementById(id); }

  function todayTasks() {
    const s = Store.state;
    const key = Store.todayKey();
    if (!s.warmup.days[key]) s.warmup.days[key] = {};
    return s.warmup.days[key];
  }

  function toggleTask(task) {
    const day = todayTasks();
    day[task] = !day[task];
    Store.save();
    App.refresh();
  }

  async function copyTerm(text) {
    const ok = await UI.copyText(text);
    UI.toast(ok ? I18N.t("copied") : "✗", ok ? "success" : "error");
  }

  function addTerm() {
    const input = $("term-input");
    const val = input.value.trim();
    if (!val) return;
    Store.state.warmup.customTerms.push(val);
    Store.save();
    input.value = "";
    render();
  }

  function removeTerm(idx) {
    Store.state.warmup.customTerms.splice(idx, 1);
    Store.save();
    render();
  }

  function addJargon() {
    const term = $("jargon-term").value.trim();
    const ctx = $("jargon-ctx").value.trim();
    if (!term) return;
    Store.state.warmup.jargon.unshift({ id: Store.uid(), term, ctx, date: Store.todayKey() });
    Store.save();
    $("jargon-term").value = "";
    $("jargon-ctx").value = "";
    UI.toast(I18N.t("toast_saved"), "success");
    render();
  }

  function removeJargon(id) {
    Store.state.warmup.jargon = Store.state.warmup.jargon.filter((j) => j.id !== id);
    Store.save();
    render();
  }

  function renderTerms() {
    const box = $("warm-terms");
    const persona = Store.activePersona();
    const custom = Store.state.warmup.customTerms;

    if (!persona && !custom.length) {
      box.innerHTML = '<div class="empty"><span class="e-icon">🔍</span>' + UI.esc(I18N.t("warm_terms_empty")) + "</div>";
      return;
    }
    const suggested = persona ? TPL.warmupTerms(I18N.lang, persona) : [];
    let html = '<div class="chips">';
    suggested.forEach((t) => {
      html += '<span class="chip action" onclick="Warmup.copyTerm(this.dataset.t)" data-t="' + UI.esc(t) + '">🔍 ' + UI.esc(t) + "</span>";
    });
    custom.forEach((t, i) => {
      html += '<span class="chip action" onclick="Warmup.copyTerm(this.dataset.t)" data-t="' + UI.esc(t) + '">📌 ' + UI.esc(t) +
        ' <button onclick="event.stopPropagation();Warmup.removeTerm(' + i + ')">✕</button></span>';
    });
    html += "</div>";
    box.innerHTML = html;
  }

  function renderChecklist() {
    const day = todayTasks();
    const box = $("warm-checklist");
    box.innerHTML = TASKS.map((t) => {
      const done = !!day[t];
      return (
        '<div class="check-item' + (done ? " done" : "") + '" onclick="Warmup.toggleTask(\'' + t + '\')">' +
          '<div class="box">✓</div>' +
          '<div class="check-label">' + UI.esc(I18N.t(TASK_LABELS[t])) + "</div>" +
        "</div>"
      );
    }).join("");

    const done = Store.warmupDaysDone();
    const pct = Math.min(100, Math.round((done / GOAL_DAYS) * 100));
    $("warm-progress-bar").style.width = pct + "%";
    $("warm-progress-text").textContent =
      I18N.t("warm_progress") + ": " + done + "/" + GOAL_DAYS + " " + I18N.t("days_label") + " (" + pct + "%)";
  }

  function renderJargon() {
    const list = Store.state.warmup.jargon;
    const box = $("jargon-list");
    if (!list.length) {
      box.innerHTML = '<div class="empty"><span class="e-icon">📓</span>' + UI.esc(I18N.t("jargon_empty")) + "</div>";
      return;
    }
    box.innerHTML =
      '<div class="table-scroll"><table class="data"><tbody>' +
      list.map((j) =>
        "<tr><td><strong>" + UI.esc(j.term) + "</strong></td>" +
        '<td class="muted">' + UI.esc(j.ctx || "") + "</td>" +
        '<td class="muted small">' + UI.esc(j.date) + "</td>" +
        '<td><button class="btn sm danger" onclick="Warmup.removeJargon(\'' + j.id + '\')">✕</button></td></tr>'
      ).join("") +
      "</tbody></table></div>";
  }

  function render() {
    renderTerms();
    renderChecklist();
    renderJargon();
  }

  return { render, toggleTask, copyTerm, addTerm, removeTerm, addJargon, removeJargon };
})();
