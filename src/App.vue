<template>
  <HomeView v-if="currentPage === 'home'" @start-game="onStartGame" />
  <GameView
    v-else
    :level="currentLevel"
    @back="onBack"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HomeView from './views/HomeView.vue'
import GameView from './views/GameView.vue'

const currentPage = ref<'home' | 'game'>('home')
const currentLevel = ref(1)

function onStartGame(level: number) {
  currentLevel.value = level
  currentPage.value = 'game'
}

function onBack() {
  currentPage.value = 'home'
}
</script>
