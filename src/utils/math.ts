import { DifficultyLevel, PracticeQuestion, SavedPreset, Vec3, VectorEntry } from '../types/vector';

export const VECTOR_PALETTE = [
  '#2563EB', // Xanh dương
  '#16A34A', // Xanh lá
  '#D97706', // Vàng hổ phách
  '#7C3AED', // Tím đậm
  '#0891B2', // Xanh ngọc
  '#DB2777', // Hồng đậm
  '#4F46E5', // Chàm
  '#0D9488', // Lục bảo
  '#EA580C', // Cam đậm
  '#475569', // Xám đá
];

export const RESULTANT_COLOR = '#DC2626'; // Đỏ đậm cho vectơ tổng

/**
 * Làm sạch sai số dấu phẩy động (tránh -0 hoặc 0.30000000000000004)
 */
export function cleanNum(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function cleanVec(v: Vec3): Vec3 {
  return {
    x: cleanNum(v.x),
    y: cleanNum(v.y),
    z: cleanNum(v.z),
  };
}

export function formatNum(n: number): string {
  const c = cleanNum(n);
  return Number.isInteger(c) ? String(c) : String(c).replace('.', ',');
}

export function formatNumLatex(n: number): string {
  const c = cleanNum(n);
  if (c < 0) return `-${Math.abs(c)}`;
  return String(c);
}

export function formatParenNum(n: number): string {
  const c = cleanNum(n);
  return c < 0 ? `(${c})` : `${c}`;
}

export function formatVecTuple(v: Vec3): string {
  return `(${cleanNum(v.x)};\\; ${cleanNum(v.y)};\\; ${cleanNum(v.z)})`;
}

export function formatVecText(v: Vec3): string {
  return `(${cleanNum(v.x)}; ${cleanNum(v.y)}; ${cleanNum(v.z)})`;
}

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return cleanVec({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  });
}

export function subVec(b: Vec3, a: Vec3): Vec3 {
  return cleanVec({
    x: b.x - a.x,
    y: b.y - a.y,
    z: b.z - a.z,
  });
}

export function sumVecs(list: Vec3[]): Vec3 {
  return list.reduce(
    (acc, item) => addVec(acc, item),
    { x: 0, y: 0, z: 0 }
  );
}

export function vecLength(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function isZeroVec(v: Vec3): boolean {
  return Math.abs(v.x) < 1e-6 && Math.abs(v.y) < 1e-6 && Math.abs(v.z) < 1e-6;
}

export function areCollinear(u: Vec3, v: Vec3): boolean {
  if (isZeroVec(u) || isZeroVec(v)) return true;
  const cx = u.y * v.z - u.z * v.y;
  const cy = u.z * v.x - u.x * v.z;
  const cz = u.x * v.y - u.y * v.x;
  return Math.sqrt(cx * cx + cy * cy + cz * cz) < 1e-5;
}

export function areOpposite(u: Vec3, v: Vec3): boolean {
  return !isZeroVec(u) && isZeroVec(addVec(u, v));
}

export function formatLengthLatex(v: Vec3): string {
  const sq = cleanNum(v.x * v.x + v.y * v.y + v.z * v.z);
  const root = Math.sqrt(sq);
  if (Number.isInteger(root)) {
    return `${root}`;
  }
  return `\\sqrt{${sq}} \\approx ${cleanNum(root)}`;
}

export function formatVecNameLatex(name: string): string {
  const trimmed = name.trim() || 'u';
  // Nếu dạng AA', AB, OM -> \overrightarrow{AB}
  if (/^[A-Z][A-Za-z0-9']*$/.test(trimmed) && trimmed.length >= 2) {
    return `\\overrightarrow{${trimmed}}`;
  }
  // Nếu có chỉ số dạng u1, u_1 -> \vec{u}_{1}
  const match = trimmed.match(/^([a-zA-Z]+)_?([0-9]+)$/);
  if (match) {
    return `\\vec{${match[1]}}_{${match[2]}}`;
  }
  return `\\vec{${trimmed}}`;
}

export function createMultiVectorEntry(index: number, coords: Vec3): VectorEntry {
  return {
    id: `mv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: `u_${index + 1}`,
    coords: cleanVec(coords),
    startPoint: { x: 0, y: 0, z: 0 },
    color: VECTOR_PALETTE[index % VECTOR_PALETTE.length],
    thickness: 1,
    visible: true,
  };
}

export const BUILTIN_PRESETS: SavedPreset[] = [
  {
    id: 'ex-1-two-points',
    title: "Ví dụ 1: Vectơ AA' từ hai điểm",
    description: "A(1; 0; 2), A'(5; 0; 1) → AA' = (4; 0; −1)",
    mode: 'single',
    singleSubMode: 'by-points',
    pointA: { x: 1, y: 0, z: 2 },
    pointB: { x: 5, y: 0, z: 1 },
    isBuiltin: true,
  },
  {
    id: 'ex-2-two-sum',
    title: 'Ví dụ 2: Cộng hai vectơ u + v',
    description: 'u = (2; 3; −1), v = (−1; 4; 5) → u + v = (1; 7; 4)',
    mode: 'two-sum',
    additionRule: 'parallelogram',
    twoU: { x: 2, y: 3, z: -1 },
    twoV: { x: -1, y: 4, z: 5 },
    isBuiltin: true,
  },
  {
    id: 'ex-3-multi-sum',
    title: 'Ví dụ 3: Tổng 4 vectơ nối đuôi',
    description: 'u₁=(2;1;3), u₂=(−1;4;2), u₃=(3;−2;1), u₄=(1;0;−3) → S=(5;3;3)',
    mode: 'multi-sum',
    multiVectors: [
      {
        id: 'ex3-1',
        name: 'u_1',
        coords: { x: 2, y: 1, z: 3 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#2563EB',
        thickness: 1,
        visible: true,
      },
      {
        id: 'ex3-2',
        name: 'u_2',
        coords: { x: -1, y: 4, z: 2 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#16A34A',
        thickness: 1,
        visible: true,
      },
      {
        id: 'ex3-3',
        name: 'u_3',
        coords: { x: 3, y: -2, z: 1 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#D97706',
        thickness: 1,
        visible: true,
      },
      {
        id: 'ex3-4',
        name: 'u_4',
        coords: { x: 1, y: 0, z: -3 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#7C3AED',
        thickness: 1,
        visible: true,
      },
    ],
    isBuiltin: true,
  },
  {
    id: 'ex-4-zero-sum',
    title: 'Trường hợp đặc biệt: Tổng bằng vectơ không',
    description: 'Các vectơ khép thành đa giác kín trong không gian: S = (0; 0; 0)',
    mode: 'multi-sum',
    multiVectors: [
      {
        id: 'ex4-1',
        name: 'u_1',
        coords: { x: 3, y: 1, z: 2 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#2563EB',
        thickness: 1,
        visible: true,
      },
      {
        id: 'ex4-2',
        name: 'u_2',
        coords: { x: -1, y: 3, z: -1 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#16A34A',
        thickness: 1,
        visible: true,
      },
      {
        id: 'ex4-3',
        name: 'u_3',
        coords: { x: -2, y: -4, z: -1 },
        startPoint: { x: 0, y: 0, z: 0 },
        color: '#D97706',
        thickness: 1,
        visible: true,
      },
    ],
    isBuiltin: true,
  },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nonZeroCoord(min: number, max: number): Vec3 {
  let v: Vec3 = { x: 0, y: 0, z: 0 };
  while (isZeroVec(v)) {
    v = { x: randInt(min, max), y: randInt(min, max), z: randInt(min, max) };
  }
  return v;
}

export function generatePracticeQuestion(level: DifficultyLevel): PracticeQuestion {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (level === 'nhan-biet') {
    const m = nonZeroCoord(-4, 5);
    return {
      id,
      level,
      prompt: 'Quan sát điểm M và vectơ OM trong không gian Oxyz (cùng các đường gióng vuông góc). Hãy xác định tọa độ của vectơ OM.',
      latexPrompt: `\\text{Xác định tọa độ } \\overrightarrow{OM} \\text{ từ hình vẽ 3D.}`,
      pointA: { x: 0, y: 0, z: 0 },
      pointB: m,
      answer: m,
      answerLabel: '\\overrightarrow{OM}',
      solutionSteps: [
        `\\text{Từ điểm } M \\text{ gióng vuông góc xuống các trục } Ox, Oy, Oz:`,
        `x_M = ${m.x},\\quad y_M = ${m.y},\\quad z_M = ${m.z}`,
        `\\Rightarrow M${formatVecTuple(m)} \\Rightarrow \\overrightarrow{OM} = ${formatVecTuple(m)}`,
      ],
    };
  }

  if (level === 'thong-hieu') {
    const a = { x: randInt(-3, 4), y: randInt(-3, 4), z: randInt(-2, 4) };
    let b = { x: randInt(-3, 5), y: randInt(-3, 5), z: randInt(-2, 5) };
    if (isZeroVec(subVec(b, a))) {
      b = addVec(a, { x: 2, y: -1, z: 3 });
    }
    const ab = subVec(b, a);
    return {
      id,
      level,
      prompt: `Cho hai điểm A${formatVecText(a)} và B${formatVecText(b)}. Tính tọa độ vectơ AB.`,
      latexPrompt: `A${formatVecTuple(a)},\\quad B${formatVecTuple(b)}.\\; \\text{Tính } \\overrightarrow{AB}.`,
      pointA: a,
      pointB: b,
      answer: ab,
      answerLabel: '\\overrightarrow{AB}',
      solutionSteps: [
        `\\overrightarrow{AB} = (x_B - x_A;\\; y_B - y_A;\\; z_B - z_A)`,
        `\\overrightarrow{AB} = (${b.x} - ${formatParenNum(a.x)};\\; ${b.y} - ${formatParenNum(a.y)};\\; ${b.z} - ${formatParenNum(a.z)})`,
        `\\Rightarrow \\overrightarrow{AB} = ${formatVecTuple(ab)}`,
      ],
    };
  }

  // Vận dụng: tổng nhiều vectơ hoặc tìm điểm cuối
  const isPointEndTask = Math.random() > 0.5;
  if (!isPointEndTask) {
    const u1 = nonZeroCoord(-3, 4);
    const u2 = nonZeroCoord(-3, 4);
    const u3 = nonZeroCoord(-3, 4);
    const s = sumVecs([u1, u2, u3]);
    return {
      id,
      level,
      prompt: `Cho 3 vectơ u₁${formatVecText(u1)}, u₂${formatVecText(u2)}, u₃${formatVecText(u3)}. Tính tọa độ vectơ tổng S = u₁ + u₂ + u₃.`,
      latexPrompt: `\\vec{u}_1 = ${formatVecTuple(u1)},\\; \\vec{u}_2 = ${formatVecTuple(u2)},\\; \\vec{u}_3 = ${formatVecTuple(u3)}.\\; \\text{Tính } \\vec{S} = \\vec{u}_1 + \\vec{u}_2 + \\vec{u}_3.`,
      vectors: [
        { name: 'u_1', coords: u1, color: '#2563EB' },
        { name: 'u_2', coords: u2, color: '#16A34A' },
        { name: 'u_3', coords: u3, color: '#D97706' },
      ],
      answer: s,
      answerLabel: '\\vec{S}',
      solutionSteps: [
        `x_S = ${u1.x} + ${formatParenNum(u2.x)} + ${formatParenNum(u3.x)} = ${s.x}`,
        `y_S = ${u1.y} + ${formatParenNum(u2.y)} + ${formatParenNum(u3.y)} = ${s.y}`,
        `z_S = ${u1.z} + ${formatParenNum(u2.z)} + ${formatParenNum(u3.z)} = ${s.z}`,
        `\\Rightarrow \\vec{S} = ${formatVecTuple(s)}`,
      ],
    };
  } else {
    const a = { x: randInt(-2, 3), y: randInt(-2, 3), z: randInt(-1, 3) };
    const u = nonZeroCoord(-3, 4);
    const m = addVec(a, u);
    return {
      id,
      level,
      prompt: `Từ điểm A${formatVecText(a)}, dựng vectơ AM = u = ${formatVecText(u)}. Tìm tọa độ điểm cuối M.`,
      latexPrompt: `A${formatVecTuple(a)},\\; \\overrightarrow{AM} = \\vec{u} = ${formatVecTuple(u)}.\\; \\text{Tìm tọa độ } M.`,
      pointA: a,
      pointB: m,
      answer: m,
      answerLabel: 'M',
      solutionSteps: [
        `\\overrightarrow{AM} = (x_M - x_A;\\; y_M - y_A;\\; z_M - z_A) = \\vec{u}`,
        `\\Rightarrow M = A + \\vec{u} = (${a.x} + ${formatParenNum(u.x)};\\; ${a.y} + ${formatParenNum(u.y)};\\; ${a.z} + ${formatParenNum(u.z)})`,
        `\\Rightarrow M${formatVecTuple(m)}`,
      ],
    };
  }
}
