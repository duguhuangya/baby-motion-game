/**
 * Canvas 2D 渲染器
 */

import { GameEntity, Particle, LevelConfig } from './entities'
import type { HandState } from './gesture'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  clear(): void {
    const ctx = this.ctx
    const grad = ctx.createLinearGradient(0, 0, 0, this.height)
    grad.addColorStop(0, '#0f0c29')
    grad.addColorStop(0.5, '#302b63')
    grad.addColorStop(1, '#24243e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.width, this.height)
  }

  drawVideoPreview(video: HTMLVideoElement | null): void {
    if (!video) return
    const ctx = this.ctx
    ctx.globalAlpha = 0.25
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -this.width, 0, this.width, this.height)
    ctx.restore()
    ctx.globalAlpha = 1.0
  }

  drawEntities(entities: GameEntity[]): void {
    const ctx = this.ctx
    for (const e of entities) {
      ctx.save()
      ctx.translate(e.x, e.y)
      ctx.rotate(e.rotation)
      ctx.font = `${e.radius * 2}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(e.emoji, 0, 0)
      ctx.restore()
    }
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  drawTrail(trail: Array<{ x: number; y: number }>): void {
    if (trail.length < 2) return
    const ctx = this.ctx

    // 光晕
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y)
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // 主线
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y)
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  drawHandCursor(handState: HandState): void {
    if (!handState.landmarks) return
    const ctx = this.ctx
    const { x, y } = handState.palmCenter

    // 手掌范围圈
    ctx.beginPath()
    ctx.arc(x, y, handState.palmRadius, 0, Math.PI * 2)
    ctx.strokeStyle = handState.isGrabbing ? '#ffd93d' : 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = handState.isGrabbing ? 3 : 2
    ctx.stroke()

    // 抓握时填充
    if (handState.isGrabbing) {
      ctx.fillStyle = 'rgba(255, 217, 61, 0.15)'
      ctx.fill()
    }

    // 中心点
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
  }

  drawPointerCursor(pos: { x: number; y: number }, isDown: boolean): void {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, isDown ? 30 : 20, 0, Math.PI * 2)
    ctx.strokeStyle = isDown ? 'rgba(255, 217, 61, 0.7)' : 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    if (isDown) {
      ctx.fillStyle = 'rgba(255, 217, 61, 0.1)'
      ctx.fill()
    }
  }

  drawHUD(score: number, levelConfig: LevelConfig, fps: number, entityCount: number, particleCount: number): void {
    const ctx = this.ctx
    const h = this.height

    // 分数
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'left'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 4
    ctx.fillText(`⭐ ${score}`, 20, 45)
    ctx.restore()

    // 底部调试信息
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '14px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(
      `${levelConfig.emoji} ${levelConfig.name}  |  FPS: ${fps}  |  Entities: ${entityCount}  |  Particles: ${particleCount}`,
      20,
      h - 20
    )
  }

  drawGrabHint(): void {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '18px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('✊ 抓握手势 = 触发', this.width / 2, this.height - 50)
    ctx.restore()
  }
}
