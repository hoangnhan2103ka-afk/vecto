import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
} from 'lucide-react';
import {
  AdditionRule,
  AppMode,
  DifficultyLevel,
  SingleSubMode,
  Vec3,
  VectorEntry,
  ViewSettings,
} from '../types/vector';
import { formatVecText } from '../utils/math';
import { CoordInputGroup } from './CoordInputGroup';

interface LeftControlPanelProps {
  mode: AppMode;
  singleSubMode: SingleSubMode;
  onSingleSubModeChange: (m: SingleSubMode) => void;
  singleDraft: VectorEntry;
  onSingleDraftChange: (v: VectorEntry) => void;
  onApplySingleDraft: () => void;
  onAddSingleToList: () => void;
  singleVectors: VectorEntry[];
  onToggleSingleVector: (id: string) => void;
  onDeleteSingleVector: (id: string) => void;
  pointA: Vec3;
  pointB: Vec3;
  onPointAChange: (v: Vec3) => void;
  onPointBChange: (v: Vec3) => void;
  onDrawAB: () => void;
  twoU: Vec3;
  twoV: Vec3;
  onTwoUChange: (v: Vec3) => void;
  onTwoVChange: (v: Vec3) => void;
  additionRule: AdditionRule;
  onAdditionRuleChange: (r: AdditionRule) => void;
  onRunTwoSumSim: () => void;
  twoSumPlaying: boolean;
  twoSumProgress: number;
  multiVectors: VectorEntry[];
  onUpdateMultiVector: (id: string, coords: Vec3) => void;
  onAddMultiVector: () => void;
  onRemoveMultiVector: (id: string) => void;
  onCalculateMultiSum: () => void;
  onDrawMultiResultant: () => void;
  onStartMultiAnim: () => void;
  onClearAllMulti: () => void;
  multiAnimRunning: boolean;
  multiAnimPaused: boolean;
  onTogglePauseMultiAnim: () => void;
  multiAnimSpeed: number;
  onMultiAnimSpeedChange: (s: number) => void;
  multiAnimStep: number;
  onJumpMultiStep: (step: number) => void;
  exploreSelectedPoint: 'A' | 'B';
  onSelectExplorePoint: (p: 'A' | 'B') => void;
  practiceLevel: DifficultyLevel;
  onPracticeLevelChange: (l: DifficultyLevel) => void;
  onNewPracticeQuestion: () => void;
  viewSettings: ViewSettings;
  onUpdateViewSettings: (patch: Partial<ViewSettings>) => void;
  onLoadPresetById: (id: string) => void;
}

export const LeftControlPanel: React.FC<LeftControlPanelProps> = ({
  mode,
  singleSubMode,
  onSingleSubModeChange,
  singleDraft,
  onSingleDraftChange,
  onApplySingleDraft,
  onAddSingleToList,
  singleVectors,
  onToggleSingleVector,
  onDeleteSingleVector,
  pointA,
  pointB,
  onPointAChange,
  onPointBChange,
  onDrawAB,
  twoU,
  twoV,
  onTwoUChange,
  onTwoVChange,
  additionRule,
  onAdditionRuleChange,
  onRunTwoSumSim,
  twoSumPlaying,
  twoSumProgress,
  multiVectors,
  onUpdateMultiVector,
  onAddMultiVector,
  onRemoveMultiVector,
  onCalculateMultiSum,
  onDrawMultiResultant,
  onStartMultiAnim,
  onClearAllMulti,
  multiAnimRunning,
  multiAnimPaused,
  onTogglePauseMultiAnim,
  multiAnimSpeed,
  onMultiAnimSpeedChange,
  multiAnimStep,
  onJumpMultiStep,
  exploreSelectedPoint,
  onSelectExplorePoint,
  practiceLevel,
  onPracticeLevelChange,
  onNewPracticeQuestion,
  viewSettings,
  onUpdateViewSettings,
  onLoadPresetById,
}) => {
  const [useCustomOrigin, setUseCustomOrigin] = useState(false);

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* ============================================================ */}
        {/* CHẾ ĐỘ 1: VẼ VECTƠ                                           */}
        {/* ============================================================ */}
        {mode === 'single' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => onSingleSubModeChange('by-coords')}
                className={`px-2.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  singleSubMode === 'by-coords'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo tọa độ
              </button>
              <button
                type="button"
                onClick={() => onSingleSubModeChange('by-points')}
                className={`px-2.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  singleSubMode === 'by-points'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Từ 2 điểm A, B
              </button>
            </div>

            {singleSubMode === 'by-coords' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-600">
                      Tên vectơ
                    </span>
                    <input
                      type="text"
                      value={singleDraft.name}
                      onChange={(e) =>
                        onSingleDraftChange({
                          ...singleDraft,
                          name: e.target.value.slice(0, 8),
                        })
                      }
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                      placeholder="u"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-600">
                      Độ dày nét: <span className="font-mono tabular-nums">{singleDraft.thickness.toFixed(1)}</span>
                    </span>
                    <input
                      type="range"
                      min={0.6}
                      max={1.8}
                      step={0.1}
                      value={singleDraft.thickness}
                      onChange={(e) =>
                        onSingleDraftChange({
                          ...singleDraft,
                          thickness: Number(e.target.value),
                        })
                      }
                      className="mt-2.5 accent-blue-600 cursor-pointer"
                    />
                  </label>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Màu sắc vectơ
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '#2563EB',
                      '#16A34A',
                      '#DC2626',
                      '#D97706',
                      '#7C3AED',
                      '#0891B2',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          onSingleDraftChange({ ...singleDraft, color: c })
                        }
                        aria-label={`Chọn màu ${c}`}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                          singleDraft.color === c
                            ? 'border-slate-900 scale-110'
                            : 'border-white shadow-sm hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <CoordInputGroup
                  label={`Tọa độ ${singleDraft.name || 'u'} = (a; b; c)`}
                  value={singleDraft.coords}
                  onChange={(coords) =>
                    onSingleDraftChange({ ...singleDraft, coords })
                  }
                />

                <div className="pt-1 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomOrigin}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseCustomOrigin(checked);
                        if (!checked) {
                          onSingleDraftChange({
                            ...singleDraft,
                            startPoint: { x: 0, y: 0, z: 0 },
                          });
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    Đặt điểm đầu tại điểm khác gốc O
                  </label>
                  {useCustomOrigin && (
                    <div className="mt-2.5">
                      <CoordInputGroup
                        label="Điểm đầu A(x₀; y₀; z₀)"
                        value={singleDraft.startPoint}
                        onChange={(startPoint) =>
                          onSingleDraftChange({ ...singleDraft, startPoint })
                        }
                        compact
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onApplySingleDraft}
                    className="col-span-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    VẼ VECTƠ
                  </button>
                  <button
                    type="button"
                    onClick={onAddSingleToList}
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm vectơ mới để so sánh
                  </button>
                </div>

                {singleVectors.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-500">
                      Danh sách đang hiển thị ({singleVectors.length})
                    </div>
                    <div className="space-y-1.5">
                      {singleVectors.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-slate-900 truncate">
                              {item.name} ={' '}
                              <span className="font-mono tabular-nums font-normal text-slate-700">
                                {formatVecText(item.coords)}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleSingleVector(item.id)}
                              title={item.visible ? 'Ẩn vectơ' : 'Hiện vectơ'}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded"
                            >
                              {item.visible ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => onDeleteSingleVector(item.id)}
                                title="Xóa vectơ"
                                className="p-1 text-red-500 hover:text-red-700 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <CoordInputGroup
                  label="Điểm đầu A(x₁; y₁; z₁)"
                  value={pointA}
                  onChange={onPointAChange}
                />
                <CoordInputGroup
                  label="Điểm cuối B(x₂; y₂; z₂)"
                  value={pointB}
                  onChange={onPointBChange}
                />
                <button
                  type="button"
                  onClick={onDrawAB}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  VẼ VECTƠ AB
                </button>
                <button
                  type="button"
                  onClick={() => onLoadPresetById('ex-1-two-points')}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Nạp Ví dụ 1: A(1; 0; 2), A'(5; 0; 1)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* CHẾ ĐỘ 2: CỘNG HAI VECTƠ                                     */}
        {/* ============================================================ */}
        {mode === 'two-sum' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm bg-blue-600 shrink-0" />
                <span className="text-sm font-bold text-blue-900">
                  Vectơ u = (a₁; b₁; c₁)
                </span>
              </div>
              <CoordInputGroup value={twoU} onChange={onTwoUChange} compact />
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm bg-green-600 shrink-0" />
                <span className="text-sm font-bold text-green-900">
                  Vectơ v = (a₂; b₂; c₂)
                </span>
              </div>
              <CoordInputGroup value={twoV} onChange={onTwoVChange} compact />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-600">
                Chế độ dựng hình
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => onAdditionRuleChange('parallelogram')}
                  className={`text-left rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    additionRule === 'parallelogram'
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Chế độ A – Quy tắc hình bình hành
                </button>
                <button
                  type="button"
                  onClick={() => onAdditionRuleChange('head-to-tail')}
                  className={`text-left rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    additionRule === 'head-to-tail'
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Chế độ B – Quy tắc nối đuôi
                </button>
              </div>
            </div>

            {additionRule === 'head-to-tail' && (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <button
                  type="button"
                  onClick={onRunTwoSumSim}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  {twoSumPlaying ? 'ĐANG MÔ PHỎNG...' : 'CHẠY MÔ PHỎNG'}
                </button>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Tiến trình tịnh tiến v</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {Math.round(twoSumProgress * 100)}%
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onLoadPresetById('ex-2-two-sum')}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Nạp Ví dụ 2: u=(2;3;−1), v=(−1;4;5)
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* CHẾ ĐỘ 3: TÍNH TỔNG NHIỀU VECTƠ (TRỌNG TÂM)                  */}
        {/* ============================================================ */}
        {mode === 'multi-sum' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                Danh sách vectơ ({multiVectors.length})
              </span>
              <button
                type="button"
                onClick={onAddMultiVector}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                THÊM VECTƠ
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {multiVectors.map((vec, index) => (
                <div
                  key={vec.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-sm shrink-0"
                        style={{ backgroundColor: vec.color }}
                      />
                      <span className="text-xs font-bold text-slate-800">
                        u{index + 1} = (x; y; z)
                      </span>
                    </div>
                    {multiVectors.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveMultiVector(vec.id)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer"
                        title="XÓA VECTƠ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        XÓA VECTƠ
                      </button>
                    )}
                  </div>
                  <CoordInputGroup
                    value={vec.coords}
                    onChange={(coords) => onUpdateMultiVector(vec.id, coords)}
                    compact
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCalculateMultiSum}
                className="rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                TÍNH TỔNG
              </button>
              <button
                type="button"
                onClick={onDrawMultiResultant}
                className="rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                VẼ VECTƠ TỔNG
              </button>
              <button
                type="button"
                onClick={onStartMultiAnim}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-700 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                MÔ PHỎNG TỪNG BƯỚC
              </button>
            </div>

            {/* Điều khiển hoạt ảnh 5 bước */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Tiến trình: Bước {multiAnimStep}/5
                </span>
                {multiAnimRunning && (
                  <button
                    type="button"
                    onClick={onTogglePauseMultiAnim}
                    className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    {multiAnimPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-green-600" />
                        TIẾP TỤC
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-600" />
                        TẠM DỪNG
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onJumpMultiStep(s)}
                    className={`rounded py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      multiAnimStep === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    B{s}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600 flex justify-between">
                  <span>Tốc độ mô phỏng</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {multiAnimSpeed.toFixed(2)}x
                  </span>
                </span>
                <input
                  type="range"
                  min={0.25}
                  max={2.5}
                  step={0.25}
                  value={multiAnimSpeed}
                  onChange={(e) => onMultiAnimSpeedChange(Number(e.target.value))}
                  className="w-full accent-green-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={viewSettings.showOriginComparison}
                  onChange={(e) =>
                    onUpdateViewSettings({
                      showOriginComparison: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                Hiển thị vectơ thành phần tại gốc O
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onLoadPresetById('ex-3-multi-sum')}
                className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Nạp Ví dụ 3
              </button>
              <button
                type="button"
                onClick={onClearAllMulti}
                className="flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                XÓA TẤT CẢ
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CHẾ ĐỘ 4: XÁC ĐỊNH TỌA ĐỘ TỪ HÌNH VẼ                         */}
        {/* ============================================================ */}
        {mode === 'explore' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed">
              Nhấp vào điểm <strong>A</strong> hoặc <strong>B</strong> trên hình 3D để kéo trực tiếp theo 3 trục (giữ <kbd className="px-1 py-0.5 bg-white border border-blue-300 rounded font-mono">Shift</kbd> để kéo bước 0,1), hoặc dùng thanh trượt bên dưới.
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => onSelectExplorePoint('A')}
                className={`py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  exploreSelectedPoint === 'A'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang chọn: Điểm A
              </button>
              <button
                type="button"
                onClick={() => onSelectExplorePoint('B')}
                className={`py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  exploreSelectedPoint === 'B'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang chọn: Điểm B
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <CoordInputGroup
                label="Tọa độ điểm đầu A"
                value={pointA}
                onChange={onPointAChange}
                withSliders
                compact
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <CoordInputGroup
                label="Tọa độ điểm cuối B"
                value={pointB}
                onChange={onPointBChange}
                withSliders
                compact
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateViewSettings({ hideAnswers: true })}
                className={`rounded-lg px-3 py-2.5 text-xs font-bold border transition-colors cursor-pointer ${
                  viewSettings.hideAnswers
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                ẨN TỌA ĐỘ
              </button>
              <button
                type="button"
                onClick={() => onUpdateViewSettings({ hideAnswers: false })}
                className={`rounded-lg px-3 py-2.5 text-xs font-bold border transition-colors cursor-pointer ${
                  !viewSettings.hideAnswers
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                }`}
              >
                HIỆN ĐÁP ÁN
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CHẾ ĐỘ 5: HỌC SINH LUYỆN TẬP                                 */}
        {/* ============================================================ */}
        {mode === 'practice' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">
                Chọn mức độ câu hỏi (GDPT 2018)
              </span>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      id: 'nhan-biet',
                      title: 'Mức 1: Nhận biết',
                      desc: 'Xác định tọa độ vectơ từ hình 3D',
                    },
                    {
                      id: 'thong-hieu',
                      title: 'Mức 2: Thông hiểu',
                      desc: 'Tính tọa độ vectơ từ hai điểm A, B',
                    },
                    {
                      id: 'van-dung',
                      title: 'Mức 3: Vận dụng',
                      desc: 'Tổng nhiều vectơ & tìm điểm cuối',
                    },
                  ] as const
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => onPracticeLevelChange(lvl.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                      practiceLevel === lvl.id
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{lvl.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {lvl.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onNewPracticeQuestion}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              SINH CÂU HỎI MỚI
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TÙY CHỌN HIỂN THỊ KHÔNG GIAN OXYZ                            */}
        {/* ============================================================ */}
        <div className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Hiển thị hệ trục & mặt phẳng
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {(
              [
                { key: 'showGrid', label: 'Lưới tọa độ' },
                { key: 'showProjectionLines', label: 'Đường gióng' },
                { key: 'showLabels', label: 'Nhãn tên' },
                { key: 'showCoordinates', label: 'Số tọa độ' },
                { key: 'showPlaneOxy', label: 'Mặt phẳng Oxy' },
                { key: 'showPlaneOyz', label: 'Mặt phẳng Oyz' },
                { key: 'showPlaneOxz', label: 'Mặt phẳng Oxz' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={viewSettings[opt.key]}
                  onChange={(e) =>
                    onUpdateViewSettings({ [opt.key]: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-slate-700 font-medium truncate">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
