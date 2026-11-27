/**
 * Task registry for ai-task. Every `_tasks/<id>.js` (except files starting with `_` and this index) is auto-registered.
 * Task contract (see smart-score.js):
 *   { id, role, effort, tools?, requireTools?, moderate?, maxOutputTokens?, schema,
 *     load({user,params}) -> ctx, buildInput(ctx,params) -> {instructions,input},
 *     finalize?(parsed,ctx,params) -> payload, outboundText?(payload) -> string[] }
 */
const fs = require('fs');
const path = require('path');

const tasks = {};
for (const f of fs.readdirSync(__dirname)) {
  if (f.startsWith('_') || f === 'index.js' || !f.endsWith('.js')) continue;
  const mod = require(path.join(__dirname, f));
  if (!mod || !mod.id) throw new Error(`Task file ${f} must export an id`);
  if (tasks[mod.id]) throw new Error(`Duplicate task id: ${mod.id}`);
  tasks[mod.id] = mod;
}

module.exports = { tasks, getTask: (id) => (Object.prototype.hasOwnProperty.call(tasks, id) ? tasks[id] : null) };
