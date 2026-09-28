/** 美術路徑:全部在 public/art/ 底下,部署在 GitHub Pages 子路徑也能用 */
import { getCommander } from "../game/factions";
import { getSquadType } from "../game/units";

const BASE = import.meta.env.BASE_URL + "art/";

export const artUrl = (path: string) => BASE + path;
export const unitArt = (typeId: string) => BASE + "units/" + getSquadType(typeId).art;
export const terrainArt = (id: string) => BASE + "terrain/" + id + ".webp";
export const portraitArt = (commanderId: string) => BASE + "portraits/" + getCommander(commanderId).portrait;
export const storyArt = (file: string) => BASE + "story/" + file;
