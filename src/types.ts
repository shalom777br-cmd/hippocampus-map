export type AiEngineType = "Gemini" | "ChatGPT" | "Claude";

export interface PatternsSummary {
  emotionPattern?: string;
  behaviorPattern?: string;
  circumstancePattern?: string;
}

export interface StabilizersData {
  stressors: string[];
  lifters: string[];
}

export interface PastComparison {
  isSimilarDetected: boolean;
  similarPastDate?: string;
  similarPastSummary?: string;
  similarities?: string[];
  differences?: string[];
}

// Separate User Original Data (原本) and AI Generated Data (AI編集版)
export interface OriginalData {
  voiceDuration?: number; // duration in seconds if recorded, or 0/undefined
  transcription: string;  // voice text
  manualNote: string;     // manual handwritten memo
  datetime: string;       // ISO timestamp
  tags: string[];         // user added tags
  emotions?: string[];    // user selected emotions (from the 46 categories)
  detectedDateStr?: string; // raw user-defined/detected date representation (e.g. "2026年5月")
  isImported?: boolean;   // imported memory flag
}

export interface AiGeneratedData {
  summary: string;             // 要約
  analysisStr: string;         // 分析内容
  patterns?: PatternsSummary;  // パターン発見
  emotion: string;             // 感情名
  emotionColor: string;        // 感情色コード
  catComment: string;          // 司書猫コメント
  reflectiveQuestion?: string; // 司書猫からの問いかけ
  scenariomap?: string[];      // 脳内文脈マップ / カウンセリングフロー
}

export interface TimelineLog {
  id: string;
  userId?: string;                     // for Supabase synchronization
  original: OriginalData;              // 原本データ
  aiData?: AiGeneratedData;            // AI生成データ (いつでも再生成可能な設計)
  createdTime: number;                 // created timestamp
  isAnalyzing?: boolean;               // is currently analyzing in background
}

// Librarian NPC Settings
export interface AppSettings {
  aiEngine: AiEngineType;
  userName: string;
  catNpcName: string;
  themeMode: "light" | "warm" | "night";
  isVoiceActive: boolean;
  showLibrarianCat?: boolean; // toggle Librarian Cat component visible
}

// User Profile Registration Details
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  address: string;
  phone: string;
  birthDate: string;
}

// Bound books model (製本機能)
export interface BoundBook {
  id: string;
  userId?: string;
  title: string;          // 書名 (e.g. "2026年5月号", "『2026年の記録』")
  type: "weekly" | "monthly" | "yearly" | "life"; // シリーズ
  periodCode: string;     // "2026-05" or "2026" or "life"
  theme: string;          // 自動テーマ抽出 (e.g. "歌声が戻ってきた5月")
  catComment: string;     // 司書猫コメント
  createdAt: string;
  logCount: number;       // Bound contents count
  logIds: string[];       // References to logs
}

// Cat announcement notifications (お知らせ)
export interface CatAnnouncement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

// Periodic overall mental reviews (定期要約インサイト)
export interface ReviewResult {
  id: string;
  range: "週間" | "月間" | "年間";
  generatedAt: string;
  summary: string;
  growthFocus: string;
  topEmotions: string[];
  stressTriggers: string[];
  recoveryElements: string[];
  connectionMap?: {
    frequentPeople?: string[];
    frequentPlaces?: string[];
    frequentActivities?: string[];
  };
  catConsolation?: string;
  deepReflections?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  user_id?: string;
  created_at?: string;
}

export interface GraphEdge {
  id: string;
  parent_id: string;
  child_id: string;
  user_id?: string;
  created_at?: string;
}

