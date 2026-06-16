import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("battlefield");
const loading = document.getElementById("loading");
const eventDate = document.getElementById("eventDate");
const phaseName = document.getElementById("phaseName");
const eventTitle = document.getElementById("eventTitle");
const eventCopy = document.getElementById("eventCopy");
const japaneseStrength = document.getElementById("japaneseStrength");
const alliedStrength = document.getElementById("alliedStrength");
const weatherReadout = document.getElementById("weatherReadout");
const cameraReadout = document.getElementById("cameraReadout");
const timeline = document.getElementById("timeline");
const timelineTicks = document.getElementById("timelineTicks");
const playButton = document.getElementById("playButton");

const red = new THREE.Color("#ff3b35");
const blue = new THREE.Color("#2797ff");
const gold = new THREE.Color("#f2c45b");
const terrainGreen = new THREE.Color("#2f7655");
const terrainHigh = new THREE.Color("#6fa36f");
const waterBlue = new THREE.Color("#0b2b3f");

const battleSteps = [
  {
    date: "1941.12.08",
    tick: "12/8",
    phase: "新界接戰",
    title: "日軍越過深圳河，啟德遭空襲",
    copy: "第 23 軍從深圳河以北展開南進，啟德機場遭轟炸，英聯邦守軍退向醉酒灣防線。",
    weather: "陰雲、海霧",
    jStrength: "約 26,900",
    aStrength: "約 14,000",
    camera: new THREE.Vector3(0, 55, 72),
    target: new THREE.Vector3(0, 0, 0),
    japanese: [
      { name: "第230聯隊", from: [-42, 0, -52], to: [-40, 0, -22], commander: "佐野忠義", strength: "西路" },
      { name: "第229聯隊", from: [-6, 0, -54], to: [-7, 0, -24], commander: "新美正一", strength: "中路" },
      { name: "第228聯隊", from: [34, 0, -52], to: [24, 0, -20], commander: "酒井隆", strength: "東路" }
    ],
    allied: [
      { name: "Royal Scots", from: [-44, 0, -9], to: [-44, 0, -9], commander: "莫德庇", strength: "右翼守備" },
      { name: "2/14 Punjab", from: [-7, 0, -10], to: [-7, 0, -10], commander: "莫德庇", strength: "中央守備" },
      { name: "5/7 Rajput", from: [26, 0, -8], to: [26, 0, -8], commander: "莫德庇", strength: "左翼守備" }
    ],
    bursts: [[6, 2, -18], [18, 2, 3], [-24, 2, -16]]
  },
  {
    date: "1941.12.09-10",
    tick: "12/9",
    phase: "醉酒灣防線",
    title: "城門碉堡失守，防線被夜襲穿透",
    copy: "日軍偵察到城門水塘與孖指徑附近弱點，快速突破醉酒灣防線，九龍北部防禦崩解。",
    weather: "低雲、細雨",
    jStrength: "突擊隊先導",
    aStrength: "防線三營",
    camera: new THREE.Vector3(-17, 42, 44),
    target: new THREE.Vector3(-8, 0, -4),
    japanese: [
      { name: "第228聯隊", from: [24, 0, -20], to: [7, 0, -3], commander: "酒井隆", strength: "夜襲" },
      { name: "第229聯隊", from: [-7, 0, -24], to: [-12, 0, -2], commander: "新美正一", strength: "中路突破" },
      { name: "第230聯隊", from: [-40, 0, -22], to: [-34, 0, -2], commander: "佐野忠義", strength: "西路壓迫" }
    ],
    allied: [
      { name: "城門碉堡", from: [-5, 0, -6], to: [-10, 0, 2], commander: "Middlesex", strength: "機槍陣地" },
      { name: "Punjabs", from: [-7, 0, -10], to: [-12, 0, 4], commander: "莫德庇", strength: "後撤" },
      { name: "Rajputs", from: [26, 0, -8], to: [18, 0, 5], commander: "莫德庇", strength: "東段" }
    ],
    bursts: [[-5, 3, -5], [-12, 2, 0], [2, 2, -2]]
  },
  {
    date: "1941.12.13",
    tick: "12/13",
    phase: "九龍撤退",
    title: "守軍放棄九龍，退守港島",
    copy: "新界與九龍難以持續防守，守軍破壞設施後撤過維多利亞港，日軍控制九龍半島。",
    weather: "炮煙、海面能見度低",
    jStrength: "九龍集結",
    aStrength: "港島防衛",
    camera: new THREE.Vector3(0, 36, 46),
    target: new THREE.Vector3(0, 0, 12),
    japanese: [
      { name: "九龍攻擊群", from: [-12, 0, -2], to: [-10, 0, 12], commander: "酒井隆", strength: "推進" },
      { name: "炮兵群", from: [10, 0, -5], to: [8, 0, 9], commander: "第23軍", strength: "炮擊港島" }
    ],
    allied: [
      { name: "西旅", from: [-14, 0, 10], to: [-26, 0, 26], commander: "羅遜", strength: "港島西段" },
      { name: "東旅", from: [16, 0, 10], to: [22, 0, 25], commander: "華里士", strength: "港島東段" },
      { name: "總部", from: [0, 0, 12], to: [-4, 0, 30], commander: "莫德庇", strength: "指揮" }
    ],
    bursts: [[-7, 2, 12], [7, 2, 14], [0, 2, 23]]
  },
  {
    date: "1941.12.18",
    tick: "12/18",
    phase: "港島登陸",
    title: "日軍橫渡維港，登陸北角與太古",
    copy: "日軍趁夜渡海，在北角、太古一帶登陸，港島戰線由北岸向山脊急速擴散。",
    weather: "夜雨、探照燈、海霧",
    jStrength: "多路登陸",
    aStrength: "東西旅分守",
    camera: new THREE.Vector3(26, 30, 42),
    target: new THREE.Vector3(14, 0, 25),
    japanese: [
      { name: "北角登陸隊", from: [6, 0, 12], to: [12, 0, 23], commander: "酒井隆", strength: "渡海" },
      { name: "太古登陸隊", from: [16, 0, 12], to: [24, 0, 25], commander: "佐野忠義", strength: "渡海" },
      { name: "炮兵支援", from: [-8, 0, 10], to: [-1, 0, 18], commander: "第23軍", strength: "火力壓制" }
    ],
    allied: [
      { name: "西旅司令部", from: [-26, 0, 26], to: [-18, 0, 28], commander: "羅遜", strength: "反擊" },
      { name: "東旅", from: [22, 0, 25], to: [28, 0, 30], commander: "華里士", strength: "防守" },
      { name: "HKVDC", from: [4, 0, 26], to: [7, 0, 27], commander: "義勇軍", strength: "街壘" }
    ],
    bursts: [[10, 2, 22], [18, 2, 25], [4, 2, 20]]
  },
  {
    date: "1941.12.19-23",
    tick: "12/19",
    phase: "黃泥涌峽",
    title: "黃泥涌峽激戰，港島防線被切開",
    copy: "羅遜准將在西旅司令部附近陣亡，黃泥涌峽失守後，港島東西守軍難以互相支援。",
    weather: "雨霧、山谷炮煙",
    jStrength: "山脊穿插",
    aStrength: "孤立據點",
    camera: new THREE.Vector3(4, 34, 58),
    target: new THREE.Vector3(4, 0, 32),
    japanese: [
      { name: "黃泥涌突擊", from: [12, 0, 23], to: [4, 0, 33], commander: "第229聯隊", strength: "穿插" },
      { name: "淺水灣方向", from: [24, 0, 25], to: [17, 0, 42], commander: "第230聯隊", strength: "南壓" }
    ],
    allied: [
      { name: "Winnipeg Grenadiers", from: [-18, 0, 28], to: [1, 0, 32], commander: "羅遜", strength: "反擊" },
      { name: "Middlesex MG", from: [7, 0, 27], to: [5, 0, 34], commander: "機槍連", strength: "碉堡" },
      { name: "赤柱守軍", from: [28, 0, 30], to: [26, 0, 47], commander: "華里士", strength: "堅守" }
    ],
    bursts: [[3, 3, 33], [8, 3, 35], [19, 3, 42], [-2, 2, 30]]
  },
  {
    date: "1941.12.25",
    tick: "12/25",
    phase: "黑色聖誕",
    title: "港督楊慕琦與莫德庇向酒井隆投降",
    copy: "守軍彈藥、通訊與補給逐步崩潰，香港在聖誕日下午投降，戰役歷時 17 天。",
    weather: "煙塵散落、陰天",
    jStrength: "控制港島北部",
    aStrength: "殘餘據點",
    camera: new THREE.Vector3(-28, 32, 58),
    target: new THREE.Vector3(-4, 0, 30),
    japanese: [
      { name: "日軍司令部", from: [4, 0, 33], to: [-8, 0, 21], commander: "酒井隆", strength: "半島酒店" },
      { name: "港島掃蕩隊", from: [17, 0, 42], to: [0, 0, 39], commander: "第23軍", strength: "控制線" }
    ],
    allied: [
      { name: "總督府", from: [-4, 0, 30], to: [-9, 0, 29], commander: "楊慕琦", strength: "投降" },
      { name: "赤柱殘部", from: [26, 0, 47], to: [27, 0, 48], commander: "華里士", strength: "延遲接令" }
    ],
    bursts: [[-8, 2, 21], [0, 2, 38]]
  }
];

const locations = [
  { name: "深圳河", pos: [0, 0.2, -55], color: "#b7efff" },
  { name: "大埔", pos: [19, 1, -21], color: "#ffffff" },
  { name: "城門水塘", pos: [-4, 1.2, -5], color: "#ffffff" },
  { name: "醉酒灣防線", pos: [-12, 1.4, 1], color: "#f2c45b" },
  { name: "九龍", pos: [-5, 1.2, 12], color: "#ffffff" },
  { name: "啟德", pos: [13, 1, 10], color: "#ffffff" },
  { name: "維多利亞港", pos: [2, 0.3, 18], color: "#b7efff" },
  { name: "北角", pos: [10, 1, 23], color: "#ffffff" },
  { name: "太古", pos: [22, 1, 25], color: "#ffffff" },
  { name: "黃泥涌峽", pos: [4, 1.5, 33], color: "#f2c45b" },
  { name: "淺水灣", pos: [16, 1, 42], color: "#ffffff" },
  { name: "赤柱", pos: [27, 1, 48], color: "#ffffff" },
  { name: "半島酒店", pos: [-8, 1.1, 21], color: "#ffffff" }
];

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
const unitLayer = new THREE.Group();
const arrowLayer = new THREE.Group();
const effectLayer = new THREE.Group();
scene.add(battlefield, unitLayer, arrowLayer, effectLayer);

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
    roundRect(ctx, 20, 56, width - 40, 112, 18);
    ctx.fill();
    ctx.stroke();
    ctx.font = "700 58px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2 + 4, width - 70);
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

  const ginLine = makeLine([[-42, 1.25, -4], [-20, 1.25, 0], [-3, 1.25, -5], [17, 1.25, 2], [30, 1.25, -2]], "#f2c45b", 0.55);
  battlefield.add(ginLine);

  locations.forEach((item) => {
    const label = makeLabel(item.name, item.color, item.name.length > 5 ? 3.8 : 4.2);
    label.position.set(item.pos[0], item.pos[1] + 3.2, item.pos[2]);
    battlefield.add(label);

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

function createUnit(unit, color, side, index = 0) {
  const group = new THREE.Group();
  const sideColor = side === "japanese" ? red : blue;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.5, 2.2, 5),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.5, metalness: 0.18, emissive: sideColor, emissiveIntensity: 0.12 })
  );
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, 0.08, 8, 48),
    new THREE.MeshBasicMaterial({ color: sideColor, transparent: true, opacity: 0.86 })
  );
  ring.position.y = 0.2;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 5.2, 8),
    new THREE.MeshBasicMaterial({ color: "#e5e7eb" })
  );
  pole.position.set(1.25, 3.8, 0);
  group.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.55),
    new THREE.MeshBasicMaterial({ map: makeFlagTexture(side, unit.name), transparent: true, side: THREE.DoubleSide })
  );
  flag.position.set(2.45, 4.65, 0);
  group.add(flag);

  const label = makeLabel(`${unit.name}\n${unit.commander}`, color, 3.1);
  const labelSide = side === "japanese" ? 1 : -1;
  const lane = index % 3;
  label.position.set(labelSide * (2.7 + lane * 1.2), 6.35 + lane * 0.72, (lane - 1) * 1.15);
  label.scale.multiplyScalar(0.82);
  group.add(label);
  group.userData = { unit, from: new THREE.Vector3(unit.from[0], 0, unit.from[2]), to: new THREE.Vector3(unit.to[0], 0, unit.to[2]) };
  return group;
}

function makeFlagTexture(side, unitName) {
  return makeCanvasTexture((ctx, width, height) => {
    const bg = side === "japanese" ? "#b11218" : "#0f4ea6";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    if (side === "japanese") {
      ctx.fillStyle = "#f8f3dc";
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.48, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f8f3dc";
      ctx.lineWidth = 14;
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height * 0.48);
        ctx.lineTo(width * 0.5 + Math.cos(a) * 148, height * 0.48 + Math.sin(a) * 148);
        ctx.stroke();
      }
      ctx.fillStyle = "#b11218";
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.48, 32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#f2c45b";
      ctx.font = "900 88px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♛", width * 0.5, height * 0.36);
      ctx.font = "900 72px Georgia, serif";
      ctx.fillText("獅", width * 0.5, height * 0.66);
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "700 28px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(unitName.slice(0, 16), width * 0.5, height - 25);
  }, 512, 320);
}

function createArrow(unit, color) {
  const from = new THREE.Vector3(unit.from[0], 0.55, unit.from[2]);
  const to = new THREE.Vector3(unit.to[0], 0.55, unit.to[2]);
  const delta = new THREE.Vector3().subVectors(to, from);
  const length = delta.length();
  if (length < 0.5) {
    return null;
  }
  const group = new THREE.Group();
  const shaft = makeLine([from.toArray(), to.toArray()], color, 0.16);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 2.3, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 })
  );
  cone.position.copy(to);
  cone.position.y = 0.72;
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  group.add(shaft, cone);
  return group;
}

function createExplosionTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    const grd = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.22, "rgba(255,220,92,0.95)");
    grd.addColorStop(0.5, "rgba(255,77,45,0.68)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
  }, 256, 256);
}

const explosionTexture = createExplosionTexture();
const explosions = [];
const rainDrops = [];

function makeBurst(position, delay = 0) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: explosionTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.position.set(position[0], position[1] + 1.4, position[2]);
  sprite.scale.set(0.1, 0.1, 0.1);
  sprite.userData = { delay, life: 0 };
  effectLayer.add(sprite);
  explosions.push(sprite);
}

function createWeather() {
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

function clearLayer(layer) {
  while (layer.children.length) {
    const child = layer.children.pop();
    child.traverse?.((node) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach((m) => m.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    });
  }
}

let activeStep = 0;
let playing = false;
let playTimer = 0;
let cameraTween = null;

function setStep(index) {
  activeStep = Number(index);
  const step = battleSteps[activeStep];
  eventDate.textContent = step.date;
  phaseName.textContent = step.phase;
  eventTitle.textContent = step.title;
  eventCopy.textContent = step.copy;
  japaneseStrength.textContent = step.jStrength;
  alliedStrength.textContent = step.aStrength;
  weatherReadout.textContent = step.weather;
  timeline.value = String(activeStep);

  clearLayer(unitLayer);
  clearLayer(arrowLayer);
  explosions.length = 0;
  effectLayer.children = effectLayer.children.filter((child) => !child.userData.isBurst);

  step.japanese.forEach((unit, index) => {
    const marker = createUnit(unit, "#ffd8d8", "japanese", index);
    marker.position.set(unit.to[0], 0.5, unit.to[2]);
    unitLayer.add(marker);
    const arrow = createArrow(unit, "#ff5a4f");
    if (arrow) arrowLayer.add(arrow);
  });

  step.allied.forEach((unit, index) => {
    const marker = createUnit(unit, "#d8ecff", "allied", index);
    marker.position.set(unit.to[0], 0.5, unit.to[2]);
    unitLayer.add(marker);
    const arrow = createArrow(unit, "#42a5ff");
    if (arrow) arrowLayer.add(arrow);
  });

  step.bursts.forEach((pos, i) => makeBurst(pos, i * 0.28));
  explosions.forEach((burst) => {
    burst.userData.isBurst = true;
  });

  document.querySelectorAll(".timeline-ticks button").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === activeStep);
  });

  cameraTween = {
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPosition: step.camera.clone(),
    endTarget: step.target.clone(),
    t: 0
  };
}

function buildTimeline() {
  battleSteps.forEach((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${step.tick} ${step.phase}`;
    button.addEventListener("click", () => setStep(index));
    timelineTicks.appendChild(button);
  });
}

timeline.addEventListener("input", (event) => {
  setStep(event.target.value);
});

playButton.addEventListener("click", () => {
  playing = !playing;
  playButton.textContent = playing ? "暫停" : "播放";
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, clock.getDelta());

  if (cameraTween) {
    cameraTween.t = Math.min(1, cameraTween.t + delta * 0.55);
    const eased = 1 - Math.pow(1 - cameraTween.t, 3);
    camera.position.lerpVectors(cameraTween.startPosition, cameraTween.endPosition, eased);
    controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, eased);
    cameraReadout.textContent = eased < 1 ? "節目運鏡中" : "自由運鏡";
    if (cameraTween.t >= 1) cameraTween = null;
  }

  unitLayer.children.forEach((group, index) => {
    group.rotation.y = Math.sin(time * 0.0014 + index) * 0.1;
    const ring = group.children[1];
    if (ring) {
      ring.scale.setScalar(1 + Math.sin(time * 0.004 + index) * 0.08);
    }
  });

  explosions.forEach((burst) => {
    burst.userData.life += delta;
    const local = Math.max(0, burst.userData.life - burst.userData.delay);
    const pulse = (local % 1.15) / 1.15;
    const scale = 2.2 + pulse * 7.5;
    burst.scale.set(scale, scale, scale);
    burst.material.opacity = Math.max(0, 1 - pulse) * 0.95;
  });

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

  if (playing) {
    playTimer += delta;
    if (playTimer > 4.1) {
      playTimer = 0;
      setStep((activeStep + 1) % battleSteps.length);
    }
  }

  searchLight.position.x = 28 + Math.sin(time * 0.0005) * 20;
  controls.update();
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();
createTerrain();
createWeather();
buildTimeline();
setStep(0);
loading.classList.add("hidden");
requestAnimationFrame(animate);
