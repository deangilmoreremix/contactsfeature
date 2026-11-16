// Single implementation lives in the Netlify layer (pure, unit-tested); re-exported here.
// @ts-ignore - CommonJS module
export { computeFreeSlots, proposeTimes, hasConflict } from "../../netlify/functions/_availability.js";
