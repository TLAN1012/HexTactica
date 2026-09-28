import { describe, expect, it } from "vitest";
import { hexKey } from "../../engine/hex";
import { buildMap } from "../battle";
import { getCommander } from "../factions";
import { cellToHex } from "../maps";
import { allScenarios, WARS, getScenario } from "../scenarios";
import { getTerrain } from "../terrain";
import { getSquadType } from "../units";
import type { Cell, ScenarioSquad } from "../types";

describe("劇本資料完整性", () => {
  for (const sc of allScenarios()) {
    it(`${sc.id} ${sc.title}`, () => {
      const map = buildMap(sc);
      const passable = (c: Cell, what: string) => {
        const t = map.terrain[hexKey(cellToHex(c))];
        expect(t, `${what} ${c} 不在地圖內`).toBeDefined();
        expect(getTerrain(t).impassable, `${what} ${c} 是不可通行地形`).toBeFalsy();
      };
      const squads: ScenarioSquad[] = [
        ...sc.enemies,
        ...(sc.playerFixed ?? []),
        ...(sc.reinforcements ?? []).flatMap((r) => r.squads),
      ];
      for (const s of squads) {
        expect(() => getSquadType(s.typeId)).not.toThrow();
        if (s.at) passable(s.at, `${s.typeId} 出生點`);
        if (s.commanderId) expect(() => getCommander(s.commanderId!)).not.toThrow();
      }
      for (const c of sc.playerDeploy ?? []) passable(c, "我方佈署格");
      for (const v of sc.victory) if (v.kind === "holdUntil") v.hexes.forEach((c) => passable(c, "目標格"));
      for (const d of sc.defeat) {
        if (d.kind === "hexesLost") d.hexes.forEach((c) => passable(c, "失守格"));
        if (d.kind === "commanderLost") expect(() => getCommander(d.commanderId)).not.toThrow();
      }
      const at = squads.filter((s) => s.at).map((s) => s.at!.join(","));
      const initial = [...sc.enemies, ...(sc.playerFixed ?? [])].filter((s) => s.at).map((s) => s.at!.join(","));
      expect(new Set(initial).size, "開場部隊出生點重疊").toBe(initial.length);
      expect(at.length).toBeGreaterThanOrEqual(0);
    });
  }

  it("每場戰爭的戰役都存在", () => {
    for (const w of WARS) for (const b of w.battles) expect(() => getScenario(b.scenarioId)).not.toThrow();
  });
});
