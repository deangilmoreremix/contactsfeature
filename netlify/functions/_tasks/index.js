/**
 * Task registry for ai-task. One file per task id (= the old edge-function name the UI used).
 * Add a task: create _tasks/<id>.js (see smart-score.js for the contract) and list it below.
 *   { id, role, effort, tools?, moderate?, schema, load({user,params}), buildInput(ctx,params), finalize?(parsed,ctx,params), outboundText?(payload) }
 */
const tasks = {};
for (const mod of [
  require('./smart-score'),
  require('./personalized-messages'),
]) tasks[mod.id] = mod;

module.exports = { tasks, getTask: (id) => (Object.prototype.hasOwnProperty.call(tasks, id) ? tasks[id] : null) };
