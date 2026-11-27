/** CommonJS port of lib/memory (prompt block + layer grouping; persistence stays in the endpoints). */
function buildMemoryPrompt(short = [], mid = [], long = []) {
  const latestShort = (short[0] && short[0].data) ?? null;
  const latestMid = (mid[0] && mid[0].data) ?? null;
  const latestLong = (long[0] && long[0].data) ?? null;

  return `
==== MEMORY CONTEXT ====

SHORT-TERM (recent messages & actions):
${JSON.stringify(latestShort, null, 2)}

MID-TERM (patterns & preferences):
${JSON.stringify(latestMid, null, 2)}

LONG-TERM (account-level insights):
${JSON.stringify(latestLong, null, 2)}

Use this memory to:
- Stay consistent with prior conversations.
- Respect their preferences and tone.
- Avoid repeating questions or offers they've rejected.
=========================
`;
}

/** Same grouping as loadAgentMemory: rows are expected newest-first. */
function groupMemory(rows) {
  const data = rows || [];
  return {
    short: data.filter((d) => d.memory_type === 'short'),
    mid: data.filter((d) => d.memory_type === 'mid'),
    long: data.filter((d) => d.memory_type === 'long'),
  };
}

module.exports = { buildMemoryPrompt, groupMemory };
