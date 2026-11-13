import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { MathFormula } from './MathFormula';

interface PrintWorksheetModalProps {
  open: boolean;
  onClose: () => void;
  snapshotDataUrl: string | null;
  title: string;
  problemSummary: string;
  latexLines: string[];
  solutionLatexLines: string[];
}

export const PrintWorksheetModal: React.FC<PrintWorksheetModalProps> = ({
  open,
  onClose,
  snapshotDataUrl,
  title,
  problemSummary,
  latexLines,
  solutionLatexLines,
}) => {
  const [includeSolution, setIncludeSolution] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Xem trước phiếu bài tập & In PDF
            </h2>
            <p className="text-xs text-slate-500">
              Chọn "Lưu dưới dạng PDF" trong hộp thoại in của trình duyệt
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSolution}
                onChange={(e) => setIncludeSolution(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              Kèm đáp án & lời giải
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In / Xuất PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ in"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div
            id="print-worksheet-area"
            className="mx-auto max-w-[720px] rounded-lg bg-white p-8 shadow-sm border border-slate-200 space-y-5"
          >
            <div className="border-b-2 border-slate-900 pb-3 flex items-end justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-700">
                  TOÁN HỌC 12 · CHƯƠNG TRÌNH GDPT 2018
                </div>
                <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                  {title}
                </h1>
              </div>
              <div className="text-right text-xs text-slate-500">
                Hệ tọa độ Oxyz
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-800">
              <p className="font-medium">{problemSummary}</p>
              <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {latexLines.map((tex, idx) => (
                  <div key={idx}>
                    <MathFormula tex={tex} />
                  </div>
                ))}
              </div>
            </div>

            {snapshotDataUrl && (
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <img
                  src={snapshotDataUrl}
                  alt="Hình minh họa hệ tọa độ Oxyz"
                  className="w-full max-h-[340px] object-contain mx-auto"
                />
              </div>
            )}

            {includeSolution ? (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Lời giải chi tiết:
                </h3>
                <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3.5 text-sm">
                  {solutionLatexLines.map((tex, idx) => (
                    <div key={idx}>
                      <MathFormula tex={tex} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Phần bài làm của học sinh:
                </h3>
                <div className="h-28 rounded-lg border border-dashed border-slate-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
