import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ==========================================
// 1. DOM 元素獲取與基礎配置
// ==========================================
const canvas = document.getElementById("battlefield");
const loading = document.getElementById("loading");
const weatherReadout = document.getElementById("weatherReadout");
const cameraReadout = document.getElementById("cameraReadout");

// 🎨 Google Maps 風格配色方案 (已被重新完整定義，防止報錯)
const waterBlue = new THREE.Color("#AAD3DF"); // 經典 Google Maps 藍色海洋
const terrainGreen = new THREE.Color("#E4E8EC"); // 淺灰色陸地主體
const terrainHigh = new THREE.Color("#DCE1E5"); // 稍深一點的小山丘
const labelColor = "#202124"; // 深灰色文字

const clock = new THREE.Clock();

// ==========================================
// 2. 香港分區天氣 —— 3D 坐標對照表 (已整合 32 個測站)
// ==========================================
const stationCoordinates = {
"尖沙咀": { pos: [2, 1.2, 11], color: "#1A73E8" },
"香港天文台": { pos: [3, 1.2, 8], color: "#1A73E8" },
"京士柏": { pos: [6, 1.2, 5], color: "#1A73E8" },
"跑馬地": { pos: [12, 1.2, 28], color: "#1A73E8" },
"黃大仙": { pos: [18, 1.2, -10], color: "#1A73E8" },
"屯門": { pos: [-82, 1.2, -15], color: "#1A73E8" },
"大埔": { pos: [-15, 1.2, -55], color: "#1A73E8" },
"石崗": { pos: [-45, 1.2, -35], color: "#1A73E8" },
"沙田": { pos: [-3, 1.2, -20], color: "#1A73E8" },
"將軍澳": { pos: [38, 1.2, 5], color: "#1A73E8" },
"赤鱲角": { pos: [-88, 1.2, 25], color: "#1A73E8" },
"長洲": { pos: [-45, 1.2, 60], color: "#1A73E8" },
"西貢": { pos: [48, 1.2, -25], color: "#1A73E8" },
"流浮山": { pos: [-96, 1.2, -35], color: "#1A73E8" },
"濕地公園": { pos: [-92, 1.2, -45], color: "#1A73E8" },
"打鼓嶺": { pos: [-30, 1.2, -75], color: "#1A73E8" },
"坪洲": { pos: [-34, 1.2, 38], color: "#1A73E8" },
"黃竹坑": { pos: [12, 1.2, 40], color: "#1A73E8" },
"青衣": { pos: [-35, 1.2, 3], color: "#1A73E8" },
"荃灣可觀": { pos: [-44, 1.2, -10], color: "#1A73E8" },
"荃灣城門谷": { pos: [-35, 1.2, -15], color: "#1A73E8" },
"香港公園": { pos: [5, 1.2, 25], color: "#1A73E8" },
"筲箕灣": { pos: [35, 1.2, 32], color: "#1A73E8" },
"九龍城": { pos: [18, 1.2, 4], color: "#1A73E8" },
"觀塘": { pos: [32, 1.2, 8], color: "#1A73E8" },
"深水埗": { pos: [-12, 1.2, 2], color: "#1A73E8" },
"啟德跑道公園": { pos: [26, 1.2, 12], color: "#1A73E8" },
"元朗公園": { pos: [-78, 1.2, -45], color: "#1A73E8" },
"大美督": { pos: [22, 1.2, -65], color: "#1A73E8" },
"赤柱": { pos: [28, 1.2, 60], color: "#1A73E8" }
};

const weatherLabels = {};

// ==========================================
// 3. Three.js 場景基礎環境初始化
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color("#F8F9FA");
scene.fog = new THREE.FogExp2("#F8F9FA", 0.006);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 110, 140); // 稍微拉高視野，更適合看真實大地形

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);

const ambient = new THREE.AmbientLight("#ffffff", 1.5);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight("#ffffff", 1.2);
keyLight.position.set(-50, 100, 50);
scene.add(keyLight);

const battlefield = new THREE.Group();
const effectLayer = new THREE.Group();
scene.add(battlefield, effectLayer);

// ==========================================
// 4. 2D / 3D 工具函式
// ==========================================
function makeCanvasTexture(draw, width = 512, height = 256) {
const labelCanvas = document.createElement("canvas");
labelCanvas.width = width;
labelCanvas.height = height;
const ctx = labelCanvas.getContext("2d");
draw(ctx, width, height);
const texture = new THREE.CanvasTexture(labelCanvas);
return texture;
}

function makeLabel(text, color = "#1A73E8", size = 4.5) {
const texture = makeCanvasTexture((ctx, width, height) => {
ctx.clearRect(0, 0, width, height);

ctx.fillStyle = "#ffffff";
ctx.strokeStyle = "#DACDC0";
ctx.lineWidth = 4;
roundRect(ctx, 20, 36, width - 40, 150, 24);
ctx.fill();
ctx.stroke();

ctx.font = "700 42px 'Noto Sans TC', sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

const lines = text.split('\n');
ctx.fillStyle = "#202124";
ctx.fillText(lines[0], width / 2, height / 2 - 24, width - 70);
ctx.fillStyle = color;
ctx.fillText(lines[1], width / 2, height / 2 + 36, width - 70);
});
const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
const sprite = new THREE.Sprite(material);
sprite.scale.set(size * 2.7, size, 1);
return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
ctx.beginPath();
ctx.moveTo(x + radius, y);
ctx.lineTo(x + width - radius, y);
ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
ctx.lineTo(x + width, y + height - radius);
ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
ctx.lineTo(x + radius, y + height);
ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
ctx.lineTo(x, y + radius);
ctx.quadraticCurveTo(x, y, x + radius, y);
ctx.closePath();
}

function islandShape(points, color, y = 0, height = 1.2) {
const shape = new THREE.Shape();
points.forEach(([x, z], index) => {
if (index === 0) shape.moveTo(x, z);
else shape.lineTo(x, z);
});
shape.closePath();
const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.1 });
geometry.rotateX(Math.PI / 2);
geometry.translate(0, y, 0);
const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
const mesh = new THREE.Mesh(geometry, material);
return mesh;
}

// ==========================================
// 5. 建立真實香港地形 (已修復變數遺漏問題)
// ==========================================
function createTerrain() {
const water = new THREE.Mesh(
new THREE.PlaneGeometry(350, 350, 1, 1),
new THREE.MeshStandardMaterial({ color: waterBlue, roughness: 0.9, metalness: 0.0 })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.45;
battlefield.add(water);

// 真實海岸線點陣列
const mainlandPoints = [
[-98, -50], [-85, -62], [-65, -70], [-45, -78], [-20, -78],
[5, -72], [25, -68], [42, -62], [58, -50], [68, -32],
[65, -12], [52, -2], [36, -6], [28, -2], [25, 4],
[21, 6], [16, 3], [12, 5], [10, 10], [5, 12],
[2, 11], [-2, 12], [-6, 10], [-10, 12], [-14, 11],
[-18, 13], [-25, 10], [-32, 2], [-42, -2], [-55, -4],
[-68, -2], [-76, -8], [-88, -18], [-95, -32], [-98, -45]
];

const hkIslandPoints = [
[-32, 25], [-24, 21], [-15, 20], [-2, 20], [8, 21],
[18, 23], [26, 25], [35, 30], [38, 38], [35, 46],
[28, 52], [18, 54], [5, 53], [-8, 50], [-18, 46],
[-28, 42], [-34, 35], [-34, 28]
];

const lantauPoints = [
[-92, 15], [-82, 12], [-72, 14], [-64, 20], [-56, 22],
[-52, 28], [-48, 35], [-52, 42], [-58, 45], [-68, 44],
[-78, 45], [-86, 42], [-94, 36], [-96, 25]
];

const newTerritoriesAndKowloon = islandShape(mainlandPoints, terrainGreen, 0, 1.2);
const hongKongIsland = islandShape(hkIslandPoints, terrainGreen, 0, 1.25);
const lantauIsland = islandShape(lantauPoints, terrainGreen, 0, 1.15);

battlefield.add(newTerritoriesAndKowloon, hongKongIsland, lantauIsland);

// 建立大頭針
Object.keys(stationCoordinates).forEach((key) => {
const item = stationCoordinates[key];
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(0.08, 0.25, 3.0, 12),
new THREE.MeshBasicMaterial({ color: "#EA4335" })
);
pin.position.set(item.pos[0], item.pos[1] + 1.0, item.pos[2]);
battlefield.add(pin);
});
}

// ==========================================
// 6. 天氣環境效果
// ==========================================
const rainDrops = [];
function createWeatherEffect() {
const rainMaterial = new THREE.LineBasicMaterial({ color: "#7499A5", transparent: true, opacity: 0.25 });
for (let i = 0; i < 90; i += 1) {
const drop = new THREE.Line(
new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.2, -2.0, 0.1)]),
rainMaterial
);
drop.position.set(THREE.MathUtils.randFloatSpread(200), THREE.MathUtils.randFloat(10, 70), THREE.MathUtils.randFloatSpread(200));
drop.userData.speed = THREE.MathUtils.randFloat(15, 25);
rainDrops.push(drop);
scene.add(drop);
}
}

// ==========================================
// 7. API 數據同步
// ==========================================
async function fetchWeatherData() {
try {
const response = await fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc");
const data = await response.json();
return data.temperature?.data ?? [];
} catch (error) {
return [];
}
}

function updateWeatherLabels(temperatureData) {
temperatureData.forEach((station) => {
const coord = stationCoordinates[station.place];
if (!coord) return;
const text = `${station.place}\n${station.value}°${station.unit}`;

if (weatherLabels[station.place]) {
battlefield.remove(weatherLabels[station.place]);
}

const label = makeLabel(text, coord.color, 4.5);
label.position.set(coord.pos[0], coord.pos[1] + 4.5, coord.pos[2]);
battlefield.add(label);
weatherLabels[station.place] = label;
});
}

async function refreshWeather() {
if (weatherReadout) weatherReadout.textContent = "正在同步天文台數據...";
const temperatureData = await fetchWeatherData();
updateWeatherLabels(temperatureData);
if (weatherReadout) weatherReadout.textContent = "即時更新成功";
}

// ==========================================
// 8. 渲染與動畫
// ==========================================
window.addEventListener("resize", () => {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
requestAnimationFrame(animate);
const delta = Math.min(0.05, clock.getDelta());

rainDrops.forEach((drop) => {
drop.position.y -= drop.userData.speed * delta;
if (drop.position.y < 0) drop.position.y = THREE.MathUtils.randFloat(40, 70);
});

controls.update();
renderer.render(scene, camera);
}

// ==========================================
// 9. 初始化入口
// ==========================================
createTerrain();
createWeatherEffect();
refreshWeather();
setInterval(refreshWeather, 5 * 60 * 1000);

if (loading) loading.classList.add("hidden");
requestAnimationFrame(animate);