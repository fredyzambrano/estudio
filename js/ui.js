/* ============================================================
   DESPEGA — Helpers de interfaz (toast, modal, formato, escape)
   ============================================================ */

const UI = (() => {
  let toastTimer = null;

  function toast(msg, type) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = type ? type : "";
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("open");
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("open");
  }

  /* Escape para todo contenido escrito por el usuario que se inyecta como HTML */
  function esc(s) {
    return String(s == null ? "" : s)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  /* 1234 -> 1.2K, 2500000 -> 2.5M */
  function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1) + "K";
    return String(n);
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(I18N.lang === "en" ? "en-US" : I18N.lang === "pt" ? "pt-BR" : "es-CO", {
      day: "numeric", month: "short",
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      /* Fallback para contextos sin Clipboard API */
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  /* Cierra modales al hacer clic fuera */
  document.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal-overlay")) {
      e.target.classList.remove("open");
    }
  });

  return { toast, openModal, closeModal, esc, fmtNum, fmtDate, copyText };
})();
