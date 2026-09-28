import { describe, expect, it } from "vitest";
import { newCampaign, prepareScenario } from "../campaign";
import { getScenario, WARS } from "../scenarios";
import { simulateBattle } from "../sim";

describe("AI 對打模擬:每場都能打完、沒有卡死", () => {
  const c = newCampaign("knight");
  for (const war of WARS) for (const b of war.battles) {
    it(`${b.scenarioId} 各難度都能分出勝負`, () => {
      const sc = prepareScenario(getScenario(b.scenarioId), c.tracks[war.id]);
      for (const diff of ["squire", "legend"] as const) {
        const r = simulateBattle(sc, c.tracks[war.id].roster, diff, 7);
        expect(r.outcome, `${diff}:${r.reason} 第 ${r.turns} 回合`).not.toBe("ongoing");
      }
    });
  }
  it("奇幻外傳第 1 關", () => {
    const r = simulateBattle(getScenario("m01"), c.tracks.fantasy.roster, "knight", 3);
    expect(r.outcome).not.toBe("ongoing");
  });
});
