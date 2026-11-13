export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface VectorEntry {
  id: string;
  name: string;
  coords: Vec3;
  startPoint: Vec3;
  color: string;
  thickness: number;
  visible: boolean;
}

export type AppMode =
  | 'single'      // Vẽ vectơ theo tọa độ & từ 2 điểm A, B
  | 'two-sum'     // Cộng 2 vectơ (Hình bình hành / Nối đuôi)
  | 'multi-sum'   // Tổng nhiều vectơ (2 - 10+ vectơ, mô phỏng 5 bước)
  | 'explore'     // Xác định tọa độ từ hình vẽ (kéo thả 3D, thanh trượt, ẩn/hiện đáp án)
  | 'practice';   // Học sinh luyện tập tương tác 3 mức độ

export type SingleSubMode = 'by-coords' | 'by-points';

export type AdditionRule = 'parallelogram' | 'head-to-tail';

export type CameraPreset = 'default' | 'oxy' | 'oxz' | 'oyz';

export type DifficultyLevel = 'nhan-biet' | 'thong-hieu' | 'van-dung';

export interface ViewSettings {
  showGrid: boolean;
  showPlaneOxy: boolean;
  showPlaneOyz: boolean;
  showPlaneOxz: boolean;
  showLabels: boolean;
  showCoordinates: boolean;
  showProjectionLines: boolean;
  showOriginComparison: boolean;
  hideAnswers: boolean;
}

export interface PracticeQuestion {
  id: string;
  level: DifficultyLevel;
  prompt: string;
  latexPrompt: string;
  pointA?: Vec3;
  pointB?: Vec3;
  vectors?: { name: string; coords: Vec3; color: string }[];
  answer: Vec3;
  answerLabel: string;
  solutionSteps: string[];
}

export interface SavedPreset {
  id: string;
  title: string;
  description: string;
  mode: AppMode;
  singleSubMode?: SingleSubMode;
  additionRule?: AdditionRule;
  singleVector?: VectorEntry;
  pointA?: Vec3;
  pointB?: Vec3;
  twoU?: Vec3;
  twoV?: Vec3;
  multiVectors?: VectorEntry[];
  isBuiltin?: boolean;
}
