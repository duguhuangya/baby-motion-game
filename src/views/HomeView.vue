<template>
  <div class="home">
    <div class="home-bg"></div>
    <h1 class="title">🎮 宝宝体感游戏</h1>
    <p class="subtitle">挥动小手，开始玩耍吧！</p>
    <div class="cards">
      <div class="card card-fruit" @click="$emit('start-game', 1)">
        <div class="card-emoji">🍉</div>
        <div class="card-title">水果切割</div>
        <div class="card-desc">挥手切水果</div>
      </div>
      <div class="card card-balloon" @click="$emit('start-game', 2)">
        <div class="card-emoji">🎈</div>
        <div class="card-title">气球刺穿</div>
        <div class="card-desc">抓破气球</div>
      </div>
      <div class="card card-toy" @click="$emit('start-game', 3)">
        <div class="card-emoji">🧸</div>
        <div class="card-title">玩具抓取</div>
        <div class="card-desc">抓住玩具</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'start-game': [level: number]
}>()
</script>

<style scoped>
.home {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

.title {
  font-size: 2.4rem;
  color: #fff;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 10px rgba(100, 100, 255, 0.4);
}

.subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2.5rem;
}

.cards {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 1rem;
}

.card {
  width: 180px;
  height: 220px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.card:hover {
  transform: translateY(-6px) scale(1.04);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.card:active {
  transform: scale(0.97);
}

.card-fruit {
  background: rgba(255, 107, 107, 0.2);
}
.card-fruit:hover {
  background: rgba(255, 107, 107, 0.35);
  border-color: rgba(255, 107, 107, 0.5);
}

.card-balloon {
  background: rgba(255, 217, 61, 0.2);
}
.card-balloon:hover {
  background: rgba(255, 217, 61, 0.35);
  border-color: rgba(255, 217, 61, 0.5);
}

.card-toy {
  background: rgba(107, 203, 119, 0.2);
}
.card-toy:hover {
  background: rgba(107, 203, 119, 0.35);
  border-color: rgba(107, 203, 119, 0.5);
}

.card-emoji {
  font-size: 4rem;
  margin-bottom: 0.6rem;
}

.card-title {
  font-size: 1.3rem;
  color: #fff;
  font-weight: bold;
  margin-bottom: 0.3rem;
}

.card-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
