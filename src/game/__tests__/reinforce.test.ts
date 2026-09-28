import { describe, expect, it } from "vitest";
import { battleReducer, initBattle, reinforceInfo } from "../battle";
import { applyBattleResult, newCampaign } from "../campaign";
import { aliveSoldiers, maxSoldiers } from "../progression";
import { getScenario } from "../scenarios";

describe("緊急整補", () => {
  const c = newCampaign("knight");
  const sc = getScenario("1066-stamford");
  const fresh = () => initBattle(sc, c.tracks["war-1066"].roster, "knight", 500);

  it("補回滿編 20%、花 3 倍補兵價、用掉本回合行動、每場一次", () => {
    let b = fresh();
    const sq = b.squads.find((s) => s.side === "player" && s.typeId === "saxon-fyrd")!;
    b = { ...b, squads: b.squads.map((s) => (s.id === sq.id ? { ...s, hpPool: Math.round(s.hpPool * 0.4) } : s)) };
    const before = aliveSoldiers(b.squads.find((s) => s.id === sq.id)!);
    const info = reinforceInfo(b, b.squads.find((s) => s.id === sq.id)!);
    expect(info.ok).toBe(true);
    expect(info.soldiers).toBe(Math.ceil(maxSoldiers("saxon-fyrd", 1) * 0.2));
    expect(info.cost).toBe(info.soldiers * 4 * 3);
    b = battleReducer(b, { type: "REINFORCE", squadId: sq.id });
    const after = b.squads.find((s) => s.id === sq.id)!;
    expect(aliveSoldiers(after)).toBe(before + info.soldiers);
    expect(after.acted).toBe(true);
    expect(b.gold).toBe(500 - info.cost);
    expect(reinforceInfo(b, after).ok).toBe(false);
    const nextTurn = battleReducer(battleReducer(b, { type: "END_TURN" }), { type: "END_TURN" });
    expect(reinforceInfo(nextTurn, nextTurn.squads.find((s) => s.id === sq.id)!).reason).toBe("本場已整補過");
  });

  it("錢不夠、滿編、貼著敵軍都不能整補", () => {
    const b = { ...fresh(), gold: 0 };
    const sq = b.squads.find((s) => s.side === "player")!;
    expect(reinforceInfo(b, sq).reason).toBe("人數已滿");
    const hurt = { ...sq, hpPool: 10 };
    expect(reinforceInfo(b, hurt).reason).toMatch(/金幣不足/);
    const foe = b.squads.find((s) => s.side === "enemy")!;
    const contact = { ...hurt, pos: { q: foe.pos.q - 1, r: foe.pos.r } };
    expect(reinforceInfo({ ...b, gold: 999 }, contact).reason).toBe("正與敵軍交戰");
  });

  it("結算時從戰役線扣掉花費", () => {
    const b = { ...fresh(), goldSpent: 120, outcome: "victory" as const };
    const r = applyBattleResult(c, "war-1066", b, sc);
    expect(r.campaign.tracks["war-1066"].gold).toBe(c.tracks["war-1066"].gold - 120 + r.result.goldEarned);
  });
});
