/* ============================================================
   DESPEGA — Paso 1: Persona de usuario + registro del producto
   ============================================================ */

const Persona = (() => {
  let editingId = null;

  function $(id) { return document.getElementById(id); }

  function linesToArr(text) {
    return String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  }

  function readForm() {
    const platforms = [];
    document.querySelectorAll("#p-platforms input:checked").forEach((c) => platforms.push(c.value));
    return {
      name: $("p-name").value.trim(),
      age: $("p-age").value.trim(),
      location: $("p-location").value.trim(),
      occupation: $("p-occupation").value.trim(),
      pains: linesToArr($("p-pains").value),
      wants: linesToArr($("p-wants").value),
      fears: linesToArr($("p-fears").value),
      platforms,
      content: $("p-content").value.trim(),
      notes: $("p-notes").value.trim(),
    };
  }

  function fillForm(p) {
    $("p-name").value = p ? p.name : "";
    $("p-age").value = p ? p.age : "";
    $("p-location").value = p ? (p.location || "") : "";
    $("p-occupation").value = p ? p.occupation : "";
    $("p-pains").value = p ? p.pains.join("\n") : "";
    $("p-wants").value = p ? p.wants.join("\n") : "";
    $("p-fears").value = p ? (p.fears || []).join("\n") : "";
    $("p-content").value = p ? p.content : "";
    $("p-notes").value = p ? p.notes : "";
    document.querySelectorAll("#p-platforms input").forEach((c) => {
      c.checked = !!(p && p.platforms.includes(c.value));
    });
    $("p-save-btn").textContent = p ? I18N.t("p_update") : I18N.t("p_save");
  }

  function savePersona() {
    const s = Store.state;
    const data = readForm();
    if (!data.name || !data.pains.length) {
      UI.toast(I18N.t("p_need_name"), "error");
      return;
    }
    if (editingId) {
      const idx = s.personas.findIndex((p) => p.id === editingId);
      if (idx >= 0) s.personas[idx] = { ...s.personas[idx], ...data };
    } else {
      if (!Store.isPro() && s.personas.length >= 1) {
        UI.toast(I18N.t("p_limit_free"), "error");
        return;
      }
      const p = { id: Store.uid(), ...data };
      s.personas.push(p);
      if (!s.activePersonaId) s.activePersonaId = p.id;
    }
    Store.save();
    editingId = null;
    fillForm(null);
    UI.toast(I18N.t("toast_saved"), "success");
    App.refresh();
  }

  function newPersona() {
    const s = Store.state;
    if (!Store.isPro() && s.personas.length >= 1) {
      UI.toast(I18N.t("p_limit_free"), "error");
      return;
    }
    editingId = null;
    fillForm(null);
    $("p-name").focus();
  }

  function editPersona(id) {
    const p = Store.state.personas.find((x) => x.id === id);
    if (!p) return;
    editingId = id;
    fillForm(p);
    $("p-name").focus();
  }

  function deletePersona(id) {
    if (!confirm(I18N.t("confirm_delete"))) return;
    const s = Store.state;
    s.personas = s.personas.filter((p) => p.id !== id);
    if (s.activePersonaId === id) s.activePersonaId = s.personas[0] ? s.personas[0].id : null;
    if (editingId === id) { editingId = null; fillForm(null); }
    Store.save();
    UI.toast(I18N.t("toast_deleted"));
    App.refresh();
  }

  function setActive(id) {
    Store.state.activePersonaId = id;
    Store.save();
    App.refresh();
  }

  function saveProduct() {
    const s = Store.state;
    s.product = {
      name: $("prod-name").value.trim(),
      desc: $("prod-desc").value.trim(),
      cat: $("prod-cat").value,
    };
    Store.save();
    UI.toast(I18N.t("toast_saved"), "success");
    App.refresh();
  }

  function renderList() {
    const s = Store.state;
    const box = $("persona-list");
    if (!s.personas.length) {
      box.innerHTML = '<div class="empty"><span class="e-icon">👤</span>' + UI.esc(I18N.t("p_empty")) + "</div>";
      return;
    }
    box.innerHTML = s.personas.map((p) => {
      const active = p.id === s.activePersonaId;
      return (
        '<div class="card" style="margin-bottom:10px">' +
          '<div class="flex between flex-wrap">' +
            '<div><strong>' + UI.esc(p.name) + '</strong>' +
              (p.age ? ' <span class="muted small">· ' + UI.esc(p.age) + '</span>' : "") +
              (active ? ' <span class="badge fire">' + UI.esc(I18N.t("p_active")) + "</span>" : "") +
              '<div class="muted small">' + UI.esc([p.occupation, p.location].filter(Boolean).join(" · ")) + "</div>" +
              '<div class="small mt-1">🔥 ' + p.pains.length + " · ✨ " + p.wants.length + (p.fears && p.fears.length ? " · 😨 " + p.fears.length : "") + "</div>" +
            "</div>" +
            '<div class="flex flex-wrap">' +
              (!active ? '<button class="btn sm" onclick="Persona.setActive(\'' + p.id + '\')">' + UI.esc(I18N.t("p_make_active")) + "</button>" : "") +
              '<button class="btn sm" onclick="Persona.editPersona(\'' + p.id + '\')">✏️</button>' +
              '<button class="btn sm danger" onclick="Persona.deletePersona(\'' + p.id + '\')">🗑</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function render() {
    renderList();
    const prod = Store.state.product;
    $("prod-name").value = prod.name || "";
    $("prod-desc").value = prod.desc || "";
    $("prod-cat").value = prod.cat || "productividad";
    if (!editingId) fillForm(null);
  }

  return { render, savePersona, newPersona, editPersona, deletePersona, setActive, saveProduct };
})();
