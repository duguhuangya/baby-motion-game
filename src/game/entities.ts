/**
 * 游戏实体定义
 */

export type EntityType = 'fruit' | 'balloon' | 'toy'
export type GameMode = 'slice' | 'grab'

export interface TrailPoint {
  x: number
  y: number
  time: number
}

// ============================================================
// 游戏实体
// ============================================================

export class GameEntity {
  x: number
  y: number
  radius: number
  type: EntityType
  mode: GameMode
  emoji: string
  id: string
  alive: boolean = true
  vx: number = 0
  vy: number = 0
  rotation: number = 0
  rotSpeed: number = 0
  opacity: number = 1

  constructor(x: number, y: number, radius: number, type: EntityType, mode: GameMode, emoji: string) {
    this.x = x
    this.y = y
    this.radius = radius
    this.type = type
    this.mode = mode
    this.emoji = emoji
    this.id = Math.random().toString(36).slice(2)
    this.vx = (Math.random() - 0.5) * 80
    this.vy = -(350 + Math.random() * 200)
    this.rotSpeed = (Math.random() - 0.5) * 3
  }

  update(dt: number, canvasHeight: number): void {
    this.vy += 200 * dt // 重力
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.rotation += this.rotSpeed * dt
    if (this.y > canvasHeight + 100) {
      this.alive = false
    }
  }
}

// ============================================================
// 粒子
// ============================================================

export class Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  size: number
  color: string
  gravity: number = 400

  constructor(x: number, y: number, color: string) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 300
    this.vy = (Math.random() - 0.5) * 300 - 100
    this.life = 1.0
    this.decay = 1.2 + Math.random() * 0.8
    this.size = 2 + Math.random() * 6
    this.color = color
  }

  update(dt: number): void {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vy += this.gravity * dt
    this.life -= this.decay * dt
  }

  get alive(): boolean {
    return this.life > 0
  }
}

// ============================================================
// 关卡配置
// ============================================================

export interface LevelConfig {
  name: string
  emoji: string
  emojis: string[]
  colors: string[]
  spawnInterval: number
  mode: GameMode
  entityType: EntityType
}

export const LEVELS: Record<number, LevelConfig> = {
  1: {
    name: '水果切割',
    emoji: '🍉',
    emojis: ['🍉', '🍎', '🍊', '🍋', '🍇', '🍓'],
    colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#ff9ff3', '#feca57'],
    spawnInterval: 1.0,
    mode: 'slice',
    entityType: 'fruit'
  },
  2: {
    name: '气球刺穿',
    emoji: '🎈',
    emojis: ['🎈', '🟡', '🔵', '🟢', '🟣'],
    colors: ['#ff6b6b', '#ffd93d', '#4d96ff', '#6bcb77', '#9b59b6'],
    spawnInterval: 1.5,
    mode: 'grab',
    entityType: 'balloon'
  },
  3: {
    name: '玩具抓取',
    emoji: '🧸',
    emojis: ['🧸', '🚗', '⚽', '🎯', '🪀'],
    colors: ['#e17055', '#fdcb6e', '#00b894', '#6c5ce7', '#fd79a8'],
    spawnInterval: 1.8,
    mode: 'grab',
    entityType: 'toy'
  }
}
