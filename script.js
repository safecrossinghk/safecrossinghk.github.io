import * as THREE from "https://unpkg.com/three@0.152.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.152.0/examples/jsm/controls/OrbitControls.js";

// ==========================================
// 1. DOM 元素獲取與基礎配置
// ==========================================
const canvas = document.getElementById("battlefield");
const loading = document.getElementById("loading");
const weatherReadout = document.getElementById("weatherReadout");

const clock = new THREE.Clock();

// ==========================================
// 2. 香港分區天氣 —— 3D 坐標對照表 (發光綠色雷達標籤)
// ==========================================
const stationCoordinates = {
"尖沙咀": { pos: [2, 1.5, 11], color: "#00FF66" },
"香港天文台": { pos: [3, 1.5, 8], color: "#00FF66" },
"京士柏": { pos: [6, 1.5, 5], color: "#00FF66" },
"跑馬地": { pos: [12, 1.5, 28], color: "#00FF66" },
"黃大仙": { pos: [18, 1.5, -10], color: "#00FF66" },
"屯門": { pos: [-82, 1.5, -15], color: "#00FF66" },
"大埔": { pos: [-15, 1.5, -55], color: "#00FF66" },
"石崗": { pos: [-45, 1.5, -35], color: "#00FF66" },
"沙田": { pos: [-3, 1.5, -20], color: "#00FF66" },
"將軍澳": { pos: [38, 1.5, 5], color: "#00FF66" },
"赤鱲角": { pos: [-88, 1.5, 25], color: "#00FF66" },
"長洲": { pos: [-45, 1.5, 60], color: "#00FF66" },
"西貢": { pos: [48, 1.5, -25], color: "#00FF66" },
"流浮山": { pos: [-96, 1.5, -35], color: "#00FF66" },
"濕地公園": { pos: [-92, 1.5, -45], color: "#00FF66" },
"打鼓嶺": { pos: [-30, 1.5, -75], color: "#00FF66" },
"坪洲": { pos: [-34, 1.5, 38], color: "#00FF66" },
"黃竹坑": { pos: [12, 1.5, 40], color: "#00FF66" },
"青衣": { pos: [-35, 1.5, 3], color: "#00FF66" },
"荃灣可觀": { pos: [-44, 1.5, -10], color: "#00FF66" },
"荃灣城門谷": { pos: [-35, 1.5, -15], color: "#00FF66" },
"香港公園": { pos: [5, 1.5, 25], color: "#00FF66" },
"筲箕灣": { pos: [35, 1.5, 32], color: "#00FF66" },
"九龍城": { pos: [18, 1.5, 4], color: "#00FF66" },
"觀塘": { pos: [32, 1.5, 8], color: "#00FF66" },
"深水埗": { pos: [-12, 1.5, 2], color: "#00FF66" },
"啟德跑道公園": { pos: [26, 1.5, 12], color: "#00FF66" },
"元朗公園": { pos: [-78, 1.5, -45], color: "#00FF66" },
"大美督": { pos: [22, 1.5, -65], color: "#00FF66" },
"赤柱": { pos: [28, 1.5, 60], color: "#00FF66" }
};

const weatherLabels = {};

// ==========================================
// 3. Three.js 場景基礎環境初始化
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color("#11161B"); // 深暗色大廳背景
scene.fog = new THREE.FogExp2("#11161B", 0.003);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 140, 160); // 預設 45 度鳥瞰視角

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);

// 環繞光，確保地圖貼圖亮度適中
const ambient = new THREE.AmbientLight("#ffffff", 1.2);
scene.add(ambient);

const battlefield = new THREE.Group();
scene.add(battlefield);

// ==========================================
// 4. 2D / 3D 工具函式 (文字氣泡框)
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

function makeLabel(text, color = "#00FF66") {
return makeCanvasTexture((ctx, width, height) => {
ctx.clearRect(0, 0, width, height);

// 半透明黑底 + 亮綠邊框
ctx.fillStyle = "rgba(10, 15, 12, 0.85)";
ctx.strokeStyle = "#00FF66";
ctx.lineWidth = 4;
roundRect(ctx, 20, 36, width - 40, 150, 16);
ctx.fill();
ctx.stroke();

ctx.font = "700 40px 'Noto Sans TC', sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

const lines = text.split('\n');
ctx.fillStyle = "#ffffff";
ctx.fillText(lines[0], width / 2, height / 2 - 24, width - 70);
ctx.fillStyle = color;
ctx.fillText(lines[1], width / 2, height / 2 + 36, width - 70);
});
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

// ==========================================
// 5. 載入本地香港地圖貼圖 (核心改動)
// ==========================================
function createMapTerrain() {
const textureLoader = new THREE.TextureLoader();

// 📥 這裡讀取你剛剛改名並上傳到 GitHub 嘅全新本地地圖圖片
const mapTexture = textureLoader.load('./hk_base_map.PNG',
() => { console.log("地圖貼圖載入成功！"); },
undefined,
(err) => { console.error("地圖載入失敗，請檢查檔名是否正確:", err); }
);

// 建立一塊 240x240 大小嘅平面，用來承托整張香港地圖
const mapGeometry = new THREE.PlaneGeometry(240, 240);
const mapMaterial = new THREE.MeshBasicMaterial({
map: mapTexture,
side: THREE.DoubleSide
});

const mapMesh = new THREE.Mesh(mapGeometry, mapMaterial);
mapMesh.rotation.x = -Math.PI / 2; // 將平面放平，變成地面
mapMesh.position.y = 0;
battlefield.add(mapMesh);

// 定位測站（在地圖對應位置立起一條條紅色的發光指標針）
Object.keys(stationCoordinates).forEach((key) => {
const item = stationCoordinates[key];
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(0.15, 0.4, 3.0, 12),
new THREE.MeshBasicMaterial({ color: "#FF3B30" })
);
pin.position.set(item.pos[0], 1.5, item.pos[2]);
battlefield.add(pin);
});
}

// ==========================================
// 6. 天氣環境效果 (發光雨絲)
// ==========================================
const rainDrops = [];
function createWeatherEffect() {
const rainMaterial = new THREE.LineBasicMaterial({ color: "#00FF66", transparent: true, opacity: 0.25 });
for (let i = 0; i < 100; i += 1) {
const drop = new THREE.Line(
new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.1, -2.5, 0)]),
rainMaterial
);
drop.position.set(THREE.MathUtils.randFloatSpread(220), THREE.MathUtils.randFloat(20, 80), THREE.MathUtils.randFloatSpread(220));
drop.userData.speed = THREE.MathUtils.randFloat(20, 35);
rainDrops.push(drop);
scene.add(drop);
}
}

// ==========================================
// 7. 天文台 API 數據同步
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

const texture = makeLabel(text, coord.color);
const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
const sprite = new THREE.Sprite(material);
sprite.scale.set(12.1, 4.5, 1);

// 讓氣溫懸浮在紅色指標針的上方
sprite.position.set(coord.pos[0], 5.5, coord.pos[2]);
battlefield.add(sprite);
weatherLabels[station.place] = sprite;
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
createMapTerrain();
createWeatherEffect();
refreshWeather();
setInterval(refreshWeather, 5 * 60 * 1000);

if (loading) loading.classList.add("hidden");
requestAnimationFrame(animate);