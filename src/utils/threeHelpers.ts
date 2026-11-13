import * as THREE from 'three';
import { Vec3 } from '../types/vector';
import { cleanNum } from './math';

/**
 * Hệ tọa độ toán học Oxyz thuận tay phải:
 *   Ox -> Three.js +Z (hướng về phía người xem, lệch trái)
 *   Oy -> Three.js +X (sang phải)
 *   Oz -> Three.js +Y (hướng thẳng lên trên)
 * Kiểm tra định thức ma trận chuyển: det = +1 (bảo toàn hướng thuận tay phải).
 */
export function mathToThree(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.y, v.z, v.x);
}

export function threeToMath(p: THREE.Vector3): Vec3 {
  return {
    x: cleanNum(p.z),
    y: cleanNum(p.x),
    z: cleanNum(p.y),
  };
}

/**
 * Giải phóng tài nguyên Geometry, Material, Texture đệ quy trong một Object3D
 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          disposeMaterialTextures(m);
          m.dispose();
        });
      } else if (mat) {
        disposeMaterialTextures(mat);
        mat.dispose();
      }
    } else if (obj instanceof THREE.Sprite) {
      const mat = obj.material;
      if (mat) {
        mat.map?.dispose();
        mat.dispose();
      }
    }
  });
}

function disposeMaterialTextures(mat: THREE.Material): void {
  const m = mat as unknown as Record<string, unknown>;
  if (m.map && m.map instanceof THREE.Texture) {
    m.map.dispose();
  }
}

/**
 * Tạo Sprite chữ sắc nét từ HTML5 Canvas (hỗ trợ đầy đủ tiếng Việt & công thức)
 */
export function createTextSprite(
  text: string,
  options: {
    color?: string;
    bgColor?: string;
    borderColor?: string;
    fontSize?: number;
    bold?: boolean;
    scale?: number;
    maxAnisotropy?: number;
  } = {}
): THREE.Sprite {
  const {
    color = '#0F172A',
    bgColor = 'rgba(255, 255, 255, 0.92)',
    borderColor = 'rgba(148, 163, 184, 0.55)',
    fontSize = 36,
    bold = true,
    scale = 0.52,
    maxAnisotropy = 4,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `${bold ? '700' : '600'} ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.font = font;

  const metrics = ctx.measureText(text);
  const padX = 20;
  const padY = 12;
  const w = Math.ceil(metrics.width + padX * 2);
  const h = Math.ceil(fontSize * 1.35 + padY * 2);

  canvas.width = Math.max(64, w);
  canvas.height = Math.max(40, h);

  // Vẽ lại sau khi resize canvas
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const r = 14;
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, r);
    ctx.fill();
  }

  if (borderColor !== 'transparent') {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, r);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(scale * aspect, scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Tạo mũi tên 3D đa thành phần (Group gồm: khớp gốc, thân trụ, vòng cổ, đầu nón)
 * Đảm bảo điểm đầu nằm chính xác tại `start` và đỉnh mũi tên nằm chính xác tại `end`.
 */
export function createCompositeVectorArrow(
  startMath: Vec3,
  endMath: Vec3,
  options: {
    color: string;
    thickness?: number;
    opacity?: number;
    isResultant?: boolean;
    isGhost?: boolean;
  }
): THREE.Group {
  const group = new THREE.Group();
  const start = mathToThree(startMath);
  const end = mathToThree(endMath);
  const dirVec = new THREE.Vector3().subVectors(end, start);
  const length = dirVec.length();

  const {
    color,
    thickness = 1,
    opacity = 1,
    isResultant = false,
    isGhost = false,
  } = options;

  const threeColor = new THREE.Color(color);
  const transparent = opacity < 0.99 || isGhost;

  // Trường hợp vectơ không (điểm đầu trùng điểm cuối)
  if (length < 1e-4) {
    const ringGeo = new THREE.TorusGeometry(0.18 * thickness, 0.035 * thickness, 12, 28);
    const ringMat = new THREE.MeshStandardMaterial({
      color: threeColor,
      roughness: 0.3,
      metalness: 0.25,
      transparent,
      opacity,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(start);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const coreGeo = new THREE.SphereGeometry(0.08 * thickness, 18, 18);
    const coreMat = new THREE.MeshStandardMaterial({
      color: threeColor,
      roughness: 0.2,
      metalness: 0.4,
      transparent,
      opacity,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(start);
    group.add(core);
    return group;
  }

  const scaleFactor = (isResultant ? 1.38 : 1.0) * thickness;
  const shaftRadius = (isGhost ? 0.025 : 0.045) * scaleFactor;
  const headRadius = (isGhost ? 0.08 : 0.135) * scaleFactor;
  const headLength = Math.min(0.42 * scaleFactor, length * 0.36);
  const shaftLength = Math.max(0.001, length - headLength);

  const unitDir = dirVec.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, unitDir);

  const shaftMat = new THREE.MeshStandardMaterial({
    color: threeColor,
    roughness: isGhost ? 0.65 : 0.34,
    metalness: isGhost ? 0.05 : 0.18,
    transparent,
    opacity,
  });

  const collarMat = new THREE.MeshStandardMaterial({
    color: threeColor.clone().multiplyScalar(0.85),
    roughness: 0.22,
    metalness: 0.55,
    transparent,
    opacity,
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: threeColor,
    roughness: isGhost ? 0.65 : 0.25,
    metalness: isGhost ? 0.05 : 0.22,
    transparent,
    opacity,
  });

  // 1. Khớp nối gốc
  const baseCap = new THREE.Mesh(
    new THREE.SphereGeometry(shaftRadius * 1.25, 16, 16),
    collarMat
  );
  baseCap.position.copy(start);
  group.add(baseCap);

  // 2. Thân vectơ hình trụ
  const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 20);
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  const shaftMid = start.clone().addScaledVector(unitDir, shaftLength * 0.5);
  shaft.position.copy(shaftMid);
  shaft.quaternion.copy(quat);
  group.add(shaft);

  // 3. Vòng cổ chuyển tiếp giữa thân và đầu mũi tên
  const collarGeo = new THREE.CylinderGeometry(headRadius * 0.72, shaftRadius * 1.15, 0.04 * scaleFactor, 20);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.copy(start).addScaledVector(unitDir, shaftLength);
  collar.quaternion.copy(quat);
  group.add(collar);

  // 4. Đầu mũi tên hình nón (đỉnh tại đúng `end`)
  const coneGeo = new THREE.ConeGeometry(headRadius, headLength, 24);
  const cone = new THREE.Mesh(coneGeo, headMat);
  const coneMid = start.clone().addScaledVector(unitDir, shaftLength + headLength * 0.5);
  cone.position.copy(coneMid);
  cone.quaternion.copy(quat);
  group.add(cone);

  return group;
}

/**
 * Tạo đoạn thẳng nét đứt từ điểm A đến điểm B trong hệ tọa độ toán học
 */
export function createDashedLineMath(
  fromMath: Vec3,
  toMath: Vec3,
  color: string,
  opacity = 0.75,
  dashSize = 0.22,
  gapSize = 0.14
): THREE.Line {
  const p1 = mathToThree(fromMath);
  const p2 = mathToThree(toMath);
  const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineDashedMaterial({
    color: new THREE.Color(color),
    dashSize,
    gapSize,
    transparent: opacity < 1,
    opacity,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

/**
 * Tạo hệ đường gióng vuông góc từ một điểm P(x, y, z) xuống các trục & mặt phẳng tọa độ
 */
export function createProjectionLinesGroup(
  p: Vec3,
  color = '#64748B',
  includeAxisNumbers = false,
  maxAnisotropy = 4
): THREE.Group {
  const group = new THREE.Group();

  // Nếu trùng gốc tọa độ thì không cần đường gióng
  if (Math.abs(p.x) < 1e-4 && Math.abs(p.y) < 1e-4 && Math.abs(p.z) < 1e-4) {
    return group;
  }

  const pOxy: Vec3 = { x: p.x, y: p.y, z: 0 };
  const pOx: Vec3 = { x: p.x, y: 0, z: 0 };
  const pOy: Vec3 = { x: 0, y: p.y, z: 0 };
  const pOz: Vec3 = { x: 0, y: 0, z: p.z };

  // Đường gióng thẳng đứng xuống mặt phẳng Oxy
  if (Math.abs(p.z) > 1e-4) {
    group.add(createDashedLineMath(p, pOxy, '#2563EB', 0.65, 0.18, 0.12));
    // Từ P xuống Oz
    group.add(createDashedLineMath(p, pOz, '#2563EB', 0.55, 0.18, 0.12));
  }

  // Từ hình chiếu Oxy đến Ox và Oy
  if (Math.abs(p.y) > 1e-4) {
    group.add(createDashedLineMath(pOxy, pOx, '#DC2626', 0.65, 0.18, 0.12));
  }
  if (Math.abs(p.x) > 1e-4) {
    group.add(createDashedLineMath(pOxy, pOy, '#16A34A', 0.65, 0.18, 0.12));
  }

  // Chấm nhỏ tại hình chiếu Oxy và các trục
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  const dotGeo = new THREE.SphereGeometry(0.055, 12, 12);

  if (Math.abs(p.z) > 1e-4 && (Math.abs(p.x) > 1e-4 || Math.abs(p.y) > 1e-4)) {
    const dotOxy = new THREE.Mesh(dotGeo.clone(), dotMat.clone());
    dotOxy.position.copy(mathToThree(pOxy));
    group.add(dotOxy);
  }

  const addAxisMarker = (pt: Vec3, val: number, axisColor: string) => {
    if (Math.abs(val) < 1e-4) return;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(axisColor) })
    );
    dot.position.copy(mathToThree(pt));
    group.add(dot);

    if (includeAxisNumbers) {
      const sprite = createTextSprite(`${cleanNum(val)}`, {
        color: axisColor,
        fontSize: 30,
        scale: 0.36,
        maxAnisotropy,
      });
      sprite.position.copy(mathToThree(pt)).add(new THREE.Vector3(0, -0.25, 0));
      group.add(sprite);
    }
  };

  addAxisMarker(pOx, p.x, '#DC2626');
  addAxisMarker(pOy, p.y, '#16A34A');
  addAxisMarker(pOz, p.z, '#2563EB');

  return group;
}

/**
 * Tạo điểm cầu 3D có viền tinh tế
 */
export function createPointMarker(
  p: Vec3,
  color: string,
  radius = 0.13,
  selectableKey?: 'A' | 'B'
): THREE.Group {
  const group = new THREE.Group();
  const pos = mathToThree(p);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.22,
      metalness: 0.25,
    })
  );
  sphere.position.copy(pos);
  if (selectableKey) {
    sphere.userData.selectablePoint = selectableKey;
  }
  group.add(sphere);

  // Vòng halo mảnh xung quanh điểm
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.35, radius * 1.65, 24),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
  );
  halo.position.copy(pos);
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  return group;
}
