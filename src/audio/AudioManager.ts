/**
 * AudioManager — WebAudio 實作(原創程序化配樂,見 music.ts)。
 *
 * 使用方式:
 *   audio.unlock()            // 任何使用者手勢中呼叫(建立 AudioContext)
 *   audio.playBgm("camp")     // "camp" | "battle"
 *   audio.playSfx("melee")    // melee/ranged/retaliate/death/victory/defeat
 *   audio.toggleMute()
 */
import { MusicEngine } from "./music";

export type BgmId = "camp" | "battle";
export type SfxId = "melee" | "ranged" | "retaliate" | "death" | "victory" | "defeat";

class AudioManager {
  private engine = new MusicEngine();

  /** 在使用者手勢中呼叫;重複呼叫無害 */
  unlock(): void {
    const wasReady = this.engine.isReady();
    this.engine.ensureContext();
    if (!wasReady) this.engine.resumeBgm();
  }

  playBgm(id: BgmId): void {
    this.engine.playBgm(id);
  }

  stopBgm(): void {
    this.engine.stopBgm();
  }

  playSfx(id: SfxId): void {
    this.engine.playSfx(id);
  }

  isMuted(): boolean {
    return this.engine.isMuted();
  }

  toggleMute(): boolean {
    const next = !this.engine.isMuted();
    this.engine.setMuted(next);
    return next;
  }
}

export const audio = new AudioManager();
