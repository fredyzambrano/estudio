/* ============================================================
   DESPEGA — Monetización: planes, activación y datos
   Los códigos NO viven en texto plano: solo sus hashes SHA-256.
   La validación real por servidor queda documentada en el README
   como siguiente paso cuando el volumen lo justifique.
   ============================================================ */

const Pro = (() => {
  /* ⚠️ CONFIGURAR ANTES DE LANZAR (ver README):
     - Links de pago de MercadoPago para cada plan
     - Número de WhatsApp de soporte (formato internacional, sin +) */
  const MP_LINK_PRO = "https://mpago.la/TU-LINK-PRO";
  const MP_LINK_ELITE = "https://mpago.la/TU-LINK-ELITE";
  const WHATSAPP = "573000000000";

  /* SHA-256 de los códigos de activación (los códigos están en CODES.md,
     que NO se sube al hosting: solo este archivo JS viaja al navegador). */
  const CODES = [
    { h: "c88cb264d804817a8f3ad60b473238472c922a96a65198a736660650638a4b17", plan: "pro" },
    { h: "a226d82bed2094ebe1c99ce7fa49be93e6e64bc6789d75b5c152ed4a21dfe6fd", plan: "pro" },
    { h: "8917a9994a4d6bfb5b011ad55f5c221c293bff591586d14140aa1950e6a6844e", plan: "pro" },
    { h: "2e8374e1eff0920ce30eb588ec86110483870ce51f600571786b6227f42cfb8e", plan: "pro" },
    { h: "4a017ce281b5a8408240590e8fddfa2bf4535611dcf9fa92f13e7ad35b274af8", plan: "pro" },
    { h: "8a42877922a3770f13171f2508aa091d32a65aab034e9cee784a432863070f4c", plan: "pro" },
    { h: "e876bf386143e769b42c93c80070e20e321cfc6068f07306b8214653cb2ae949", plan: "pro" },
    { h: "15ee579e4e43acd1c0623734fccf7daecc6726f696b515f5d0f3ade5f27f0ebb", plan: "pro" },
    { h: "5ea24a49d87f27769f590d7116da54128b194d23d89f5ebc39609c9c61633f23", plan: "pro" },
    { h: "1dd7a8476b9a315ea5e3b802118b0fb4013ac12314e3a201f0c6c3b3a23618ea", plan: "pro" },
    { h: "251a01d06eb6c1b60b52399168b0410706c72f82fe2647ae9fc2a3708c39afae", plan: "elite" },
    { h: "85f29b04e329141e47a62e48048c9a135623eb37cc02eb1ab747c9d765fdd83a", plan: "elite" },
    { h: "25e8e90d7ced308f28c756f95c19e87514285439b153dda500b4e816d4645522", plan: "elite" },
    { h: "0b9dbe30a0c6ea8fbe4d33c34672477cea5c8111a23d1f12d52f37e44260b770", plan: "elite" },
    { h: "22080d10f42620750e854802056c7db9e7b65bb1cc886481dfa593d0ca0c9338", plan: "elite" },
  ];

  function $(id) { return document.getElementById(id); }

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function activate() {
    const input = $("act-code");
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    if (!(window.crypto && crypto.subtle)) {
      UI.toast(I18N.t("act_https"), "error");
      return;
    }
    const hash = await sha256Hex(code);
    const match = CODES.find((c) => c.h === hash);
    if (!match) {
      UI.toast(I18N.t("act_bad"), "error");
      return;
    }
    Store.state.plan = match.plan;
    Store.state.activationCode = code;
    Store.save();
    input.value = "";
    UI.closeModal("activate-modal");
    UI.toast(I18N.t("act_ok"), "success");
    App.refresh();
  }

  function whatsappUrl() {
    const msg = encodeURIComponent("Hola 👋 vengo de Despega y quiero activar mi plan PRO 🚀");
    return "https://wa.me/" + WHATSAPP + "?text=" + msg;
  }

  function renderButtons() {
    const plan = Store.state.plan;
    const btnFree = $("buy-free");
    const btnPro = $("buy-pro");
    const btnElite = $("buy-elite");

    btnFree.textContent = plan === "free" ? I18N.t("btn_current") : I18N.t("plan_free_t");
    btnFree.disabled = true;

    if (plan === "pro" || plan === "elite") {
      btnPro.textContent = plan === "pro" ? I18N.t("btn_current") : "✓";
      btnPro.disabled = true;
      btnPro.removeAttribute("onclick");
    } else {
      btnPro.textContent = I18N.t("btn_buy");
      btnPro.disabled = false;
    }
    if (plan === "elite") {
      btnElite.textContent = I18N.t("btn_current");
      btnElite.disabled = true;
    } else {
      btnElite.textContent = I18N.t("btn_buy");
      btnElite.disabled = false;
    }

    $("wa-link").href = whatsappUrl();
    $("wa-link-2").href = whatsappUrl();
  }

  function buy(plan) {
    window.open(plan === "elite" ? MP_LINK_ELITE : MP_LINK_PRO, "_blank");
  }

  /* ---------- Datos: export / import / reset ---------- */
  function exportData() {
    Store.exportJson();
    UI.toast(I18N.t("data_export_ok"), "success");
  }

  function importData(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (Store.importJson(obj)) {
          UI.toast(I18N.t("data_import_ok"), "success");
          App.refresh();
        } else {
          UI.toast(I18N.t("data_import_bad"), "error");
        }
      } catch (e) {
        UI.toast(I18N.t("data_import_bad"), "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  }

  function resetData() {
    if (!confirm(I18N.t("data_reset_confirm"))) return;
    Store.reset();
    App.refresh();
    UI.toast(I18N.t("toast_deleted"));
  }

  function render() {
    renderButtons();
  }

  return { render, activate, buy, exportData, importData, resetData, whatsappUrl };
})();
