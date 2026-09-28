import { describe, expect, it } from "vitest";
import { analyzeAttack, damageBounds } from "../combat";
import { cellToHex } from "../maps";
import type { BattleState, Squad } from "../types";

function mkState(squads: Squad[], extra: Partial<BattleState> = {}): BattleState {
  const terrain: Record<string, string> = {};
  for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++) {
    const h = cellToHex([c, r]);
    terrain[`${h.q},${h.r}`] = "plains";
  }
  return {
    scenarioId: "t", missionId: "t", turn: 1, activeSide: "player", terrain, width: 10, height: 8,
    squads, log: [], outcome: "ongoing", kills: {}, difficulty: "knight", enemyStatMul: 1,
    victory: [], defeat: [], pendingReinforcements: [], objectiveHexes: [], gold: 0, goldSpent: 0, reinforced: [], ...extra,
  };
}
function sq(id: string, typeId: string, side: "player" | "enemy", cell: [number, number], extra: Partial<Squad> = {}): Squad {
  return { id, typeId, side, pos: cellToHex(cell), level: 1, xp: 0, hpPool: 200, movedThisActivation: 0, acted: false, moved: false, retaliations: 1, ...extra };
}

describe("傷害公式", () => {
  it("盾牆:相鄰有盾牆友軍時承傷變少,並擋下騎士衝鋒", () => {
    const knight = sq("k", "norman-knight", "enemy", [5, 3], { movedThisActivation: 4 });
    const lone = mkState([knight, sq("a", "saxon-huscarl", "player", [4, 3])]);
    const wall = mkState([knight, sq("a", "saxon-huscarl", "player", [4, 3]), sq("b", "saxon-fyrd", "player", [4, 2]), sq("c", "saxon-fyrd", "player", [4, 4])]);
    const ctxLone = analyzeAttack(lone, knight, lone.squads[1], knight.pos, 4);
    const ctxWall = analyzeAttack(wall, knight, wall.squads[1], knight.pos, 4);
    expect(ctxLone.chargeBonus).toBeGreaterThan(0);
    expect(ctxWall.chargeBonus).toBe(0);
    expect(ctxWall.chargeBlockedBy).toBe("盾牆");
    expect(damageBounds(wall, knight, wall.squads[1], ctxWall)[1]).toBeLessThan(damageBounds(lone, knight, lone.squads[1], ctxLone)[1]);
  });

  it("穿甲:弩對重甲比弓更有效", () => {
    const target = sq("t", "saxon-huscarl", "player", [3, 3]);
    const xbow = sq("x", "norman-crossbow", "enemy", [5, 3]);
    const s = mkState([target, xbow]);
    const ctx = analyzeAttack(s, xbow, target);
    expect(ctx.pierce).toBe(true);
    const noPierce = { ...ctx, pierce: false };
    expect(damageBounds(s, xbow, target, ctx)[1]).toBeGreaterThan(damageBounds(s, xbow, target, noPierce)[1]);
  });

  it("指揮官光環:與指揮官相鄰 +15%", () => {
    const foe = sq("f", "norse-raider", "enemy", [5, 3]);
    const atk = sq("a", "saxon-fyrd", "player", [4, 3]);
    const without = mkState([foe, atk]);
    const withCmd = mkState([foe, atk, sq("h", "saxon-huscarl", "player", [3, 3], { commanderId: "harold" })]);
    expect(analyzeAttack(without, atk, foe).commanderBonus).toBe(0);
    expect(analyzeAttack(withCmd, atk, foe).commanderBonus).toBeCloseTo(0.15);
  });

  it("難度倍率:敵方出手變痛、挨打變輕", () => {
    const p = sq("p", "saxon-fyrd", "player", [4, 3]);
    const e = sq("e", "norse-raider", "enemy", [5, 3]);
    const hard = mkState([p, e], { enemyStatMul: 1.2 });
    expect(analyzeAttack(hard, e, p).attackerMul).toBeCloseTo(1.2);
    expect(analyzeAttack(hard, p, e).attackerMul).toBeCloseTo(1 / 1.2);
  });

  it("村莊與渡口不能衝鋒", () => {
    const knight = sq("k", "norman-knight", "enemy", [5, 3], { movedThisActivation: 3 });
    const target = sq("t", "saxon-archer", "player", [4, 3]);
    const s = mkState([knight, target]);
    s.terrain[`${target.pos.q},${target.pos.r}`] = "village";
    expect(analyzeAttack(s, knight, target, knight.pos, 3).chargeBonus).toBe(0);
  });
});
