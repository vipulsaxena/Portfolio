/**
 * Field mode (Attract / Repel) — shared state for the hero dot grid.
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
    },
    cycleMode: function () {
      var i = FIELD_MODE_IDS.indexOf(modeId);
      this.setMode(FIELD_MODE_IDS[(i + 1) % FIELD_MODE_IDS.length]);
    }
  };
})();
