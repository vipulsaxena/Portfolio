/**
 * Field mode (Fascination: Attract / Repel) — syncs hero dot grid and Pixi orbs.
 * No full-page surface gradient layer (visual surface is disabled in CSS).
 */
(function () {
  "use strict";

  var FIELD_MODE_IDS = ["attract", "repel"];

  var modeId =
    document.documentElement.getAttribute("data-field-mode") || "attract";
  if (FIELD_MODE_IDS.indexOf(modeId) < 0) modeId = "attract";
  document.documentElement.dataset.fieldMode = modeId;

  window.FieldMode = {
    get id() {
      return modeId;
    },
    setMode: function (id) {
      if (FIELD_MODE_IDS.indexOf(id) < 0 || modeId === id) return;
      modeId = id;
      document.documentElement.dataset.fieldMode = id;
      window.dispatchEvent(
        new CustomEvent("field-mode-change", { detail: { mode: id } })
      );
      updateToggle();
    },
    cycleMode: function () {
      var i = FIELD_MODE_IDS.indexOf(modeId);
      this.setMode(FIELD_MODE_IDS[(i + 1) % FIELD_MODE_IDS.length]);
    }
  };

  function modeLabel(id) {
    if (id === "repel") return "Repel";
    return "Attract";
  }

  function updateToggle() {
    var btn = document.getElementById("field-mode-toggle");
    if (!btn) return;
    var label = btn.querySelector(".field-label");
    var text = modeLabel(modeId);
    if (label) label.textContent = text;
    btn.setAttribute("aria-label", "Fascination: " + text + ". Click to switch.");
    btn.dataset.mode = modeId;
  }

  function initToggle() {
    var cluster = document.getElementById("cta-cluster");
    if (!cluster || document.getElementById("field-mode-toggle")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "field-mode-toggle";
    btn.className = "orb-cta orb-cta--field";
    btn.innerHTML =
      '<span class="dot field-dot" aria-hidden="true"></span><span class="hud-label">Fascination: <span class="hud-value field-label">Attract</span></span>';

    var luminescence = cluster.querySelector(".overlay__btn--colors");
    if (luminescence) luminescence.after(btn);
    else cluster.appendChild(btn);

    btn.addEventListener("click", function () {
      window.FieldMode.cycleMode();
    });

    window.addEventListener("field-mode-change", updateToggle);
    updateToggle();
  }

  function init() {
    initToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
