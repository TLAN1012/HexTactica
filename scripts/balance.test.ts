/**
 * 平衡報告(不在一般測試中跑):BALANCE=1 npx vitest run scripts/balance.test.ts
 * 每個劇本 × 難度,讓 AI 雙方各打 N 場,印出玩家勝率與平均回合數。
 */
import { it } from "vitest";
import { newCampaign, prepareScenario } from "../src/game/campaign";
import { getScenario, WARS } from "../src/game/scenarios";
import { simulateBattle } from "../src/game/sim";
import type { DifficultyId } from "../src/game/types";

const N = Number(process.env.N ?? 20);
const SKILL = Number(process.env.SKILL ?? 0.75);
it.runIf(process.env.BALANCE)("balance report", () => {
  const c = newCampaign("knight");
  const rows: string[] = [];
  for (const war of WARS.filter((w) => !process.env.WAR || w.id.includes(process.env.WAR))) for (const b of war.battles.filter((x) => !process.env.ONLY || x.scenarioId.includes(process.env.ONLY))) {
    const sc = prepareScenario(getScenario(b.scenarioId), c.tracks[war.id]);
    for (const d of ["squire", "knight", "lord", "legend"] as DifficultyId[]) {
      let wins = 0, turns = 0;
      const reasons: Record<string, number> = {};
      for (let i = 0; i < N; i++) {
        const r = simulateBattle(sc, c.tracks[war.id].roster, d, 1000 + i, SKILL);
        if (r.outcome === "victory") wins++;
        turns += r.turns;
        reasons[r.reason ?? "?"] = (reasons[r.reason ?? "?"] ?? 0) + 1;
      }
      rows.push(`${sc.id.padEnd(16)} ${d.padEnd(7)} 勝率 ${String(Math.round((wins / N) * 100)).padStart(3)}%  平均 ${(turns / N).toFixed(1)} 回合  ${JSON.stringify(reasons)}`);
    }
  }
  console.log("\n玩家 AI 技巧 " + SKILL + "\n" + rows.join("\n"));
}, 600000);
