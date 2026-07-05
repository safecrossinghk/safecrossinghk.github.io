import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ==========================================
// 1. DOM 元素獲取與基礎配置
// ==========================================
const canvas = document.getElementById("battlefield");
const loading = document.getElementById("loading");
const weatherReadout = document.getElementById("weatherReadout");
const cameraReadout = document.getElementById("cameraReadout");

// 天氣專用顏色定義
const waterBlue = new THREE.Color("#0b2b3f");
const terrainGreen = new THREE.Color("#2f7655");
const terrainHigh = new THREE.Color("#6fa36f");

// 初始化計時器 (必須移到最上方，防止 animate 報錯)
const clock = new THREE.Clock();

// ==========================================
// 2. 香港分區天氣 —— 3D 坐標對照表 (已整合 32 個測站)
// ==========================================
const stationCoordinates = {
"尖沙咀": { pos: [0, 1.2, 0], color: "#ffe08a" },
"香港天文台": { pos: [3, 1.2, -5], color: "#ffe08a" },
"京士柏": { pos: [6, 1.2, -8], color: "#ffe08a" },
"跑馬地": { pos: [12, 1.2, 20], color: "#ffe08a" },
"黃大仙": { pos: [18, 1.2, -28], color: "#ffe08a" },
"屯門": { pos: [-82, 1.2, -22], color: "#ffe08a" },
"大埔": { pos: [-15, 1.2, -76], color: "#ffe08a" },
"石崗": { pos: [-45, 1.2, -54], color: "#ffe08a" },
"沙田": { pos: [-3, 1.2, -38], color: "#ffe08a" },
"將軍澳": { pos: [38, 1.2, -8], color: "#ffe08a" },
"赤鱲角": { pos: [-88, 1.2, 30], color: "#ffe08a" },
"長洲": { pos: [-45, 1.2, 66], color: "#ffe08a" },
"西貢": { pos: [48, 1.2, -42], color: "#ffe08a" },
"流浮山": { pos: [-96, 1.2, -48], color: "#ffe08a" },
"濕地公園": { pos: [-92, 1.2, -56], color: "#ffe08a" },
"打鼓嶺": { pos: [-30, 1.2, -94], color: "#ffe08a" },
"坪洲": { pos: [-34, 1.2, 38], color: "#ffe08a" },
"黃竹坑": { pos: [12, 1.2, 48], color: "#ffe08a" },
"青衣": { pos: [-35, 1.2, 3], color: "#ffe08a" },
"荃灣可觀": { pos: [-44, 1.2, -16], color: "#ffe08a" },
"荃灣城門谷": { pos: [-35, 1.2, -24], color: "#ffe08a" },
"香港公園": { pos: [5, 1.2, 33], color: "#ffe08a" },
"筲箕灣": { pos: [42, 1.2, 35], color: "#ffe08a" },
"九龍城": { pos: [18, 1.2, -4], color: "#ffe08a" },
"觀塘": { pos: [36, 1.2, -5], color: "#ffe08a" },
"深水埗": { pos: [-12, 1.2, -8], color: "#ffe08a" },
"啟德跑道公園": { pos: [30, 1.2, 6], color: "#ffe08a" },
"元朗公園": { pos: [-88, 1.2, -68], color: "#ffe08a" },
"大美督": { pos: [12, 1.2, -86], color: "#ffe08a" },
"赤柱": { pos: [30, 1.2, 70], color: "#ffe08a" }
};

// 記錄場上已建立的天氣標籤
const weatherLabels = {};

// ==========================================
// 3. Three.js 場景基礎環境初始化
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color("#03070d");
scene.fog = new THREE.FogExp2("#07101a", 0.014);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 55, 72);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 22;
controls.maxDistance = 115;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 0, 0);

const ambient = new THREE.AmbientLight("#8fb2c8", 1.2);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight("#fff4d5", 2.6);
keyLight.position.set(-32, 58, 24);
keyLight.castShadow = true;
scene.add(keyLight);

const searchLight = new THREE.SpotLight("#9fd4ff", 180, 105, 0.34, 0.5, 1.2);
searchLight.position.set(32, 48, -25);
searchLight.target.position.set(4, 0, 28);
scene.add(searchLight, searchLight.target);

const battlefield = new THREE.Group();
const effectLayer = new THREE.Group();
scene.add(battlefield, effectLayer);

// ==========================================
// 4. 畫布文字標籤與 2D/3D 工具函式
// ==========================================
function makeCanvasTexture(draw, width = 512, height = 256) {
const labelCanvas = document.createElement("canvas");
labelCanvas.width = width;
labelCanvas.height = height;
const ctx = labelCanvas.getContext("2d");
draw(ctx, width, height);
const texture = new THREE.CanvasTexture(labelCanvas);
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
return texture;
}

function makeLabel(text, color = "#ffffff", size = 4.5) {
const texture = makeCanvasTexture((ctx, width, height) => {
ctx.clearRect(0, 0, width, height);
ctx.fillStyle = "rgba(3, 7, 13, 0.62)";
ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
ctx.lineWidth = 8;
roundRect(ctx, 20, 36, width - 40, 150, 18);
ctx.fill();
ctx.stroke();
ctx.font = "700 48px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillStyle = color;

const lines = text.split('\n');
if (lines.length > 1) {
ctx.fillText(lines[0], width / 2, height / 2 - 24, width - 70);
ctx.fillText(lines[1], width / 2, height / 2 + 36, width - 70);
} else {
ctx.fillText(text, width / 2, height / 2 + 4, width - 70);
}
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
const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.25 });
geometry.rotateX(Math.PI / 2);
geometry.translate(0, y, 0);
const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.05 });
const mesh = new THREE.Mesh(geometry, material);
mesh.receiveShadow = true;
mesh.castShadow = true;
return mesh;
}

// ==========================================
// 5. 建立 3D 香港地形與觀測站地標針
// ==========================================
function createTerrain() {
const water = new THREE.Mesh(
new THREE.PlaneGeometry(130, 130, 1, 1),
new THREE.MeshStandardMaterial({ color: waterBlue, roughness: 0.72, metalness: 0.05 })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.45;
battlefield.add(water);

const newTerritories = islandShape([[-56, -48], [50, -48], [54, -16], [38, -6], [16, -10], [0, 0], [-24, -2], [-52, -12]], terrainGreen, 0, 1.1);
const kowloon = islandShape([[-26, -2], [25, -2], [28, 8], [20, 16], [2, 17], [-18, 14], [-30, 6]], "#476f59", 0, 1);
const hongKongIsland = islandShape([[-30, 22], [-18, 18], [5, 19], [27, 23], [35, 33], [28, 50], [4, 53], [-19, 45], [-33, 35]], "#3c805d", 0, 1.25);
battlefield.add(newTerritories, kowloon, hongKongIsland);

const hills = [
[-14, -6, 8, 4.4], [6, -7, 7, 3.8], [-3, 33, 7, 5.6], [18, 39, 8, 4.5], [-17, 35, 7, 3.8],
[-38, -18, 9, 3.2], [24, -18, 9, 3.6]
];
hills.forEach(([x, z, radius, h]) => {
const hill = new THREE.Mesh(
new THREE.ConeGeometry(radius, h, 7),
new THREE.MeshStandardMaterial({ color: terrainHigh, roughness: 0.9 })
);
hill.position.set(x, h / 2, z);
hill.rotation.y = Math.random() * Math.PI;
hill.castShadow = true;
hill.receiveShadow = true;
battlefield.add(hill);
});

const harborLine = makeLine([[-32, 0.08, 18], [-16, 0.08, 18], [0, 0.08, 18], [16, 0.08, 18], [32, 0.08, 18]], "#9fd4ff", 0.45);
battlefield.add(harborLine);

Object.keys(stationCoordinates).forEach((key) => {
const item = stationCoordinates[key];
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(0.14, 0.14, 3.2, 12),
new THREE.MeshBasicMaterial({ color: item.color })
);
pin.position.set(item.pos[0], item.pos[1] + 1.3, item.pos[2]);
battlefield.add(pin);
});
}

function makeLine(points, color, width) {
const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
const geometry = new THREE.TubeGeometry(curve, 64, width, 8, false);
const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.84 });
return new THREE.Mesh(geometry, material);
}

// ==========================================
// 6. 天氣動態環境效果 (雲與雨)
// ==========================================
const rainDrops = [];

function createWeatherEffect() {
const rainMaterial = new THREE.LineBasicMaterial({ color: "#a7c8dd", transparent: true, opacity: 0.42 });
for (let i = 0; i < 140; i += 1) {
const x = THREE.MathUtils.randFloatSpread(120);
const y = THREE.MathUtils.randFloat(10, 55);
const z = THREE.MathUtils.randFloatSpread(110);
const geometry = new THREE.BufferGeometry().setFromPoints([
new THREE.Vector3(0, 0, 0),
new THREE.Vector3(-0.25, -2.6, 0.18)
]);
const drop = new THREE.Line(geometry, rainMaterial);
drop.position.set(x, y, z);
drop.userData.speed = THREE.MathUtils.randFloat(18, 34);
rainDrops.push(drop);
scene.add(drop);
}

const cloudMaterial = new THREE.SpriteMaterial({
map: makeCanvasTexture((ctx, width, height) => {
const grd = ctx.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, width / 2);
grd.addColorStop(0, "rgba(190,210,220,0.18)");
grd.addColorStop(1, "rgba(190,210,220,0)");
ctx.fillStyle = grd;
ctx.fillRect(0, 0, width, height);
}),
transparent: true,
depthWrite: false
});

for (let i = 0; i < 16; i += 1) {
const cloud = new THREE.Sprite(cloudMaterial.clone());
cloud.position.set(THREE.MathUtils.randFloatSpread(90), THREE.MathUtils.randFloat(12, 26), THREE.MathUtils.randFloat(-42, 55));
const s = THREE.MathUtils.randFloat(18, 38);
cloud.scale.set(s, s * 0.42, 1);
cloud.userData.drift = THREE.MathUtils.randFloat(0.6, 1.5);
effectLayer.add(cloud);
}
}

// ==========================================
// 7. 香港天文台 API 數據抓取與渲染邏輯
// ==========================================
async function fetchWeatherData() {
try {
const response = await fetch(
"https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc"
);
if (!response.ok) {
throw new Error(`HKO API 回應異常: ${response.status}`);
}
const data = await response.json();
return data.temperature?.data ?? [];
} catch (error) {
console.error("無法取得天文台數據：", error);
return [];
}
}

function updateWeatherLabels(temperatureData) {
temperatureData.forEach((station) => {
const coord = stationCoordinates[station.place];
if (!coord) return;

const text = `${station.place}\n${station.value}°${station.unit}`;

if (weatherLabels[station.place]) {
const oldSprite = weatherLabels[station.place];
battlefield.remove(oldSprite);
oldSprite.material.map.dispose();
oldSprite.material.dispose();
}

const label = makeLabel(text, coord.color, 4.2);
label.position.set(coord.pos[0], coord.pos[1] + 3.8, coord.pos[2]);
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
// 8. 視窗尺寸改變監聽與動畫渲染循環
// ==========================================
window.addEventListener("resize", () => {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(time) {
requestAnimationFrame(animate);
const delta = Math.min(0.05, clock.getDelta());

rainDrops.forEach((drop) => {
drop.position.y -= drop.userData.speed * delta;
drop.position.x -= 2.8 * delta;
if (drop.position.y < 0) {
drop.position.y = THREE.MathUtils.randFloat(32, 58);
drop.position.x = THREE.MathUtils.randFloatSpread(110);
drop.position.z = THREE.MathUtils.randFloatSpread(110);
}
});

effectLayer.children.forEach((child) => {
if (child.type === "Sprite" && child.userData.drift) {
child.position.x += child.userData.drift * delta;
if (child.position.x > 65) child.position.x = -65;
}
});

if (cameraReadout) cameraReadout.textContent = "自由運鏡";

searchLight.position.x = 28 + Math.sin(time * 0.0005) * 20;
controls.update();
renderer.render(scene, camera);
}

// ==========================================
// 9. 程式初始化入口
// ==========================================
createTerrain();
createWeatherEffect();

refreshWeather();
setInterval(refreshWeather, 5 * 60 * 1000);

if (loading) loading.classList.add("hidden");
requestAnimationFrame(animate);