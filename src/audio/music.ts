/**
 * WebAudio 程序化配樂 — 全原創作曲。
 *
 * 兩首循環 BGM:
 *  - "camp"  營地曲:D dorian、72 BPM,豎琴式琶音 + 溫暖長音和弦
 *  - "battle" 戰鬥曲:D minor、100 BPM,戰鼓 + 頑固低音 + 調式短句
 *
 * 音效:melee / ranged / retaliate / death / victory / defeat
 *
 * 不載入任何音檔,全部由 oscillator + noise 即時合成,
 * 首次使用者互動後才建立 AudioContext(瀏覽器 autoplay 政策)。
 */

type TrackId = "camp" | "battle";

// ── 音高工具 ────────────────────────────────────────────
const A4 = 440;
/** MIDI 音號 → 頻率 */
const f = (midi: number) => A4 * Math.pow(2, (midi - 69) / 12);

// D dorian / D minor 常用音(MIDI):D=62
const N = {
  D2: 38, A2: 45, Bb2: 46, C3: 48, D3: 50, F3: 53, G3: 55, A3: 57, Bb3: 58, C4: 60,
  D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, Bb4: 70, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81,
};

// ── 樂曲資料(原創)────────────────────────────────────
// 營地曲:每小節一組琶音(和弦進行 Dm → F → C → Am,4/4)
const CAMP_BARS: number[][] = [
  [N.D3, N.A3, N.D4, N.F4, N.A4, N.F4, N.D4, N.A3], // Dm
  [N.F3, N.C4, N.F4, N.A4, N.C5, N.A4, N.F4, N.C4], // F
  [N.C3, N.G3, N.C4, N.E4, N.G4, N.E4, N.C4, N.G3], // C
  [N.A2, N.E4, N.A3, N.C4, N.E4, N.C4, N.A3, N.E4], // Am
];
const CAMP_PADS: number[][] = [
  [N.D3, N.F3, N.A3],
  [N.F3, N.A3, N.C4],
  [N.C3, N.E4 - 12, N.G3],
  [N.A2, N.C4 - 12, N.E4 - 12],
];
// 營地旋律(每小節 4 個半拍音,0 = 休止)
const CAMP_MELODY: number[][] = [
  [N.A4, 0, N.F4, N.G4],
  [N.A4, 0, N.C5, N.A4],
  [N.G4, 0, N.E4, N.G4],
  [N.A4, N.G4, N.F4, N.E4],
];

// 戰鬥曲:頑固低音(八分音符)與旋律短句
const BATTLE_BASS: number[][] = [
  [N.D2, N.D2, N.D3, N.D2, N.D2, N.D2, N.C3, N.D3],
  [N.D2, N.D2, N.D3, N.D2, N.D2, N.D2, N.C3, N.D3],
  [N.Bb2, N.Bb2, N.Bb3, N.Bb2, N.C3, N.C3, N.C4 - 12, N.C3],
  [N.D2, N.D2, N.D3, N.D2, N.A2, N.A2, N.C3, N.C3],
];
const BATTLE_MELODY: number[][] = [
  [N.D4, 0, N.F4, N.G4, N.A4, 0, 0, N.G4],
  [N.F4, 0, N.D4, 0, N.E4, N.F4, N.E4, 0],
  [N.Bb4, 0, N.A4, N.G4, N.C5, 0, N.A4, 0],
  [N.D5, 0, N.C5, N.A4, N.G4, N.F4, N.E4, N.D4],
];
// 鼓組:k=大鼓 s=小鼓 h=輕擊 . =休止(八分音符 × 8)
const BATTLE_DRUMS = "k.h.s.hhk.h.s.hs";

// ═══════════════════════════════════════════════════════
// 引擎
// ═══════════════════════════════════════════════════════

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private timer: number | null = null;
  private current: TrackId | null = null;
  private bar = 0;
  private muted: boolean;

  constructor() {
    this.muted = (() => {
      try {
        return localStorage.getItem("hextactica-muted") === "1";
      } catch {
        return false;
      }
    })();
  }

  /** 需在使用者手勢中呼叫(點擊等) */
  ensureContext(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.5;
    this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
  }

  isReady(): boolean {
    return this.ctx !== null;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem("hextactica-muted", m ? "1" : "0");
    } catch {
      /* noop */
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  }

  // ── BGM ──────────────────────────────────────────────
  playBgm(track: TrackId): void {
    if (this.current === track) return;
    this.stopBgm();
    this.current = track;
    if (!this.ctx) return; // context 建立後由 resumeBgm 重新啟動
    this.bar = 0;
    this.scheduleLoop();
  }

  /** context 剛建立時,把先前指定的曲子真正放出來 */
  resumeBgm(): void {
    if (this.ctx && this.current && this.timer === null) {
      this.bar = 0;
      this.scheduleLoop();
    }
  }

  stopBgm(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.current = null;
  }

  private scheduleLoop(): void {
    if (!this.ctx || !this.current) return;
    const track = this.current;
    const bpm = track === "camp" ? 72 : 100;
    const barSec = (60 / bpm) * 4;
    const t0 = this.ctx.currentTime + 0.05;
    this.playBar(track, this.bar % 4, t0, barSec);
    this.bar++;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (this.current === track) this.scheduleLoop();
    }, barSec * 1000 - 30);
  }

  private playBar(track: TrackId, bar: number, t0: number, barSec: number): void {
    if (track === "camp") {
      const eighth = barSec / 8;
      CAMP_BARS[bar].forEach((m, i) => {
        this.pluck(f(m), t0 + i * eighth, eighth * 1.8, 0.16, "triangle");
      });
      // 長音和弦墊底
      for (const m of CAMP_PADS[bar]) {
        this.pad(f(m), t0, barSec * 1.02, 0.05);
      }
      const half = barSec / 4;
      CAMP_MELODY[bar].forEach((m, i) => {
        if (m) this.pluck(f(m) * 2, t0 + i * half, half * 1.6, 0.07, "sine");
      });
    } else {
      const eighth = barSec / 8;
      BATTLE_BASS[bar].forEach((m, i) => {
        this.pluck(f(m), t0 + i * eighth, eighth * 0.9, 0.22, "sawtooth", 700);
      });
      BATTLE_MELODY[bar].forEach((m, i) => {
        if (m) this.pluck(f(m), t0 + i * eighth, eighth * 1.4, 0.12, "square", 1600);
      });
      const drums = BATTLE_DRUMS.slice(bar % 2 === 0 ? 0 : 8);
      for (let i = 0; i < 8; i++) {
        const ch = drums[i];
        const t = t0 + i * eighth;
        if (ch === "k") this.kick(t);
        else if (ch === "s") this.snare(t, 0.5);
        else if (ch === "h") this.snare(t, 0.12);
      }
    }
  }

  // ── 合成器基元 ───────────────────────────────────────
  private pluck(
    freq: number,
    t: number,
    dur: number,
    vol: number,
    type: OscillatorType,
    cutoff = 2400,
  ): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp).connect(g).connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private pad(freq: number, t: number, dur: number, vol: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp).connect(g).connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private kick(t: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g).connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private snare(t: number, vol: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp).connect(g).connect(this.bgmGain);
    src.start(t);
    src.stop(t + 0.12);
  }

  // ── SFX ──────────────────────────────────────────────
  playSfx(id: string): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime + 0.01;
    switch (id) {
      case "melee":
      case "retaliate": {
        // 金屬碰撞:高頻 noise burst + 短促方波
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer();
        const hp = this.ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = id === "melee" ? 2600 : 1700;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        src.connect(hp).connect(g).connect(this.sfxGain);
        src.start(t);
        src.stop(t + 0.2);
        break;
      }
      case "ranged": {
        // 箭矢破空:帶通掃頻
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer();
        const bp = this.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 6;
        bp.frequency.setValueAtTime(3600, t);
        bp.frequency.exponentialRampToValueAtTime(700, t + 0.28);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        src.connect(bp).connect(g).connect(this.sfxGain);
        src.start(t);
        src.stop(t + 0.35);
        break;
      }
      case "death": {
        // 低沉悶響
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.5);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(g).connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.65);
        break;
      }
      case "victory": {
        // 短號角:上行三和弦(原創音型)
        [N.D4, N.F4, N.A4, N.D5].forEach((m, i) => {
          this.fanfare(f(m), t + i * 0.16, i === 3 ? 0.7 : 0.2);
        });
        break;
      }
      case "defeat": {
        [N.A3, N.F3, N.D3].forEach((m, i) => {
          this.fanfare(f(m), t + i * 0.3, i === 2 ? 0.9 : 0.32);
        });
        break;
      }
    }
  }

  private fanfare(freq: number, t: number, dur: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.03);
    g.gain.setValueAtTime(0.22, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp).connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}
