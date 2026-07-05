import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ==========================================
// 1. DOM 元素獲取與基礎配置
// ==========================================
const canvas = document.getElementById("battlefield");
const loading = document.getElementById("loading");
const weatherReadout = document.getElementById("weatherReadout");
const cameraReadout = document.getElementById("cameraReadout");

// 🎨 Google Maps 風格配色方案
const waterBlue = new THREE.Color("#AAD3DF"); // 經典 Google Maps 藍色海洋
const terrainGreen = new THREE.Color("#E4E8EC"); // 淺灰色陸地主體
const terrainHigh = new THREE.Color("#DCE1E5"); // 稍深一點的小山丘
const labelColor = "#202124"; // 深灰色文字（Google Maps 預設標籤色）

const clock = new THREE.Clock();

// ==========================================
// 2. 香港分區天氣 —— 3D 坐標對照表
// ==========================================
const stationCoordinates = {
"尖沙咀": { pos: [0, 1.2, 0], color: "#1A73E8" }, // 換成漂亮的 Google 藍色字
"香港天文台": { pos: [3, 1.2, -5], color: "#1A73E8" },
"京士柏": { pos: [6, 1.2, -8], color: "#1A73E8" },
"跑馬地": { pos: [12, 1.2, 20], color: "#1A73E8" },
"黃大仙": { pos: [18, 1.2, -28], color: "#1A73E8" },
"屯門": { pos: [-82, 1.2, -22], color: "#1A73E8" },
"大埔": { pos: [-15, 1.2, -76], color: "#1A73E8" },
"石崗": { pos: [-45, 1.2, -54], color: "#1A73E8" },
"沙田": { pos: [-3, 1.2, -38], color: "#1A73E8" },
"將軍澳": { pos: [38, 1.2, -8], color: "#1A73E8" },
"赤鱲角": { pos: [-88, 1.2, 30], color: "#1A73E8" },
"長洲": { pos: [-45, 1.2, 66], color: "#1A73E8" },
"西貢": { pos: [48, 1.2, -42], color: "#1A73E8" },
"流浮山": { pos: [-96, 1.2, -48], color: "#1A73E8" },
"濕地公園": { pos: [-92, 1.2, -56], color: "#1A73E8" },
"打鼓嶺": { pos: [-30, 1.2, -94], color: "#1A73E8" },
"坪洲": { pos: [-34, 1.2, 38], color: "#1A73E8" },
"黃竹坑": { pos: [12, 1.2, 48], color: "#1A73E8" },
"青衣": { pos: [-35, 1.2, 3], color: "#1A73E8" },
"荃灣可觀": { pos: [-44, 1.2, -16], color: "#1A73E8" },
"荃灣城門谷": { pos: [-35, 1.2, -24], color: "#1A73E8" },
"香港公園": { pos: [5, 1.2, 33], color: "#1A73E8" },
"筲箕灣": { pos: [42, 1.2, 35], color: "#1A73E8" },
"九龍城": { pos: [18, 1.2, -4], color: "#1A73E8" },
"觀塘": { pos: [36, 1.2, -5], color: "#1A73E8" },
"深水埗": { pos: [-12, 1.2, -8], color: "#1A73E8" },
"啟德跑道公園": { pos: [30, 1.2, 6], color: "#1A73E8" },
"元朗公園": { pos: [-88, 1.2, -68], color: "#1A73E8" },
"大美督": { pos: [12, 1.2, -86], color: "#1A73E8" },
"赤柱": { pos: [30, 1.2, 70], color: "#1A73E8" }
};

const weatherLabels = {};

// ==========================================
// 3. Three.js 場景基礎環境初始化 (明亮天空)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color("#F8F9FA"); // Google 明亮背景底色
scene.fog = new THREE.FogExp2("#F8F9FA", 0.008);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 55, 72);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);

// 提高整體照明度，做出白天的感覺
const ambient = new THREE.AmbientLight("#ffffff", 1.6);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight("#ffffff", 1.5);
keyLight.position.set(-32, 58, 24);
scene.add(keyLight);

const battlefield = new THREE.Group();
const effectLayer = new THREE.Group();
scene.add(battlefield, effectLayer);

// ==========================================
// 4. 畫布文字標籤 (改為白底深字，類似 Google Maps Bubble)
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

// Google Maps 風格的對話框白底
ctx.fillStyle = "#ffffff";
ctx.strokeStyle = "#DACDC0";
ctx.lineWidth = 4;
roundRect(ctx, 20, 36, width - 40, 150, 24);
ctx.fill();
ctx.stroke();

ctx.font = "700 44px 'Noto Sans TC', sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

const lines = text.split('\n');
// 地區名稱用深灰
ctx.fillStyle = "#202124";
ctx.fillText(lines[0], width / 2, height / 2 - 24, width - 70);
// 溫度用 Google 藍
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
// 5. 建立地形與針頭
// ==========================================
function createTerrain() {
const water = new THREE.Mesh(
new THREE.PlaneGeometry(150, 150, 1, 1),
new THREE.MeshStandardMaterial({ color: waterBlue, roughness: 0.9, metalness: 0.0 })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.45;
battlefield.add(water);

const newTerritories = islandShape([[-56, -48], [50, -48], [54, -16], [38, -6], [16, -10], [0, 0], [-24, -2], [-52, -12]], terrainGreen, 0, 1.1);
const kowloon = islandShape([[-26, -2], [25, -2], [28, 8], [20, 16], [2, 17], [-18, 14], [-30, 6]], terrainGreen, 0, 1);
const hongKongIsland = islandShape([[-30, 22], [-18, 18], [5, 19], [27, 23], [35, 33], [28, 50], [4, 53], [-19, 45], [-33, 35]], terrainGreen, 0, 1.25);
battlefield.add(newTerritories, kowloon, hongKongIsland);

Object.keys(stationCoordinates).forEach((key) => {
const item = stationCoordinates[key];
// 定位針換成 Google Maps 經典紅色大頭針
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(0.05, 0.2, 2.5, 12),
new THREE.MeshBasicMaterial({ color: "#EA4335" })
);
pin.position.set(item.pos[0], item.pos[1] + 1.0, item.pos[2]);
battlefield.add(pin);
});
}

// ==========================================
// 6. 天氣效果 (白天淡淡的雨)
// ==========================================
const rainDrops = [];
function createWeatherEffect() {
const rainMaterial = new THREE.LineBasicMaterial({ color: "#7499A5", transparent: true, opacity: 0.25 });
for (let i = 0; i < 90; i += 1) {
const drop = new THREE.Line(
new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.2, -2.0, 0.1)]),
rainMaterial
);
drop.position.set(THREE.MathUtils.randFloatSpread(120), THREE.MathUtils.randFloat(10, 55), THREE.MathUtils.randFloatSpread(110));
drop.userData.speed = THREE.MathUtils.randFloat(15, 25);
rainDrops.push(drop);
scene.add(drop);
}
}

// ==========================================
// 7. API 連動
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

const label = makeLabel(text, coord.color, 4.0);
label.position.set(coord.pos[0], coord.pos[1] + 3.2, coord.pos[2]);
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
if (drop.position.y < 0) drop.position.y = THREE.MathUtils.randFloat(32, 58);
});

controls.update();
renderer.render(scene, camera);
}

createTerrain();
createWeatherEffect();
refreshWeather();
setInterval(refreshWeather, 5 * 60 * 1000);

if (loading) loading.classList.add("hidden");
requestAnimationFrame(animate);