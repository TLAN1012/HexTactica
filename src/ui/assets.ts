/** 美術路徑:全部在 public/art/ 底下,部署在 GitHub Pages 子路徑也能用 */
import { getCommander } from "../game/factions";
import { getSquadType } from "../game/units";

const BASE = import.meta.env.BASE_URL + "art/";

export const artUrl = (path: string) => BASE + path;
export const unitArt = (typeId: string) => BASE + "units/" + getSquadType(typeId).art;
export const terrainArt = (id: string) => BASE + "terrain/" + id + ".webp";
export const portraitArt = (commanderId: string) => BASE + "portraits/" + getCommander(commanderId).portrait;
export const storyArt = (file: string) => BASE + "story/" + file;

/** 戰場小人(透明背景)。指揮官用 cmd-<id> */
export const spriteArt = (id: string) => BASE + "sprites/" + id + ".webp";

/**
 * 小人圖原本臉朝的方向(畫的時候要求朝右,少數沒照做的在這裡登記)。
 * 戰場上我方一律朝右(往敵陣)、敵方朝左,需要時水平翻轉。
 */
export const SPRITE_FACES_LEFT = new Set<string>(["heavy-cavalry", "norman-knight", "troll-crusher", "eng-manatarms", "fr-manatarms", "genoese", "cmd-johnbohemia", "cmd-philip6"]);
