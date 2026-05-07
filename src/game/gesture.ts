/**
 * MediaPipe Hands 手势识别模块
 * 使用 @mediapipe/tasks-vision 新版 API (CDN 动态 import)
 */

export interface HandState {
  landmarks: any[] | null
  handedness: string
  isGrabbing: boolean
  palmCenter: { x: number; y: number }
  palmRadius: number
  trail: Array<{ x: number; y: number; time: number }>
  velocity: { x: number; y: number }
}

export interface GestureCallbacks {
  onHandUpdate: (state: HandState) => void
}

const MAX_TRAIL_LENGTH = 15

export class GestureDetector {
  private handLandmarker: any = null
  private videoElement: HTMLVideoElement | null = null
  private handState: HandState
  private initialized: boolean = false
  private cameraReady: boolean = false
  private lastTimestamp: number = -1

  constructor() {
    this.handState = {
      landmarks: null,
      handedness: 'Right',
      isGrabbing: false,
      palmCenter: { x: 0, y: 0 },
      palmRadius: 40,
      trail: [],
      velocity: { x: 0, y: 0 }
    }
  }

  get state(): HandState {
    return this.handState
  }

  get isInitialized(): boolean {
    return this.initialized
  }

  get hasCamera(): boolean {
    return this.cameraReady
  }

  /** 初始化 MediaPipe HandLandmarker (CDN)，带超时保护 */
  async init(): Promise<boolean> {
    try {
      // 8秒超时保护，避免 CDN 加载慢导致游戏无法开始
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MediaPipe CDN 加载超时')), 8000)
      )

      const initTask = (async () => {
        const { HandLandmarker, FilesetResolver } = await import(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
        )

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        )

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        })
      })()

      await Promise.race([initTask, timeout])

      this.initialized = true
      console.log('✅ MediaPipe HandLandmarker 初始化成功')
      return true
    } catch (err) {
      console.warn('⚠️ MediaPipe 初始化失败，降级为鼠标模式:', err)
      return false
    }
  }

  /** 启动摄像头 */
  async startCamera(): Promise<boolean> {
    try {
      const video = document.createElement('video')
      video.setAttribute('playsinline', '')
      video.setAttribute('autoplay', '')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        }
      })

      video.srcObject = stream
      await video.play()
      this.videoElement = video
      this.cameraReady = true
      console.log('✅ 摄像头启动成功')
      return true
    } catch (err) {
      console.warn('⚠️ 摄像头启动失败:', err)
      this.cameraReady = false
      return false
    }
  }

  /** 处理一帧视频 */
  processFrame(timestamp: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.handLandmarker || !this.videoElement || !this.cameraReady) return
    if (timestamp === this.lastTimestamp) return

    this.lastTimestamp = timestamp

    try {
      const results = this.handLandmarker.detectForVideo(this.videoElement, timestamp)
      this._updateFromResults(results, canvasWidth, canvasHeight)
    } catch {
      // 静默处理
    }
  }

  /** 获取视频元素（用于渲染摄像头预览） */
  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement
  }

  private _updateFromResults(results: any, canvasWidth: number, canvasHeight: number): void {
    if (!results.landmarks || results.landmarks.length === 0) {
      this.handState.landmarks = null
      return
    }

    const landmarks = results.landmarks[0]
    this.handState.landmarks = landmarks
    this.handState.handedness = results.handednesses?.[0]?.[0]?.categoryName || 'Right'

    // 手掌中心 (wrist=0, index_mcp=5, middle_mcp=9, ring_mcp=13, pinky_mcp=17)
    const palmIndices = [0, 5, 9, 13, 17]
    let sumX = 0, sumY = 0
    for (const idx of palmIndices) {
      sumX += landmarks[idx].x
      sumY += landmarks[idx].y
    }

    // 镜像翻转 x 坐标
    const newX = (1 - sumX / palmIndices.length) * canvasWidth
    const newY = (sumY / palmIndices.length) * canvasHeight

    // 速度
    const oldX = this.handState.palmCenter.x
    const oldY = this.handState.palmCenter.y
    this.handState.velocity.x = newX - oldX
    this.handState.velocity.y = newY - oldY

    this.handState.palmCenter = { x: newX, y: newY }

    // 抓握检测
    this.handState.isGrabbing = this._detectGrab(landmarks)

    // 轨迹
    this.handState.trail.push({ x: newX, y: newY, time: performance.now() })
    if (this.handState.trail.length > MAX_TRAIL_LENGTH) {
      this.handState.trail.shift()
    }
  }

  /** 抓握手势检测 */
  private _detectGrab(landmarks: any[]): boolean {
    const fingerTips = [8, 12, 16, 20]
    const fingerRoots = [5, 9, 13, 17]

    let foldedCount = 0
    for (let i = 0; i < 4; i++) {
      const tipDist = this._dist2D(landmarks[fingerTips[i]], landmarks[0])
      const rootDist = this._dist2D(landmarks[fingerRoots[i]], landmarks[0])

      if (tipDist < rootDist * 1.1) {
        foldedCount++
      }
    }

    return foldedCount >= 3
  }

  private _dist2D(a: any, b: any): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /** 停止摄像头 */
  stopCamera(): void {
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = (this.videoElement.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
      this.videoElement = null
      this.cameraReady = false
    }
  }

  /** 销毁 */
  destroy(): void {
    this.stopCamera()
    if (this.handLandmarker) {
      this.handLandmarker.close()
      this.handLandmarker = null
    }
    this.initialized = false
  }
}
