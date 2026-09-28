/** 兵種特性的一句話說明(戰鬥資訊卡、軍營共用) */
import type { TraitId } from "../game/types";

export const TRAIT_INFO: Record<TraitId, string> = {
  charge: "衝鋒:移動越多格,近戰越痛(每格 +15%,上限 +60%)",
  firstStrike: "先制:被近戰攻擊時先反擊",
  antiCavalry: "克騎:對騎兵 +30%,並讓衝鋒失效",
  volley: "拋射:遠程不因距離衰減",
  skirmisher: "散兵:貼身也能用投射武器",
  shieldWall: "盾牆:旁邊有盾牆友軍時承傷 −15%/−25%,騎兵衝不動",
  berserk: "狂暴:主動近戰 +25%",
  pierce: "穿甲:無視目標一半的護甲",
  levy: "民兵:便宜量多",
};

/** 特性名稱(敵方資料卡只寫名稱,不寫數字) */
export const TRAIT_NAME: Record<TraitId, string> = {
  charge: "衝鋒",
  firstStrike: "先制",
  antiCavalry: "克騎",
  volley: "拋射",
  skirmisher: "散兵",
  shieldWall: "盾牆",
  berserk: "狂暴",
  pierce: "穿甲",
  levy: "民兵",
};
