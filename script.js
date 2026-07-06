import * as THREE from "https://unpkg.com/three@0.152.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.152.0/examples/jsm/controls/OrbitControls.js";

// ==========================================
// 1. DOM 元素獲取與基礎配置
// ==========================================
const canvas = document.getElementById("battlefield");
const loading = document.getElementById("loading");
const weatherReadout = document.getElementById("weatherReadout");

// 🎨 科幻深色質感配色方案
const waterBlue = new THREE.Color("#0A1128"); // 深邃夜空藍海洋
const labelColor = "#202124";

const clock = new THREE.Clock();

// ==========================================
// 2. 香港分區天氣 —— 3D 坐標對照表 (維持不變)
// ==========================================
const stationCoordinates = {
"尖沙咀": { pos: [2, 2.5, 11], color: "#00F2FE" },
"香港天文台": { pos: [3, 2.5, 8], color: "#00F2FE" },
"京士柏": { pos: [6, 2.5, 5], color: "#00F2FE" },
"跑馬地": { pos: [12, 2.5, 28], color: "#00F2FE" },
"黃大仙": { pos: [18, 2.5, -10], color: "#00F2FE" },
"屯門": { pos: [-82, 2.5, -15], color: "#00F2FE" },
"大埔": { pos: [-15, 2.5, -55], color: "#00F2FE" },
"石崗": { pos: [-45, 2.5, -35], color: "#00F2FE" },
"沙田": { pos: [-3, 2.5, -20], color: "#00F2FE" },
"將軍澳": { pos: [38, 2.5, 5], color: "#00F2FE" },
"赤鱲角": { pos: [-88, 2.5, 25], color: "#00F2FE" },
"長洲": { pos: [-45, 2.5, 60], color: "#00F2FE" },
"西貢": { pos: [48, 2.5, -25], color: "#00F2FE" },
"流浮山": { pos: [-96, 2.5, -35], color: "#00F2FE" },
"濕地公園": { pos: [-92, 2.5, -45], color: "#00F2FE" },
"打鼓嶺": { pos: [-30, 2.5, -75], color: "#00F2FE" },
"坪洲": { pos: [-34, 2.5, 38], color: "#00F2FE" },
"黃竹坑": { pos: [12, 2.5, 40], color: "#00F2FE" },
"青衣": { pos: [-35, 2.5, 3], color: "#00F2FE" },
"荃灣可觀": { pos: [-44, 2.5, -10], color: "#00F2FE" },
"荃灣城門谷": { pos: [-35, 2.5, -15], color: "#00F2FE" },
"香港公園": { pos: [5, 2.5, 25], color: "#00F2FE" },
"筲箕灣": { pos: [35, 2.5, 32], color: "#00F2FE" },
"九龍城": { pos: [18, 2.5, 4], color: "#00F2FE" },
"觀塘": { pos: [32, 2.5, 8], color: "#00F2FE" },
"深水埗": { pos: [-12, 2.5, 2], color: "#00F2FE" },
"啟德跑道公園": { pos: [26, 2.5, 12], color: "#00F2FE" },
"元朗公園": { pos: [-78, 2.5, -45], color: "#00F2FE" },
"大美督": { pos: [22, 2.5, -65], color: "#00F2FE" },
"赤柱": { pos: [28, 2.5, 60], color: "#00F2FE" }
};

const weatherLabels = {};

// ==========================================
// 3. Three.js 場景基礎環境初始化
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0C1020"); // 全局改為深色暗夜背景
scene.fog = new THREE.FogExp2("#0C1020", 0.005);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 120, 150); // 經典斜45度鳥瞰

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);

const ambient = new THREE.AmbientLight("#ffffff", 1.2);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight("#00F2FE", 1.5); // 帶有科技藍的導向光
keyLight.position.set(-60, 100, 40);
scene.add(keyLight);

const battlefield = new THREE.Group();
scene.add(battlefield);

// 載入高質感地圖貼圖
const textureLoader = new THREE.TextureLoader();
// 採用高品質的黑金/暗色調地圖切片作為紋理
const mapTexture = textureLoader.load("https://basemaps.cartocdn.com/dark_all/12/3343/1793.png");
mapTexture.wrapS = THREE.RepeatWrapping;
mapTexture.wrapT = THREE.RepeatWrapping;
mapTexture.repeat.set(1.5, 1.5);

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

function makeLabel(text, color = "#00F2FE", size = 4.5) {
const texture = makeCanvasTexture((ctx, width, height) => {
ctx.clearRect(0, 0, width, height);

// 氣泡框背景（改為深色高透毛玻璃質感）
ctx.fillStyle = "rgba(20, 24, 35, 0.85)";
ctx.strokeStyle = "#00F2FE";
ctx.lineWidth = 4;
roundRect(ctx, 20, 36, width - 40, 150, 24);
ctx.fill();
ctx.stroke();

ctx.font = "700 42px 'Noto Sans TC', sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

const lines = text.split('\n');
ctx.fillStyle = "#ffffff";
ctx.fillText(lines[0], width / 2, height / 2 - 24, width - 70);
ctx.fillStyle = color; // 溫度數值使用青藍色亮色
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

function islandShape(points, y = 0, height = 2.0) {
const shape = new THREE.Shape();
points.forEach(([x, z], index) => {
if (index === 0) shape.moveTo(x, z);
else shape.lineTo(x, z);
});
shape.closePath();

const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.2 });
geometry.rotateX(Math.PI / 2);
geometry.translate(0, y, 0);

// 將真實地圖貼圖應用在模型表面
const material = new THREE.MeshStandardMaterial({
map: mapTexture,
color: "#2A354D", // 基礎底色調深
roughness: 0.6,
metalness: 0.2
});
const mesh = new THREE.Mesh(geometry, material);
return mesh;
}

// ==========================================
// 5. 建立真實香港地形
// ==========================================
function createTerrain() {
// 海洋平面
const water = new THREE.Mesh(
new THREE.PlaneGeometry(400, 400, 1, 1),
new THREE.MeshStandardMaterial({ color: waterBlue, roughness: 0.4, metalness: 0.6 })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.45;
battlefield.add(water);

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

const newTerritoriesAndKowloon = islandShape(mainlandPoints, 0, 2.0);
const hongKongIsland = islandShape(hkIslandPoints, 0, 2.1);
const lantauIsland = islandShape(lantauPoints, 0, 1.9);

battlefield.add(newTerritoriesAndKowloon, hongKongIsland, lantauIsland);

// 定位大頭針（改為發光發亮的霓虹紅色）
Object.keys(stationCoordinates).forEach((key) => {
const item = stationCoordinates[key];
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(0.1, 0.3, 4.0, 12),
new THREE.MeshBasicMaterial({ color: "#FF3B30" })
);
pin.position.set(item.pos[0], item.pos[1], item.pos[2]);
battlefield.add(pin);
});
}

// ==========================================
// 6. 天氣環境效果 (發光雨絲)
// ==========================================
const rainDrops = [];
function createWeatherEffect() {
const rainMaterial = new THREE.LineBasicMaterial({ color: "#00F2FE", transparent: true, opacity: 0.4 });
for (let i = 0; i < 120; i += 1) {
const drop = new THREE.Line(
new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.1, -2.5, 0)]),
rainMaterial
);
drop.position.set(THREE.MathUtils.randFloatSpread(250), THREE.MathUtils.randFloat(20, 80), THREE.MathUtils.randFloatSpread(250));
drop.userData.speed = THREE.MathUtils.randFloat(20, 35);
rainDrops.push(drop);
scene.add(drop);
}
}

// ==========================================
// 7. API 數據同步 (AllOrigins 代理)
// ==========================================
async function fetchWeatherData() {
try {
const targetUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc";
const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

const response = await fetch(proxyUrl);
const wrapper = await response.json();
const data = JSON.parse(wrapper.contents);
return data.temperature?.data ?? [];
} catch (error) {
console.error("氣象數據抓取失敗:", error);
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
label.position.set(coord.pos[0], coord.pos[1] + 5.0, coord.pos[2]);
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
if (drop.position.y < 0) drop.position.y = THREE.MathUtils.randFloat(50, 80);
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