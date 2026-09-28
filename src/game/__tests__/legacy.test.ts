import { describe, expect, it } from "vitest";
import { applyBattleResult, applyHeirs, newCampaign, relicMods } from "../campaign";
import { battleReducer, initBattle } from "../battle";
import { cellToHex } from "../maps";
import { convertHeir, recordHeirs } from "../legacy";
import { getScenario } from "../scenarios";
import { getSquadType } from "../units";

describe("跨時代傳承", () => {
  it("老兵轉成新時代同定位兵種:等級 −1、補滿、保留番號與戰功", () => {
    const vet = { id: "v", typeId: "saxon-huscarl", level: 4, xp: 45, soldiers: 9, honors: ["黑斯廷斯之戰"] };
    const h = convertHeir(vet, "english", "n");
    expect(getSquadType(h.typeId).role).toBe("heavyInf");
    expect(h.typeId).toBe("eng-manatarms");
    expect(h.level).toBe(3);
    expect(h.soldiers).toBeGreaterThan(9);
    expect(h.lineage).toContain("黑斯廷斯之戰");
    expect(h.honors).toEqual(["黑斯廷斯之戰"]);
    expect(convertHeir({ ...vet, typeId: "saxon-archer" }, "english", "a").typeId).toBe("eng-longbow");
  });

  it("1066 選的老兵,開啟百年戰爭時加進名冊(只加一次、不超過上限)", () => {
    let c = newCampaign("knight");
    const picks = c.tracks["war-1066"].roster.filter((r) => !r.commanderId).slice(0, 3);
    c = recordHeirs(c, "war-1066", picks);
    expect(c.legacy!.heirs).toHaveLength(2);
    const before = c.tracks["war-hyw"].roster.length;
    c = applyHeirs(c, "war-hyw");
    expect(c.tracks["war-hyw"].roster.length).toBe(before + 2);
    expect(c.tracks["war-hyw"].roster.some((r) => r.lineage)).toBe(true);
    expect(applyHeirs(c, "war-hyw").tracks["war-hyw"].roster.length).toBe(before + 2);
  });

  it("打完戰爭得到遺物;裝備後全軍帶加成;勝利記進戰功", () => {
    let c = newCampaign("knight");
    c.tracks["war-1066"].stage = 2;
    const sc = getScenario("1066-hastings");
    const b = { ...initBattle(sc, c.tracks["war-1066"].roster, "knight"), outcome: "victory" as const };
    c = applyBattleResult(c, "war-1066", b, sc).campaign;
    expect(c.legacy!.relics).toContain("wessex-dragon");
    expect(c.tracks["war-1066"].roster.some((r) => r.honors?.includes("黑斯廷斯之戰"))).toBe(true);
    const mods = relicMods({ ...c.tracks["war-hyw"], relic: "wessex-dragon" });
    const b2 = initBattle(getScenario("hyw-crecy"), c.tracks["war-hyw"].roster, "knight", 0, mods);
    expect(b2.squads.filter((s) => s.side === "player").every((s) => s.modifiers?.some((m) => m.damageMul === 1.05))).toBe(true);
  });

  it("奧爾良:一整輪結束時占領兩格堡壘即勝", () => {
    const sc = getScenario("hyw-orleans");
    let b = initBattle(sc, [], "knight");
    const [a, z] = b.squads.filter((s) => s.side === "player");
    b = {
      ...b,
      activeSide: "enemy",
      squads: b.squads.map((s) =>
        s.side === "enemy" ? { ...s, hpPool: 0 }
        : s.id === a.id ? { ...s, pos: cellToHex([15, 7]) }
        : s.id === z.id ? { ...s, pos: cellToHex([16, 7]) }
        : s),
      pendingReinforcements: [],
    };
    const after = battleReducer(b, { type: "END_TURN" });
    expect(after.outcome).toBe("victory");
    expect(after.outcomeReason).toBe("攻下目標陣地");
  });
});
