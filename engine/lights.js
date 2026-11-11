// lights.js — preset ánh sáng/bầu trời dùng chung (trước nằm trong engine/envs.js; envs.js re-export nên import cũ vẫn chạy).
//   top/bottom = màu trời trên/dưới, fog + fogR [gần, xa], hemi [trời, đất, cường độ], sun [màu, cường độ], dir = hướng nắng, exposure, night 0..1
export const LIGHTS = {
  day:      { top: '#3f9fe6', bottom: '#cdeeff', fog: '#cfeaff', fogR: [160, 700], hemi: ['#ffffff', '#7a9a66', 1.15], sun: ['#fff3dc', 2.6], dir: [0.5, 1, 0.6], exposure: 1.0, night: 0 },
  beach:    { top: '#2f95e3', bottom: '#bfeaff', fog: '#cdefff', fogR: [180, 800], hemi: ['#ffffff', '#d8c08a', 1.2], sun: ['#fff1d6', 2.8], dir: [0.4, 1, 0.7], exposure: 1.0, night: 0 },
  desert:   { top: '#5fb2ec', bottom: '#fbe3b8', fog: '#f7e2bb', fogR: [150, 650], hemi: ['#fff6e6', '#d9a860', 1.2], sun: ['#ffe2b0', 2.8], dir: [0.6, 0.9, 0.4], exposure: 1.0, night: 0 },
  snow:     { top: '#7cb9e8', bottom: '#e9f6ff', fog: '#e4f2fb', fogR: [120, 600], hemi: ['#ffffff', '#b8cfe0', 1.25], sun: ['#ffffff', 2.2], dir: [0.4, 1, 0.6], exposure: 0.95, night: 0 },
  night:    { top: '#0c1238', bottom: '#33428a', fog: '#26326e', fogR: [90, 520], hemi: ['#8fa0ff', '#1b2040', 0.95], sun: ['#a9bcff', 1.3], dir: [-0.5, 1, 0.5], exposure: 1.05, night: 1 },
  snowNight:{ top: '#0d1640', bottom: '#4a5ea8', fog: '#3a4a8c', fogR: [90, 520], hemi: ['#aab8ff', '#4a5a90', 1.0], sun: ['#c4d0ff', 1.3], dir: [-0.4, 1, 0.5], exposure: 1.05, night: 1 },
  storm:    { top: '#0f1c40', bottom: '#33507e', fog: '#26395e', fogR: [70, 380], hemi: ['#a4b8e0', '#1c2848', 1.4], sun: ['#c4d2f2', 1.4], dir: [0.3, 1, 0.4], exposure: 1.25, night: 1 },
  interior: { top: '#f3e2b8', bottom: '#f3e2b8', fog: null, hemi: ['#fff3dc', '#8a6a44', 1.35], sun: ['#ffe9c4', 1.6], dir: [0.6, 0.9, 0.8], exposure: 1.0, night: 0 },
  bedNight: { top: '#2a2f6a', bottom: '#2a2f6a', fog: null, hemi: ['#9aa6ff', '#3a2a40', 1.0], sun: ['#aab6ff', 1.2], dir: [-0.8, 0.7, 0.4], exposure: 1.05, night: 1 },
  ocean:    { top: '#2e8fe0', bottom: '#c3ebff', fog: '#bfe6fa', fogR: [200, 900], hemi: ['#ffffff', '#3a8fb0', 1.15], sun: ['#fff4e0', 2.6], dir: [0.5, 1, 0.5], exposure: 1.0, night: 0 },
  sky:      { top: '#2c7fd6', bottom: '#d8f0ff', fog: '#e8f6ff', fogR: [250, 1000], hemi: ['#ffffff', '#c8d8e8', 1.25], sun: ['#fff6e6', 2.6], dir: [0.5, 1, 0.5], exposure: 1.0, night: 0 },
};
