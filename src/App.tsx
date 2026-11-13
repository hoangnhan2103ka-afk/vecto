import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from 'lucide-react';
import { LeftControlPanel } from './components/LeftControlPanel';
import { OxyzCanvas, OxyzCanvasHandle } from './components/OxyzCanvas';
import { PrintWorksheetModal } from './components/PrintWorksheetModal';
import { RightSolutionPanel } from './components/RightSolutionPanel';
import {
  AdditionRule,
  AppMode,
  CameraPreset,
  DifficultyLevel,
  PracticeQuestion,
  SavedPreset,
  SingleSubMode,
  Vec3,
  VectorEntry,
  ViewSettings,
} from './types/vector';
import {
  addVec,
  BUILTIN_PRESETS,
  cleanVec,
  createMultiVectorEntry,
  formatParenNum,
  formatVecText,
  formatVecTuple,
  generatePracticeQuestion,
  subVec,
  sumVecs,
  VECTOR_PALETTE,
} from './utils/math';

const STORAGE_KEY = 'oxyz_vector_presets_v1';

const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  showGrid: true,
  showPlaneOxy: true,
  showPlaneOyz: false,
  showPlaneOxz: false,
  showLabels: true,
  showCoordinates: true,
  showProjectionLines: true,
  showOriginComparison: false,
  hideAnswers: false,
};

const INITIAL_SINGLE_VECTOR: VectorEntry = {
  id: 'sv-primary',
  name: 'u',
  coords: { x: 2, y: 3, z: 4 },
  startPoint: { x: 0, y: 0, z: 0 },
  color: '#2563EB',
  thickness: 1.1,
  visible: true,
};

const INITIAL_MULTI_VECTORS: VectorEntry[] = [
  {
    id: 'mv-1',
    name: 'u_1',
    coords: { x: 2, y: 1, z: 3 },
    startPoint: { x: 0, y: 0, z: 0 },
    color: VECTOR_PALETTE[0],
    thickness: 1,
    visible: true,
  },
  {
    id: 'mv-2',
    name: 'u_2',
    coords: { x: -1, y: 4, z: 2 },
    startPoint: { x: 0, y: 0, z: 0 },
    color: VECTOR_PALETTE[1],
    thickness: 1,
    visible: true,
  },
  {
    id: 'mv-3',
    name: 'u_3',
    coords: { x: 3, y: -2, z: 1 },
    startPoint: { x: 0, y: 0, z: 0 },
    color: VECTOR_PALETTE[2],
    thickness: 1,
    visible: true,
  },
  {
    id: 'mv-4',
    name: 'u_4',
    coords: { x: 1, y: 0, z: -3 },
    startPoint: { x: 0, y: 0, z: 0 },
    color: VECTOR_PALETTE[3],
    thickness: 1,
    visible: true,
  },
];

export default function App() {
  const canvasRef = useRef<OxyzCanvasHandle | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Điều hướng chế độ & giao diện
  const [mode, setMode] = useState<AppMode>('single');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cài đặt hiển thị hệ trục Oxyz
  const [viewSettings, setViewSettings] = useState<ViewSettings>(
    DEFAULT_VIEW_SETTINGS
  );

  // Chế độ 1: Vẽ vectơ đơn / từ 2 điểm
  const [singleSubMode, setSingleSubMode] = useState<SingleSubMode>('by-coords');
  const [singleDraft, setSingleDraft] = useState<VectorEntry>(INITIAL_SINGLE_VECTOR);
  const [singleVectors, setSingleVectors] = useState<VectorEntry[]>([
    INITIAL_SINGLE_VECTOR,
  ]);
  const [pointA, setPointA] = useState<Vec3>({ x: 1, y: 0, z: 2 });
  const [pointB, setPointB] = useState<Vec3>({ x: 5, y: 0, z: 1 });

  // Chế độ 2: Cộng 2 vectơ
  const [twoU, setTwoU] = useState<Vec3>({ x: 2, y: 3, z: -1 });
  const [twoV, setTwoV] = useState<Vec3>({ x: -1, y: 4, z: 5 });
  const [additionRule, setAdditionRule] = useState<AdditionRule>('parallelogram');
  const [twoSumPlaying, setTwoSumPlaying] = useState(false);
  const [twoSumProgress, setTwoSumProgress] = useState(1);

  // Chế độ 3: Tổng nhiều vectơ (2 - 10+ vectơ)
  const [multiVectors, setMultiVectors] = useState<VectorEntry[]>(
    INITIAL_MULTI_VECTORS
  );
  const [multiAnimStep, setMultiAnimStep] = useState<number>(5);
  const [multiAnimSubProgress, setMultiAnimSubProgress] = useState<number>(1);
  const [multiAnimRunning, setMultiAnimRunning] = useState(false);
  const [multiAnimPaused, setMultiAnimPaused] = useState(false);
  const [multiAnimSpeed, setMultiAnimSpeed] = useState(1);

  // Chế độ 4: Khám phá tọa độ từ hình vẽ
  const [exploreSelectedPoint, setExploreSelectedPoint] = useState<'A' | 'B'>('B');

  // Chế độ 5: Học sinh luyện tập
  const [practiceLevel, setPracticeLevel] = useState<DifficultyLevel>('nhan-biet');
  const [practiceQuestion, setPracticeQuestion] = useState<PracticeQuestion>(() =>
    generatePracticeQuestion('nhan-biet')
  );
  const [practiceShowSolution, setPracticeShowSolution] = useState(false);
  const [practiceStats, setPracticeStats] = useState({ correct: 0, total: 0 });

  // Bộ ví dụ lưu trữ
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as SavedPreset[];
    } catch {
      // ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // ignore storage errors
    }
  }, [customPresets]);

  const allPresets = useMemo(
    () => [...BUILTIN_PRESETS, ...customPresets],
    [customPresets]
  );

  // Print / Export PDF Modal
  const [printOpen, setPrintOpen] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState<string | null>(null);

  // Hoạt ảnh Quy tắc nối đuôi cho Cộng 2 vectơ
  useEffect(() => {
    if (!twoSumPlaying) return;
    let rafId = 0;
    const start = performance.now();
    const duration = 1400;

    const stepFrame = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / duration);
      setTwoSumProgress(p);
      if (p < 1) {
        rafId = requestAnimationFrame(stepFrame);
      } else {
        setTwoSumPlaying(false);
      }
    };
    rafId = requestAnimationFrame(stepFrame);
    return () => cancelAnimationFrame(rafId);
  }, [twoSumPlaying]);

  // Hoạt ảnh 5 bước cho Tổng nhiều vectơ
  const multiSpeedRef = useRef(multiAnimSpeed);
  multiSpeedRef.current = multiAnimSpeed;
  const multiPausedRef = useRef(multiAnimPaused);
  multiPausedRef.current = multiAnimPaused;
  const multiCountRef = useRef(multiVectors.filter((v) => v.visible).length);
  multiCountRef.current = multiVectors.filter((v) => v.visible).length;

  useEffect(() => {
    if (!multiAnimRunning) return;
    let rafId = 0;
    let lastTime = performance.now();
    let currentStep = 1;
    let progress = 0;

    setMultiAnimStep(1);
    setMultiAnimSubProgress(0);

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!multiPausedRef.current) {
        const n = Math.max(1, multiCountRef.current);
        let stepDuration = 1.1;
        if (currentStep === 1) stepDuration = 1.0;
        else if (currentStep === 2) stepDuration = n >= 2 ? 1.3 : 0.1;
        else if (currentStep === 3)
          stepDuration = n > 2 ? Math.max(1.0, (n - 2) * 1.15) : 0.1;
        else if (currentStep === 4) stepDuration = 1.25;
        else if (currentStep === 5) stepDuration = 0.6;

        progress += (dt * multiSpeedRef.current) / stepDuration;
        if (progress >= 1) {
          if (currentStep < 5) {
            currentStep += 1;
            progress = 0;
            setMultiAnimStep(currentStep);
            setMultiAnimSubProgress(currentStep === 5 ? 1 : 0);
          } else {
            setMultiAnimStep(5);
            setMultiAnimSubProgress(1);
            setMultiAnimRunning(false);
            return;
          }
        } else {
          setMultiAnimSubProgress(progress);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [multiAnimRunning]);

  // Toàn màn hình cho giáo viên
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && rootRef.current?.requestFullscreen) {
        await rootRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      // Fallback CSS zen-mode nếu môi trường iframe hạn chế native fullscreen
      setIsFullscreen((v) => !v);
    }
  };

  const updateViewSettings = useCallback((patch: Partial<ViewSettings>) => {
    setViewSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Handlers chế độ Single
  const handleApplySingleDraft = () => {
    setSingleVectors((prev) => {
      const updated = { ...singleDraft, id: prev[0]?.id || 'sv-primary', visible: true };
      return [updated, ...prev.slice(1)];
    });
  };

  const handleAddSingleToList = () => {
    const idx = singleVectors.length;
    const newEntry: VectorEntry = {
      ...singleDraft,
      id: `sv-${Date.now()}`,
      name: singleDraft.name === 'u' ? `v_${idx}` : `${singleDraft.name}_${idx}`,
      color: VECTOR_PALETTE[idx % VECTOR_PALETTE.length],
      visible: true,
    };
    setSingleVectors((prev) => [...prev, newEntry]);
  };

  // Handlers chế độ Multi-sum
  const handleAddMultiVector = () => {
    if (multiVectors.length >= 12) return;
    const idx = multiVectors.length;
    const defaultCoords: Vec3 = {
      x: (idx % 3) - 1,
      y: ((idx + 1) % 3) - 1,
      z: 1,
    };
    setMultiVectors((prev) => [...prev, createMultiVectorEntry(idx, defaultCoords)]);
    setMultiAnimRunning(false);
    setMultiAnimStep(5);
    setMultiAnimSubProgress(1);
  };

  const handleRemoveMultiVector = (id: string) => {
    if (multiVectors.length <= 2) return;
    setMultiVectors((prev) =>
      prev
        .filter((v) => v.id !== id)
        .map((v, idx) => ({
          ...v,
          name: `u_${idx + 1}`,
          color: VECTOR_PALETTE[idx % VECTOR_PALETTE.length],
        }))
    );
    setMultiAnimRunning(false);
    setMultiAnimStep(5);
    setMultiAnimSubProgress(1);
  };

  const handleUpdateMultiVector = (id: string, coords: Vec3) => {
    setMultiVectors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, coords: cleanVec(coords) } : v))
    );
  };

  const handleClearAllMulti = () => {
    setMultiAnimRunning(false);
    setMultiAnimPaused(false);
    setMultiAnimStep(5);
    setMultiAnimSubProgress(1);
    setMultiVectors([
      createMultiVectorEntry(0, { x: 0, y: 0, z: 0 }),
      createMultiVectorEntry(1, { x: 0, y: 0, z: 0 }),
    ]);
  };

  // Nạp preset
  const handleLoadPreset = useCallback((preset: SavedPreset) => {
    setMultiAnimRunning(false);
    setTwoSumPlaying(false);
    setMode(preset.mode);

    if (preset.mode === 'single') {
      if (preset.singleSubMode) setSingleSubMode(preset.singleSubMode);
      if (preset.singleVector) {
        setSingleDraft(preset.singleVector);
        setSingleVectors([preset.singleVector]);
      }
      if (preset.pointA) setPointA(preset.pointA);
      if (preset.pointB) setPointB(preset.pointB);
    } else if (preset.mode === 'two-sum') {
      if (preset.twoU) setTwoU(preset.twoU);
      if (preset.twoV) setTwoV(preset.twoV);
      if (preset.additionRule) setAdditionRule(preset.additionRule);
      setTwoSumProgress(1);
    } else if (preset.mode === 'multi-sum' && preset.multiVectors) {
      setMultiVectors(preset.multiVectors.map((v) => ({ ...v })));
      setMultiAnimStep(5);
      setMultiAnimSubProgress(1);
    }
    setViewSettings((v) => ({ ...v, hideAnswers: false }));
  }, []);

  const handleLoadPresetById = useCallback(
    (id: string) => {
      const found = allPresets.find((p) => p.id === id);
      if (found) handleLoadPreset(found);
    },
    [allPresets, handleLoadPreset]
  );

  const handleSaveCurrentPreset = (title: string) => {
    const id = `custom-${Date.now()}`;
    let preset: SavedPreset = {
      id,
      title,
      description: 'Bộ ví dụ do giáo viên lưu',
      mode,
      isBuiltin: false,
    };

    if (mode === 'single') {
      preset = {
        ...preset,
        singleSubMode,
        singleVector: singleVectors[0],
        pointA,
        pointB,
        description:
          singleSubMode === 'by-points'
            ? `A${formatVecText(pointA)}, B${formatVecText(pointB)}`
            : `${singleVectors[0]?.name || 'u'} = ${formatVecText(
                singleVectors[0]?.coords || { x: 0, y: 0, z: 0 }
              )}`,
      };
    } else if (mode === 'two-sum') {
      preset = {
        ...preset,
        additionRule,
        twoU,
        twoV,
        description: `u=${formatVecText(twoU)}, v=${formatVecText(twoV)}`,
      };
    } else if (mode === 'multi-sum') {
      const s = sumVecs(multiVectors.map((v) => v.coords));
      preset = {
        ...preset,
        multiVectors: multiVectors.map((v) => ({ ...v })),
        description: `${multiVectors.length} vectơ → S = ${formatVecText(s)}`,
      };
    } else if (mode === 'explore') {
      preset = {
        ...preset,
        mode: 'single',
        singleSubMode: 'by-points',
        pointA,
        pointB,
        description: `A${formatVecText(pointA)}, B${formatVecText(pointB)}`,
      };
    }

    setCustomPresets((prev) => [preset, ...prev]);
  };

  // Khôi phục hình về trạng thái ban đầu
  const handleResetAll = () => {
    setViewSettings(DEFAULT_VIEW_SETTINGS);
    canvasRef.current?.resetCamera();
    if (mode === 'two-sum' && additionRule === 'head-to-tail') {
      setTwoSumPlaying(false);
      setTwoSumProgress(1);
    }
    if (mode === 'multi-sum') {
      setMultiAnimRunning(false);
      setMultiAnimPaused(false);
      setMultiAnimStep(5);
      setMultiAnimSubProgress(1);
    }
  };

  // Xuất ảnh PNG
  const handleDownloadPNG = (highRes: boolean) => {
    const dataUrl = canvasRef.current?.capturePNG(highRes);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `vecto-oxyz-${mode}${highRes ? '-hd' : ''}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Mở modal In / Xuất PDF
  const handleOpenPrintModal = () => {
    const dataUrl = canvasRef.current?.capturePNG(true) || null;
    setPrintSnapshot(dataUrl);
    setPrintOpen(true);
  };

  // Nội dung sao chép & in phiếu bài tập đồng bộ với chế độ hiện tại
  const summaryData = useMemo(() => {
    if (mode === 'single' && singleSubMode === 'by-coords') {
      const v = singleVectors[0] || INITIAL_SINGLE_VECTOR;
      const m = addVec(v.startPoint, v.coords);
      return {
        title: 'Biểu diễn vectơ trong không gian Oxyz',
        problemSummary: `Cho vectơ ${v.name} có tọa độ ${formatVecText(v.coords)} với điểm đầu ${formatVecText(v.startPoint)}.`,
        latexLines: [`\\vec{${v.name}} = ${formatVecTuple(v.coords)}`],
        solutionLatexLines: [
          `\\text{Điểm đầu } A${formatVecTuple(v.startPoint)},\\; \\text{điểm cuối } M${formatVecTuple(m)}`,
          `|\\vec{${v.name}}| = \\sqrt{${formatParenNum(v.coords.x)}^2 + ${formatParenNum(v.coords.y)}^2 + ${formatParenNum(v.coords.z)}^2}`,
        ],
        copyText: `Vectơ ${v.name} = ${formatVecText(v.coords)}, điểm cuối M${formatVecText(m)}`,
      };
    }

    if (
      (mode === 'single' && singleSubMode === 'by-points') ||
      mode === 'explore'
    ) {
      const ab = subVec(pointB, pointA);
      return {
        title: 'Xác định tọa độ vectơ từ hai điểm trong không gian Oxyz',
        problemSummary: `Cho hai điểm A${formatVecText(pointA)} và B${formatVecText(pointB)}. Tính tọa độ vectơ AB.`,
        latexLines: [
          `A${formatVecTuple(pointA)},\\quad B${formatVecTuple(pointB)}`,
        ],
        solutionLatexLines: [
          `\\overrightarrow{AB} = (x_B - x_A;\\; y_B - y_A;\\; z_B - z_A)`,
          `\\overrightarrow{AB} = (${pointB.x} - ${formatParenNum(pointA.x)};\\; ${pointB.y} - ${formatParenNum(pointA.y)};\\; ${pointB.z} - ${formatParenNum(pointA.z)}) = ${formatVecTuple(ab)}`,
        ],
        copyText: `A${formatVecText(pointA)}, B${formatVecText(pointB)} => AB = ${formatVecText(ab)}`,
      };
    }

    if (mode === 'two-sum') {
      const s = addVec(twoU, twoV);
      return {
        title: 'Cộng hai vectơ trong không gian Oxyz',
        problemSummary: `Cho hai vectơ u = ${formatVecText(twoU)} và v = ${formatVecText(twoV)}. Tính vectơ tổng u + v.`,
        latexLines: [
          `\\vec{u} = ${formatVecTuple(twoU)},\\quad \\vec{v} = ${formatVecTuple(twoV)}`,
        ],
        solutionLatexLines: [
          `\\vec{u} + \\vec{v} = (${twoU.x} + ${formatParenNum(twoV.x)};\\; ${twoU.y} + ${formatParenNum(twoV.y)};\\; ${twoU.z} + ${formatParenNum(twoV.z)})`,
          `\\vec{u} + \\vec{v} = ${formatVecTuple(s)}`,
        ],
        copyText: `u = ${formatVecText(twoU)}, v = ${formatVecText(twoV)} => u + v = ${formatVecText(s)}`,
      };
    }

    if (mode === 'multi-sum') {
      const active = multiVectors.filter((v) => v.visible);
      const s = sumVecs(active.map((v) => v.coords));
      return {
        title: 'Tổng của nhiều vectơ trong không gian Oxyz',
        problemSummary: `Tính tổng S của ${active.length} vectơ trong hệ tọa độ Oxyz.`,
        latexLines: active.map(
          (v, idx) => `\\vec{u}_{${idx + 1}} = ${formatVecTuple(v.coords)}`
        ),
        solutionLatexLines: [
          `x_S = ${active.map((v) => formatParenNum(v.coords.x)).join(' + ')} = ${s.x}`,
          `y_S = ${active.map((v) => formatParenNum(v.coords.y)).join(' + ')} = ${s.y}`,
          `z_S = ${active.map((v) => formatParenNum(v.coords.z)).join(' + ')} = ${s.z}`,
          `\\Rightarrow \\vec{S} = ${formatVecTuple(s)}`,
        ],
        copyText: `S = ${active.map((v, i) => `u${i + 1}${formatVecText(v.coords)}`).join(' + ')} = ${formatVecText(s)}`,
      };
    }

    return {
      title: 'Phiếu luyện tập vectơ Oxyz',
      problemSummary: practiceQuestion.prompt,
      latexLines: [practiceQuestion.latexPrompt],
      solutionLatexLines: practiceQuestion.solutionSteps,
      copyText: `${practiceQuestion.prompt} | Đáp án: ${formatVecText(practiceQuestion.answer)}`,
    };
  }, [
    mode,
    singleSubMode,
    singleVectors,
    pointA,
    pointB,
    twoU,
    twoV,
    multiVectors,
    practiceQuestion,
  ]);

  const handleCameraPreset = (preset: CameraPreset) => {
    canvasRef.current?.setCameraPreset(preset);
  };

  return (
    <div
      ref={rootRef}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900"
    >
      {/* ============================================================ */}
      {/* THANH TIÊU ĐỀ TRÊN CÙNG (3 KHU VỰC RÕ RÀNG)                  */}
      {/* ============================================================ */}
      <header className="no-print h-14 shrink-0 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-6 z-20">
        {/* Khu vực 1: Tên ứng dụng */}
        <div className="text-sm lg:text-base font-extrabold tracking-tight text-blue-700 whitespace-nowrap shrink-0">
          KHÁM PHÁ VECTƠ TRONG KHÔNG GIAN OXYZ
        </div>

        {/* Khu vực 2: Thanh chuyển 5 chức năng */}
        <nav
          aria-label="Chế độ học tập"
          className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
        >
          {(
            [
              { id: 'single', label: 'Vẽ vectơ' },
              { id: 'two-sum', label: 'Cộng 2 vectơ' },
              { id: 'multi-sum', label: 'Tổng nhiều vectơ' },
              { id: 'explore', label: 'Xác định tọa độ' },
              { id: 'practice', label: 'Học sinh luyện tập' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setMultiAnimRunning(false);
                setTwoSumPlaying(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Khu vực 3: Nút trình chiếu toàn màn hình cho giáo viên */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Thoát toàn màn hình
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Toàn màn hình
              </>
            )}
          </button>
        </div>
      </header>

      {/* Thanh tab trên màn hình nhỏ */}
      <div className="md:hidden no-print flex items-center gap-1 px-3 py-2 bg-white border-b border-slate-200 overflow-x-auto">
        {(
          [
            { id: 'single', label: 'Vẽ vectơ' },
            { id: 'two-sum', label: 'Cộng 2 vectơ' },
            { id: 'multi-sum', label: 'Tổng nhiều vectơ' },
            { id: 'explore', label: 'Đọc tọa độ' },
            { id: 'practice', label: 'Luyện tập' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
              mode === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* BỐ CỤC CHÍNH 3 KHU VỰC: TRÁI | KHÔNG GIAN 3D | PHẢI          */}
      {/* ============================================================ */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Khu vực 1: Bảng nhập tọa độ & công cụ bên trái */}
        {showLeftPanel && (
          <div className="w-full lg:w-[310px] xl:w-[340px] max-h-[38vh] lg:max-h-none shrink-0 overflow-hidden">
            <LeftControlPanel
              mode={mode}
              singleSubMode={singleSubMode}
              onSingleSubModeChange={setSingleSubMode}
              singleDraft={singleDraft}
              onSingleDraftChange={setSingleDraft}
              onApplySingleDraft={handleApplySingleDraft}
              onAddSingleToList={handleAddSingleToList}
              singleVectors={singleVectors}
              onToggleSingleVector={(id) =>
                setSingleVectors((prev) =>
                  prev.map((v) =>
                    v.id === id ? { ...v, visible: !v.visible } : v
                  )
                )
              }
              onDeleteSingleVector={(id) =>
                setSingleVectors((prev) => prev.filter((v) => v.id !== id))
              }
              pointA={pointA}
              pointB={pointB}
              onPointAChange={setPointA}
              onPointBChange={setPointB}
              onDrawAB={() => setSingleSubMode('by-points')}
              twoU={twoU}
              twoV={twoV}
              onTwoUChange={setTwoU}
              onTwoVChange={setTwoV}
              additionRule={additionRule}
              onAdditionRuleChange={(r) => {
                setAdditionRule(r);
                setTwoSumPlaying(false);
                setTwoSumProgress(r === 'head-to-tail' ? 1 : 1);
              }}
              onRunTwoSumSim={() => {
                setTwoSumProgress(0);
                setTwoSumPlaying(true);
              }}
              twoSumPlaying={twoSumPlaying}
              twoSumProgress={twoSumProgress}
              multiVectors={multiVectors}
              onUpdateMultiVector={handleUpdateMultiVector}
              onAddMultiVector={handleAddMultiVector}
              onRemoveMultiVector={handleRemoveMultiVector}
              onCalculateMultiSum={() => {
                setMultiAnimRunning(false);
                setMultiAnimStep(5);
                setMultiAnimSubProgress(1);
              }}
              onDrawMultiResultant={() => {
                setMultiAnimRunning(false);
                setMultiAnimStep(5);
                setMultiAnimSubProgress(1);
              }}
              onStartMultiAnim={() => {
                setMultiAnimPaused(false);
                setMultiAnimRunning(false);
                requestAnimationFrame(() => setMultiAnimRunning(true));
              }}
              onClearAllMulti={handleClearAllMulti}
              multiAnimRunning={multiAnimRunning}
              multiAnimPaused={multiAnimPaused}
              onTogglePauseMultiAnim={() => setMultiAnimPaused((p) => !p)}
              multiAnimSpeed={multiAnimSpeed}
              onMultiAnimSpeedChange={setMultiAnimSpeed}
              multiAnimStep={multiAnimStep}
              onJumpMultiStep={(s) => {
                setMultiAnimRunning(false);
                setMultiAnimStep(s);
                setMultiAnimSubProgress(1);
              }}
              exploreSelectedPoint={exploreSelectedPoint}
              onSelectExplorePoint={setExploreSelectedPoint}
              practiceLevel={practiceLevel}
              onPracticeLevelChange={(lvl) => {
                setPracticeLevel(lvl);
                setPracticeQuestion(generatePracticeQuestion(lvl));
                setPracticeShowSolution(false);
              }}
              onNewPracticeQuestion={() => {
                setPracticeQuestion(generatePracticeQuestion(practiceLevel));
                setPracticeShowSolution(false);
              }}
              viewSettings={viewSettings}
              onUpdateViewSettings={updateViewSettings}
              onLoadPresetById={handleLoadPresetById}
            />
          </div>
        )}

        {/* Khu vực 2: Không gian hình học 3D Oxyz ở trung tâm */}
        <main className="flex-1 min-w-0 min-h-[320px] relative">
          <OxyzCanvas
            ref={canvasRef}
            mode={mode}
            singleSubMode={singleSubMode}
            singleVectors={singleVectors}
            pointA={pointA}
            pointB={pointB}
            twoU={twoU}
            twoV={twoV}
            additionRule={additionRule}
            twoSumSimProgress={twoSumProgress}
            multiVectors={multiVectors}
            multiAnimStep={multiAnimStep}
            multiAnimSubProgress={multiAnimSubProgress}
            exploreSelectedPoint={exploreSelectedPoint}
            onSelectExplorePoint={setExploreSelectedPoint}
            onExplorePointMove={(which, pos) => {
              if (which === 'A') setPointA(pos);
              else setPointB(pos);
            }}
            practiceQuestion={practiceQuestion}
            practiceShowSolution={practiceShowSolution}
            viewSettings={viewSettings}
          />

          {/* Chú thích trục gọn gàng ở góc trên trái viewport */}
          <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/92 border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-red-600">Ox</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-green-600">Oy</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-blue-600">Oz</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-normal text-slate-500 hidden sm:inline">
              Kéo chuột xoay 360° · Cuộn để thu phóng
            </span>
          </div>

          {/* Thanh điều khiển góc nhìn ở cạnh dưới trung tâm (không che tâm 3D) */}
          <div className="no-print absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-md max-w-[96%] overflow-x-auto">
            <button
              type="button"
              onClick={() => setShowLeftPanel((s) => !s)}
              title={showLeftPanel ? 'Ẩn bảng trái' : 'Hiện bảng trái'}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shrink-0"
            >
              {showLeftPanel ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" />

            {(
              [
                { id: 'default', label: '3D Mặc định' },
                { id: 'oxy', label: 'Chiếu Oxy' },
                { id: 'oxz', label: 'Chiếu Oxz' },
                { id: 'oyz', label: 'Chiếu Oyz' },
              ] as const
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => handleCameraPreset(cam.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {cam.label}
              </button>
            ))}

            <div className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={handleResetAll}
              title="Khôi phục góc nhìn mặc định"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khôi phục</span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={() => setShowRightPanel((s) => !s)}
              title={showRightPanel ? 'Ẩn bảng phải' : 'Hiện bảng phải'}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shrink-0"
            >
              {showRightPanel ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </main>

        {/* Khu vực 3: Kết quả, lời giải chi tiết & công cụ giáo viên bên phải */}
        {showRightPanel && (
          <div className="w-full lg:w-[320px] xl:w-[360px] max-h-[38vh] lg:max-h-none shrink-0 overflow-hidden">
            <RightSolutionPanel
              mode={mode}
              singleSubMode={singleSubMode}
              singleVectors={singleVectors}
              pointA={pointA}
              pointB={pointB}
              twoU={twoU}
              twoV={twoV}
              additionRule={additionRule}
              multiVectors={multiVectors}
              multiAnimStep={multiAnimStep}
              viewSettings={viewSettings}
              onToggleHideAnswers={() =>
                updateViewSettings({ hideAnswers: !viewSettings.hideAnswers })
              }
              practiceQuestion={practiceQuestion}
              practiceShowSolution={practiceShowSolution}
              onTogglePracticeSolution={() =>
                setPracticeShowSolution((s) => !s)
              }
              onNextPracticeQuestion={() => {
                setPracticeQuestion(generatePracticeQuestion(practiceLevel));
                setPracticeShowSolution(false);
              }}
              practiceStats={practiceStats}
              onRecordPracticeAnswer={(isCorrect) =>
                setPracticeStats((prev) => ({
                  correct: prev.correct + (isCorrect ? 1 : 0),
                  total: prev.total + 1,
                }))
              }
              presets={allPresets}
              onLoadPreset={handleLoadPreset}
              onSaveCurrentPreset={handleSaveCurrentPreset}
              onDeletePreset={(id) =>
                setCustomPresets((prev) => prev.filter((p) => p.id !== id))
              }
              onDownloadPNG={handleDownloadPNG}
              onOpenPrintModal={handleOpenPrintModal}
              copyPlainText={summaryData.copyText}
            />
          </div>
        )}
      </div>

      {/* Hộp thoại xem trước & in phiếu bài tập PDF */}
      <PrintWorksheetModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        snapshotDataUrl={printSnapshot}
        title={summaryData.title}
        problemSummary={summaryData.problemSummary}
        latexLines={summaryData.latexLines}
        solutionLatexLines={summaryData.solutionLatexLines}
      />
    </div>
  );
}
