import { TimelineLog, AppSettings, ReviewResult, BoundBook, OriginalData, AiGeneratedData, CatAnnouncement } from "../types";
import JSZip from "jszip";

const STORAGE_KEY_LOGS = "hippocampus_logs_v2";
const STORAGE_KEY_SETTINGS = "hippocampus_settings_v2";
const STORAGE_KEY_REVIEWS = "hippocampus_reviews_v2";
const STORAGE_KEY_BOOKS = "hippocampus_books_v2";
const STORAGE_KEY_ANNOUNCEMENTS = "hippocampus_announcements_v2";

export const DEFAULT_SETTINGS: AppSettings = {
  aiEngine: "Gemini",
  userName: "探求者",
  catNpcName: "ノア",
  themeMode: "light",
  isVoiceActive: true,
  showLibrarianCat: true,
};

// Initial preset state logs with raw/AI split
export const INITIAL_LOGS: TimelineLog[] = [
  {
    id: "init-1",
    original: {
      transcription: "朝から晴れていて気持ちよかった。公園を少し歩いてから、好きな音楽を聴いた、久しぶりに心が穏やかになった気がするにゃ。",
      manualNote: "近所の緑道で紫陽花がきれいに咲いていた。散歩をして体温が少し上がった気がする。",
      datetime: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString(), // 3 days ago
      tags: ["プライベート", "自然", "音楽", "散歩"]
    },
    aiData: {
      summary: "朝の晴れ間に、公園の散歩と音楽鑑賞を行い、心身の緊張をゆるめた経緯。",
      analysisStr: "自然光を浴びながらの歩行運動と、お気に入りのサウンドトラックが、神経細胞の落ち着きとセルフラブの再活性を促していますにゃ。",
      emotion: "穏やか",
      emotionColor: "#E2F0D9",
      catComment: "静かな光と音楽に包まれて、こころの縮こまりがゆるんでいく音が聞こえたにゃ。たまにはこうして自分だけのペースで、世界を感じる時間が必要にゃあ♪",
      reflectiveQuestion: "お散歩から帰ってきたとき、体にどんな温かさが残っていたか思い出せるにゃ？",
      patterns: {
        emotionPattern: "朝、自然を主体とした場所に移動すると心が整いやすいにゃ。",
        behaviorPattern: "散歩と音楽をお持ち帰りラテがセットで発生しているにゃ。",
        circumstancePattern: "デジタル機器を置いて物理世界に目を向けることで癒やされている様子にゃ。"
      },
      scenariomap: [
        "晴れた朝陽のもとでのお散歩",
        "軽快なアコースティック音楽を再生",
        "カフェでのカフェラテ購入",
        "心がいっぱいの落ち着きになる"
      ]
    },
    createdTime: Date.now() - 24 * 60 * 60 * 1000 * 3
  },
  {
    id: "init-2",
    original: {
      transcription: "SNSの投稿で仕事のやり取りを見て、なぜか自分が誤解されているような気がしてモヤモヤ、心がザワザワして夜遅くまで携帯を触り、眠りが浅かったにゃ。",
      manualNote: "夜11時過ぎまでインスタとTwitterを無意識に周回していた。首が凝って頭痛気味になり、余計焦った。",
      datetime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      tags: ["仕事", "SNS", "夜ふかし"]
    },
    aiData: {
      summary: "他人の仕事上の文面を見て、取り残される不安が芽生え、スマホを周回して夜更かしに陥ったプロセス。",
      analysisStr: "未確定な文字表現に対して、脳が『私は歓迎されていないのでは』という幻影を創出。セルフコンパッションを適用し、他者のやり取りと自身の安全を区別する必要がありますにゃ。",
      emotion: "ストレス",
      emotionColor: "#FCE4D6",
      catComment: "SNS上の文字は、時に実物以上の怪物に見えて刺さるものにゃ。モヤモヤはあなたを攻撃するためでなく、単に『傷つきたくないにゃ』と心が身構えている防衛反応にゃ…、まずは深く息を吐くにゃ。",
      reflectiveQuestion: "その『不快な感覚』は、本当に今ここに存在する真実にゃ？それとも、疲れたあなたの脳が見せた蜃気楼かにゃ？",
      patterns: {
        emotionPattern: "他者評価や比較を感じると過緊張トリガーがオンになりがちにゃ。",
        behaviorPattern: "モヤモヤするとスマホを握りしめたままベッドに入ってしまう傾向にゃ。",
        circumstancePattern: "デジタル周回の時間が睡眠時間を圧迫してしまうにゃ。"
      },
      scenariomap: [
        "オンライン上の文字を目視",
        "私だけが失敗するのではと焦燥",
        "睡眠不足と目の疲れが発生",
        "翌朝の目覚めに重さを覚える"
      ]
    },
    createdTime: Date.now() - 24 * 60 * 60 * 1000
  }
];

function getStorageKey(baseKey: string, userId?: string): string {
  if (userId) {
    return `user_${userId}_${baseKey}`;
  }
  return `guest_${baseKey}`;
}

// --- STORAGE FOR LOGS ---
export function getLogs(userId?: string): TimelineLog[] {
  try {
    const key = getStorageKey(STORAGE_KEY_LOGS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LOGS;
  }
}

export function saveLogs(logs: TimelineLog[], userId?: string): void {
  try {
    const key = getStorageKey(STORAGE_KEY_LOGS, userId);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.error("Failed to save logs to localStorage", err);
  }
}

// --- STORAGE FOR SETTINGS ---
export function getSettings(userId?: string): AppSettings {
  try {
    const key = getStorageKey(STORAGE_KEY_SETTINGS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings, userId?: string): void {
  try {
    const key = getStorageKey(STORAGE_KEY_SETTINGS, userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save settings to localStorage", err);
  }
}

// --- STORAGE FOR REVIEWS ---
export function getReviews(userId?: string): ReviewResult[] {
  try {
    const key = getStorageKey(STORAGE_KEY_REVIEWS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReviews(reviews: ReviewResult[], userId?: string): void {
  try {
    const key = getStorageKey(STORAGE_KEY_REVIEWS, userId);
    localStorage.setItem(key, JSON.stringify(reviews));
  } catch (err) {
    console.error("Failed to save reviews to localStorage", err);
  }
}

// --- STORAGE FOR BOUND BOOKS ---
export function getBooks(userId?: string): BoundBook[] {
  try {
    const key = getStorageKey(STORAGE_KEY_BOOKS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveBooks(books: BoundBook[], userId?: string): void {
  try {
    const key = getStorageKey(STORAGE_KEY_BOOKS, userId);
    localStorage.setItem(key, JSON.stringify(books));
  } catch (err) {
    console.error("Failed to save books to localStorage", err);
  }
}

// --- STORAGE FOR ANNOUNCEMENTS ---
export function getAnnouncements(userId?: string): CatAnnouncement[] {
  try {
    const key = getStorageKey(STORAGE_KEY_ANNOUNCEMENTS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // populate with nice default welcome announcement!
      const defaults = [
        {
          id: "ann-welcome",
          title: "司書長ノアよりお祝い",
          message: "当お部屋へようこそにゃ！私はあなたの脳内記憶を美しく並べる司書猫にゃ。嬉しいことも、モヤモヤしたつぶやきも、マイクボタンから優しく吹き込んでにゃ🐾",
          createdAt: new Date().toISOString(),
          isRead: false
        }
      ];
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAnnouncements(announcements: any[], userId?: string): void {
  try {
    const key = getStorageKey(STORAGE_KEY_ANNOUNCEMENTS, userId);
    localStorage.setItem(key, JSON.stringify(announcements));
  } catch (err) {
    console.error("Failed to save announcements", err);
  }
}

// Custom data query and format exporters catering to different user choices:
// choices: 'raw_only' | 'plus_ai' | 'ai_only' | 'full_backup'
export function generateJSONExport(logs: TimelineLog[], mode: string, userId?: string): string {
  const filteredLogs = logs.map((log) => {
    if (mode === "raw_only") {
      return { id: log.id, original: log.original, createdTime: log.createdTime };
    }
    if (mode === "ai_only") {
      return { id: log.id, aiData: log.aiData, createdTime: log.createdTime };
    }
    return log; // plus_ai or full_backup
  });

  const payload: any = {
    logs: filteredLogs,
    exportedAt: new Date().toISOString(),
    exportMode: mode,
    appSignature: "Hippocampus Map Library"
  };

  if (mode === "full_backup") {
    payload.settings = getSettings(userId);
    payload.books = getBooks(userId);
    payload.reviews = getReviews(userId);
  }

  return JSON.stringify(payload, null, 2);
}

export function generateCSVExport(logs: TimelineLog[], mode: string): string {
  const headers = ["ID", "記録日付", "文字起こしデータ", "手入力メモ", "感情タグ", "感情", "感情色", "要約", "パターン発見", "司書コメント"];
  
  const rows = logs.map((log) => {
    const orig = log.original;
    const ai = log.aiData;

    const includeRaw = mode !== "ai_only";
    const includeAi = mode !== "raw_only";

    return [
      log.id,
      orig.datetime,
      includeRaw ? (orig.transcription || "").replace(/"/g, '""') : "",
      includeRaw ? (orig.manualNote || "").replace(/"/g, '""') : "",
      includeRaw ? (orig.tags || []).join(";") : "",
      includeAi ? (ai?.emotion || "") : "",
      includeAi ? (ai?.emotionColor || "") : "",
      includeAi ? (ai?.summary || "").replace(/"/g, '""') : "",
      includeAi ? `感情重複: ${ai?.patterns?.emotionPattern}; 行動: ${ai?.patterns?.behaviorPattern}` : "",
      includeAi ? (ai?.catComment || "").replace(/"/g, '""') : ""
    ];
  });

  const content = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${v}"`).join(","))
  ].join("\n");

  return content;
}

export function generateMarkdownExport(logs: TimelineLog[], mode: string): string {
  let md = `# 脳内図書館 (Hippocampus Map) 自己対話データ\n`;
  md += `出力日: ${new Date().toLocaleDateString("ja-JP")} | モード: ${mode}\n\n`;
  md += `---\n\n`;

  logs.forEach((log) => {
    const orig = log.original;
    const ai = log.aiData;

    md += `## 📅 記録時刻: ${new Date(orig.datetime).toLocaleString("ja-JP")}\n\n`;
    
    if (mode !== "ai_only") {
      md += `### 🎤 原本データ\n`;
      md += `**音声認識文字起こし:**\n> ${orig.transcription || "なし"}\n\n`;
      if (orig.manualNote) {
        md += `**手入力メモ:**\n* ${orig.manualNote}\n\n`;
      }
      md += `**本人のタグ付け:** ${orig.tags.map(t => `#${t}`).join(" ")}\n\n`;
    }

    if (mode !== "raw_only" && ai) {
      md += `### 🤖 AI司書ノア編集版\n`;
      md += `* **抽出感情:** ${ai.emotion} ${ai.emotionColor ? `(色: ${ai.emotionColor})` : ""}\n`;
      md += `* **要約:** ${ai.summary}\n`;
      md += `* **分析解説:** ${ai.analysisStr}\n`;
      if (ai.patterns) {
        md += `* **生活パターン発見:**\n`;
        if (ai.patterns.emotionPattern) md += `  - 感情: ${ai.patterns.emotionPattern}\n`;
        if (ai.patterns.behaviorPattern) md += `  - 行動: ${ai.patterns.behaviorPattern}\n`;
        if (ai.patterns.circumstancePattern) md += `  - 環境: ${ai.patterns.circumstancePattern}\n`;
      }
      md += `\n> **🐱 司書長のコンパッションレター:**\n> ${ai.catComment}\n\n`;
      
      if (ai.reflectiveQuestion) {
        md += `*司書猫からの安らぎの問いかけ: "${ai.reflectiveQuestion}"*\n\n`;
      }
    }

    md += `---\n\n`;
  });

  return md;
}

export function generateRawTextExport(logs: TimelineLog[], mode: string): string {
  let txt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += ` 脳内図書館 (Hippocampus Map) テキストエクスポート - ${mode}\n`;
  txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  logs.forEach((log) => {
    const orig = log.original;
    const ai = log.aiData;

    txt += `[日付: ${new Date(orig.datetime).toLocaleString("ja-JP")}]\n`;
    
    if (mode !== "ai_only") {
      txt += `◆ 原本・文字起こし:\n${orig.transcription || "音声なし"}\n`;
      if (orig.manualNote) {
        txt += `◆ 自著手書き追記:\n${orig.manualNote}\n`;
      }
      txt += `◆ タグ: ${orig.tags.map(t => `#${t}`).join(", ")}\n`;
    }

    if (mode !== "raw_only" && ai) {
      txt += `◇ AI要約: ${ai.summary}\n`;
      txt += `◇ 心象感情: ${ai.emotion}\n`;
      txt += `◇ 司書猫コメント:\n${ai.catComment}\n`;
      if (ai.reflectiveQuestion) {
        txt += `◇ 司書長からの質問: ${ai.reflectiveQuestion}\n`;
      }
    }

    txt += `--------------------------------------------------------\n\n`;
  });

  return txt;
}

// Generate ZIP package of all selected types
export async function generateZipExportBlob(logs: TimelineLog[], mode: string): Promise<Blob> {
  const zip = new JSZip();

  zip.file("hippocampus_journal.json", generateJSONExport(logs, mode));
  zip.file("hippocampus_timeline.csv", generateCSVExport(logs, mode));
  zip.file("hippocampus_reading.md", generateMarkdownExport(logs, mode));
  zip.file("hippocampus_simple.txt", generateRawTextExport(logs, mode));

  const readme = `脳内図書館 (Hippocampus Map) 完全保存用ZIPパッケージ
===================================================
出力日時: ${new Date().toLocaleString("ja-JP")}
出力制限モード: ${mode}

このZIP内には、あなたが選択した条件 (${mode}) でフォーマットされた
JSON, CSV, Markdown, テキストデータがすべて一括封入されています。
Notion, Obsidian, Excel、その他あらゆる環境へ移植してご自身を振り返りいただけます。

あなたの人生の軌跡は、100%あなたのものです。安心して使い切ってくださいにゃ🐾`;

  zip.file("README.txt", readme);
  return await zip.generateAsync({ type: "blob" });
}

// Import restoring
export function importSyncPayload(jsonString: string, userId?: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.logs) {
      return { success: false, message: "無効なバックアップファイルフォーマットですにゃ。" };
    }

    // save safely
    localStorage.setItem(getStorageKey(STORAGE_KEY_LOGS, userId), JSON.stringify(parsed.logs));
    
    if (parsed.settings) {
      localStorage.setItem(getStorageKey(STORAGE_KEY_SETTINGS, userId), JSON.stringify(parsed.settings));
    }
    if (parsed.books) {
      localStorage.setItem(getStorageKey(STORAGE_KEY_BOOKS, userId), JSON.stringify(parsed.books));
    }
    if (parsed.reviews) {
      localStorage.setItem(getStorageKey(STORAGE_KEY_REVIEWS, userId), JSON.stringify(parsed.reviews));
    }

    return { success: true, message: "インポート・データの安全同期が完了したにゃあ！お部屋が復元されたにゃ🐾" };
  } catch (err: any) {
    return { success: false, message: "データの解析に失敗しました。ファイルが壊れている可能性があるにゃ。" };
  }
}

// Flexible raw text log parser for simple imports (e.g. date & contents)
function findDateMatches(text: string): { index: number; length: number; date: Date; dateStr: string }[] {
  const matches: { index: number; length: number; date: Date; dateStr: string }[] = [];
  
  // 1. Japanese format with colon/JP time: 2024年3月2日12:58, 2024年3月2日 12:58, 2024年3月2日12時58分
  const p1 = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(\d{1,2})\s*[:：時]\s*(\d{1,2})\s*分?/g;
  let m;
  while ((m = p1.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const h = parseInt(m[4], 10);
    const min = parseInt(m[5], 10);
    const date = new Date(y, month, d, h, min, 0);
    if (!isNaN(date.getTime())) {
      matches.push({ index: m.index, length: m[0].length, date, dateStr: m[0] });
    }
  }

  // 2. Standard with space + colon time: 2024/03/02 12:58, 2024-3-2 12:58:00
  const p2 = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?/g;
  while ((m = p2.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const h = parseInt(m[4], 10);
    const min = parseInt(m[5], 10);
    const s = m[6] ? parseInt(m[6], 10) : 0;
    const date = new Date(y, month, d, h, min, s);
    if (!isNaN(date.getTime())) {
      matches.push({ index: m.index, length: m[0].length, date, dateStr: m[0] });
    }
  }

  // 3. Bracketed style with either of the above inside: e.g. [2024/03/02 12:58]
  const p3 = /\[(?:日付:\s*)?(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?\]/g;
  while ((m = p3.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const h = m[4] ? parseInt(m[4], 10) : 12;
    const min = m[5] ? parseInt(m[5], 10) : 0;
    const s = m[6] ? parseInt(m[6], 10) : 0;
    const date = new Date(y, month, d, h, min, s);
    if (!isNaN(date.getTime())) {
      matches.push({ index: m.index, length: m[0].length, date, dateStr: m[0] });
    }
  }

  // 4. Japanese format date only (2024年3月2日)
  const p4 = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = p4.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const date = new Date(y, month, d, 12, 0, 0);
    if (!isNaN(date.getTime())) {
      matches.push({ index: m.index, length: m[0].length, date, dateStr: m[0] });
    }
  }

  // 5. Regular date only (2024/03/02, 2024-3-2)
  const p5 = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g;
  while ((m = p5.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const date = new Date(y, month, d, 12, 0, 0);
    if (!isNaN(date.getTime())) {
      matches.push({ index: m.index, length: m[0].length, date, dateStr: m[0] });
    }
  }

  // Overlap resolution
  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.length - a.length;
  });

  const filtered: typeof matches = [];
  let lastEnd = -1;
  for (const match of matches) {
    if (match.index >= lastEnd) {
      filtered.push(match);
      lastEnd = match.index + match.length;
    }
  }

  return filtered;
}

export function parseRawTextImport(rawText: string): TimelineLog[] {
  const importedLogs: TimelineLog[] = [];
  const now = new Date();

  // 1. Check if this is the rich multiline export format containing separator delimiters or structural tags
  const isExportBlockFormat = rawText.includes("◆ 原本") || rawText.includes("◆ 自著") || rawText.includes("[日付:");

  if (isExportBlockFormat) {
    const blocks = rawText.split(/(?:----+|━+|━━+)/g);
    
    blocks.forEach((block, index) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock || trimmedBlock.includes("脳内図書館") || trimmedBlock.includes("テキストエクスポート")) return;

      let extractedDate: Date | null = null;
      let detectedDateStr: string | undefined = undefined;

      // Extract bracketed date e.g. [日付: 2026/06/20 10:30:00] or [2026/06/20 10:30:00]
      const dateMatch = trimmedBlock.match(/\[(?:日付:\s*)?([^\]\n]+)\]/);
      if (dateMatch) {
        const dateVal = dateMatch[1].trim();
        const parsed = Date.parse(dateVal.replace(/年/g, "/").replace(/月/g, "/").replace(/日/g, ""));
        if (!isNaN(parsed)) {
          extractedDate = new Date(parsed);
          detectedDateStr = dateVal;
        } else {
          // Standard JS Date constructor fallback
          const standardParsed = Date.parse(dateVal);
          if (!isNaN(standardParsed)) {
            extractedDate = new Date(standardParsed);
            detectedDateStr = dateVal;
          }
        }
      }

      // If no bracketed matches found, fallback to inline regex
      if (!extractedDate) {
        const inlineMatch = trimmedBlock.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (inlineMatch) {
          const y = parseInt(inlineMatch[1], 10);
          const m = parseInt(inlineMatch[2], 10) - 1;
          const d = parseInt(inlineMatch[3], 10);
          const hh = inlineMatch[4] ? parseInt(inlineMatch[4], 10) : 12;
          const mm = inlineMatch[5] ? parseInt(inlineMatch[5], 10) : 0;
          const ss = inlineMatch[6] ? parseInt(inlineMatch[6], 10) : 0;
          const parsedDate = new Date(y, m, d, hh, mm, ss);
          if (!isNaN(parsedDate.getTime())) {
            extractedDate = parsedDate;
            detectedDateStr = inlineMatch[0];
          }
        }
      }

      // Transcription text body extraction
      let transcription = "";
      const transMatch = trimmedBlock.match(/◆\s*原本・文字起こし:\s*\n?([\s\S]*?)(?=(?:◆|◇|\[日付:|$))/i);
      if (transMatch) {
        transcription = transMatch[1].trim();
      } else {
        // Fallback clean extraction
        transcription = trimmedBlock
          .replace(/\[(?:日付:\s*)?[^\]]+\]/g, "")
          .replace(/◆\s*原本・文字起こし:\s*/gi, "")
          .replace(/◆\s*自著手書き追記:[\s\S]*/gi, "")
          .replace(/◆\s*タグ:\s*[^\n]*/gi, "")
          .replace(/◇\s*[^\n]*/g, "")
          .trim();
      }

      // Manual handwritten annotation extraction
      let manualNote = "";
      const noteMatch = trimmedBlock.match(/◆\s*自著手書き追記:\s*\n?([\s\S]*?)(?=(?:◆|◇|\[日付:|$))/i);
      if (noteMatch) {
        manualNote = noteMatch[1].trim();
      }

      // Tags parsing
      const tags: string[] = [];
      const tagsMatch = trimmedBlock.match(/◆\s*タグ:\s*([^\n]+)/i);
      if (tagsMatch) {
        const tagParts = tagsMatch[1].split(/[,，、\s]+/);
        tagParts.forEach(t => {
          const cleanT = t.trim().replace(/^#/, "");
          if (cleanT) tags.push(cleanT);
        });
      }

      // Extract active direct hashtags from text body too
      const hashTagRegexp = /#([^\s#]+)/g;
      let hashMatch;
      while ((hashMatch = hashTagRegexp.exec(transcription)) !== null) {
        if (hashMatch[1]) {
          const cleanHash = hashMatch[1].trim();
          if (!tags.includes(cleanHash)) {
            tags.push(cleanHash);
          }
        }
      }

      // Preserve existing AI summaries where possible
      let summary = "インポートされた簡易記憶";
      let comment = "簡易テキストからのインポートに成功したにゃ！";
      
      const summaryMatch = trimmedBlock.match(/◇\s*AI要約:\s*([^\n]+)/i);
      if (summaryMatch) summary = summaryMatch[1].trim();

      const commentMatch = trimmedBlock.match(/◇\s*司書猫コメント:\s*\n?([\s\S]*?)(?=(?:◇|◆|------|$))/i);
      if (commentMatch) comment = commentMatch[1].trim();

      if (!transcription && !manualNote) return;

      const finalDate = extractedDate || new Date(now.getTime() - index * 60 * 1000);

      const log: TimelineLog = {
        id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + "_" + index,
        createdTime: finalDate.getTime(),
        original: {
          transcription: transcription || "音声なし",
          manualNote: manualNote,
          tags: tags,
          datetime: finalDate.toISOString(),
          detectedDateStr: detectedDateStr,
          isImported: true
        },
        aiData: {
          summary: summary,
          analysisStr: "テキストやメモから直接搬入された簡易的な記憶原本です。AI編集版レポートを楽しみたい場合は「再生成」ボタンをクリックしてにゃ🐾",
          emotion: "穏やか",
          emotionColor: "#FAF9F5",
          catComment: comment,
          reflectiveQuestion: "この時のあなたの本音は何だったにゃ？"
        }
      };

      importedLogs.push(log);
    });

    if (importedLogs.length > 0) {
      return importedLogs;
    }
  }

  // 2. Default is our unified smart line-by-line & sticky-date parser
  const lines = rawText.split("\n");
  let stickyDate: Date | null = null;
  let stickyDateStr: string | undefined = undefined;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      // blank line clears the sticky date context so a subsequent item doesn't get grouped unless intended
      stickyDate = null;
      stickyDateStr = undefined;
      return;
    }

    if (trimmed.startsWith("━━") || trimmed.startsWith("---") || trimmed.includes("テキストエクスポート")) {
      return;
    }

    let parsedLine = trimmed;
    // Strip leading decoration markers, list bullets, checkboxes
    parsedLine = parsedLine.replace(/^[#\s\*_\-\+\>\\\/\[\]【】●🐾★◆◇＝=]+/g, "").trim();
    parsedLine = parsedLine.replace(/[*_\-\+\>🐾★◆◇＝=]+$/g, "").trim();

    let extractedDate: Date | null = null;
    let detectedDateStr: string | undefined = undefined;

    const tryParseDate = (str: string, referenceDate: Date): { date: Date, label: string, matchedLength: number } | null => {
      const targetStr = str.trim();
      if (!targetStr) return null;

      // Match format: YYYY/MM/DD, YYYY-MM-DD, YYYY年MM月DD日
      const matchA = targetStr.match(/^(\d{4})(?:[-/年.]|年\s*の\s*)(\d{1,2})(?:[-/月.]|月\s*の\s*|月)(\d{1,2})[日]?(?:の)?/);
      if (matchA) {
        const y = parseInt(matchA[1], 10);
        const m = parseInt(matchA[2], 10) - 1;
        const d = parseInt(matchA[3], 10);

        let hh = 12, mm = 0, ss = 0;
        let hasTime = false;
        let matchedTimeLength = 0;
        let ampmLabel = "";
        let hourLabel = "";
        let minLabel = "";

        let remaining = targetStr.substring(matchA[0].length);
        let prefixOffset = 0;
        const skipBracketMatch = remaining.match(/^(?:[\s,、]*)[(（\[]/);
        if (skipBracketMatch) {
          prefixOffset = skipBracketMatch[0].length;
          remaining = remaining.substring(prefixOffset);
        }

        const timeMatch = remaining.match(/^(午前|午後)?\s*(\d{1,2})\s*[:時]\s*(?:(\d{1,2})\s*[分]?)?/);
        if (timeMatch) {
          const ampm = timeMatch[1];
          const rawHour = parseInt(timeMatch[2], 10);
          const rawMin = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

          if (ampm === "午前") {
            hh = (rawHour === 12) ? 0 : rawHour;
          } else if (ampm === "午後") {
            hh = (rawHour === 12) ? 12 : rawHour + 12;
          } else {
            hh = rawHour;
          }
          mm = rawMin;
          hasTime = true;
          
          let tempRemaining = remaining.substring(timeMatch[0].length);
          const skipEndMatch = tempRemaining.match(/^(?:頃|ごろ|分|半)?(?:[)）\]\s\t,、]*)/);
          const endLength = skipEndMatch ? skipEndMatch[0].length : 0;
          matchedTimeLength = prefixOffset + timeMatch[0].length + endLength;
          
          ampmLabel = ampm || "";
          hourLabel = `${rawHour}時`;
          minLabel = timeMatch[3] ? `${rawMin}分` : "";
        }

        const parsedDate = new Date(y, m, d, hh, mm, ss);
        if (!isNaN(parsedDate.getTime())) {
          const label = hasTime
            ? `${y}年${m + 1}月${d}日${ampmLabel}${hourLabel}${minLabel}`
            : `${y}年${m + 1}月${d}日`;
          return { date: parsedDate, label, matchedLength: matchA[0].length + matchedTimeLength };
        }
      }

      // Match format: YYYY/MM, YYYY-MM, YYYY年MM月
      const matchB = targetStr.match(/^(\d{4})(?:[-/年.]|年\s*の\s*)(\d{1,2})[月]?(?:の)?/);
      if (matchB) {
        const y = parseInt(matchB[1], 10);
        const m = parseInt(matchB[2], 10) - 1;
        const parsedDate = new Date(y, m, 1, 12, 0, 0);
        if (!isNaN(parsedDate.getTime())) {
          const label = `${y}年${m + 1}月`;
          return { date: parsedDate, label, matchedLength: matchB[0].length };
        }
      }

      // Match format: YYYY年
      const matchC = targetStr.match(/^(\d{4})年(?:の)?/);
      if (matchC) {
        const y = parseInt(matchC[1], 10);
        const parsedDate = new Date(y, 0, 1, 12, 0, 0);
        if (!isNaN(parsedDate.getTime())) {
          const label = `${y}年`;
          return { date: parsedDate, label, matchedLength: matchC[0].length };
        }
      }

      // Match format: MM/DD, MM-DD, MM月DD日
      const matchD = targetStr.match(/^(\d{1,2})[-/月.](\d{1,2})[日]?(?:の)?/);
      if (matchD) {
        const y = referenceDate.getFullYear();
        const m = parseInt(matchD[1], 10) - 1;
        const d = parseInt(matchD[2], 10);

        let hh = 12, mm = 0, ss = 0;
        let hasTime = false;
        let matchedTimeLength = 0;
        let ampmLabel = "";
        let hourLabel = "";
        let minLabel = "";

        let remaining = targetStr.substring(matchD[0].length);
        let prefixOffset = 0;
        const skipBracketMatch = remaining.match(/^(?:[\s,、]*)[(（\[]/);
        if (skipBracketMatch) {
          prefixOffset = skipBracketMatch[0].length;
          remaining = remaining.substring(prefixOffset);
        }

        const timeMatch = remaining.match(/^(午前|午後)?\s*(\d{1,2})\s*[:時]\s*(?:(\d{1,2})\s*[分]?)?/);
        if (timeMatch) {
          const ampm = timeMatch[1];
          const rawHour = parseInt(timeMatch[2], 10);
          const rawMin = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

          if (ampm === "午前") {
            hh = (rawHour === 12) ? 0 : rawHour;
          } else if (ampm === "午後") {
            hh = (rawHour === 12) ? 12 : rawHour + 12;
          } else {
            hh = rawHour;
          }
          mm = rawMin;
          hasTime = true;
          
          let tempRemaining = remaining.substring(timeMatch[0].length);
          const skipEndMatch = tempRemaining.match(/^(?:頃|ごろ|分|半)?(?:[)）\]\s\t,、]*)/);
          const endLength = skipEndMatch ? skipEndMatch[0].length : 0;
          matchedTimeLength = prefixOffset + timeMatch[0].length + endLength;
          
          ampmLabel = ampm || "";
          hourLabel = `${rawHour}時`;
          minLabel = timeMatch[3] ? `${rawMin}分` : "";
        }

        const parsedDate = new Date(y, m, d, hh, mm, ss);
        if (!isNaN(parsedDate.getTime())) {
          const label = hasTime
            ? `${y}年${m + 1}月${d}日${ampmLabel}${hourLabel}${minLabel}`
            : `${y}年${m + 1}月${d}日`;
          return { date: parsedDate, label, matchedLength: matchD[0].length + matchedTimeLength };
        }
      }

      return null;
    };

    // Support Japanese relative words at the start of line (今日, 昨日, 一昨日, xx日前, 1週間前)
    const checkRelativeDate = (textLine: string): { date: Date, label: string, matchedLength: number } | null => {
      const matchRel = textLine.match(/^(一昨日|昨日|今日|1週間前|(\d+)日前)\s*(?:の)?/);
      if (matchRel) {
        const word = matchRel[1];
        const label = word;
        const targetDate = new Date(now);
        targetDate.setHours(12, 0, 0, 0);

        if (word === "今日") {
          // keeps today's date
        } else if (word === "昨日") {
          targetDate.setDate(targetDate.getDate() - 1);
        } else if (word === "一昨日") {
          targetDate.setDate(targetDate.getDate() - 2);
        } else if (word === "1週間前") {
          targetDate.setDate(targetDate.getDate() - 7);
        } else if (matchRel[2]) {
          const daysAgo = parseInt(matchRel[2], 10);
          targetDate.setDate(targetDate.getDate() - daysAgo);
        }
        return { date: targetDate, label, matchedLength: matchRel[0].length };
      }
      return null;
    };

    // 1. Bracketed dates
    const bracketMatch = parsedLine.match(/^\[([^\]]+)\]/);
    if (bracketMatch) {
      const dateInBrackets = bracketMatch[1].trim();
      let matched = false;

      const bracketParsed = tryParseDate(dateInBrackets, now);
      if (bracketParsed) {
        extractedDate = bracketParsed.date;
        detectedDateStr = bracketParsed.label;
        parsedLine = parsedLine.substring(bracketMatch[0].length).trim();
        matched = true;
      }

      if (!matched) {
        const yearOnlyMatch = dateInBrackets.match(/^(\d{4})[年]?$/);
        if (yearOnlyMatch) {
          const y = parseInt(yearOnlyMatch[1], 10);
          const parsedDate = new Date(y, 0, 1, 12, 0, 0);
          if (!isNaN(parsedDate.getTime())) {
            extractedDate = parsedDate;
            detectedDateStr = `${y}年`;
            parsedLine = parsedLine.substring(bracketMatch[0].length).trim();
            matched = true;
          }
        }
      }
    }

    parsedLine = parsedLine.replace(/^[◆◇]\s+[^:]+:\s*/, "");

    // 2. Head of line matched date
    if (!extractedDate) {
      const relativeParsed = checkRelativeDate(parsedLine);
      if (relativeParsed) {
        extractedDate = relativeParsed.date;
        detectedDateStr = relativeParsed.label;
        parsedLine = parsedLine.substring(relativeParsed.matchedLength).trim();
      } else {
        const lineParsed = tryParseDate(parsedLine, now);
        if (lineParsed) {
          extractedDate = lineParsed.date;
          detectedDateStr = lineParsed.label;
          parsedLine = parsedLine.substring(lineParsed.matchedLength).trim();
        }
      }
    }

    // 3. Flexible inline date search anywhere inside the string
    if (!extractedDate) {
      const inlineDateMatch = parsedLine.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (inlineDateMatch) {
        const y = parseInt(inlineDateMatch[1], 10);
        const m = parseInt(inlineDateMatch[2], 10) - 1;
        const d = parseInt(inlineDateMatch[3], 10);
        const hh = inlineDateMatch[4] ? parseInt(inlineDateMatch[4], 10) : 12;
        const mm = inlineDateMatch[5] ? parseInt(inlineDateMatch[5], 10) : 0;
        const ss = inlineDateMatch[6] ? parseInt(inlineDateMatch[6], 10) : 0;
        const parsedDate = new Date(y, m, d, hh, mm, ss);
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate;
          detectedDateStr = inlineDateMatch[0];
        }
      } else {
        const inlineJpDateMatch = parsedLine.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*(\d{1,2})時(?:(\d{1,2})分)?)?/);
        if (inlineJpDateMatch) {
          const y = parseInt(inlineJpDateMatch[1], 10);
          const m = parseInt(inlineJpDateMatch[2], 10) - 1;
          const d = parseInt(inlineJpDateMatch[3], 10);
          const hh = inlineJpDateMatch[4] ? parseInt(inlineJpDateMatch[4], 10) : 12;
          const mm = inlineJpDateMatch[5] ? parseInt(inlineJpDateMatch[5], 10) : 0;
          const parsedDate = new Date(y, m, d, hh, mm, 0);
          if (!isNaN(parsedDate.getTime())) {
            extractedDate = parsedDate;
            detectedDateStr = inlineJpDateMatch[0];
          }
        }
      }
    }

    // Extract tags
    const tags: string[] = [];
    const hashTagRegexp = /#([^\s#]+)/g;
    let tagMatch;
    while ((tagMatch = hashTagRegexp.exec(parsedLine)) !== null) {
      if (tagMatch[1]) {
        tags.push(tagMatch[1].trim());
      }
    }

    // Clean inline hashtags out
    let cleanedTranscription = parsedLine.replace(/#[^\s#]+/g, "").trim();
    cleanedTranscription = cleanedTranscription.replace(/^[:：\-\s\t]+/, "").trim();

    // If the line has an extracted date/relative date label but no actual content,
    // establish it as the sticky date context for subsequent lines
    if (extractedDate && !cleanedTranscription) {
      stickyDate = extractedDate;
      stickyDateStr = detectedDateStr;
      return;
    }

    if (!cleanedTranscription) return;

    // Determine finalized date using extractions, sticky date or absolute fallback
    let logDate = extractedDate;
    let logDateStr = detectedDateStr;

    if (!logDate && stickyDate) {
      // Offset slightly to main consecutive order for items on the same Sticky Date
      logDate = new Date(stickyDate.getTime() + index * 1000);
      logDateStr = stickyDateStr;
    }

    const finalDate = logDate || new Date(now.getTime() - index * 60 * 1000);

    const log: TimelineLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + "_" + index,
      createdTime: finalDate.getTime(),
      original: {
        transcription: cleanedTranscription,
        manualNote: "",
        tags: tags,
        datetime: finalDate.toISOString(),
        detectedDateStr: logDateStr,
        isImported: true
      },
      aiData: {
        summary: "インポートされた簡易記憶",
        analysisStr: "テキストやメモから直接搬入された簡易的な記憶原本です。AI編集版レポートを楽しみたい場合は「再生成」ボタンをクリックしてにゃ🐾",
        emotion: "穏やか",
        emotionColor: "#FAF9F5",
        catComment: "簡易テキストからのインポートに成功したにゃ！このカードの右上にある『編集』や、展開後の『再生成 🔄』を押せば、いつでも最新のAIコメントや要約を上書き再編できるよ🐾",
        reflectiveQuestion: "この時のあなたの本音は何だったにゃ？"
      }
    };

    importedLogs.push(log);
  });

  return importedLogs;
}
