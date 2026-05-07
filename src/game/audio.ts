/**
 * 🎵 Web Audio API 音效合成模块
 * 宝宝体感游戏 - 程序化音效合成器
 *
 * 5种音效：
 * 1. slice  - 🍉 切割声（水果被切开）
 * 2. burst  - 🎈 爆破声（气球扎破）
 * 3. ding   - ✨ 叮声（得分/收集成功）
 * 4. fail   - ❌ 失败声（错过/超时）
 * 5. whoosh - 💨 挥手声（手势轨迹反馈）
 */

export class GameAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _initialized = false

  get initialized(): boolean {
    return this._initialized
  }

  /** 初始化音频引擎 - 必须在用户交互事件中调用 */
  init(): void {
    if (this._initialized) return

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextCtor) {
      console.warn('Web Audio API 不可用')
      return
    }

    this.ctx = new AudioContextCtor()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.6 // 主音量，宝宝产品不宜过大
    this.masterGain.connect(this.ctx.destination)

    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    this._initialized = true
  }

  /** 确保音频上下文已激活 */
  ensureResumed(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // ============================================================
  // 🍉 切割声 - 短促的上升扫频 + 白噪声混合
  // ============================================================
  playSlice(): void {
    if (!this._initialized || !this.ctx || !this.masterGain) return
    this.ensureResumed()
    const ctx = this.ctx
    const now = ctx.currentTime

    // 主音：快速上升的锯齿波扫频
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15)

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.3, now)
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    // 高频噪声层
    const noiseBuffer = this._createNoiseBuffer(0.12)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 2000

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.15, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)

    osc.connect(oscGain).connect(this.masterGain)
    noise.connect(noiseFilter).connect(noiseGain).connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.15)
    noise.start(now)
    noise.stop(now + 0.12)
  }

  // ============================================================
  // 🎈 爆破声 - 低频砰声 + 噪声爆发
  // ============================================================
  playBurst(): void {
    if (!this._initialized || !this.ctx || !this.masterGain) return
    this.ensureResumed()
    const ctx = this.ctx
    const now = ctx.currentTime

    // 低频冲击
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2)

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.5, now)
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    // 宽带噪声爆发
    const noiseBuffer = this._createNoiseBuffer(0.15)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.4, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    // 共振峰值
    const resonance = ctx.createBiquadFilter()
    resonance.type = 'peaking'
    resonance.frequency.value = 800
    resonance.Q.value = 5
    resonance.gain.value = 15

    osc.connect(oscGain).connect(this.masterGain)
    noise.connect(resonance).connect(noiseGain).connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.25)
    noise.start(now)
    noise.stop(now + 0.15)
  }

  // ============================================================
  // ✨ 叮声 - 纯净的上升双音阶
  // ============================================================
  playDing(): void {
    if (!this._initialized || !this.ctx || !this.masterGain) return
    this.ensureResumed()
    const ctx = this.ctx
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1760, now)

    const gain1 = ctx.createGain()
    gain1.gain.setValueAtTime(0.35, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    const gain2 = ctx.createGain()
    gain2.gain.setValueAtTime(0.15, now)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    // 混响
    const delay = ctx.createDelay()
    delay.delayTime.value = 0.08
    const delayGain = ctx.createGain()
    delayGain.gain.value = 0.2

    osc1.connect(gain1).connect(this.masterGain)
    osc2.connect(gain2).connect(this.masterGain)
    gain1.connect(delay).connect(delayGain).connect(this.masterGain)

    osc1.start(now)
    osc1.stop(now + 0.5)
    osc2.start(now)
    osc2.stop(now + 0.3)
  }

  // ============================================================
  // ❌ 失败声 - 下降的嘟嘟声
  // ============================================================
  playFail(): void {
    if (!this._initialized || !this.ctx || !this.masterGain) return
    this.ensureResumed()
    const ctx = this.ctx
    const now = ctx.currentTime

    const beep1 = ctx.createOscillator()
    beep1.type = 'triangle'
    beep1.frequency.setValueAtTime(400, now)
    beep1.frequency.linearRampToValueAtTime(250, now + 0.15)

    const beep2 = ctx.createOscillator()
    beep2.type = 'triangle'
    beep2.frequency.setValueAtTime(350, now + 0.2)
    beep2.frequency.linearRampToValueAtTime(200, now + 0.35)

    const gain1 = ctx.createGain()
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.setValueAtTime(0.0, now + 0.15)
    gain1.gain.setValueAtTime(0.25, now + 0.2)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    const gain2 = ctx.createGain()
    gain2.gain.setValueAtTime(0.0, now)
    gain2.gain.setValueAtTime(0.25, now + 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    beep1.connect(gain1).connect(this.masterGain)
    beep2.connect(gain2).connect(this.masterGain)

    beep1.start(now)
    beep1.stop(now + 0.4)
    beep2.start(now + 0.2)
    beep2.stop(now + 0.45)
  }

  // ============================================================
  // 💨 挥手声 - 柔和的风声
  // ============================================================
  playWhoosh(): void {
    if (!this._initialized || !this.ctx || !this.masterGain) return
    this.ensureResumed()
    const ctx = this.ctx
    const now = ctx.currentTime

    const noiseBuffer = this._createNoiseBuffer(0.2)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 600
    bandpass.Q.value = 0.5

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    noise.connect(bandpass).connect(gain).connect(this.masterGain)

    noise.start(now)
    noise.stop(now + 0.2)
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /** 创建白噪声 AudioBuffer */
  private _createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate
    const length = Math.ceil(sampleRate * duration)
    const buffer = this.ctx!.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  /** 设置主音量 */
  setVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value))
    }
  }

  /** 销毁 */
  destroy(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
      this.masterGain = null
      this._initialized = false
    }
  }
}

// 单例导出
export const audioEngine = new GameAudioEngine()
