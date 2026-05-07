/**
 * 🎯 碰撞检测模块
 * 宝宝体感游戏 - 手势轨迹 vs 游戏实体的碰撞检测
 */

export interface Point {
  x: number
  y: number
}

export interface Circle {
  x: number
  y: number
  radius: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface HitResult {
  x: number
  y: number
  angle: number
  speed: number
  t: number
}

export interface GrabResult {
  target: any
  overlap: number
}

export interface SliceHit {
  fruit: any
  hitPoint: HitResult
  segmentIndex: number
}

// ============================================================
// 基础碰撞
// ============================================================

/** 点是否在圆内 */
export function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

/** 点是否在矩形内 */
export function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

// ============================================================
// 核心：轨迹线段 vs 圆形碰撞（水果忍者切割检测）
// ============================================================

/** 线段是否与圆相交 */
export function segmentCircleCollision(p1: Point, p2: Point, circle: Circle): HitResult | null {
  const { x: cx, y: cy, radius: r } = circle

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  const fx = p1.x - cx
  const fy = p1.y - cy

  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - r * r

  let discriminant = b * b - 4 * a * c

  if (discriminant < 0) return null

  discriminant = Math.sqrt(discriminant)
  const t1 = (-b - discriminant) / (2 * a)
  const t2 = (-b + discriminant) / (2 * a)

  let t: number | null = null
  if (t1 >= 0 && t1 <= 1) {
    t = t1
  } else if (t2 >= 0 && t2 <= 1) {
    t = t2
  }

  if (t === null) return null

  const hitX = p1.x + t * dx
  const hitY = p1.y + t * dy

  const angle = Math.atan2(dy, dx)
  const speed = Math.sqrt(a)

  return { x: hitX, y: hitY, angle, speed, t }
}

// ============================================================
// 轨迹线段 vs 矩形碰撞
// ============================================================

/** 线段是否与 AABB 矩形相交 (Liang-Barsky) */
export function segmentRectCollision(p1: Point, p2: Point, rect: Rect): HitResult | null {
  const { x, y, width: w, height: h } = rect

  let tmin = 0, tmax = 1
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  const edges = [
    { p: -dx, q: p1.x - x },
    { p: dx, q: x + w - p1.x },
    { p: -dy, q: p1.y - y },
    { p: dy, q: y + h - p1.y }
  ]

  for (const { p, q } of edges) {
    if (p === 0) {
      if (q < 0) return null
    } else {
      const r = q / p
      if (p < 0) {
        tmin = Math.max(tmin, r)
      } else {
        tmax = Math.min(tmax, r)
      }
      if (tmin > tmax) return null
    }
  }

  const hitX = p1.x + tmin * dx
  const hitY = p1.y + tmin * dy

  return { x: hitX, y: hitY, angle: 0, speed: 0, t: tmin }
}

// ============================================================
// 批量切割碰撞检测
// ============================================================

/**
 * 水果忍者风格切割检测
 * 对一段轨迹检测是否切过圆形水果
 */
export function detectSliceCollisions(trail: Point[], fruits: any[]): SliceHit[] {
  if (trail.length < 2 || fruits.length === 0) return []

  const hitFruits: SliceHit[] = []
  const hitIds = new Set<string>()

  const recentTrail = trail.length > 10 ? trail.slice(-10) : trail

  for (let i = 0; i < recentTrail.length - 1; i++) {
    const p1 = recentTrail[i]
    const p2 = recentTrail[i + 1]

    // 最小速度阈值
    const segDx = p2.x - p1.x
    const segDy = p2.y - p1.y
    const segSpeed = Math.sqrt(segDx * segDx + segDy * segDy)
    if (segSpeed < 5) continue

    for (const fruit of fruits) {
      if (hitIds.has(fruit.id)) continue

      const hit = segmentCircleCollision(p1, p2, fruit)
      if (hit) {
        hitIds.add(fruit.id)
        hitFruits.push({ fruit, hitPoint: hit, segmentIndex: i })
      }
    }
  }

  return hitFruits
}

// ============================================================
// 手掌覆盖检测（气球/玩具抓取）
// ============================================================

/** 手掌是否覆盖到目标实体 */
export function detectGrabCollision(
  handPosition: Point,
  handRadius: number,
  isGrabbing: boolean,
  targets: any[]
): GrabResult | null {
  if (!isGrabbing) return null

  for (const target of targets) {
    const dx = handPosition.x - target.x
    const dy = handPosition.y - target.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = handRadius + target.radius

    if (dist <= minDist) {
      return {
        target,
        overlap: 1 - dist / minDist
      }
    }
  }

  return null
}

// ============================================================
// 空间分区
// ============================================================

/** 简单的网格空间分区 */
export class SpatialGrid {
  private cellSize: number
  private cols: number
  private rows: number
  private cells: Map<string, any[]>

  constructor(cellSize: number, width: number, height: number) {
    this.cellSize = cellSize
    this.cols = Math.ceil(width / cellSize)
    this.rows = Math.ceil(height / cellSize)
    this.cells = new Map()
  }

  clear(): void {
    this.cells.clear()
  }

  private _key(col: number, row: number): string {
    return `${col},${row}`
  }

  insert(entity: any): void {
    const minCol = Math.floor((entity.x - entity.radius) / this.cellSize)
    const maxCol = Math.floor((entity.x + entity.radius) / this.cellSize)
    const minRow = Math.floor((entity.y - entity.radius) / this.cellSize)
    const maxRow = Math.floor((entity.y + entity.radius) / this.cellSize)

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = this._key(col, row)
        if (!this.cells.has(key)) {
          this.cells.set(key, [])
        }
        this.cells.get(key)!.push(entity)
      }
    }
  }

  query(x: number, y: number, radius: number): any[] {
    const result = new Set<any>()
    const minCol = Math.floor((x - radius) / this.cellSize)
    const maxCol = Math.floor((x + radius) / this.cellSize)
    const minRow = Math.floor((y - radius) / this.cellSize)
    const maxRow = Math.floor((y + radius) / this.cellSize)

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = this._key(col, row)
        const cell = this.cells.get(key)
        if (cell) {
          for (const entity of cell) {
            result.add(entity)
          }
        }
      }
    }

    return Array.from(result)
  }
}
