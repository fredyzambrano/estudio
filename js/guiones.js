/* ============================================================
   DESPEGA — Paso 3: Fábrica de guiones
   Generador por plantillas (determinista, $0 de costo, offline)
   + biblioteca. Límite free: 3 generaciones/día.
   ============================================================ */

const Guiones = (() => {
  const FREE_DAILY_LIMIT = 3;
  let current = null; // último guion generado (aún no guardado)

  function $(id) { return document.getElementById(id); }

  function gensToday() {
    return Store.state.genLog[Store.todayKey()] || 0;
  }

  function gensLeftLabel() {
    if (Store.isPro()) return "∞";
    return Math.max(0, FREE_DAILY_LIMIT - gensToday()) + "/" + FREE_DAILY_LIMIT;
  }

  function generate() {
    const s = Store.state;
    const personaId = $("gen-persona").value;
    const persona = s.personas.find((p) => p.id === personaId) || Store.activePersona();
    const format = document.querySelector("input[name='gen-format']:checked").value;

    if (!persona) { UI.toast(I18N.t("gen_need_persona"), "error"); return; }
    if (!persona.pains.length) { UI.toast(I18N.t("gen_need_pains"), "error"); return; }
    if (!Store.isPro() && gensToday() >= FREE_DAILY_LIMIT) {
      UI.toast(I18N.t("gen_limit_reached"), "error");
      return;
    }

    current = TPL.generate(I18N.lang, format, persona, s.product);
    current.personaId = persona.id;

    s.genLog[Store.todayKey()] = gensToday() + 1;
    Store.save();
    renderOutput();
    renderMeta();
  }

  function scriptToText(sc) {
    const lines = [];
    lines.push("🎬 " + I18N.t("fmt_" + sc.format));
    lines.push("");
    lines.push(I18N.t(sc.format === "longtext" ? "out_overlay_lbl" : "out_hook_lbl") + ":");
    lines.push("“" + sc.hook + "”");
    lines.push("");
    lines.push(I18N.t("out_beats_lbl") + ":");
    sc.beats.forEach((b) => lines.push("• [" + b.t + "] " + b.k));
    lines.push("");
    lines.push(I18N.t("out_reply_lbl"));
    lines.push("“" + sc.reply + "”");
    return lines.join("\n");
  }

  async function copyCurrent() {
    if (!current) return;
    const ok = await UI.copyText(scriptToText(current));
    UI.toast(ok ? I18N.t("copied") : "✗", ok ? "success" : "error");
  }

  function saveCurrent() {
    if (!current) return;
    Store.state.scripts.unshift({
      id: Store.uid(),
      date: Store.todayKey(),
      personaId: current.personaId,
      format: current.format,
      hook: current.hook,
      overlay: current.overlay || "",
      beats: current.beats,
      reply: current.reply,
    });
    Store.save();
    UI.toast(I18N.t("script_saved"), "success");
    App.refresh();
  }

  function deleteScript(id) {
    if (!confirm(I18N.t("confirm_delete"))) return;
    Store.state.scripts = Store.state.scripts.filter((x) => x.id !== id);
    Store.save();
    UI.toast(I18N.t("toast_deleted"));
    render();
  }

  function viewScript(id) {
    const sc = Store.state.scripts.find((x) => x.id === id);
    if (!sc) return;
    current = sc;
    renderOutput();
    $("script-output").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderOutput() {
    const box = $("script-output");
    if (!current) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");

    const isLong = current.format === "longtext";
    let html = '<div class="flex between flex-wrap mb-1">' +
      '<span class="badge fire">' + UI.esc(I18N.t("fmt_" + current.format)) + "</span>" +
      '<div class="flex">' +
        '<button class="btn sm" onclick="Guiones.copyCurrent()">📋 ' + UI.esc(I18N.t("copy_script")) + "</button>" +
        '<button class="btn sm success" onclick="Guiones.saveCurrent()">💾 ' + UI.esc(I18N.t("save_script")) + "</button>" +
      "</div></div>";

    html += '<div class="small muted mb-1">' + UI.esc(I18N.t(isLong ? "out_overlay_lbl" : "out_hook_lbl")) + "</div>";
    html += '<div class="s-hook">“' + UI.esc(current.hook) + "”</div>";

    html += '<div class="small muted mb-1">' + UI.esc(I18N.t("out_beats_lbl")) + "</div>";
    current.beats.forEach((b) => {
      html += '<div class="beat"><div class="b-time">' + UI.esc(b.t) + '</div><div class="b-text">' + UI.esc(b.k) + "</div></div>";
    });

    html += '<div class="small muted mt-2 mb-1">' + UI.esc(I18N.t("out_reply_lbl")) + "</div>";
    html += '<div class="chip" style="font-size:0.95rem">💬 ' + UI.esc(current.reply) + "</div>";

    html += '<div class="script-rules">' +
      '<div class="small muted" style="font-weight:700">' + UI.esc(I18N.t("out_rules_lbl")) + "</div>" +
      '<div class="rule">🚫 ' + UI.esc(I18N.t("rule_no_product")) + "</div>" +
      '<div class="rule">💬 ' + UI.esc(I18N.t("rule_reply_comments")) + "</div>" +
      '<div class="rule">🗣 ' + UI.esc(I18N.t("rule_feel_native")) + "</div>" +
    "</div>";

    box.innerHTML = html;
  }

  function renderMeta() {
    $("gen-left").textContent = I18N.t("gen_left") + ": " + gensLeftLabel();

    /* Selector de personas */
    const sel = $("gen-persona");
    const s = Store.state;
    const activeId = (Store.activePersona() || {}).id;
    sel.innerHTML = s.personas.map((p) =>
      '<option value="' + p.id + '"' + (p.id === activeId ? " selected" : "") + ">" + UI.esc(p.name) + "</option>"
    ).join("");

    /* Avisos de requisitos */
    const notice = $("gen-notice");
    if (!s.personas.length) {
      notice.textContent = I18N.t("gen_need_persona");
      notice.classList.remove("hidden");
    } else if (!s.product.name) {
      notice.textContent = I18N.t("gen_need_product");
      notice.classList.remove("hidden");
    } else {
      notice.classList.add("hidden");
    }
  }

  function renderLibrary() {
    const box = $("script-lib");
    const list = Store.state.scripts;
    if (!list.length) {
      box.innerHTML = '<div class="empty"><span class="e-icon">📚</span>' + UI.esc(I18N.t("lib_empty")) + "</div>";
      return;
    }
    box.innerHTML =
      '<div class="table-scroll"><table class="data"><tbody>' +
      list.map((sc) =>
        "<tr><td><span class='badge gray'>" + UI.esc(I18N.t("fmt_" + sc.format)) + "</span></td>" +
        "<td>“" + UI.esc(sc.hook.length > 70 ? sc.hook.slice(0, 70) + "…" : sc.hook) + "”</td>" +
        '<td class="muted small">' + UI.esc(sc.date) + "</td>" +
        '<td style="white-space:nowrap">' +
          '<button class="btn sm" onclick="Guiones.viewScript(\'' + sc.id + '\')">' + UI.esc(I18N.t("lib_use")) + "</button> " +
          '<button class="btn sm danger" onclick="Guiones.deleteScript(\'' + sc.id + '\')">✕</button>' +
        "</td></tr>"
      ).join("") +
      "</tbody></table></div>";
  }

  function render() {
    renderMeta();
    renderOutput();
    renderLibrary();
  }

  return { render, generate, copyCurrent, saveCurrent, deleteScript, viewScript };
})();
