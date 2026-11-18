// Doppel-Shift erkennen: zweimal kurz Shift, ohne andere Taste dazwischen.
// Großschreiben (Shift halten + Buchstabe) löst also nie aus, langes Halten auch nicht.
const TAP_MAX = 300;   // ms: so lange darf Shift bei einem Antippen höchstens unten sein
const GAP_MAX = 400;   // ms: so viel Zeit darf zwischen den beiden Tipps liegen

function createDoubleShift(onTrigger, { tapMax = TAP_MAX, gapMax = GAP_MAX } = {}) {
  let downAt = null;   // wann Shift gedrückt wurde (null = nicht gedrückt)
  let dirty = false;   // andere Taste während Shift unten
  let lastTap = null;  // Ende des letzten sauberen Tipps
  return {
    // isShift: linke oder rechte Shift-Taste. t: Zeit in ms
    down(isShift, t) {
      if (isShift) {
        if (downAt !== null) return; // Tastenwiederholung beim Halten
        downAt = t; dirty = false;
      } else {
        dirty = true; lastTap = null; // andere Taste: Serie abbrechen
      }
    },
    up(isShift, t) {
      if (!isShift || downAt === null) return;
      const held = t - downAt;
      downAt = null;
      if (dirty || held > tapMax) { lastTap = null; return; }
      if (lastTap !== null && t - lastTap <= gapMax + tapMax) { lastTap = null; onTrigger(); return; }
      lastTap = t;
    },
    // Mausklick zwischen den Tipps bricht ebenfalls ab (Shift-Klick zum Markieren)
    mouse() { lastTap = null; if (downAt !== null) dirty = true; },
  };
}

module.exports = { createDoubleShift };
