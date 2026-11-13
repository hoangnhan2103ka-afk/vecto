import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Pause, RotateCw, SlidersHorizontal } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AdditionRule,
  AppMode,
  CameraPreset,
  PracticeQuestion,
  SingleSubMode,
  Vec3,
  VectorEntry,
  ViewSettings,
} from '../types/vector';
import {
  addVec,
  cleanNum,
  formatVecText,
  isZeroVec,
  RESULTANT_COLOR,
  subVec,
  sumVecs,
} from '../utils/math';
import {
  createCompositeVectorArrow,
  createDashedLineMath,
  createPointMarker,
  createProjectionLinesGroup,
  createTextSprite,
  disposeObject3D,
  mathToThree,
  threeToMath,
} from '../utils/threeHelpers';

export interface OxyzCanvasHandle {
  setCameraPreset: (preset: CameraPreset) => void;
  resetCamera: () => void;
  capturePNG: (highRes?: boolean) => string | null;
}

interface OxyzCanvasProps {
  mode: AppMode;
  singleSubMode: SingleSubMode;
  singleVectors: VectorEntry[];
  pointA: Vec3;
  pointB: Vec3;
  twoU: Vec3;
  twoV: Vec3;
  additionRule: AdditionRule;
  twoSumSimProgress: number;
  multiVectors: VectorEntry[];
  multiAnimStep: number;
  multiAnimSubProgress: number;
  exploreSelectedPoint: 'A' | 'B';
  onSelectExplorePoint: (which: 'A' | 'B') => void;
  onExplorePointMove: (which: 'A' | 'B', pos: Vec3) => void;
  practiceQuestion: PracticeQuestion | null;
  practiceShowSolution: boolean;
  viewSettings: ViewSettings;
}

const CAMERA_DEFAULT_POS = new THREE.Vector3(10.5, 7.5, 11.5);
const CAMERA_TARGET_DEFAULT = new THREE.Vector3(0, 0, 0);

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const OxyzCanvas = forwardRef<OxyzCanvasHandle, OxyzCanvasProps>(
  function OxyzCanvas(props, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [webglLost, setWebglLost] = useState(false);
    const [autoRotate, setAutoRotate] = useState(false);
    const [autoRotateSpeed, setAutoRotateSpeed] = useState(1.1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const autoRotateRef = useRef(false);
    const autoRotateSpeedRef = useRef(1.1);
    const isTransformDraggingRef = useRef(false);
    const isOrbitDraggingRef = useRef(false);
    const speedPanelRef = useRef<HTMLDivElement | null>(null);

    // Các ref ổn định cho vòng lặp WebGL
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const transformControlsRef = useRef<TransformControls | null>(null);
    const axesGroupRef = useRef<THREE.Group | null>(null);
    const contentGroupRef = useRef<THREE.Group | null>(null);
    const dragAnchorARef = useRef<THREE.Object3D | null>(null);
    const dragAnchorBRef = useRef<THREE.Object3D | null>(null);
    const requestRenderRef = useRef<() => void>(() => {});
    const isSoftwareGlRef = useRef<boolean>(false);

    // Camera transition target
    const camTransitionRef = useRef<{
      active: boolean;
      pos: THREE.Vector3;
      target: THREE.Vector3;
    }>({
      active: false,
      pos: CAMERA_DEFAULT_POS.clone(),
      target: CAMERA_TARGET_DEFAULT.clone(),
    });

    // Latest callbacks in refs để tránh re-mount WebGL
    const propsRef = useRef(props);
    propsRef.current = props;

    // Tính phạm vi trục tự động dựa trên toàn bộ dữ liệu hiện tại
    const axisRange = useMemo(() => {
      let maxCoord = 5;
      const checkVec = (v: Vec3) => {
        maxCoord = Math.max(
          maxCoord,
          Math.abs(v.x),
          Math.abs(v.y),
          Math.abs(v.z)
        );
      };

      if (props.mode === 'single') {
        if (props.singleSubMode === 'by-coords') {
          props.singleVectors.forEach((item) => {
            if (item.visible) {
              checkVec(item.startPoint);
              checkVec(addVec(item.startPoint, item.coords));
            }
          });
        } else {
          checkVec(props.pointA);
          checkVec(props.pointB);
        }
      } else if (props.mode === 'two-sum') {
        checkVec(props.twoU);
        checkVec(props.twoV);
        checkVec(addVec(props.twoU, props.twoV));
      } else if (props.mode === 'multi-sum') {
        let cur: Vec3 = { x: 0, y: 0, z: 0 };
        props.multiVectors.forEach((v) => {
          if (v.visible) {
            checkVec(v.coords);
            cur = addVec(cur, v.coords);
            checkVec(cur);
          }
        });
      } else if (props.mode === 'explore') {
        checkVec(props.pointA);
        checkVec(props.pointB);
      } else if (props.mode === 'practice' && props.practiceQuestion) {
        const q = props.practiceQuestion;
        if (q.pointA) checkVec(q.pointA);
        if (q.pointB) checkVec(q.pointB);
        if (q.vectors) {
          let cur: Vec3 = { x: 0, y: 0, z: 0 };
          q.vectors.forEach((v) => {
            checkVec(v.coords);
            cur = addVec(cur, v.coords);
            checkVec(cur);
          });
        }
      }

      return Math.min(40, Math.max(6, Math.ceil(maxCoord + 2)));
    }, [
      props.mode,
      props.singleSubMode,
      props.singleVectors,
      props.pointA,
      props.pointB,
      props.twoU,
      props.twoV,
      props.multiVectors,
      props.practiceQuestion,
    ]);

    const axisRangeRef = useRef(axisRange);
    axisRangeRef.current = axisRange;

    // Khởi tạo Three.js 1 lần duy nhất
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareGl();
      isSoftwareGlRef.current = isSoftwareGl;

      const width = Math.max(container.clientWidth, 320);
      const height = Math.max(container.clientHeight, 320);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#F8FAFC');
      scene.fog = new THREE.Fog('#F8FAFC', 48, 120);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 250);
      camera.position.copy(CAMERA_DEFAULT_POS);
      camera.lookAt(CAMERA_TARGET_DEFAULT);
      cameraRef.current = camera;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        setWebglLost(true);
        return;
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = false;
      rendererRef.current = renderer;

      const canvas = renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      // Môi trường phản xạ studio
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTexture = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();

      // Hệ thống ánh sáng 3 điểm studio (ấm / mát)
      const hemiLight = new THREE.HemisphereLight('#EFF6FF', '#E2E8F0', 0.85);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.35);
      keyLight.position.set(14, 22, 16);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight('#DBEAFE', 0.65);
      rimLight.position.set(-14, 10, -14);
      scene.add(rimLight);

      // Nhóm trục và nội dung
      const axesGroup = new THREE.Group();
      scene.add(axesGroup);
      axesGroupRef.current = axesGroup;

      const contentGroup = new THREE.Group();
      scene.add(contentGroup);
      contentGroupRef.current = contentGroup;

      // Điểm neo để kéo thả trong chế độ Khám phá tọa độ
      const anchorA = new THREE.Object3D();
      const anchorB = new THREE.Object3D();
      scene.add(anchorA);
      scene.add(anchorB);
      dragAnchorARef.current = anchorA;
      dragAnchorBRef.current = anchorB;

      // OrbitControls
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.autoRotate = false;
      controls.autoRotateSpeed = autoRotateSpeedRef.current;
      controls.minDistance = 4;
      controls.maxDistance = 85;
      controls.target.copy(CAMERA_TARGET_DEFAULT);
      controlsRef.current = controls;

      // TransformControls cho kéo thả điểm A, B
      const transformControls = new TransformControls(camera, canvas);
      transformControls.setMode('translate');
      transformControls.setSpace('world');
      transformControls.setSize(0.75);
      transformControls.setTranslationSnap(0.5);
      const tcHelper = transformControls.getHelper();
      tcHelper.visible = false;
      scene.add(tcHelper);
      transformControlsRef.current = transformControls;

      let frameId = 0;
      let renderBusy = false;
      let renderDirty = false;
      let lastTime = performance.now();

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const requestRender = () => {
        if (renderBusy) {
          renderDirty = true;
          return;
        }
        renderBusy = true;
        frameId = requestAnimationFrame(() => {
          renderDirty = false;
          const now = performance.now();
          const dt = Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;

          let needsMoreFrames = false;

          // Nội suy chuyển góc nhìn mượt mà
          if (camTransitionRef.current.active) {
            const lambda = 10;
            camera.position.x = THREE.MathUtils.damp(
              camera.position.x,
              camTransitionRef.current.pos.x,
              lambda,
              dt
            );
            camera.position.y = THREE.MathUtils.damp(
              camera.position.y,
              camTransitionRef.current.pos.y,
              lambda,
              dt
            );
            camera.position.z = THREE.MathUtils.damp(
              camera.position.z,
              camTransitionRef.current.pos.z,
              lambda,
              dt
            );
            controls.target.x = THREE.MathUtils.damp(
              controls.target.x,
              camTransitionRef.current.target.x,
              lambda,
              dt
            );
            controls.target.y = THREE.MathUtils.damp(
              controls.target.y,
              camTransitionRef.current.target.y,
              lambda,
              dt
            );
            controls.target.z = THREE.MathUtils.damp(
              controls.target.z,
              camTransitionRef.current.target.z,
              lambda,
              dt
            );

            const distPos = camera.position.distanceTo(camTransitionRef.current.pos);
            const distTarget = controls.target.distanceTo(
              camTransitionRef.current.target
            );
            if (distPos < 0.03 && distTarget < 0.03) {
              camera.position.copy(camTransitionRef.current.pos);
              controls.target.copy(camTransitionRef.current.target);
              camTransitionRef.current.active = false;
            } else {
              needsMoreFrames = true;
            }
          }

          const shouldAutoRotate =
            autoRotateRef.current &&
            !camTransitionRef.current.active &&
            !isTransformDraggingRef.current &&
            !isOrbitDraggingRef.current;
          controls.autoRotate = shouldAutoRotate;
          controls.autoRotateSpeed = autoRotateSpeedRef.current;

          if (controls.enableDamping || shouldAutoRotate) {
            const updated = controls.update(dt);
            if (updated || shouldAutoRotate) needsMoreFrames = true;
          } else {
            controls.update();
          }

          renderer.render(scene, camera);

          const done = () => {
            renderBusy = false;
            if (renderDirty || needsMoreFrames) {
              requestRender();
            }
          };

          if (isSoftwareGl) {
            afterDraw(done);
          } else {
            done();
          }
        });
      };

      requestRenderRef.current = requestRender;

      // Hủy chuyển cảnh & tạm nhường quyền điều khiển khi người dùng thao tác chuột thủ công
      const onControlsStart = () => {
        isOrbitDraggingRef.current = true;
        camTransitionRef.current.active = false;
      };
      const onControlsEnd = () => {
        isOrbitDraggingRef.current = false;
        if (autoRotateRef.current) {
          requestRender();
        }
      };
      const onControlsChange = () => {
        requestRender();
      };
      controls.addEventListener('start', onControlsStart);
      controls.addEventListener('end', onControlsEnd);
      controls.addEventListener('change', onControlsChange);

      // Kéo thả điểm 3D với TransformControls
      const onTransformDragging = (event: { value: unknown }) => {
        const dragging = Boolean(event.value);
        isTransformDraggingRef.current = dragging;
        controls.enabled = !dragging;
        requestRender();
      };
      const onTransformObjectChange = () => {
        const obj = transformControls.object;
        if (!obj) return;
        const p = propsRef.current;
        if (p.mode !== 'explore') return;

        const mathCoords = threeToMath(obj.position);
        // Giới hạn kéo trong khoảng hợp lý
        const clamped: Vec3 = {
          x: cleanNum(THREE.MathUtils.clamp(mathCoords.x, -15, 15)),
          y: cleanNum(THREE.MathUtils.clamp(mathCoords.y, -15, 15)),
          z: cleanNum(THREE.MathUtils.clamp(mathCoords.z, -15, 15)),
        };

        if (obj === anchorA) {
          p.onExplorePointMove('A', clamped);
        } else if (obj === anchorB) {
          p.onExplorePointMove('B', clamped);
        }
        requestRender();
      };

      transformControls.addEventListener('dragging-changed', onTransformDragging);
      transformControls.addEventListener('objectChange', onTransformObjectChange);

      // Raycasting để click chọn điểm A hoặc B trong không gian 3D
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDownPos = { x: 0, y: 0 };

      const onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };
      const onPointerUp = (e: PointerEvent) => {
        const dist = Math.hypot(
          e.clientX - pointerDownPos.x,
          e.clientY - pointerDownPos.y
        );
        if (dist > 6) return; // Là thao tác kéo xoay camera chứ không phải click
        if (propsRef.current.mode !== 'explore') return;

        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(contentGroup.children, true);
        for (const hit of hits) {
          const key = hit.object.userData?.selectablePoint as
            | 'A'
            | 'B'
            | undefined;
          if (key) {
            propsRef.current.onSelectExplorePoint(key);
            break;
          }
        }
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointerup', onPointerUp);

      // Phím Shift tạm tắt snap 0.5 để kéo mịn 0.1
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift') {
          transformControls.setTranslationSnap(0.1);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift') {
          transformControls.setTranslationSnap(0.5);
        }
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // Resize observer chuẩn xác cho layout 3 cột / toàn màn hình
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(1, Math.floor(entry.contentRect.width));
          const h = Math.max(1, Math.floor(entry.contentRect.height));
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          requestRender();
        }
      });
      resizeObserver.observe(container);

      // WebGL context lost / restored
      const onContextLost = (e: Event) => {
        e.preventDefault();
        setWebglLost(true);
      };
      const onContextRestored = () => {
        setWebglLost(false);
        requestRender();
      };
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
      requestRender();

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver.disconnect();
        controls.removeEventListener('start', onControlsStart);
        controls.removeEventListener('end', onControlsEnd);
        controls.removeEventListener('change', onControlsChange);
        controls.dispose();
        transformControls.removeEventListener(
          'dragging-changed',
          onTransformDragging
        );
        transformControls.removeEventListener(
          'objectChange',
          onTransformObjectChange
        );
        transformControls.dispose();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        disposeObject3D(axesGroup);
        disposeObject3D(contentGroup);
        envTexture.dispose();
        renderer.dispose();
        if (canvas.parentElement === container) {
          container.removeChild(canvas);
        }
      };
    }, []);

    // Phương thức điều khiển từ bên ngoài (góc nhìn + chụp ảnh PNG)
    useImperativeHandle(ref, () => ({
      setCameraPreset: (preset: CameraPreset) => {
        const range = axisRangeRef.current;
        const dist = Math.max(14, range * 2.15);
        const trans = camTransitionRef.current;
        trans.target.set(0, 0, 0);

        if (preset === 'default') {
          const factor = Math.max(1, range / 6.5);
          trans.pos.copy(CAMERA_DEFAULT_POS).multiplyScalar(factor);
        } else if (preset === 'oxy') {
          // Nhìn từ +Oz xuống mặt phẳng Oxy
          autoRotateRef.current = false;
          setAutoRotate(false);
          trans.pos.set(0.01, dist, 0.01);
        } else if (preset === 'oxz') {
          // Nhìn vuông góc mặt phẳng Oxz (theo chiều trục Oy)
          autoRotateRef.current = false;
          setAutoRotate(false);
          trans.pos.set(-dist, 0.01, 0.01);
        } else if (preset === 'oyz') {
          // Nhìn vuông góc mặt phẳng Oyz (theo chiều trục Ox)
          autoRotateRef.current = false;
          setAutoRotate(false);
          trans.pos.set(0.01, 0.01, dist);
        }
        trans.active = true;
        requestRenderRef.current();
      },
      resetCamera: () => {
        const range = axisRangeRef.current;
        const factor = Math.max(1, range / 6.5);
        camTransitionRef.current.target.set(0, 0, 0);
        camTransitionRef.current.pos
          .copy(CAMERA_DEFAULT_POS)
          .multiplyScalar(factor);
        camTransitionRef.current.active = true;
        requestRenderRef.current();
      },
      capturePNG: (highRes = false) => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!renderer || !scene || !camera) return null;

        if (highRes) {
          const prevPR = renderer.getPixelRatio();
          renderer.setPixelRatio(Math.min(3, Math.max(2, prevPR)));
          renderer.render(scene, camera);
          const dataUrl = renderer.domElement.toDataURL('image/png');
          renderer.setPixelRatio(prevPR);
          renderer.render(scene, camera);
          return dataUrl;
        }

        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      },
    }));

    // Dựng lại hệ trục Oxyz, lưới, mặt phẳng tọa độ khi `axisRange` hoặc `viewSettings` thay đổi
    useEffect(() => {
      const axesGroup = axesGroupRef.current;
      const renderer = rendererRef.current;
      if (!axesGroup || !renderer) return;

      while (axesGroup.children.length > 0) {
        const child = axesGroup.children[0];
        axesGroup.remove(child);
        disposeObject3D(child);
      }

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const R = axisRange;
      const {
        showGrid,
        showPlaneOxy,
        showPlaneOyz,
        showPlaneOxz,
        showLabels,
      } = props.viewSettings;

      // 1. Lưới tọa độ trên mặt phẳng Oxy (y_three = 0)
      if (showGrid) {
        const grid = new THREE.GridHelper(R * 2, R * 2, '#94A3B8', '#E2E8F0');
        grid.position.y = -0.005;
        axesGroup.add(grid);
      }

      // 2. Các mặt phẳng tọa độ Oxy, Oyz, Oxz
      const addPlane = (
        size: number,
        color: string,
        borderColor: string,
        rotX: number,
        rotY: number,
        offset: THREE.Vector3
      ) => {
        const planeGeo = new THREE.PlaneGeometry(size, size);
        const planeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.14,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.rotation.set(rotX, rotY, 0);
        mesh.position.copy(offset);
        axesGroup.add(mesh);

        const edges = new THREE.EdgesGeometry(planeGeo);
        const border = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: new THREE.Color(borderColor),
            transparent: true,
            opacity: 0.45,
          })
        );
        border.rotation.set(rotX, rotY, 0);
        border.position.copy(offset);
        axesGroup.add(border);
      };

      if (showPlaneOxy) {
        addPlane(
          R * 2,
          '#38BDF8',
          '#0284C7',
          -Math.PI / 2,
          0,
          new THREE.Vector3(0, -0.002, 0)
        );
      }
      if (showPlaneOyz) {
        // Mặt phẳng Oyz: x_math = 0 -> z_three = 0 (nằm trên mặt phẳng XY của Three.js)
        addPlane(
          R * 2,
          '#4ADE80',
          '#16A34A',
          0,
          0,
          new THREE.Vector3(0, 0, -0.002)
        );
      }
      if (showPlaneOxz) {
        // Mặt phẳng Oxz: y_math = 0 -> x_three = 0 (nằm trên mặt phẳng YZ của Three.js)
        addPlane(
          R * 2,
          '#FB7185',
          '#DC2626',
          0,
          Math.PI / 2,
          new THREE.Vector3(-0.002, 0, 0)
        );
      }

      // 3. Ba trục Ox (đỏ), Oy (xanh lá), Oz (xanh dương)
      const buildAxis = (
        axisKey: 'x' | 'y' | 'z',
        colorHex: string,
        labelText: string
      ) => {
        const posEnd: Vec3 = {
          x: axisKey === 'x' ? R : 0,
          y: axisKey === 'y' ? R : 0,
          z: axisKey === 'z' ? R : 0,
        };
        const negEnd: Vec3 = {
          x: axisKey === 'x' ? -R : 0,
          y: axisKey === 'y' ? -R : 0,
          z: axisKey === 'z' ? -R : 0,
        };

        const pPos = mathToThree(posEnd);
        const pNeg = mathToThree(negEnd);
        const origin = new THREE.Vector3(0, 0, 0);
        const color = new THREE.Color(colorHex);

        // Chiều âm: nét đứt mảnh
        axesGroup.add(createDashedLineMath({ x: 0, y: 0, z: 0 }, negEnd, colorHex, 0.45, 0.25, 0.18));

        // Chiều dương: trụ mảnh + mũi tên chỉ chiều dương
        const dir = pPos.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        const coneH = 0.36;
        const shaftH = R - coneH;

        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.026, shaftH, 12),
          new THREE.MeshBasicMaterial({ color })
        );
        shaft.position.copy(origin).addScaledVector(dir, shaftH * 0.5);
        shaft.quaternion.copy(quat);
        axesGroup.add(shaft);

        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.095, coneH, 16),
          new THREE.MeshBasicMaterial({ color })
        );
        cone.position.copy(origin).addScaledVector(dir, shaftH + coneH * 0.5);
        cone.quaternion.copy(quat);
        axesGroup.add(cone);

        // Vạch chia đơn vị và nhãn số
        const tickStep = R > 16 ? 2 : 1;
        for (let i = -R + 1; i <= R - 1; i++) {
          if (i === 0) continue;
          const ptMath: Vec3 = {
            x: axisKey === 'x' ? i : 0,
            y: axisKey === 'y' ? i : 0,
            z: axisKey === 'z' ? i : 0,
          };
          const ptThree = mathToThree(ptMath);
          const tick = new THREE.Mesh(
            new THREE.SphereGeometry(0.036, 8, 8),
            new THREE.MeshBasicMaterial({ color })
          );
          tick.position.copy(ptThree);
          axesGroup.add(tick);

          if (showLabels && i % tickStep === 0 && Math.abs(i) <= R - 1) {
            // Giảm mật độ nhãn số nếu trục rất dài
            if (R <= 12 || i % 2 === 0) {
              const numSprite = createTextSprite(String(i), {
                color: '#475569',
                bgColor: 'rgba(255,255,255,0.82)',
                borderColor: 'transparent',
                fontSize: 26,
                bold: false,
                scale: 0.32,
                maxAnisotropy: maxAniso,
              });
              const offsetVec =
                axisKey === 'z'
                  ? new THREE.Vector3(-0.28, 0, 0)
                  : new THREE.Vector3(0, -0.26, 0);
              numSprite.position.copy(ptThree).add(offsetVec);
              axesGroup.add(numSprite);
            }
          }
        }

        // Nhãn tên trục x, y, z
        if (showLabels) {
          const axisLabel = createTextSprite(labelText, {
            color: colorHex,
            bgColor: '#FFFFFF',
            borderColor: colorHex,
            fontSize: 38,
            bold: true,
            scale: 0.52,
            maxAnisotropy: maxAniso,
          });
          axisLabel.position.copy(pPos).addScaledVector(dir, 0.45);
          axesGroup.add(axisLabel);
        }

        // Tránh lint unused pNeg
        void pNeg;
      };

      buildAxis('x', '#DC2626', 'x');
      buildAxis('y', '#16A34A', 'y');
      buildAxis('z', '#2563EB', 'z');

      // Gốc tọa độ O(0; 0; 0)
      const originDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 20, 20),
        new THREE.MeshStandardMaterial({
          color: '#0F172A',
          roughness: 0.3,
          metalness: 0.2,
        })
      );
      axesGroup.add(originDot);

      if (showLabels) {
        const oText = props.viewSettings.showCoordinates ? 'O(0; 0; 0)' : 'O';
        const oLabel = createTextSprite(oText, {
          color: '#0F172A',
          bgColor: 'rgba(255,255,255,0.92)',
          borderColor: '#CBD5E1',
          fontSize: 32,
          scale: 0.44,
          maxAnisotropy: maxAniso,
        });
        oLabel.position.set(-0.42, -0.35, -0.35);
        axesGroup.add(oLabel);
      }

      requestRenderRef.current();
    }, [axisRange, props.viewSettings]);

    // Dựng lại các vectơ, điểm, đường gióng và hiệu ứng mô phỏng khi state thay đổi
    useEffect(() => {
      const contentGroup = contentGroupRef.current;
      const renderer = rendererRef.current;
      const transformControls = transformControlsRef.current;
      const anchorA = dragAnchorARef.current;
      const anchorB = dragAnchorBRef.current;

      if (!contentGroup || !renderer) return;

      while (contentGroup.children.length > 0) {
        const child = contentGroup.children[0];
        contentGroup.remove(child);
        disposeObject3D(child);
      }

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const {
        showLabels,
        showCoordinates,
        showProjectionLines,
        showOriginComparison,
        hideAnswers,
      } = props.viewSettings;

      const addLabelAt = (
        posMath: Vec3,
        text: string,
        color: string,
        yOffset = 0.38,
        scale = 0.48
      ) => {
        if (!showLabels) return;
        const sprite = createTextSprite(text, {
          color,
          bgColor: 'rgba(255, 255, 255, 0.94)',
          borderColor: color,
          fontSize: 32,
          scale,
          maxAnisotropy: maxAniso,
        });
        sprite.position.copy(mathToThree(posMath)).add(new THREE.Vector3(0, yOffset, 0));
        contentGroup.add(sprite);
      };

      const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      });

      const easeInOut = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Quản lý TransformControls trong chế độ Khám phá tọa độ
      if (transformControls && anchorA && anchorB) {
        const tcHelper = transformControls.getHelper();
        if (props.mode === 'explore') {
          anchorA.position.copy(mathToThree(props.pointA));
          anchorB.position.copy(mathToThree(props.pointB));
          transformControls.attach(
            props.exploreSelectedPoint === 'A' ? anchorA : anchorB
          );
          tcHelper.visible = true;
        } else {
          transformControls.detach();
          tcHelper.visible = false;
        }
      }

      // ================================================================
      // CHẾ ĐỘ 1: VẼ VECTƠ (THEO TỌA ĐỘ HOẶC TỪ 2 ĐIỂM A, B)
      // ================================================================
      if (props.mode === 'single') {
        if (props.singleSubMode === 'by-coords') {
          props.singleVectors.forEach((vec, idx) => {
            if (!vec.visible) return;
            const endPt = addVec(vec.startPoint, vec.coords);
            contentGroup.add(
              createCompositeVectorArrow(vec.startPoint, endPt, {
                color: vec.color,
                thickness: vec.thickness,
              })
            );

            // Điểm đầu (nếu khác O) và điểm cuối M
            if (!isZeroVec(vec.startPoint)) {
              contentGroup.add(createPointMarker(vec.startPoint, vec.color, 0.1));
            }
            contentGroup.add(createPointMarker(endPt, vec.color, 0.11));

            if (showProjectionLines && idx === 0) {
              contentGroup.add(
                createProjectionLinesGroup(endPt, vec.color, showCoordinates, maxAniso)
              );
              if (!isZeroVec(vec.startPoint)) {
                contentGroup.add(
                  createProjectionLinesGroup(vec.startPoint, '#64748B', false, maxAniso)
                );
              }
            }

            if (showLabels) {
              const mid = lerpVec(vec.startPoint, endPt, 0.5);
              const coordSuffix = showCoordinates
                ? ` = ${formatVecText(vec.coords)}`
                : '';
              addLabelAt(
                mid,
                `${vec.name}${coordSuffix}`,
                vec.color,
                0.42,
                0.5
              );

              if (isZeroVec(vec.startPoint)) {
                const mText = showCoordinates
                  ? `M${formatVecText(endPt)}`
                  : 'M';
                addLabelAt(endPt, mText, '#0F172A', 0.34, 0.42);
              }
            }
          });
        } else {
          // Từ hai điểm A và B: vẽ điểm A, điểm B, và vectơ AB chính xác từ A đến B
          const A = props.pointA;
          const B = props.pointB;
          const ab = subVec(B, A);

          contentGroup.add(createPointMarker(A, '#0284C7', 0.13));
          contentGroup.add(createPointMarker(B, '#D97706', 0.13));
          contentGroup.add(
            createCompositeVectorArrow(A, B, {
              color: '#2563EB',
              thickness: 1.15,
            })
          );

          if (showProjectionLines) {
            contentGroup.add(createProjectionLinesGroup(A, '#0284C7', false, maxAniso));
            contentGroup.add(createProjectionLinesGroup(B, '#D97706', false, maxAniso));
          }

          if (showLabels) {
            addLabelAt(
              A,
              showCoordinates ? `A${formatVecText(A)}` : 'A',
              '#0284C7',
              0.38,
              0.45
            );
            addLabelAt(
              B,
              showCoordinates ? `B${formatVecText(B)}` : 'B',
              '#D97706',
              0.38,
              0.45
            );
            const mid = lerpVec(A, B, 0.5);
            const abLabel =
              showCoordinates && !hideAnswers
                ? `AB = ${formatVecText(ab)}`
                : 'AB';
            addLabelAt(mid, abLabel, '#2563EB', 0.48, 0.5);
          }
        }
      }

      // ================================================================
      // CHẾ ĐỘ 2: CỘNG HAI VECTƠ (HÌNH BÌNH HÀNH / NỐI ĐUÔI)
      // ================================================================
      else if (props.mode === 'two-sum') {
        const u = props.twoU;
        const v = props.twoV;
        const sum = addVec(u, v);
        const O: Vec3 = { x: 0, y: 0, z: 0 };

        // Vectơ u: luôn màu xanh dương từ O
        contentGroup.add(
          createCompositeVectorArrow(O, u, {
            color: '#2563EB',
            thickness: 1.05,
          })
        );
        addLabelAt(
          lerpVec(O, u, 0.5),
          showCoordinates ? `u = ${formatVecText(u)}` : 'u',
          '#2563EB',
          0.38,
          0.46
        );

        if (props.additionRule === 'parallelogram') {
          // Quy tắc hình bình hành: u và v chung gốc O
          contentGroup.add(
            createCompositeVectorArrow(O, v, {
              color: '#16A34A',
              thickness: 1.05,
            })
          );
          addLabelAt(
            lerpVec(O, v, 0.5),
            showCoordinates ? `v = ${formatVecText(v)}` : 'v',
            '#16A34A',
            0.38,
            0.46
          );

          // Các cạnh nét đứt của hình bình hành
          contentGroup.add(createDashedLineMath(u, sum, '#16A34A', 0.8));
          contentGroup.add(createDashedLineMath(v, sum, '#2563EB', 0.8));

          // Mặt phẳng hình bình hành mờ nhẹ giúp học sinh thấy rõ hình bình hành trong không gian 3D
          const p0 = mathToThree(O);
          const pU = mathToThree(u);
          const pV = mathToThree(v);
          const pS = mathToThree(sum);
          const quadGeo = new THREE.BufferGeometry();
          const verts = new Float32Array([
            p0.x, p0.y, p0.z,
            pU.x, pU.y, pU.z,
            pS.x, pS.y, pS.z,
            p0.x, p0.y, p0.z,
            pS.x, pS.y, pS.z,
            pV.x, pV.y, pV.z,
          ]);
          quadGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          quadGeo.computeVertexNormals();
          const quadMesh = new THREE.Mesh(
            quadGeo,
            new THREE.MeshBasicMaterial({
              color: '#DBEAFE',
              transparent: true,
              opacity: 0.25,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          contentGroup.add(quadMesh);

          // Vectơ tổng u + v màu đỏ nét đậm
          contentGroup.add(
            createCompositeVectorArrow(O, sum, {
              color: RESULTANT_COLOR,
              thickness: 1.15,
              isResultant: true,
            })
          );
          addLabelAt(
            lerpVec(O, sum, 0.55),
            showCoordinates && !hideAnswers
              ? `u + v = ${formatVecText(sum)}`
              : 'u + v',
            RESULTANT_COLOR,
            0.48,
            0.52
          );
        } else {
          // Quy tắc nối đuôi: tịnh tiến v từ O đến ngọn của u
          const t = easeInOut(THREE.MathUtils.clamp(props.twoSumSimProgress, 0, 1));
          const vStart = lerpVec(O, u, t);
          const vEnd = addVec(vStart, v);

          // Bóng mờ của v tại gốc O để học sinh thấy phép tịnh tiến giữ nguyên hướng & độ dài
          if (t > 0.02) {
            contentGroup.add(
              createCompositeVectorArrow(O, v, {
                color: '#16A34A',
                thickness: 0.85,
                opacity: 0.26,
                isGhost: true,
              })
            );
            contentGroup.add(createDashedLineMath(O, vStart, '#94A3B8', 0.55));
          }

          // Vectơ v đang tịnh tiến / đã nối đuôi
          contentGroup.add(
            createCompositeVectorArrow(vStart, vEnd, {
              color: '#16A34A',
              thickness: 1.05,
            })
          );
          addLabelAt(
            lerpVec(vStart, vEnd, 0.5),
            showCoordinates ? `v = ${formatVecText(v)}` : 'v',
            '#16A34A',
            0.38,
            0.46
          );

          // Vẽ vectơ tổng u + v khi nối đuôi xong (hoặc tiến dần)
          if (t >= 0.85) {
            const sFrac = THREE.MathUtils.clamp((t - 0.85) / 0.15, 0.05, 1);
            const sumTip = lerpVec(O, sum, sFrac);
            contentGroup.add(
              createCompositeVectorArrow(O, sumTip, {
                color: RESULTANT_COLOR,
                thickness: 1.15,
                isResultant: true,
              })
            );
            if (sFrac > 0.7) {
              addLabelAt(
                lerpVec(O, sum, 0.55),
                showCoordinates && !hideAnswers
                  ? `u + v = ${formatVecText(sum)}`
                  : 'u + v',
                RESULTANT_COLOR,
                0.48,
                0.52
              );
            }
          }
        }

        if (showProjectionLines) {
          contentGroup.add(
            createProjectionLinesGroup(sum, RESULTANT_COLOR, showCoordinates, maxAniso)
          );
        }
      }

      // ================================================================
      // CHẾ ĐỘ 3: TỔNG CỦA NHIỀU VECTƠ (NỐI ĐUÔI LIÊN TIẾP + MÔ PHỎNG 5 BƯỚC)
      // ================================================================
      else if (props.mode === 'multi-sum') {
        const activeVecs = props.multiVectors.filter((v) => v.visible);
        const O: Vec3 = { x: 0, y: 0, z: 0 };

        // Tính chuỗi điểm nối đuôi P_0, P_1, ..., P_n
        const chainPoints: Vec3[] = [O];
        for (const v of activeVecs) {
          chainPoints.push(addVec(chainPoints[chainPoints.length - 1], v.coords));
        }
        const totalSum = sumVecs(activeVecs.map((v) => v.coords));

        // Tùy chọn hiển thị các vectơ thành phần tại gốc O để so sánh
        if (showOriginComparison) {
          activeVecs.forEach((v) => {
            contentGroup.add(
              createCompositeVectorArrow(O, v.coords, {
                color: v.color,
                thickness: 0.75,
                opacity: 0.3,
                isGhost: true,
              })
            );
          });
        }

        const step = props.multiAnimStep;
        const subP = easeInOut(
          THREE.MathUtils.clamp(props.multiAnimSubProgress, 0, 1)
        );
        const n = activeVecs.length;

        if (n > 0) {
          // Bước 1: Vẽ vectơ thứ nhất u_1
          if (step === 1) {
            const v0 = activeVecs[0];
            const tip = lerpVec(O, v0.coords, Math.max(0.05, subP));
            contentGroup.add(
              createCompositeVectorArrow(O, tip, {
                color: v0.color,
                thickness: 1.05,
              })
            );
            addLabelAt(
              lerpVec(O, tip, 0.5),
              v0.name.replace('_', ''),
              v0.color,
              0.36,
              0.44
            );
          }

          // Bước 2: Tịnh tiến vectơ thứ hai u_2 từ O đến ngọn của u_1
          else if (step === 2) {
            const v0 = activeVecs[0];
            contentGroup.add(
              createCompositeVectorArrow(chainPoints[0], chainPoints[1], {
                color: v0.color,
                thickness: 1.0,
              })
            );
            addLabelAt(
              lerpVec(chainPoints[0], chainPoints[1], 0.5),
              v0.name.replace('_', ''),
              v0.color,
              0.36,
              0.44
            );

            if (n >= 2) {
              const v1 = activeVecs[1];
              // Bóng tại O
              contentGroup.add(
                createCompositeVectorArrow(O, v1.coords, {
                  color: v1.color,
                  thickness: 0.78,
                  opacity: 0.25,
                  isGhost: true,
                })
              );
              const startPt = lerpVec(O, chainPoints[1], subP);
              const endPt = addVec(startPt, v1.coords);
              contentGroup.add(
                createCompositeVectorArrow(startPt, endPt, {
                  color: v1.color,
                  thickness: 1.05,
                })
              );
              addLabelAt(
                lerpVec(startPt, endPt, 0.5),
                v1.name.replace('_', ''),
                v1.color,
                0.36,
                0.44
              );
            }
          }

          // Bước 3: Nối tiếp các vectơ còn lại u_3 ... u_n
          else if (step === 3) {
            // Vẽ sẵn u_1, u_2
            const fixedCount = Math.min(2, n);
            for (let i = 0; i < fixedCount; i++) {
              const v = activeVecs[i];
              contentGroup.add(
                createCompositeVectorArrow(chainPoints[i], chainPoints[i + 1], {
                  color: v.color,
                  thickness: 1.0,
                })
              );
              addLabelAt(
                lerpVec(chainPoints[i], chainPoints[i + 1], 0.5),
                v.name.replace('_', ''),
                v.color,
                0.35,
                0.42
              );
            }

            if (n > 2) {
              const remaining = n - 2;
              const scaled = subP * remaining;
              for (let k = 2; k < n; k++) {
                const v = activeVecs[k];
                const localIdx = k - 2;
                const localT = THREE.MathUtils.clamp(scaled - localIdx, 0, 1);
                if (localT <= 0) continue;

                if (localT < 1) {
                  contentGroup.add(
                    createCompositeVectorArrow(O, v.coords, {
                      color: v.color,
                      thickness: 0.78,
                      opacity: 0.25,
                      isGhost: true,
                    })
                  );
                }
                const startPt = lerpVec(O, chainPoints[k], easeInOut(localT));
                const endPt = addVec(startPt, v.coords);
                contentGroup.add(
                  createCompositeVectorArrow(startPt, endPt, {
                    color: v.color,
                    thickness: 1.0,
                  })
                );
                addLabelAt(
                  lerpVec(startPt, endPt, 0.5),
                  v.name.replace('_', ''),
                  v.color,
                  0.35,
                  0.42
                );
              }
            }
          }

          // Bước 4 & 5: Đã nối đủ tất cả thành phần, vẽ vectơ tổng S (Bước 4 tiến dần, Bước 5 hoàn chỉnh)
          else {
            activeVecs.forEach((v, i) => {
              const pStart = chainPoints[i];
              const pEnd = chainPoints[i + 1];
              contentGroup.add(
                createCompositeVectorArrow(pStart, pEnd, {
                  color: v.color,
                  thickness: 0.98,
                })
              );
              // Điểm nối nhỏ tại đỉnh trung gian
              if (i > 0) {
                contentGroup.add(createPointMarker(pStart, v.color, 0.08));
              }
              const displayName = v.name.replace('_', '');
              const labelTxt = showCoordinates
                ? `${displayName}${formatVecText(v.coords)}`
                : displayName;
              addLabelAt(
                lerpVec(pStart, pEnd, 0.5),
                labelTxt,
                v.color,
                0.36,
                0.42
              );
            });

            const sFrac = step === 4 ? Math.max(0.05, subP) : 1;
            const sTip = lerpVec(O, totalSum, sFrac);

            contentGroup.add(
              createCompositeVectorArrow(O, sTip, {
                color: RESULTANT_COLOR,
                thickness: 1.25,
                isResultant: true,
              })
            );

            if (sFrac > 0.7) {
              const sLabel =
                showCoordinates && !hideAnswers
                  ? `S = ${formatVecText(totalSum)}`
                  : 'S';
              addLabelAt(
                isZeroVec(totalSum) ? { x: 0.3, y: 0.3, z: 0.4 } : lerpVec(O, totalSum, 0.55),
                sLabel,
                RESULTANT_COLOR,
                0.5,
                0.54
              );
            }

            if (showProjectionLines && step >= 4 && !isZeroVec(totalSum)) {
              contentGroup.add(
                createProjectionLinesGroup(totalSum, RESULTANT_COLOR, showCoordinates, maxAniso)
              );
            }
          }
        }
      }

      // ================================================================
      // CHẾ ĐỘ 4: XÁC ĐỊNH TỌA ĐỘ TỪ HÌNH VẼ (KÉO THẢ + ĐƯỜNG GIÓNG)
      // ================================================================
      else if (props.mode === 'explore') {
        const A = props.pointA;
        const B = props.pointB;
        const ab = subVec(B, A);

        // Điểm A và B có thể click chọn để gắn TransformControls kéo thả
        contentGroup.add(
          createPointMarker(
            A,
            '#0284C7',
            props.exploreSelectedPoint === 'A' ? 0.16 : 0.13,
            'A'
          )
        );
        contentGroup.add(
          createPointMarker(
            B,
            '#D97706',
            props.exploreSelectedPoint === 'B' ? 0.16 : 0.13,
            'B'
          )
        );

        contentGroup.add(
          createCompositeVectorArrow(A, B, {
            color: '#2563EB',
            thickness: 1.12,
          })
        );

        // Đường gióng vuông góc rõ ràng để học sinh đọc tọa độ
        if (showProjectionLines) {
          contentGroup.add(
            createProjectionLinesGroup(A, '#0284C7', !hideAnswers, maxAniso)
          );
          contentGroup.add(
            createProjectionLinesGroup(B, '#D97706', !hideAnswers, maxAniso)
          );
        }

        if (showLabels) {
          const aTxt = hideAnswers ? 'A(?; ?; ?)' : `A${formatVecText(A)}`;
          const bTxt = hideAnswers ? 'B(?; ?; ?)' : `B${formatVecText(B)}`;
          const vTxt = hideAnswers
            ? 'AB = (?; ?; ?)'
            : `AB = ${formatVecText(ab)}`;
          addLabelAt(A, aTxt, '#0284C7', 0.4, 0.46);
          addLabelAt(B, bTxt, '#D97706', 0.4, 0.46);
          addLabelAt(lerpVec(A, B, 0.5), vTxt, '#2563EB', 0.46, 0.5);
        }
      }

      // ================================================================
      // CHẾ ĐỘ 5: HỌC SINH LUYỆN TẬP
      // ================================================================
      else if (props.mode === 'practice' && props.practiceQuestion) {
        const q = props.practiceQuestion;
        const O: Vec3 = { x: 0, y: 0, z: 0 };

        if (q.level === 'nhan-biet' && q.pointB) {
          const M = q.pointB;
          contentGroup.add(createPointMarker(M, '#2563EB', 0.14));
          contentGroup.add(
            createCompositeVectorArrow(O, M, {
              color: '#2563EB',
              thickness: 1.15,
            })
          );
          // Luôn hiện đường gióng để học sinh đọc tọa độ từ hình
          contentGroup.add(
            createProjectionLinesGroup(M, '#2563EB', true, maxAniso)
          );
          addLabelAt(
            M,
            props.practiceShowSolution ? `M${formatVecText(M)}` : 'M(?; ?; ?)',
            '#2563EB',
            0.42,
            0.48
          );
        } else if (q.level === 'thong-hieu' && q.pointA && q.pointB) {
          const A = q.pointA;
          const B = q.pointB;
          contentGroup.add(createPointMarker(A, '#0284C7', 0.13));
          contentGroup.add(createPointMarker(B, '#D97706', 0.13));
          contentGroup.add(
            createCompositeVectorArrow(A, B, {
              color: '#2563EB',
              thickness: 1.15,
            })
          );
          contentGroup.add(createProjectionLinesGroup(A, '#0284C7', false, maxAniso));
          contentGroup.add(createProjectionLinesGroup(B, '#D97706', false, maxAniso));
          addLabelAt(A, `A${formatVecText(A)}`, '#0284C7', 0.4, 0.45);
          addLabelAt(B, `B${formatVecText(B)}`, '#D97706', 0.4, 0.45);
          addLabelAt(
            lerpVec(A, B, 0.5),
            props.practiceShowSolution
              ? `AB = ${formatVecText(q.answer)}`
              : 'AB = ?',
            '#2563EB',
            0.46,
            0.5
          );
        } else if (q.level === 'van-dung') {
          if (q.vectors) {
            let cur = O;
            q.vectors.forEach((v) => {
              const next = addVec(cur, v.coords);
              contentGroup.add(
                createCompositeVectorArrow(cur, next, {
                  color: v.color,
                  thickness: 1.0,
                })
              );
              addLabelAt(
                lerpVec(cur, next, 0.5),
                `${v.name.replace('_', '')}${formatVecText(v.coords)}`,
                v.color,
                0.38,
                0.42
              );
              cur = next;
            });
            if (props.practiceShowSolution) {
              contentGroup.add(
                createCompositeVectorArrow(O, cur, {
                  color: RESULTANT_COLOR,
                  thickness: 1.25,
                  isResultant: true,
                })
              );
              addLabelAt(
                lerpVec(O, cur, 0.55),
                `S = ${formatVecText(cur)}`,
                RESULTANT_COLOR,
                0.5,
                0.52
              );
            }
          } else if (q.pointA && q.pointB) {
            const A = q.pointA;
            const M = q.pointB;
            contentGroup.add(createPointMarker(A, '#0284C7', 0.13));
            contentGroup.add(
              createCompositeVectorArrow(A, M, {
                color: '#16A34A',
                thickness: 1.15,
              })
            );
            contentGroup.add(createPointMarker(M, '#DC2626', 0.14));
            addLabelAt(A, `A${formatVecText(A)}`, '#0284C7', 0.4, 0.45);
            addLabelAt(
              M,
              props.practiceShowSolution ? `M${formatVecText(M)}` : 'M(?; ?; ?)',
              '#DC2626',
              0.42,
              0.48
            );
          }
        }
      }

      requestRenderRef.current();
    }, [
      props.mode,
      props.singleSubMode,
      props.singleVectors,
      props.pointA,
      props.pointB,
      props.twoU,
      props.twoV,
      props.additionRule,
      props.twoSumSimProgress,
      props.multiVectors,
      props.multiAnimStep,
      props.multiAnimSubProgress,
      props.exploreSelectedPoint,
      props.practiceQuestion,
      props.practiceShowSolution,
      props.viewSettings,
    ]);

    useEffect(() => {
      if (!showSpeedMenu) return;
      const handleOutside = (e: PointerEvent) => {
        if (
          speedPanelRef.current &&
          !speedPanelRef.current.contains(e.target as Node)
        ) {
          setShowSpeedMenu(false);
        }
      };
      document.addEventListener('pointerdown', handleOutside);
      return () => document.removeEventListener('pointerdown', handleOutside);
    }, [showSpeedMenu]);

    const toggleAutoRotate = () => {
      const next = !autoRotateRef.current;
      autoRotateRef.current = next;
      setAutoRotate(next);
      if (next) {
        camTransitionRef.current.active = false;
      }
      if (controlsRef.current) {
        controlsRef.current.autoRotate = next;
        controlsRef.current.autoRotateSpeed = autoRotateSpeedRef.current;
      }
      requestRenderRef.current();
    };

    const handleSpeedChange = (nextSpeed: number) => {
      const clamped = Math.min(4, Math.max(0.3, Math.round(nextSpeed * 10) / 10));
      autoRotateSpeedRef.current = clamped;
      setAutoRotateSpeed(clamped);
      if (controlsRef.current) {
        controlsRef.current.autoRotateSpeed = clamped;
      }
      if (autoRotateRef.current) {
        requestRenderRef.current();
      }
    };

    return (
      <div className="OxyzCanvas relative w-full h-full bg-slate-50 overflow-hidden select-none">
        <div ref={mountRef} className="w-full h-full" />

        <div
          ref={speedPanelRef}
          className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5"
        >
          <div className="flex items-center rounded-lg border border-slate-200 bg-white/95 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={toggleAutoRotate}
              aria-pressed={autoRotate}
              title="Tự xoay chậm quanh trục đứng để quan sát chiều sâu 3D"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                autoRotate
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {autoRotate ? (
                <>
                  <Pause className="w-3.5 h-3.5 shrink-0" />
                  <span>Dừng tự xoay</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Tự xoay 3D</span>
                </>
              )}
            </button>

            <div className="h-5 w-px bg-slate-200 shrink-0" />

            <button
              type="button"
              onClick={() => setShowSpeedMenu((s) => !s)}
              aria-expanded={showSpeedMenu}
              aria-label="Điều chỉnh tốc độ tự xoay"
              title="Điều chỉnh tốc độ tự xoay"
              className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                showSpeedMenu
                  ? 'bg-slate-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <ChevronDown
                className={`w-3 h-3 shrink-0 transition-transform ${
                  showSpeedMenu ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {showSpeedMenu && (
            <div className="w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Tốc độ tự xoay
                </span>
                <span className="font-mono tabular-nums font-bold text-blue-700">
                  {autoRotateSpeed.toFixed(1)}x
                </span>
              </div>

              <input
                type="range"
                min={0.3}
                max={4.0}
                step={0.1}
                value={autoRotateSpeed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                aria-label="Thanh trượt tốc độ tự xoay"
                className="w-full accent-blue-600 cursor-pointer"
              />

              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { label: 'Chậm', speed: 0.5 },
                    { label: 'Vừa', speed: 1.1 },
                    { label: 'Nhanh', speed: 2.5 },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSpeedChange(preset.speed)}
                    className={`rounded py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      Math.abs(autoRotateSpeed - preset.speed) < 0.05
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {webglLost && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
            <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Không thể khởi tạo ngữ cảnh đồ họa 3D
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Trình duyệt đang tạm thời mất kết nối WebGL. Vui lòng tải lại trang hoặc kiểm tra hỗ trợ tăng tốc phần cứng.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);
