import { describe, expect, it } from "vitest";
import { applyBattleResult, migrateV1, newCampaign, prepareScenario } from "../campaign";
import { initBattle } from "../battle";
import { getScenario } from "../scenarios";

describe("戰役存檔與戰爭推進", () => {
  it("v1 存檔搬進 fantasy 線,1066 戰爭從頭開始", () => {
    const c = migrateV1({ version: 1, gold: 999, completedMissions: ["m01"], roster: [] });
    expect(c.version).toBe(2);
    expect(c.tracks.fantasy.gold).toBe(999);
    expect(c.tracks["war-1066"].stage).toBe(0);
  });

  it("富爾福德打輸也推進劇情,挪威軍損失帶到斯坦福橋", () => {
    let c = newCampaign("knight");
    const fulford = getScenario("1066-fulford");
    const battle = initBattle(fulford, c.tracks["war-1066"].roster, "knight");
    // 模擬:殺掉挪威軍一半兵力後戰敗
    battle.squads = battle.squads.map((s) => (s.side === "enemy" ? { ...s, hpPool: Math.round(s.hpPool / 2) } : s));
    battle.outcome = "defeat";
    const r = applyBattleResult(c, "war-1066", battle, fulford);
    c = r.campaign;
    expect(r.result.advanced).toBe(true);
    expect(c.tracks["war-1066"].stage).toBe(1);
    expect(c.tracks["war-1066"].flags!.norseLosses).toBeGreaterThan(0.4);
    const stamford = prepareScenario(getScenario("1066-stamford"), c.tracks["war-1066"]);
    expect(stamford.enemies[0].casualties).toBeGreaterThan(0.2);
    // 富爾福德不帶名冊:哈羅德的部隊沒有戰損
    expect(c.tracks["war-1066"].roster.length).toBe(6);
  });

  it("斯坦福橋輸了不推進", () => {
    const c = newCampaign("knight");
    c.tracks["war-1066"].stage = 1;
    const sc = getScenario("1066-stamford");
    const battle = { ...initBattle(sc, c.tracks["war-1066"].roster, "knight"), outcome: "defeat" as const };
    const r = applyBattleResult(c, "war-1066", battle, sc);
    expect(r.result.advanced).toBeFalsy();
    expect(r.campaign.tracks["war-1066"].stage).toBe(1);
  });
});
