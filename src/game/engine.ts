/**
 * 🎮 游戏主引擎
 * 改写自 game-loop.js 原型
 */

import { audioEngine } from './audio'
import { detectSliceCollisions, detectGrabCollision } from './collision'
import { GestureDetector } from './gesture'
import { GameEntity, Particle, LEVELS, type LevelConfig, type GameMode } from './entities'
import { Renderer } from './renderer'

export interface GameCallbacks {
  onScoreChange: (score: number) => void
}

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private renderer: Renderer
  private gesture: GestureDetector

  private entities: GameEntity[] = []
  private particles: Particle[] = []
  private currentLevel: number = 1
  private levelConfig: LevelConfig = LEVELS[1]
  private score: number = 0
  private running: boolean = false

  // 鼠标/触摸降级模式
  private mouseMode: boolean = false
  private isPointerDown: boolean = false
  private pointerPos: { x: number; y: number } = { x: 0, y: 0 }
  private mouseTrail: Array<{ x: number; y: number; time: number }> = []

  // 计时
  private lastFrameTime: number = 0
  private spawnTimer: number = 0
  private fps: number = 0
  private frameCount: number = 0
  private fpsTimer: number = 0
  private animFrameId: number = 0

  // 回调
  private callbacks: GameCallbacks

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.width = canvas.width
    this.height = canvas.height
    this.renderer = new Renderer(this.ctx, this.width, this.height)
    this.gesture = new GestureDetector()
    this.callbacks = callbacks

    this._bindPointerEvents()
  }

  get currentScore(): number {
    return this.score
  }

  /** 设置关卡 */
  setLevel(level: number): void {
    this.currentLevel = level
    this.levelConfig = LEVELS[level]
  }

  /** 初始化并启动 */
  async start(): Promise<void> {
    this.score = 0
    this.entities = []
    this.particles = []
    this.mouseTrail = []
    this.spawnTimer = 0
    this.running = true
    this.lastFrameTime = performance.now()

    // 初始化音频
    audioEngine.init()
    audioEngine.ensureResumed()

    // 🔑 先启动游戏循环（鼠标模式），再后台加载 MediaPipe
    // 避免等待 CDN 加载阻塞渲染
    this.mouseMode = true
    this._loop()

    // 后台异步加载 MediaPipe，成功后切换到手势模式
    this._initGesture()
  }

  /** 后台初始化手势识别 */
  private async _initGesture(): Promise<void> {
    const mpOk = await this.gesture.init()
    if (mpOk) {
      const camOk = await this.gesture.startCamera()
      if (camOk) {
        console.log('✅ 手势模式激活')
        this.mouseMode = false
      } else {
        console.warn('⚠️ 摄像头不可用，保持鼠标模式')
      }
    } else {
      console.warn('⚠️ MediaPipe 不可用，保持鼠标模式')
    }
  }

  /** 停止游戏 */
  stop(): void {
    this.running = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = 0
    }
    this.gesture.destroy()
  }

  /** 调整画布尺寸 */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.renderer.resize(width, height)
  }

  /** 获取摄像头视频元素 */
  getVideoElement(): HTMLVideoElement | null {
    return this.gesture.getVideoElement()
  }

  /** 是否是鼠标模式 */
  get isMouseMode(): boolean {
    return this.mouseMode
  }

  // ============================================================
  // 主循环
  // ============================================================

  private _loop = (): void => {
    if (!this.running) return

    const now = performance.now()
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = now

    // FPS
    this.frameCount++
    this.fpsTimer += dt
    if (this.fpsTimer >= 1.0) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.fpsTimer = 0
    }

    // MediaPipe 帧处理
    if (!this.mouseMode) {
      this.gesture.processFrame(now, this.width, this.height)
    }

    // 更新
    this._update(dt)

    // 渲染
    this._render()

    this.animFrameId = requestAnimationFrame(this._loop)
  }

  // ============================================================
  // 游戏逻辑
  // ============================================================

  private _update(dt: number): void {
    // 生成实体
    this.spawnTimer += dt
    const interval = this.levelConfig.spawnInterval
    if (this.spawnTimer >= interval && this.entities.length < 8) {
      this._spawnEntity()
      this.spawnTimer = 0
    }

    // 更新实体
    for (const e of this.entities) {
      if (e.alive) {
        e.update(dt, this.height)
      }
    }

    // 更新粒子
    for (const p of this.particles) {
      p.update(dt)
    }

    // 清理
    this.entities = this.entities.filter(e => e.alive)
    this.particles = this.particles.filter(p => p.alive)

    // 碰撞检测
    this._checkCollisions()
  }

  private _checkCollisions(): void {
    if (this.mouseMode) {
      this._checkMouseCollisions()
    } else {
      this._checkHandCollisions()
    }
  }

  // ============================================================
  // 手势模式碰撞
  // ============================================================

  private _checkHandCollisions(): void {
    const hand = this.gesture.state
    if (!hand.landmarks) return

    if (this.levelConfig.mode === 'slice') {
      this._checkSliceCollisions(hand.trail)
    } else {
      this._checkGrabCollisions(hand.palmCenter, hand.palmRadius, hand.isGrabbing)
    }
  }

  private _checkSliceCollisions(trail: Array<{ x: number; y: number }>): void {
    const alive = this.entities.filter(e => e.alive)
    if (alive.length === 0 || trail.length < 2) return

    const hits = detectSliceCollisions(trail, alive)
    for (const hit of hits) {
      hit.fruit.alive = false
      this.score += 10
      this.callbacks.onScoreChange(this.score)

      // 粒子
      const colors = this.levelConfig.colors
      for (let i = 0; i < 15; i++) {
        this.particles.push(new Particle(hit.hitPoint.x, hit.hitPoint.y, colors[Math.floor(Math.random() * colors.length)]))
      }

      audioEngine.playSlice()
    }
  }

  private _checkGrabCollisions(pos: { x: number; y: number }, radius: number, isGrabbing: boolean): void {
    const alive = this.entities.filter(e => e.alive)
    const hit = detectGrabCollision(pos, radius, isGrabbing, alive)

    if (hit) {
      hit.target.alive = false
      this.score += 10
      this.callbacks.onScoreChange(this.score)

      // 粒子
      const colors = this.levelConfig.colors
      for (let i = 0; i < 12; i++) {
        this.particles.push(new Particle(hit.target.x, hit.target.y, colors[Math.floor(Math.random() * colors.length)]))
      }

      if (this.currentLevel === 2) {
        audioEngine.playBurst()
      } else {
        audioEngine.playDing()
      }
    }
  }

  // ============================================================
  // 鼠标模式碰撞
  // ============================================================

  private _checkMouseCollisions(): void {
    if (this.levelConfig.mode === 'slice') {
      if (this.isPointerDown && this.mouseTrail.length >= 2) {
        this._checkSliceCollisions(this.mouseTrail)
      }
    } else {
      if (this.isPointerDown) {
        this._checkGrabCollisions(this.pointerPos, 50, true)
      }
    }
  }

  // ============================================================
  // 实体生成
  // ============================================================

  private _spawnEntity(): void {
    const emoji = this.levelConfig.emojis[Math.floor(Math.random() * this.levelConfig.emojis.length)]
    const entity = new GameEntity(
      50 + Math.random() * (this.width - 100),
      this.height + 30,
      25 + Math.random() * 15,
      this.levelConfig.entityType,
      this.levelConfig.mode,
      emoji
    )
    this.entities.push(entity)
  }

  // ============================================================
  // 渲染
  // ============================================================

  private _render(): void {
    const r = this.renderer

    r.clear()

    // 摄像头预览
    if (!this.mouseMode) {
      r.drawVideoPreview(this.gesture.getVideoElement())
    }

    // 实体
    r.drawEntities(this.entities)

    // 粒子
    r.drawParticles(this.particles)

    // 轨迹和手势
    if (this.mouseMode) {
      if (this.isPointerDown && this.mouseTrail.length >= 2) {
        r.drawTrail(this.mouseTrail)
      }
      r.drawPointerCursor(this.pointerPos, this.isPointerDown)
    } else {
      const hand = this.gesture.state
      if (hand.trail.length >= 2) {
        r.drawTrail(hand.trail)
      }
      r.drawHandCursor(hand)
    }

    // 抓取模式提示
    if (this.levelConfig.mode === 'grab') {
      r.drawGrabHint()
    }

    // HUD
    r.drawHUD(this.score, this.levelConfig, this.fps, this.entities.length, this.particles.length)
  }

  // ============================================================
  // 鼠标/触摸事件
  // ============================================================

  private _bindPointerEvents(): void {
    const canvas = this.canvas

    const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      }
    }

    const onDown = (pos: { x: number; y: number }) => {
      this.isPointerDown = true
      this.mouseTrail = []
      this.pointerPos = pos
      this.mouseTrail.push({ ...pos, time: performance.now() })
    }

    const onMove = (pos: { x: number; y: number }) => {
      this.pointerPos = pos
      if (this.isPointerDown) {
        this.mouseTrail.push({ ...pos, time: performance.now() })
        if (this.mouseTrail.length > 20) this.mouseTrail.shift()
      }
    }

    const onUp = () => {
      this.isPointerDown = false
      this.mouseTrail = []
    }

    canvas.addEventListener('mousedown', (e) => {
      onDown(getPos(e))
    })
    canvas.addEventListener('mousemove', (e) => {
      onMove(getPos(e))
    })
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('mouseleave', onUp)

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (e.touches[0]) onDown(getPos(e.touches[0]))
    }, { passive: false })
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches[0]) onMove(getPos(e.touches[0]))
    }, { passive: false })
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      onUp()
    }, { passive: false })
  }
}
