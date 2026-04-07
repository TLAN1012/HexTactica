/**
 * 音效介面 — v1 為 no-op 實作。
 * 未來接入真實 Web Audio 時，只需改 createAudio() 的回傳實例，
 * 其餘程式碼不需動。
 */

export interface AudioManager {
  loadTrack(id: string, url: string): Promise<void>;
  playBgm(id: string, loop?: boolean): void;
  stopBgm(fadeMs?: number): void;
  playSfx(id: string): void;
  setMasterVolume(v: number): void; // 0.0 - 1.0
  setBgmVolume(v: number): void;
  setSfxVolume(v: number): void;
  isMuted(): boolean;
  mute(muted: boolean): void;
}

/** 預期會被 UI 呼叫的 SFX id 清單（實作時對照） */
export const SFX_EVENTS = {
  CHARGE: "charge",
  CLASH: "clash",
  ROUT: "rout",
  ARROWS: "arrows",
  JAVELIN: "javelin",
  HORN: "horn",
  MARCH: "march",
  DIE_ROLL: "die-roll",
} as const;

export const BGM_TRACKS = {
  MENU: "menu",
  BATTLE_ANCIENT: "battle-ancient",
  BATTLE_MEDIEVAL: "battle-medieval",
  VICTORY: "victory",
  DEFEAT: "defeat",
} as const;

class NoopAudioManager implements AudioManager {
  private muted = false;
  async loadTrack(_id: string, _url: string): Promise<void> {
    /* no-op */
  }
  playBgm(_id: string, _loop?: boolean): void {
    /* no-op */
  }
  stopBgm(_fadeMs?: number): void {
    /* no-op */
  }
  playSfx(_id: string): void {
    /* no-op */
  }
  setMasterVolume(_v: number): void {
    /* no-op */
  }
  setBgmVolume(_v: number): void {
    /* no-op */
  }
  setSfxVolume(_v: number): void {
    /* no-op */
  }
  isMuted(): boolean {
    return this.muted;
  }
  mute(muted: boolean): void {
    this.muted = muted;
  }
}

export function createAudio(): AudioManager {
  return new NoopAudioManager();
}

/** 全域單例，方便 UI 直接 import 使用 */
export const audio: AudioManager = createAudio();
