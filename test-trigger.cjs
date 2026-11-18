const assert = require('node:assert');
const { createDoubleShift } = require('./trigger.cjs');
function run(events) {
  let n = 0;
  const d = createDoubleShift(() => n++);
  for (const [type, key, t] of events) (type === 'm' ? d.mouse() : d[type](key === 'S', t));
  return n;
}
const cases = [
  ['zweimal kurz Shift', [['down','S',0],['up','S',80],['down','S',200],['up','S',270]], 1],
  ['zweimal, aber zu langsam', [['down','S',0],['up','S',80],['down','S',900],['up','S',960]], 0],
  ['Shift lange gehalten', [['down','S',0],['up','S',600],['down','S',700],['up','S',760]], 0],
  ['Großschreiben: Shift+A, Shift+B', [['down','S',0],['down','A',40],['up','A',60],['up','S',90],['down','S',150],['down','B',170],['up','S',210]], 0],
  ['Buchstabe zwischen den Tipps', [['down','S',0],['up','S',80],['down','X',120],['down','S',200],['up','S',270]], 0],
  ['Tastenwiederholung zählt nicht doppelt', [['down','S',0],['down','S',30],['down','S',60],['up','S',90],['down','S',200],['up','S',260]], 1],
  ['dreimal Shift: nur einmal auslösen', [['down','S',0],['up','S',60],['down','S',150],['up','S',210],['down','S',300],['up','S',360]], 1],
  ['Shift-Klick dazwischen', [['down','S',0],['up','S',60],['m'],['down','S',150],['up','S',210]], 0],
  ['viermal: zweimal auslösen', [['down','S',0],['up','S',60],['down','S',150],['up','S',210],['down','S',300],['up','S',360],['down','S',450],['up','S',510]], 2],
];
for (const [name, ev, want] of cases) { assert.strictEqual(run(ev), want, name); console.log('ok ', name); }
console.log(`${cases.length} Fälle ok`);
