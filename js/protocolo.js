/* ============================================================
   DESPEGA — Paso 4: Protocolo de publicación
   Ritual pre-post + reglas anti-estancamiento + registro de posts
   ============================================================ */

const Protocolo = (() => {
  const RITUAL = ["scroll", "like", "comment", "saveshare"];
  const RITUAL_LABELS = { scroll: "rit_scroll", like: "rit_like", comment: "rit_comment", saveshare: "rit_save_share" };
  const MAX_POSTS_DAY = 3;
  const MIN_GAP_MS = 2 * 3600 * 1000;

  function $(id) { return document.getElementById(id); }

  function ritualToday() {
    const s = Store.state;
    const key = Store.todayKey();
    if (!s.ritual[key]) s.ritual[key] = {};
    return s.ritual[key];
  }

  function toggleRitual(task) {
    const day = ritualToday();
    day[task] = !day[task];
    Store.save();
    renderRitual();
  }

  function postsToday() {
    const key = Store.todayKey();
    return Store.state.posts.filter((p) => Store.todayKey(new Date(p.ts)) === key);
  }

  function lastPostTs() {
    if (!Store.state.posts.length) return 0;
    return Math.max(...Store.state.posts.map((p) => p.ts));
  }

  function logPost() {
    const s = Store.state;
    const hook = $("post-hook").value.trim();
    const platform = $("post-platform").value;
    const format = $("post-format").value;
    const scriptId = $("post-script").value || null;

    const post = {
      id: Store.uid(),
      ts: Date.now(),
      platform, format, hook, scriptId,
      views: 0, likes: 0, comments: 0, asks: 0, notes: "",
    };
    s.posts.unshift(post);
    if (!s.startedAt) s.startedAt = new Date().toISOString();
    Store.save();
    $("post-hook").value = "";
    UI.toast(I18N.t("toast_saved"), "success");
    App.refresh();
  }

  function pickScript() {
    const id = $("post-script").value;
    const sc = Store.state.scripts.find((x) => x.id === id);
    if (!sc) return;
    $("post-hook").value = sc.hook;
    $("post-format").value = sc.format;
  }

  function renderRitual() {
    const day = ritualToday();
    $("ritual-list").innerHTML = RITUAL.map((t) => {
      const done = !!day[t];
      return (
        '<div class="check-item' + (done ? " done" : "") + '" onclick="Protocolo.toggleRitual(\'' + t + '\')">' +
          '<div class="box">✓</div>' +
          '<div class="check-label">' + UI.esc(I18N.t(RITUAL_LABELS[t])) + "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderGuards() {
    const box = $("post-guards");
    const warnings = [];
    if (postsToday().length >= MAX_POSTS_DAY) warnings.push(I18N.t("guard_too_many"));
    const last = lastPostTs();
    if (last && Date.now() - last < MIN_GAP_MS) warnings.push(I18N.t("guard_too_soon"));
    if (!warnings.length) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    box.innerHTML = warnings.map((w) =>
      '<div class="card" style="border-color:rgba(251,191,36,0.4);background:var(--warn-soft);margin-bottom:8px;padding:12px 16px;font-size:0.87rem">' + UI.esc(w) + "</div>"
    ).join("");
  }

  function renderScriptSelect() {
    const sel = $("post-script");
    const list = Store.state.scripts;
    sel.innerHTML = '<option value="">—</option>' + list.map((sc) =>
      '<option value="' + sc.id + '">' + UI.esc(I18N.t("fmt_" + sc.format)) + " · “" +
      UI.esc(sc.hook.length > 40 ? sc.hook.slice(0, 40) + "…" : sc.hook) + "”</option>"
    ).join("");
  }

  function renderToday() {
    const list = postsToday();
    const box = $("today-posts");
    if (!list.length) {
      box.innerHTML = '<div class="empty">' + UI.esc(I18N.t("no_posts_today")) + "</div>";
      return;
    }
    box.innerHTML = list.map((p) => {
      const time = new Date(p.ts).toLocaleTimeString(I18N.lang === "en" ? "en-US" : "es-CO", { hour: "2-digit", minute: "2-digit" });
      return (
        '<div class="chip" style="margin-bottom:6px">' +
          "🕑 " + time + " · " + UI.esc(p.platform) + " · " +
          '<span class="badge gray">' + UI.esc(I18N.t("fmt_" + p.format)) + "</span>" +
          (p.hook ? " · “" + UI.esc(p.hook.length > 44 ? p.hook.slice(0, 44) + "…" : p.hook) + "”" : "") +
        "</div>"
      );
    }).join("");
  }

  function render() {
    renderRitual();
    renderGuards();
    renderScriptSelect();
    renderToday();
  }

  return { render, toggleRitual, logPost, pickScript };
})();
