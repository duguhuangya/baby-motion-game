<template>
  <div class="game-view">
    <canvas ref="canvasRef" class="game-canvas"></canvas>
    <button class="back-btn" @click="handleBack">← 返回</button>
    <div class="mode-hint" v-if="modeHint">{{ modeHint }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { GameEngine } from '../game/engine'

const props = defineProps<{
  level: number
}>()

const emit = defineEmits<{
  back: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let engine: GameEngine | null = null

const modeHint = ref('')

function handleBack() {
  if (engine) {
    engine.stop()
    engine = null
  }
  emit('back')
}

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 设置画布尺寸
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  engine = new GameEngine(canvas, {
    onScoreChange(_score: number) {
      // 分数实时在 Canvas HUD 上显示
    }
  })

  engine.setLevel(props.level)

  // 监听窗口大小变化
  const onResize = () => {
    if (canvas && engine) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      engine.resize(canvas.width, canvas.height)
    }
  }
  window.addEventListener('resize', onResize)

  await engine.start()

  if (engine.isMouseMode) {
    modeHint.value = '🖱️ 鼠标/触摸模式（未检测到摄像头）'
  } else {
    modeHint.value = '👋 挥动手掌开始游戏'
  }

  // 几秒后隐藏提示
  setTimeout(() => {
    modeHint.value = ''
  }, 4000)

  // 清理
  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    if (engine) {
      engine.stop()
      engine = null
    }
  })
})
</script>

<style scoped>
.game-view {
  width: 100%;
  height: 100%;
  position: relative;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.back-btn {
  position: absolute;
  top: 12px;
  right: 16px;
  padding: 8px 16px;
  font-size: 16px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  z-index: 10;
  transition: background 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.mode-hint {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  pointer-events: none;
  transition: opacity 0.5s;
  z-index: 10;
}
</style>
