# 🎮 Baby Motion Game

宝宝体感游戏 MVP — Canvas 2D + MediaPipe Hands 手势识别

## 🎯 功能

- 🖐️ **手势识别** — MediaPipe Hands 实时追踪手部动作
- 🍉 **水果切割** — Slice 水果得分
- 🎈 **气球刺穿** — 戳破气球
- 🧸 **玩具抓取** — 抓取掉落的玩具
- 🔊 **音效** — Web Audio API 程序化合成
- 🖱️ **降级模式** — 摄像头不可用时自动切换鼠标模式

## 🛠️ 技术栈

- Vue 3 + TypeScript + Vite
- Canvas 2D 渲染（60fps）
- MediaPipe Hands（手势识别）
- Web Audio API（音效合成）

## 🚀 运行

```bash
npm install
npm run dev
```

## 📁 项目结构

```
src/
├── game/
│   ├── engine.ts      # 游戏主引擎
│   ├── audio.ts       # 音效系统
│   ├── collision.ts   # 碰撞检测
│   ├── entities.ts    # 游戏实体
│   ├── gesture.ts     # 手势识别
│   └── renderer.ts    # Canvas 渲染
├── views/
│   ├── HomeView.vue   # 首页（关卡选择）
│   └── GameView.vue   # 游戏页面
└── main.ts
```
