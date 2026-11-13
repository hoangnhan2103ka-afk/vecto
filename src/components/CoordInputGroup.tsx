import React, { useEffect, useState } from 'react';
import { Vec3 } from '../types/vector';
import { cleanNum } from '../utils/math';

interface CoordInputGroupProps {
  label?: string;
  value: Vec3;
  onChange: (next: Vec3) => void;
  withSliders?: boolean;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  accentColor?: string;
  compact?: boolean;
}

const SingleAxisInput: React.FC<{
  axisLabel: 'x' | 'y' | 'z';
  colorClass: string;
  numValue: number;
  onCommit: (n: number) => void;
  compact?: boolean;
}> = ({ axisLabel, colorClass, numValue, onCommit, compact }) => {
  const [text, setText] = useState(String(cleanNum(numValue)));

  useEffect(() => {
    const parsed = parseFloat(text.replace(',', '.'));
    if (Number.isNaN(parsed) || cleanNum(parsed) !== cleanNum(numValue)) {
      setText(String(cleanNum(numValue)));
    }
  }, [numValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const normalized = raw.replace(',', '.').trim();
    if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
      return;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      onCommit(cleanNum(parsed));
    }
  };

  const handleBlur = () => {
    const parsed = Number(text.replace(',', '.').trim());
    if (!Number.isFinite(parsed)) {
      setText(String(cleanNum(numValue)));
    } else {
      const cleaned = cleanNum(parsed);
      setText(String(cleaned));
      onCommit(cleaned);
    }
  };

  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className={`text-xs font-semibold ${colorClass}`}>
        {axisLabel}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={`Tọa độ ${axisLabel}`}
        className={`w-full rounded-lg border border-slate-300 bg-white font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
          compact ? 'px-2 py-1.5 text-sm' : 'px-2.5 py-2 text-sm'
        }`}
      />
    </label>
  );
};

export const CoordInputGroup: React.FC<CoordInputGroupProps> = ({
  label,
  value,
  onChange,
  withSliders = false,
  sliderMin = -8,
  sliderMax = 8,
  sliderStep = 0.5,
  compact = false,
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <div className="text-sm font-semibold text-slate-800">{label}</div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <SingleAxisInput
          axisLabel="x"
          colorClass="text-red-600"
          numValue={value.x}
          onCommit={(x) => onChange({ ...value, x })}
          compact={compact}
        />
        <SingleAxisInput
          axisLabel="y"
          colorClass="text-green-600"
          numValue={value.y}
          onCommit={(y) => onChange({ ...value, y })}
          compact={compact}
        />
        <SingleAxisInput
          axisLabel="z"
          colorClass="text-blue-600"
          numValue={value.z}
          onCommit={(z) => onChange({ ...value, z })}
          compact={compact}
        />
      </div>

      {withSliders && (
        <div className="space-y-2 pt-1">
          {(
            [
              { key: 'x', label: 'Hoành độ x', color: 'accent-red-600 text-red-700' },
              { key: 'y', label: 'Tung độ y', color: 'accent-green-600 text-green-700' },
              { key: 'z', label: 'Cao độ z', color: 'accent-blue-600 text-blue-700' },
            ] as const
          ).map((axis) => (
            <div key={axis.key} className="flex items-center gap-2.5">
              <span className={`w-24 shrink-0 text-xs font-medium ${axis.color.split(' ')[1]}`}>
                {axis.label}: <span className="font-mono tabular-nums font-semibold">{cleanNum(value[axis.key])}</span>
              </span>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={value[axis.key]}
                onChange={(e) =>
                  onChange({ ...value, [axis.key]: cleanNum(Number(e.target.value)) })
                }
                className={`w-full cursor-pointer ${axis.color.split(' ')[0]}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
