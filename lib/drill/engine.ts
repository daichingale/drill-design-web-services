// lib/drill/engine.ts
import type { Drill, WorldPos } from "./types";

/**
 * DrillEngine
 * - countsPerSecond: 1秒あたり何カウント進めるか（例: 16）
 * - currentCount: 現在のカウント（小数もあり得る）
 * - playing: 再生中かどうか
 *
 * positionsByMember は
 *   memberId -> { count(Number) -> WorldPos }
 * という「キー付きキーフレーム」として扱い、
 * currentCount の前後のキーの間を線形補間して座標を出す。
 */
export class DrillEngine {
  private drill: Drill;
  private countsPerSecond: number;
  public currentCount: number;
  private playing: boolean;

  constructor(drill: Drill, countsPerSecond: number = 16) {
    this.drill = drill;
    this.countsPerSecond = countsPerSecond;
    this.currentCount = 0;
    this.playing = false;
  }

  /** 新しいドリルデータをセット（カウントは 0 に戻す） */
  setDrill(drill: Drill) {
    this.drill = drill;
    this.currentCount = 0;
  }

  /** 再生開始位置をセット */
  setCount(count: number) {
    this.currentCount = Math.max(0, Math.min(count, this.drill.maxCount));
  }

  /** 再生速度を設定（1秒あたりのカウント数） */
  setCountsPerSecond(countsPerSecond: number) {
    this.countsPerSecond = countsPerSecond;
  }

  play() {
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** 毎フレーム呼ぶ。dt は秒単位。*/
  update(dt: number) {
    if (!this.playing) return;

    this.currentCount += this.countsPerSecond * dt;

    if (this.currentCount > this.drill.maxCount) {
      this.currentCount = this.drill.maxCount;
      this.playing = false;
    }
    if (this.currentCount < 0) {
      this.currentCount = 0;
      this.playing = false;
    }
  }

  /**
   * 現在カウントでの全メンバーの位置を返す。
   * 各メンバーについて:
   *  - そのメンバーのキーフレームのうち、
   *    currentCount の直前と直後の2つを探して線形補間
   *  - 直前しかなければその位置をそのまま使う
   */
  getCurrentPositionsMap(): Record<string, WorldPos> {
    const result: Record<string, WorldPos> = {};
    const t = this.currentCount;
    const positionsByMember = this.drill.positionsByMember;

    for (const memberId of Object.keys(positionsByMember)) {
      const keyframes = positionsByMember[memberId];
      const keys = Object.keys(keyframes)
        .map((k) => Number(k))
        .sort((a, b) => a - b);

      if (keys.length === 0) continue;

      // currentCount の両側になる key を探す
      let prevKey = keys[0];
      let nextKey = keys[0];

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k <= t) {
          prevKey = k;
          nextKey = k;
        }
        if (k > t) {
          nextKey = k;
          break;
        }
      }

      const pPrev = keyframes[prevKey];
      const pNext = keyframes[nextKey] ?? pPrev;
      if (!pPrev || !pNext) continue;

      let ratio = 0;
      if (prevKey !== nextKey) {
        ratio = (t - prevKey) / (nextKey - prevKey);
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;
      }

      result[memberId] = {
        x: pPrev.x + (pNext.x - pPrev.x) * ratio,
        y: pPrev.y + (pNext.y - pPrev.y) * ratio,
      };
    }

    return result;
  }
}
