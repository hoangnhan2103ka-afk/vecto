import React, { useEffect, useState } from 'react';
import {
  BookmarkPlus,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  AdditionRule,
  AppMode,
  PracticeQuestion,
  SavedPreset,
  SingleSubMode,
  Vec3,
  VectorEntry,
  ViewSettings,
} from '../types/vector';
import {
  addVec,
  areCollinear,
  areOpposite,
  cleanNum,
  formatLengthLatex,
  formatParenNum,
  formatVecNameLatex,
  formatVecTuple,
  isZeroVec,
  subVec,
  sumVecs,
} from '../utils/math';
import { CoordInputGroup } from './CoordInputGroup';
import { MathFormula } from './MathFormula';

interface RightSolutionPanelProps {
  mode: AppMode;
  singleSubMode: SingleSubMode;
  singleVectors: VectorEntry[];
  pointA: Vec3;
  pointB: Vec3;
  twoU: Vec3;
  twoV: Vec3;
  additionRule: AdditionRule;
  multiVectors: VectorEntry[];
  multiAnimStep: number;
  viewSettings: ViewSettings;
  onToggleHideAnswers: () => void;
  practiceQuestion: PracticeQuestion | null;
  practiceShowSolution: boolean;
  onTogglePracticeSolution: () => void;
  onNextPracticeQuestion: () => void;
  practiceStats: { correct: number; total: number };
  onRecordPracticeAnswer: (isCorrect: boolean) => void;
  presets: SavedPreset[];
  onLoadPreset: (preset: SavedPreset) => void;
  onSaveCurrentPreset: (title: string) => void;
  onDeletePreset: (id: string) => void;
  onDownloadPNG: (highRes: boolean) => void;
  onOpenPrintModal: () => void;
  copyPlainText: string;
}

const MULTI_STEP_CAPTIONS: Record<number, string> = {
  1: 'Bước 1: Dựng vectơ thứ nhất u₁ xuất phát từ gốc tọa độ O.',
  2: 'Bước 2: Tịnh tiến vectơ u₂ (giữ nguyên hướng và độ dài) sao cho điểm đầu trùng ngọn của u₁.',
  3: 'Bước 3: Tiếp tục tịnh tiến nối đuôi các vectơ còn lại lần lượt từ đầu đến cuối.',
  4: 'Bước 4: Dựng vectơ tổng S nối từ điểm đầu ban đầu O đến điểm cuối cùng của chuỗi.',
  5: 'Bước 5: Tổng hợp kết quả tọa độ bằng phép cộng từng thành phần (hoành, tung, cao độ).',
};

export const RightSolutionPanel: React.FC<RightSolutionPanelProps> = ({
  mode,
  singleSubMode,
  singleVectors,
  pointA,
  pointB,
  twoU,
  twoV,
  additionRule,
  multiVectors,
  multiAnimStep,
  viewSettings,
  onToggleHideAnswers,
  practiceQuestion,
  practiceShowSolution,
  onTogglePracticeSolution,
  onNextPracticeQuestion,
  practiceStats,
  onRecordPracticeAnswer,
  presets,
  onLoadPreset,
  onSaveCurrentPreset,
  onDeletePreset,
  onDownloadPNG,
  onOpenPrintModal,
  copyPlainText,
}) => {
  const [copied, setCopied] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  // State cho câu hỏi luyện tập
  const [studentInput, setStudentInput] = useState<Vec3>({ x: 0, y: 0, z: 0 });
  const [checkResult, setCheckResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    setStudentInput({ x: 0, y: 0, z: 0 });
    setCheckResult('idle');
  }, [practiceQuestion?.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyPlainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleCheckPractice = () => {
    if (!practiceQuestion) return;
    const ans = practiceQuestion.answer;
    const ok =
      Math.abs(cleanNum(studentInput.x) - cleanNum(ans.x)) < 1e-4 &&
      Math.abs(cleanNum(studentInput.y) - cleanNum(ans.y)) < 1e-4 &&
      Math.abs(cleanNum(studentInput.z) - cleanNum(ans.z)) < 1e-4;
    if (checkResult === 'idle') {
      onRecordPracticeAnswer(ok);
    }
    setCheckResult(ok ? 'correct' : 'wrong');
  };

  const primaryVec = singleVectors[0];
  const abVec = subVec(pointB, pointA);
  const twoSum = addVec(twoU, twoV);
  const activeMulti = multiVectors.filter((v) => v.visible);
  const multiSum = sumVecs(activeMulti.map((v) => v.coords));

  const accuracy =
    practiceStats.total > 0
      ? Math.round((practiceStats.correct / practiceStats.total) * 100)
      : 0;

  return (
    <aside className="flex flex-col h-full bg-white border-l border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* ============================================================ */}
        {/* KẾT QUẢ & LỜI GIẢI TỪNG BƯỚC                                 */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              {mode === 'practice'
                ? 'Bài tập thực hành'
                : 'Kết quả & Lời giải chi tiết'}
            </h2>
            {mode !== 'practice' && (
              <button
                type="button"
                onClick={onToggleHideAnswers}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                {viewSettings.hideAnswers ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Hiện đáp án
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    Ẩn đáp án
                  </>
                )}
              </button>
            )}
          </div>

          {viewSettings.hideAnswers && mode !== 'practice' ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <div className="font-semibold text-slate-900">
                Đang ở chế độ ẩn đáp án
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Học sinh quan sát hệ trục tọa độ 3D, các đường gióng vuông góc và tự tính toán kết quả trước khi giáo viên nhấn nút <strong>Hiện đáp án</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Lời giải: Vẽ vectơ theo tọa độ */}
              {mode === 'single' && singleSubMode === 'by-coords' && primaryVec && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="overflow-x-auto py-1">
                    <MathFormula
                      tex={`${formatVecNameLatex(primaryVec.name)} = ${formatVecTuple(primaryVec.coords)}`}
                      displayMode
                      className="text-base text-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 border-t border-slate-200 pt-2.5">
                    <div>
                      Điểm đầu:{' '}
                      <MathFormula
                        tex={`A${formatVecTuple(primaryVec.startPoint)}`}
                      />
                    </div>
                    <div>
                      Điểm cuối:{' '}
                      <MathFormula
                        tex={`M${formatVecTuple(
                          addVec(primaryVec.startPoint, primaryVec.coords)
                        )}`}
                      />
                    </div>
                    <div>
                      Độ dài vectơ:{' '}
                      <MathFormula
                        tex={`|${formatVecNameLatex(primaryVec.name)}| = \\sqrt{${formatParenNum(primaryVec.coords.x)}^2 + ${formatParenNum(primaryVec.coords.y)}^2 + ${formatParenNum(primaryVec.coords.z)}^2} = ${formatLengthLatex(primaryVec.coords)}`}
                      />
                    </div>
                  </div>

                  {isZeroVec(primaryVec.coords) && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                      Đây là <strong>vectơ không</strong> <MathFormula tex="\vec{0} = (0; 0; 0)" /> có điểm đầu trùng điểm cuối, độ dài bằng 0.
                    </div>
                  )}
                </div>
              )}

              {/* Lời giải: Vectơ từ hai điểm A, B */}
              {mode === 'single' && singleSubMode === 'by-points' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs text-slate-800">
                  <div className="font-semibold text-slate-900">
                    Công thức tọa độ vectơ từ hai điểm:
                  </div>
                  <div className="overflow-x-auto">
                    <MathFormula
                      tex={`\\overrightarrow{AB} = (x_B - x_A;\\; y_B - y_A;\\; z_B - z_A)`}
                      displayMode
                    />
                  </div>
                  <div className="space-y-1.5 border-t border-slate-200 pt-2">
                    <div>
                      Bước 1 (Thay số):{' '}
                      <MathFormula
                        tex={`\\overrightarrow{AB} = (${pointB.x} - ${formatParenNum(pointA.x)};\\; ${pointB.y} - ${formatParenNum(pointA.y)};\\; ${pointB.z} - ${formatParenNum(pointA.z)})`}
                      />
                    </div>
                    <div className="text-sm font-bold text-blue-700 pt-1">
                      Bước 2 (Kết quả):{' '}
                      <MathFormula
                        tex={`\\overrightarrow{AB} = ${formatVecTuple(abVec)}`}
                      />
                    </div>
                    <div className="pt-1">
                      Độ dài đoạn thẳng:{' '}
                      <MathFormula
                        tex={`AB = |\\overrightarrow{AB}| = ${formatLengthLatex(abVec)}`}
                      />
                    </div>
                  </div>
                  {isZeroVec(abVec) && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                      Hai điểm A và B trùng nhau nên <MathFormula tex="\overrightarrow{AB} = \vec{0}" />.
                    </div>
                  )}
                </div>
              )}

              {/* Lời giải: Cộng hai vectơ */}
              {mode === 'two-sum' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 text-xs text-slate-800">
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold text-blue-700">Vectơ u:</span>{' '}
                      <MathFormula tex={`\\vec{u} = ${formatVecTuple(twoU)}`} />
                    </div>
                    <div>
                      <span className="font-semibold text-green-700">Vectơ v:</span>{' '}
                      <MathFormula tex={`\\vec{v} = ${formatVecTuple(twoV)}`} />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                    <div className="font-semibold text-slate-900">
                      Phép cộng theo từng tọa độ:
                    </div>
                    <MathFormula
                      tex={`\\vec{u} + \\vec{v} = (${twoU.x} + ${formatParenNum(twoV.x)};\\; ${twoU.y} + ${formatParenNum(twoV.y)};\\; ${twoU.z} + ${formatParenNum(twoV.z)})`}
                      displayMode
                    />
                    <div className="text-sm font-bold text-red-700 text-center">
                      <MathFormula
                        tex={`\\vec{u} + \\vec{v} = ${formatVecTuple(twoSum)}`}
                        displayMode
                      />
                    </div>
                    <div>
                      Độ dài vectơ tổng:{' '}
                      <MathFormula
                        tex={`|\\vec{u} + \\vec{v}| = ${formatLengthLatex(twoSum)}`}
                      />
                    </div>
                  </div>

                  <div className="rounded-md bg-white border border-slate-200 p-2.5 text-slate-700 leading-relaxed">
                    <strong>Ý nghĩa hình học: </strong>
                    {additionRule === 'parallelogram'
                      ? 'Khi u và v có chung điểm đầu O, vectơ tổng u + v là đường chéo xuất phát từ O của hình bình hành tạo bởi u và v.'
                      : 'Khi tịnh tiến vectơ v sao cho điểm đầu của v trùng điểm cuối của u (giữ nguyên hướng và độ dài), vectơ tổng u + v nối từ điểm đầu của u đến điểm cuối của v sau tịnh tiến.'}
                  </div>

                  {areOpposite(twoU, twoV) && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                      Hai vectơ <strong>đối nhau</strong> nên tổng bằng vectơ không <MathFormula tex="(0; 0; 0)" />.
                    </div>
                  )}
                  {!areOpposite(twoU, twoV) && areCollinear(twoU, twoV) && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-blue-900">
                      Hai vectơ u và v <strong>cùng phương</strong> (giá song song hoặc trùng nhau).
                    </div>
                  )}
                </div>
              )}

              {/* Lời giải: Tổng nhiều vectơ */}
              {mode === 'multi-sum' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 text-xs text-slate-800">
                  <div className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-2 text-blue-900 font-medium leading-relaxed">
                    {MULTI_STEP_CAPTIONS[multiAnimStep] || MULTI_STEP_CAPTIONS[5]}
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-900">
                      Cộng từng thành phần tọa độ ({activeMulti.length} vectơ):
                    </div>
                    <div className="overflow-x-auto space-y-1 bg-white rounded-md border border-slate-200 p-2.5">
                      <div>
                        <MathFormula
                          tex={`x_S = ${activeMulti.map((v) => formatParenNum(v.coords.x)).join(' + ')} = ${multiSum.x}`}
                        />
                      </div>
                      <div>
                        <MathFormula
                          tex={`y_S = ${activeMulti.map((v) => formatParenNum(v.coords.y)).join(' + ')} = ${multiSum.y}`}
                        />
                      </div>
                      <div>
                        <MathFormula
                          tex={`z_S = ${activeMulti.map((v) => formatParenNum(v.coords.z)).join(' + ')} = ${multiSum.z}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-center">
                    <div className="text-xs font-semibold text-red-700 mb-1">
                      Vectơ tổng S
                    </div>
                    <MathFormula
                      tex={`\\vec{S} = ${formatVecTuple(multiSum)}`}
                      displayMode
                      className="text-base font-bold text-red-700"
                    />
                    <div className="text-xs text-slate-700 mt-1">
                      Độ dài:{' '}
                      <MathFormula
                        tex={`|\\vec{S}| = ${formatLengthLatex(multiSum)}`}
                      />
                    </div>
                  </div>

                  {isZeroVec(multiSum) && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                      Tổng của chuỗi vectơ bằng <strong>vectơ không (0; 0; 0)</strong> — đường gấp khúc nối đuôi khép kín trở về điểm đầu O.
                    </div>
                  )}
                </div>
              )}

              {/* Lời giải: Khám phá tọa độ từ hình vẽ */}
              {mode === 'explore' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs text-slate-800">
                  <div>
                    Điểm đầu:{' '}
                    <MathFormula tex={`A${formatVecTuple(pointA)}`} />
                  </div>
                  <div>
                    Điểm cuối:{' '}
                    <MathFormula tex={`B${formatVecTuple(pointB)}`} />
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <MathFormula
                      tex={`\\overrightarrow{AB} = (${pointB.x} - ${formatParenNum(pointA.x)};\\; ${pointB.y} - ${formatParenNum(pointA.y)};\\; ${pointB.z} - ${formatParenNum(pointA.z)})`}
                      displayMode
                    />
                    <div className="text-sm font-bold text-blue-700 text-center">
                      <MathFormula
                        tex={`\\overrightarrow{AB} = ${formatVecTuple(abVec)}`}
                      />
                    </div>
                  </div>
                  <div>
                    Độ dài:{' '}
                    <MathFormula
                      tex={`|\\overrightarrow{AB}| = ${formatLengthLatex(abVec)}`}
                    />
                  </div>
                </div>
              )}

              {/* Chế độ học sinh luyện tập */}
              {mode === 'practice' && practiceQuestion && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Đúng:{' '}
                      <strong className="font-mono tabular-nums text-green-700">
                        {practiceStats.correct}/{practiceStats.total}
                      </strong>
                    </span>
                    <span className="font-mono tabular-nums">
                      Tỉ lệ: {accuracy}%
                    </span>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {practiceQuestion.prompt}
                    </p>
                    <div className="overflow-x-auto bg-white rounded-md border border-blue-100 px-2.5 py-2">
                      <MathFormula
                        tex={practiceQuestion.latexPrompt}
                        className="text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                    <CoordInputGroup
                      label="Nhập câu trả lời của em (x; y; z):"
                      value={studentInput}
                      onChange={(val) => {
                        setStudentInput(val);
                        if (checkResult !== 'idle') setCheckResult('idle');
                      }}
                      compact
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCheckPractice}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors cursor-pointer"
                      >
                        KIỂM TRA
                      </button>
                      <button
                        type="button"
                        onClick={onNextPracticeQuestion}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        CÂU HỎI TIẾP THEO
                      </button>
                    </div>

                    {checkResult === 'correct' && (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-300 px-3 py-2 text-xs font-bold text-green-800">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                        Chính xác! Kết quả đúng là{' '}
                        <MathFormula
                          tex={formatVecTuple(practiceQuestion.answer)}
                        />
                      </div>
                    )}

                    {checkResult === 'wrong' && (
                      <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-300 px-3 py-2 text-xs font-bold text-red-800">
                        <XCircle className="w-4 h-4 shrink-0 text-red-600" />
                        Chưa đúng. Hãy kiểm tra lại phép tính hoặc xem lời giải.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={onTogglePracticeSolution}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                      {practiceShowSolution ? 'Ẩn lời giải chi tiết' : 'Xem lời giải từng bước'}
                    </button>

                    {practiceShowSolution && (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 space-y-1.5 overflow-x-auto">
                        {practiceQuestion.solutionSteps.map((step, i) => (
                          <div key={i} className="text-xs text-slate-800">
                            <MathFormula tex={step} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================ */}
        {/* CÔNG CỤ PHỤC VỤ GIÁO VIÊN                                    */}
        {/* ============================================================ */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-700">
            Công cụ giảng dạy & Xuất tài liệu
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDownloadPNG(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Tải PNG nét cao</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadPNG(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="truncate">Chụp khung hình</span>
            </button>
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="truncate">In / Xuất PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-green-700 truncate">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate">Sao chép phép tính</span>
                </>
              )}
            </button>
          </div>

          {/* Bộ ví dụ đã lưu */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Bộ ví dụ mẫu ({presets.length})
              </span>
              {mode !== 'practice' && (
                <button
                  type="button"
                  onClick={() => setShowSaveForm((s) => !s)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Lưu ví dụ này
                </button>
              )}
            </div>

            {showSaveForm && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Tên bộ ví dụ..."
                  className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (presetName.trim()) {
                      onSaveCurrentPreset(presetName.trim());
                      setPresetName('');
                      setShowSaveForm(false);
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            )}

            <div className="space-y-1.5 max-h-[210px] overflow-y-auto custom-scrollbar pr-0.5">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-2 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onLoadPreset(p)}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {p.description}
                    </div>
                  </button>
                  {!p.isBuiltin && (
                    <button
                      type="button"
                      onClick={() => onDeletePreset(p.id)}
                      title="Xóa ví dụ đã lưu"
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
