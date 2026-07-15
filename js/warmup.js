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

  /* ---- Banco de inspiración viral ---- */
  const PSYCH_KEYS = ["social", "fomo", "curiosity", "authentic", "transform", "relatable"];

  function addViral() {
    const val = (id) => { const el = $(id); return el ? el.value.trim() : ""; };
    const platform = val("viral-platform") || "TikTok";
    const title = val("viral-title-input");
    const url = val("viral-url");
    const views = parseInt(val("viral-views-input")) || 0;
    const hook = val("viral-hook-input");
    const psych = PSYCH_KEYS.filter((k) => {
      const el = document.getElementById("vpsych-" + k);
      return el && el.checked;
    });
    const why = val("viral-why");

    if (!title && !url) { UI.toast(I18N.t("viral_need_title"), "error"); return; }

    if (!Store.state.research) Store.state.research = { viral: [] };
    Store.state.research.viral.push({ id: Store.uid(), platform, title, url, views, hook, psych, why, date: Store.todayKey() });
    Store.save();

    if ($("viral-title-input")) $("viral-title-input").value = "";
    if ($("viral-url")) $("viral-url").value = "";
    if ($("viral-views-input")) $("viral-views-input").value = "";
    if ($("viral-hook-input")) $("viral-hook-input").value = "";
    if ($("viral-why")) $("viral-why").value = "";
    PSYCH_KEYS.forEach((k) => { const el = document.getElementById("vpsych-" + k); if (el) el.checked = false; });

    UI.toast(I18N.t("toast_saved"), "success");
    renderViral();
  }

  function deleteViral(id) {
    if (!confirm(I18N.t("confirm_delete"))) return;
    if (Store.state.research) Store.state.research.viral = Store.state.research.viral.filter((v) => v.id !== id);
    Store.save();
    renderViral();
  }

  function renderViral() {
    const box = $("viral-list");
    if (!box) return;
    const videos = (Store.state.research && Store.state.research.viral) || [];
    if (!videos.length) {
      box.innerHTML = '<div class="empty"><span class="e-icon">🎥</span>' + UI.esc(I18N.t("viral_empty")) + "</div>";
      return;
    }
    box.innerHTML = [...videos].reverse().map((v) => {
      const psychChips = v.psych && v.psych.length
        ? '<div class="chips mt-1" style="gap:4px">' + v.psych.map((p) => '<span class="chip" style="font-size:0.77rem;padding:3px 9px">' + UI.esc(I18N.t("psych_" + p)) + "</span>").join("") + "</div>"
        : "";
      return (
        '<div class="card" style="margin-bottom:8px;padding:12px 14px">' +
          '<div class="flex between">' +
            '<div>' +
              '<strong>' + UI.esc(v.title || v.url || "—") + "</strong> " +
              '<span class="badge gray">' + UI.esc(v.platform) + "</span>" +
              (v.views ? ' <span class="muted small">· ' + UI.fmtNum(v.views) + " views</span>" : "") +
            "</div>" +
            '<button class="btn sm danger" onclick="Warmup.deleteViral(\'' + v.id + '\')">🗑</button>' +
          "</div>" +
          (v.hook ? '<div class="small muted mt-1">🪝 "' + UI.esc(v.hook) + '"</div>' : "") +
          psychChips +
          (v.why ? '<div class="small mt-1" style="color:var(--text-2)">💡 ' + UI.esc(v.why) + "</div>" : "") +
          '<div class="small muted" style="opacity:0.45;margin-top:4px">' + UI.esc(v.date) + "</div>" +
        "</div>"
      );
    }).join("");
  }

  function render() {
    renderTerms();
    renderChecklist();
    renderJargon();
    renderViral();
  }

  return { render, toggleTask, copyTerm, addTerm, removeTerm, addJargon, removeJargon, addViral, deleteViral };
})();
