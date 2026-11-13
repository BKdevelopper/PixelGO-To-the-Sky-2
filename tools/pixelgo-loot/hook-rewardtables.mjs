#!/usr/bin/env node
/* =============================================================================
 *  Claude Code hook (PostToolUse, Edit|Write|MultiEdit) — .claude/settings.json
 * =============================================================================
 *  When a Mystery Bag loot table, one of its sub-tables (minions, Pokédolls)
 *  or a bag type is edited by hand, rebuild the four FTB Quests reward tables
 *  that mirror the bags (rewardtables.mjs). Any other file: does nothing.
 *
 *  Reads the hook payload on stdin; always exits 0. A failed rebuild is fed
 *  back to Claude (decision "block" + the script's report) so it gets fixed.
 * ========================================================================== */

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const WATCHED = /kubejs\/data\/(loot\/loot_table|pixelgo\/loot_table\/(minions|pokedolls)|pixelgo\/treasurebags_types)\/[^/]+\.json$/i;

let input = '';
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  let file = '';
  try {
    const j = JSON.parse(input);
    file = j.tool_input?.file_path || j.tool_response?.filePath || '';
  } catch { process.exit(0); }
  if (!WATCHED.test(file.replace(/\\/g, '/'))) process.exit(0);

  const run = spawnSync(process.execPath, [path.join(HERE, 'rewardtables.mjs')], { cwd: ROOT, encoding: 'utf8' });
  const report = `${run.stdout || ''}${run.stderr || ''}`.trim();
  const out = run.status === 0
    ? { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `FTB reward tables rebuilt from the Mystery Bags (rewardtables.mjs):\n${report}` } }
    : { decision: 'block', reason: `rewardtables.mjs failed after editing ${path.basename(file)} — the FTB reward tables are NOT in sync with the bags:\n${report}` };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
});
