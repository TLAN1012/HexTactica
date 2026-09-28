import { it } from "vitest";
import { newCampaign, prepareScenario } from "../src/game/campaign";
import { hexToCell } from "../src/game/maps";
import { getScenario } from "../src/game/scenarios";
import { simulateBattle } from "../src/game/sim";
import { aliveSoldiers } from "../src/game/progression";

it.runIf(process.env.TRACE)("trace", () => {
  const c = newCampaign("knight");
  const sc = prepareScenario(getScenario(process.env.TRACE!), c.tracks["war-1066"]);
  const r = simulateBattle(sc, c.tracks["war-1066"].roster, (process.env.DIFF as any) ?? "knight", 1001, Number(process.env.SKILL ?? 0.75));
  const lines = r.final.log.filter((l) => l.kind !== "move").map((l) => `T${l.turn} ${l.text}`);
  console.log(lines.slice(0, 400).join("\n"));
  console.log("RESULT", r.outcome, r.reason, r.turns);
  for (const s of r.final.squads) console.log(s.side, s.typeId, s.commanderId ?? "", hexToCell(s.pos).join(","), aliveSoldiers(s));
}, 120000);
