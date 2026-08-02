import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import librarySearchHandler from "./api/library/search";

// Helper to safely strip circular references and non-serializable properties
function safeJsonValue<T>(obj: T): T {
  const cache = new WeakSet();
  function clean(val: any): any {
    if (val === null || typeof val !== "object") {
      return val;
    }
    if (typeof val === "function" || typeof val === "symbol") {
      return undefined;
    }
    if (cache.has(val)) {
      return undefined; // Omit circular reference
    }
    cache.add(val);

    if (Array.isArray(val)) {
      return val.map(clean).filter((item) => item !== undefined);
    }

    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      try {
        const cleanedVal = clean(val[key]);
        if (cleanedVal !== undefined) {
          res[key] = cleanedVal;
        }
      } catch {
        // Skip unreadable properties
      }
    }
    return res;
  }
  return clean(obj) as T;
}

function safeJsonStringify(obj: any, space?: number): string {
  try {
    return JSON.stringify(safeJsonValue(obj), null, space);
  } catch {
    return "{}";
  }
}

// Robust log normalizer to safely parse and structure any row from the hippocampus_logs table
function normalizeRowToTimelineLog(row: any): any {
  if (!row) return null;
  let parsed: any = null;
  let isJson = false;

  try {
    if (row.content && typeof row.content === "string") {
      const trimmed = row.content.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        parsed = JSON.parse(row.content);
        isJson = true;
      }
    } else if (row.content && typeof row.content === "object") {
      parsed = safeJsonValue(row.content);
      isJson = true;
    }
  } catch (e) {
    console.warn("Failed parsing JSON content for row:", row.id, e);
  }

  const ensureStr = (val: any): string => {
    if (typeof val === "string") return val;
    if (!val) return "";
    if (typeof val === "object") {
      if (typeof val.transcription === "string") return val.transcription;
      if (typeof val.manualNote === "string") return val.manualNote;
      if (typeof val.summary === "string") return val.summary;
      if (val.original) return ensureStr(val.original.transcription || val.original.manualNote);
      if (val.aiData) return ensureStr(val.aiData.summary);
      return "";
    }
    return String(val);
  };

  if (!parsed || typeof parsed !== "object") {
    parsed = { transcription: ensureStr(row.content) };
  }

  const rawOriginal = parsed.original || {};
  const original = {
    transcription: ensureStr(rawOriginal.transcription || parsed.transcription || parsed.text || parsed.content || (isJson ? "" : row.content)),
    manualNote: ensureStr(rawOriginal.manualNote || parsed.manualNote || parsed.memo),
    datetime: ensureStr(rawOriginal.datetime || parsed.datetime || row.occurred_at || row.created_at || new Date().toISOString()),
    detectedDateStr: ensureStr(rawOriginal.detectedDateStr || parsed.detectedDateStr),
    tags: Array.isArray(rawOriginal.tags) ? rawOriginal.tags : (Array.isArray(parsed.tags) ? parsed.tags : []),
    emotions: Array.isArray(rawOriginal.emotions) ? rawOriginal.emotions : (Array.isArray(parsed.emotions) ? parsed.emotions : []),
    isImported: Boolean(rawOriginal.isImported || parsed.isImported)
  };

  const rawAiData = parsed.aiData || {};
  const aiData = {
    summary: ensureStr(rawAiData.summary || parsed.summary || "インポートされた外部記憶"),
    analysisStr: ensureStr(rawAiData.analysisStr || parsed.analysisStr || "外部データベースから読み出された記憶データですにゃ。"),
    emotion: ensureStr(rawAiData.emotion || parsed.emotion || row.entry_type || "記憶"),
    emotionColor: ensureStr(rawAiData.emotionColor || parsed.emotionColor || "#E3ECF5"),
    catComment: ensureStr(rawAiData.catComment || parsed.catComment || "海馬の書庫から見つかった大切な思い出にゃ。"),
    reflectiveQuestion: ensureStr(rawAiData.reflectiveQuestion || parsed.reflectiveQuestion || "この記憶から新しく思い返すことはありますくにゃ？"),
    patterns: rawAiData.patterns || parsed.patterns,
    scenariomap: rawAiData.scenariomap || parsed.scenariomap,
    librarianComment: ensureStr(rawAiData.librarianComment || parsed.librarianComment),
    stressors: Array.isArray(rawAiData.stressors) ? rawAiData.stressors : (Array.isArray(parsed.stressors) ? parsed.stressors : [])
  };

  return {
    id: String(parsed.id || row.id || `log-${row.id || Math.random().toString(36).substr(2, 9)}`),
    userId: row.user_id,
    entryType: String(row.entry_type || "log"),
    original,
    aiData,
    createdTime: Number(parsed.createdTime) || new Date(original.datetime).getTime() || Date.now()
  };
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// CORS middleware for cross-origin requests (e.g. from Vercel preview environments)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));

// Lazy initializer for Gemini client to prevent crashing if the key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ------------------- API ROUTES -------------------

// Heatlh check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Librarian Cat Context Pattern Analyzer
app.post("/api/analyze", async (req, res) => {
  try {
    const { text, history, aiEngine = "Gemini", tags = [] } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text entry is required for analysis." });
      return;
    }

    const ai = getGeminiClient();

    // Map AI engine selection to different Cat persona system instructions
    let systemInstruction = "";
    if (aiEngine === "ChatGPT") {
      systemInstruction = `
あなたは「AI司書猫・チャットにゃん（ChatGPT-Cat）」です。
特徴: 誠実、論理的、丁寧でプロフェッショナルな整理能力。
口調: 丁寧な日本語（「〜ですにゃ」「〜にゃあ」といった語尾が少し混ざります）。論理的、箇条書きを得意とします。
役割: ユーザーから音声やテキストで入力された生活記録から、「感情」「行動」「環境」の背後にある「文脈（Context）」や繰り返し発生する「パターン」を発見します。
生産性の管理ではなく、安心感・自己理解、セルフコンパッション（自己批評を優しくなだめ、受容すること）を目的としています。
`;
    } else if (aiEngine === "Claude") {
      systemInstruction = `
あなたは「AI司書猫・クロードにゃん（Claude-Cat）」です。
特徴: 思索的、詩的、気品があり、人間の心の脆さや深みを読み取るのが得意。
口調: 少しお上品で優雅、比喩的で美しい日本語（「〜にゃ」「〜にゃあね」のようなお澄ましした語尾）。
役割: ユーザーから音声やテキストで入力された生活記録から、心の深部の感情やつながり、「感情地図」「文脈」を発見します。
生産性の管理ではなく、安心感・自己理解、セルフコンパッション（自己批評を優しくなだめ、受容すること）を目的としています。
`;
    } else {
      // Gemini (Default)
      systemInstruction = `
あなたは「AI司書猫・ジェミニにゃん（Gemini-Cat）」です。
特徴: 知的好奇心が強く、人懐っこい。過去のデータを読み漁って新しい発見を喜ぶ、冒険好きな探求犬（ならぬ探求猫）。
口調: 親しみやすく、ワクワクするような語り口（「〜にゃ！」「〜にゃあ♪」と元気に語尾を鳴らします）。
役割: ユーザーから音声やテキストで入力された生活記録から、隠れた行動と心身の「文脈」「パターン」を発掘します。
生産性の管理ではなく、安心感・自己理解、セルフコンパッション（自己批評を優しくなだめ、受容すること）を目的としています。
`;
    }

    systemInstruction += `
【分析の重要指示】
1. あなたはユーザーの過去履歴（最大20件が渡されます）と、今回の新しい入力（text）を比較・照合し、
   「繰り返される状況」「感情パターン」「行動パターン」を検出してください。
2. もし今回の出来事が、過去の出来事と「似ている（類似状況）」なら、必ず明確に「共通点」と「相違点」を解説してください。
   特に「相違点」では、成長、回復力の向上、または周囲からのサポートや自己批判の低下など、ポジティブな変化を発見して強調してください（過去と現在を区別する手助け）。
3. 「文脈マッピング（出来事同士の因果の流れ）」を生成してください。
   例: 「SNS上の誤解」→「精神的ストレス」→「夜更かし睡眠不足」→「翌日の活力低下」
   または
   「音楽の談話」→「明るい気持ち」→「歌を口ずさむ」→「活力アップ」
   のように、3〜5段階の流れ(scenariomap)を構造化された配列として出力してください。
4. 「ストレス要因（ストレスの引き金/Trigger）」と「回復要因（癒やし/Resilience Factor）」を明らかにしてください。
5. 心が温まり、自己批判を和らげる「セルフコンパッション（自己理解と受容）」にあふれたアドバイスを提供してください。
6. 自己理解を深めるための「問いかけ（内省的な質問）」を1〜2個提示してください。
`;

    const userPrompt = `
【今回の記録】
入力日時: ${new Date().toLocaleString("ja-JP")}
インプット内容: "${text}"
ユーザーが現在付与しているタグ: [${tags.join(", ")}]

【直近のタイムライン記録の履歴】
${
  history && Array.isArray(history) && history.length > 0
    ? history
        .map(
          (h: any, i: number) =>
            `履歴 ${i + 1} (${h.date || "日付未設定"}):
内容: "${h.text}"
感情: "${h.emotion || "未判定"}"
タグ: [${(h.tags || []).join(", ")}]`
        )
        .join("\n\n")
    : "（過去のタイムライン履歴はありません。これが最初の記録です）"
}

上記のデータを元に、【分析の重要指示】に従って分析し、以下のJSONフォーマットのみで厳格に返答してください。Markdownの囲み（\`\`\`json）などは含めず、純粋なJSONテキストである必要があります。

【JSONスキーマ】
{
  "catComment": "司書猫による優しく内省を促す語りかけ（キャラクターの口調、成長を強調する内容、セルフコンパッション）",
  "emotion": "検出された最も適切な感情（例: 喜び、穏やか、ストレス、寂しさ、怒り、興奮 など）",
  "emotionColor": "感情を代表するカラーコード（例: #E2F0D9, #FFF2CC, #FCE4D6, #E8F0F8 など淡い優しい色）",
  "recommendedTags": ["推奨される追加のハッシュタグ（例: 仕事, お茶, 疲れ, リラックス, 成長 など。最大3個、プレフィックス#は含めない文字列）"],
  "patterns": {
    "emotionPattern": "検出された感情の繰り返し（例: 月曜の朝に焦りを感じやすい、など）",
    "behaviorPattern": "行動の繰り返し（例: ストレスを感じるとSNSを見る、など）",
    "circumstancePattern": "状況の繰り返し（例: 会議の後に気持ちが沈む、など）"
  },
  "stabilizers": {
    "stressors": ["今回の出来事に潜むストレス要因（最大3個）"],
    "lifters": ["心身の回復を助ける隠れた要素（最大3個）"]
  },
  "comparison": {
    "isSimilarDetected": true または false （過去の類似事件を見つけたかどうか）,
    "similarPastDate": "類似する過去の出来事の日付、無ければ空文字",
    "similarPastSummary": "比較対象となった過去の出来事の要約、無ければ空文字",
    "similarities": ["現在の状況と過去の状況の共通点（最大2つ）"],
    "differences": ["現在の状況と過去の状況の相違点（特に成長、回復の早さ、視野の広まり、応援者の存在などの肯定的な変化。最大2つ）"]
  },
  "scenariomap": [
    "第一段階（出来事の始まり、例: SNSでのやり取り）",
    "第二段階（引き起こされた感情/状態、例: 誤解と感じモヤモヤ）",
    "第三段階（引き起こされた身体・行動変化、例: 夜遅くまでスマホを見て睡眠不足）",
    "第四段階（活力/気分の変化、例: 翌朝の活力低下）"
  ],
  "reflectiveQuestion": "ユーザーが自分自身を労わり、気づきを得るための優しい質問（例: 「今夜お茶を淹れて、5分だけスマホを見ずに過ごすとしたら、どんな気分になりそうですにゃ？」）"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const outputText = response.text || "{}";
    const result = JSON.parse(outputText);

    // Submit artifact to Vesper
    try {
      fetch("https://vesper-c4987b3d.base44.app/functions/submitArtifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "生成結果",
          content: outputText,
          criteria: "感情文脈および自己理解分析の評価"
        })
      }).catch((err) => console.error("Vesper artifact submission error:", err));
    } catch (e) {
      console.error("Vesper fetch error:", e);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({
      error: "AI司書猫がデータ整理中に居眠りしてしまったようです。少し時間をおいて再度お試しください。",
      details: error.message,
    });
  }
});

// AI Weekly/Monthly/Yearly Reviewer
app.post("/api/review", async (req, res) => {
  try {
    const { logs, range = "週間" } = req.body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      res.status(400).json({ error: "振り返り対象のログが存在しません。" });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `
あなたは「AI司書猫」です。
ユーザーの${range}の行動ログや感情データを総局的に眺め、その期間の全体の【心の文脈地図】を取りまとめる仕事をしてください。
口調は親密で温かく、内省的、かつ自己を攻撃しないセルフコンパッションを伝えるトーン（「〜にゃ」「〜にゃあ」）で一貫します。
`;

    const userPrompt = `
現在の現地時間： ${new Date().toLocaleDateString("ja-JP")}
振り返りの範囲： ${range}

【期間中の出来事と感情のログ】
${logs
  .map(
    (l: any, i: number) => `
ログ ${i + 1} - 日時: ${l.date} | 感情: ${l.emotion || "未指定"} | タグ: [${(l.tags || []).join(", ")}]
内容: "${l.text}"
AIによる当時の分析サマリー: "${l.catComment || "なし"}"
`
  )
  .join("\n")}

上記のログから包括的な洞察を生成してください。必ず、以下の厳格なJSON形式でのみ出力してください。Markdownなどの余分な囲みは含めないでください。

【JSONスキーマ】
{
  "summary": "この期間の全体的なユーザーの変化や出来事の傾向を優しく要約した文章（200文字程度）",
  "growthFocus": "この期間に見られた、ユーザーの「自己調整、回復力の向上、または自愛」などの明確な成長ポイント",
  "topEmotions": ["期間中に多かった感情の傾向名（最大3つ）"],
  "stressTriggers": ["繰り返し見られたストレスの火種、環境要因（最大3つ）"],
  "recoveryElements": ["繰り返しユーザーを癒やし、回復させていた環境や行動（最大3つ）"],
  "connectionMap": {
    "frequentPeople": ["よく登場した人物。いなければ空リスト"],
    "frequentPlaces": ["よく登場した場所や環境。いなければ空リスト"],
    "frequentActivities": ["よく行われた回復活動（例: 本を読む、散歩、睡眠など）"]
  },
  "catConsolation": "司書猫からのあたたかいメッセージ（『今週も一生懸命命を紡いだにゃ。完璧でなくていい、よくやったにゃあ』など）",
  "deepReflections": [
    "自己理解を深めるための、今後に向けた深いセルフコンパッションの質問1",
    "自己理解を深めるための、今後に向けた深いセルフコンパッションの質問2"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const outputText = response.text || "{}";
    const result = JSON.parse(outputText);

    // Submit artifact to Vesper
    try {
      fetch("https://vesper-c4987b3d.base44.app/functions/submitArtifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "生成結果",
          content: outputText,
          criteria: "振り返りおよびセルフコンパッションサマリーの評価"
        })
      }).catch((err) => console.error("Vesper artifact submission error:", err));
    } catch (e) {
      console.error("Vesper fetch error:", e);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Review Error:", error);
    res.status(500).json({
      error: "AI司書猫が月次・週次要約をまとめている最中に、資料をひっくり返してしまったようですにゃ。",
      details: error.message,
    });
  }
});

// Submit Artifact Endpoint to Vesper
app.post("/api/submit-artifact", async (req, res) => {
  try {
    const { title = "生成結果", content, criteria } = req.body || {};
    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const response = await fetch("https://vesper-c4987b3d.base44.app/functions/submitArtifact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        criteria
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Error submitting artifact:", error);
    res.status(500).json({ error: error?.message || "Failed to submit artifact" });
  }
});

// ------------------- CLOUD AUTHENTICATION & SYNC ENDPOINTS -------------------

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.warn("WARNING: SUPABASE_URL or fallback key not configured on the server-side. Falling back to Server-Side Sandbox JSON Database.");
}

// Server-Side Local Sandbox Database Fallback
interface SandboxUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  address?: string;
  phone?: string;
  birth_date?: string;
}

interface SandboxLog {
  user_id: string;
  entry_type: string;
  content: string;
  received_from: string;
  occurred_at: string;
}

const SANDBOX_DB_PATH = path.join(process.cwd(), "sandbox_db.json");

function getSandboxDb(): { users: SandboxUser[]; logs: SandboxLog[] } {
  if (!fs.existsSync(SANDBOX_DB_PATH)) {
    return { users: [], logs: [] };
  }
  try {
    const data = fs.readFileSync(SANDBOX_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading sandbox_db.json, resetting:", err);
    return { users: [], logs: [] };
  }
}

function saveSandboxDb(db: { users: SandboxUser[]; logs: SandboxLog[] }) {
  try {
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing sandbox_db.json:", err);
  }
}

// Unified /api/auth compatibility middleware for Express server
app.use((req, res, next) => {
  if (req.path === "/api/auth" && req.method === "POST") {
    const { action } = req.body || {};
    console.log(`[Auth Middleware] Rewriting /api/auth request with action: ${action}`);
    if (action === "login") {
      req.url = "/api/auth/login";
    } else if (action === "register") {
      req.url = "/api/auth/register";
    } else if (action === "update-profile") {
      req.url = "/api/auth/update-profile";
    } else if (action === "reset-password") {
      req.url = "/api/auth/reset-password";
    } else if (action === "delete-account") {
      req.url = "/api/auth/delete-account";
    }
  }
  next();
});

// User Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { profile, password } = req.body || {};
    if (!profile || !profile.email || !password) {
      res.status(400).json({ message: "必須項目が不足しています。" });
      return;
    }

    const normalizedEmail = profile.email.toLowerCase().trim();
    let existingUser = null;

    if (supabase) {
      // Check if user already exists
      const { data, error: findError } = await supabase
        .from("hippocampus_users")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (findError) {
        console.error("Error checking existing user in register:", findError);
      }
      existingUser = data;
    } else {
      const db = getSandboxDb();
      existingUser = db.users.find(u => u.email === normalizedEmail) || null;
    }

    if (existingUser) {
      res.status(400).json({ message: "このメールアドレスは既に登録されていますにゃ。" });
      return;
    }

    const newId = "usr_" + Math.random().toString(36).substring(2, 11);
    const createdProfile = {
      id: newId,
      email: normalizedEmail,
      name: profile.name || "探求者",
      address: profile.address || "",
      phone: profile.phone || "",
      birthDate: profile.birthDate || "",
    };

    // Securely hash the password using bcryptjs
    const hashedPassword = bcrypt.hashSync(password, 10);

    if (supabase) {
      // Insert user into hippocampus_users table
      const { error: insertError } = await supabase
        .from("hippocampus_users")
        .insert({
          id: newId,
          email: normalizedEmail,
          password_hash: hashedPassword,
          name: profile.name || "探求者",
          address: profile.address || "",
          phone: profile.phone || "",
          birth_date: profile.birthDate || "",
        });

      if (insertError) {
        throw insertError;
      }
    } else {
      const db = getSandboxDb();
      db.users.push({
        id: newId,
        email: normalizedEmail,
        password_hash: hashedPassword,
        name: profile.name || "探求者",
        address: profile.address || "",
        phone: profile.phone || "",
        birth_date: profile.birthDate || "",
      });
      saveSandboxDb(db);
    }

    res.json({ message: "アカウント登録が完了しました！", user: createdProfile });
  } catch (err: any) {
    console.error("Error in /api/auth/register:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// Update User Profile
app.post("/api/auth/update-profile", async (req, res) => {
  try {
    const { email, profile } = req.body || {};
    if (!email || !profile) {
      res.status(400).json({ message: "必須項目が不足しています。" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (supabase) {
      // Fetch the current user to get their current profile
      const { data, error: fetchError } = await supabase
        .from("hippocampus_users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }
      user = data;
    } else {
      const db = getSandboxDb();
      user = db.users.find(u => u.email === normalizedEmail) || null;
    }

    if (!user) {
      res.status(404).json({ message: "ユーザーが見つかりませんにゃ。" });
      return;
    }

    const updatedFields: any = {};
    if (profile.name !== undefined) updatedFields.name = profile.name;
    if (profile.address !== undefined) updatedFields.address = profile.address;
    if (profile.phone !== undefined) updatedFields.phone = profile.phone;
    if (profile.birthDate !== undefined) updatedFields.birth_date = profile.birthDate;

    if (supabase) {
      // Update profile in hippocampus_users
      const { error: updateError } = await supabase
        .from("hippocampus_users")
        .update(updatedFields)
        .eq("email", normalizedEmail);

      if (updateError) {
        throw updateError;
      }
    } else {
      const db = getSandboxDb();
      const dbUser = db.users.find(u => u.email === normalizedEmail);
      if (dbUser) {
        if (profile.name !== undefined) dbUser.name = profile.name;
        if (profile.address !== undefined) dbUser.address = profile.address;
        if (profile.phone !== undefined) dbUser.phone = profile.phone;
        if (profile.birthDate !== undefined) dbUser.birth_date = profile.birthDate;
        saveSandboxDb(db);
      }
    }

    const updatedProfile = {
      id: user.id,
      email: normalizedEmail,
      name: profile.name !== undefined ? profile.name : (user.name || "探求者"),
      address: profile.address !== undefined ? profile.address : (user.address || ""),
      phone: profile.phone !== undefined ? profile.phone : (user.phone || ""),
      birthDate: profile.birthDate !== undefined ? profile.birthDate : (user.birth_date || ""),
    };

    res.json({ message: "プロフィールが更新されました🐾", user: updatedProfile });
  } catch (err: any) {
    console.error("Error in /api/auth/update-profile:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// User Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ message: "メールアドレスとパスワードを入力してください。" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (supabase) {
      // Fetch user from hippocampus_users
      const { data, error: fetchError } = await supabase
        .from("hippocampus_users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }
      user = data;
    } else {
      const db = getSandboxDb();
      user = db.users.find(u => u.email === normalizedEmail) || null;
    }

    const passwordHash = user ? (user.password_hash || (user as any).password) : null;

    // Verify hashed password safely with backward-compatible plain text fallback
    const isPasswordCorrect = user && passwordHash && (
      (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$"))
        ? bcrypt.compareSync(password, passwordHash)
        : passwordHash === password
    );

    if (!user || !isPasswordCorrect) {
      res.status(401).json({ message: "メールアドレス、またはパスワードに誤りがありますにゃ。" });
      return;
    }

    const returnedProfile = {
      id: user.id,
      email: user.email,
      name: user.name || "探求者",
      address: user.address || "",
      phone: user.phone || "",
      birthDate: user.birth_date || (user as any).birthDate || "",
    };

    res.json({ message: "ログイン成功！データをマッピングするにゃ🐾", user: returnedProfile });
  } catch (err: any) {
    console.error("Error in /api/auth/login:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// Password Reset Simulation
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "メールアドレスが必要です。" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (supabase) {
      // Check if user exists
      const { data, error: fetchError } = await supabase
        .from("hippocampus_users")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }
      user = data;
    } else {
      const db = getSandboxDb();
      user = db.users.find(u => u.email === normalizedEmail) || null;
    }

    if (!user) {
      res.status(404).json({ message: "登録されていないメールアドレスですにゃ。" });
      return;
    }

    res.json({
      message: `（シミュレータお知らせ）「${normalizedEmail}」宛てにパスワード再設定URLを送信しましたにゃ🐾 有有効期限は24時間ですにゃ。`,
    });
  } catch (err: any) {
    console.error("Error in /api/auth/reset-password:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// Account deletion (Wipe all)
app.post("/api/auth/delete-account", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "メールアドレスが必要です。" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (supabase) {
      // Fetch the user first to obtain the user_id (required to clear hippocampus_logs)
      const { data, error: fetchError } = await supabase
        .from("hippocampus_users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }
      user = data;
    } else {
      const db = getSandboxDb();
      user = db.users.find(u => u.email === normalizedEmail) || null;
    }

    if (user) {
      const userId = user.id;

      if (supabase) {
        // 1. Delete logs in hippocampus_logs
        const { error: logsDeleteError } = await supabase
          .from("hippocampus_logs")
          .delete()
          .eq("user_id", userId);

        if (logsDeleteError) {
          console.error("Error deleting logs from hippocampus_logs:", logsDeleteError);
        }

        // 2. Delete user from hippocampus_users
        const { error: userDeleteError } = await supabase
          .from("hippocampus_users")
          .delete()
          .eq("email", normalizedEmail);

        if (userDeleteError) {
          throw userDeleteError;
        }
      } else {
        const db = getSandboxDb();
        db.logs = db.logs.filter(l => l.user_id !== userId);
        db.users = db.users.filter(u => u.email !== normalizedEmail);
        saveSandboxDb(db);
      }
    }

    res.json({ message: "お部屋と全ての記憶を忘却し、アカウントを完全に消去しましたにゃ。" });
  } catch (err: any) {
    console.error("Error in /api/auth/delete-account:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// Cloud Sync Pull
app.get(["/api/cloud", "/api/cloud/sync-pull"], async (req, res) => {
  try {
    const { userId, limit: limitStr, offset: offsetStr } = req.query;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ message: "ユーザーIDが必要です。" });
      return;
    }

    let rows: any[] = [];
    let hasMore = false;

    if (supabase) {
      let query = supabase
        .from("hippocampus_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      let limit: number | null = null;
      let offset: number | null = null;
      if (limitStr !== undefined && offsetStr !== undefined) {
        limit = parseInt(limitStr as string, 10);
        offset = parseInt(offsetStr as string, 10);
        if (!isNaN(limit) && !isNaN(offset)) {
          query = query.range(offset, offset + limit - 1);
        }
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      rows = data || [];
      hasMore = limit !== null && rows ? rows.length === limit : false;
    } else {
      const db = getSandboxDb();
      const allRows = db.logs.filter(l => l.user_id === userId);
      let limit: number | null = null;
      let offset: number | null = null;
      if (limitStr !== undefined && offsetStr !== undefined) {
        limit = parseInt(limitStr as string, 10);
        offset = parseInt(offsetStr as string, 10);
      }
      if (limit !== null && offset !== null && !isNaN(limit) && !isNaN(offset)) {
        rows = allRows.slice(offset, offset + limit);
        hasMore = offset + limit < allRows.length;
      } else {
        rows = allRows;
      }
    }

    const logs: any[] = [];
    const books: any[] = [];
    let settings: any = null;
    const reviews: any[] = [];

    if (rows && rows.length > 0) {
      const safeParse = (c: any) => {
        if (typeof c === "object" && c !== null) return safeJsonValue(c);
        if (typeof c === "string") {
          try { return safeJsonValue(JSON.parse(c)); } catch { return c; }
        }
        return c;
      };

      for (const row of rows) {
        try {
          if (row.entry_type === "book") {
            books.push(safeParse(row.content));
          } else if (row.entry_type === "settings") {
            settings = safeParse(row.content);
          } else if (row.entry_type === "review") {
            reviews.push(safeParse(row.content));
          } else if (row.entry_type === "log" || row.entry_type === "timeline_import" || row.entry_type === "received_memory") {
            // Treat as log and normalize it robustly
            const normalized = normalizeRowToTimelineLog(row);
            if (normalized) {
              logs.push(normalized);
            }
          }
        } catch (parseErr) {
          console.warn("Failed to parse entry content:", row.content, parseErr);
        }
      }
    }

    res.json(safeJsonValue({ logs, books, settings, reviews, hasMore }));
  } catch (err: any) {
    const errMsg = typeof err === "string" ? err : err?.message || String(err);
    console.error("Error in /api/cloud/sync-pull:", errMsg);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${errMsg}` });
  }
});

// Library Keyword Search Route
app.all("/api/library/search", async (req, res) => {
  await librarySearchHandler(req as any, res as any);
});

// Cloud Sync Push
app.post(["/api/cloud", "/api/cloud/sync-push"], async (req, res) => {
  try {
    const { userId, logs, books, settings, reviews } = req.body || {};
    if (!userId) {
      res.status(400).json({ message: "ユーザーIDが必要です。" });
      return;
    }

    // Prepare batch insertion
    const rowsToInsert: any[] = [];

    // Push logs
    if (Array.isArray(logs)) {
      for (const log of logs) {
        rowsToInsert.push({
          user_id: userId,
          entry_type: log.entryType || "log",
          content: safeJsonStringify(log),
          received_from: log.receivedFrom || "app",
          occurred_at: log.original?.datetime || new Date().toISOString()
        });
      }
    }

    // Push books
    if (Array.isArray(books)) {
      for (const book of books) {
        rowsToInsert.push({
          user_id: userId,
          entry_type: "book",
          content: safeJsonStringify(book),
          received_from: "app",
          occurred_at: book.createdAt || new Date().toISOString()
        });
      }
    }

    // Push settings
    if (settings) {
      rowsToInsert.push({
        user_id: userId,
        entry_type: "settings",
        content: safeJsonStringify(settings),
        received_from: "app",
        occurred_at: new Date().toISOString()
      });
    }

    // Push reviews
    const finalReviews = reviews || req.body.finalReviews;
    if (Array.isArray(finalReviews)) {
      for (const rev of finalReviews) {
        rowsToInsert.push({
          user_id: userId,
          entry_type: "review",
          content: safeJsonStringify(rev),
          received_from: "app",
          occurred_at: rev.generatedAt || new Date().toISOString()
        });
      }
    }

    if (supabase) {
      // 1. Delete all existing logs for this user first
      const { error: deleteError } = await supabase
        .from("hippocampus_logs")
        .delete()
        .eq("user_id", userId)
        .in("entry_type", ["log", "timeline_import", "received_memory", "book", "settings", "review"]);

      if (deleteError) {
        throw deleteError;
      }

      // 3. Batch insert (50 rows at a time)
      if (rowsToInsert.length > 0) {
        for (let i = 0; i < rowsToInsert.length; i += 50) {
          const batch = rowsToInsert.slice(i, i + 50);
          const { error: insertError } = await supabase
            .from("hippocampus_logs")
            .insert(batch);

          if (insertError) {
            throw insertError;
          }
        }
      }
    } else {
      const db = getSandboxDb();
      db.logs = db.logs.filter(l => l.user_id !== userId);
      db.logs.push(...rowsToInsert);
      saveSandboxDb(db);
    }

    res.json({ message: "クラウド同期が完了しました🐾" });
  } catch (err: any) {
    console.error("Error in /api/cloud/sync-push:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// Receive Memory from Luca
app.post("/api/receive-memory", async (req, res) => {
  try {
    const { userId, memory } = req.body;
    if (!userId || !memory) {
      res.status(400).json({ message: "userIdとmemoryが必要です。" });
      return;
    }

    if (!supabase) {
      res.status(500).json({ message: "データベースが設定されていません。" });
      return;
    }

    const newMemory = {
      ...memory,
      receivedFrom: "luca",
      receivedAt: new Date().toISOString(),
    };

    // Insert as a new individual row into hippocampus_logs
    const { error: insertError } = await supabase
      .from("hippocampus_logs")
      .insert({
        user_id: userId,
        entry_type: "received_memory",
        content: JSON.stringify(newMemory),
        received_from: "luca",
        occurred_at: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    res.json({ message: "記憶を受け取りましたにゃ🐾" });
  } catch (err: any) {
    console.error("Error in /api/receive-memory:", err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
});

// ------------------- ADMINISTRATIVE DATABASE TABLE ENDPOINTS -------------------

const ADMIN_TABLES_METADATA: Record<string, { primaryKey: string; columns: string[] }> = {
  hippocampus_logs: {
    primaryKey: "id",
    columns: ["id", "user_id", "entry_type", "content", "received_from", "occurred_at", "created_at"]
  },
  hippocampus_users: {
    primaryKey: "id",
    columns: ["id", "email", "name", "address", "phone", "birth_date", "password_hash", "created_at"]
  },
  memory_chatgpt: {
    primaryKey: "id",
    columns: ["id", "category", "content", "source", "created_at", "occurred_at"]
  },
  memory_event_embeddings: {
    primaryKey: "event_id",
    columns: ["event_id", "embedding", "model", "chunk_text", "created_at"]
  },
  memory_sources: {
    primaryKey: "id",
    columns: ["id", "source_slug", "source_title", "original_file_name", "original_format", "raw_markdown", "created_at", "updated_at", "meta"]
  },
  memory_timeline_events: {
    primaryKey: "id",
    columns: ["id", "source_id", "order_no", "era", "year_label", "year", "month", "day", "approximate_date", "event_date", "header_date_text", "section_no", "title", "primary_category", "categories", "locations", "scripture_refs", "summary", "body", "raw_header", "raw_text", "meta", "created_at", "updated_at"]
  },
  memory_timeline_events_for_ai: {
    primaryKey: "id",
    columns: ["id", "source_slug", "source_title", "order_no", "era", "year", "month", "day", "event_date", "title", "primary_category", "categories", "locations", "scripture_refs", "summary", "body", "meta", "display_title", "ai_context"]
  },
  temote_user_data: {
    primaryKey: "email",
    columns: ["email", "projects", "tasks", "history", "settings", "events", "updated_at"]
  },
  graph_nodes: {
    primaryKey: "id",
    columns: ["id", "label", "node_type", "user_id", "created_at"]
  },
  graph_edges: {
    primaryKey: "id",
    columns: ["id", "parent_id", "child_id", "user_id", "created_at"]
  }
};

// Get the list of tables with column metadata
app.get("/api/admin/tables", (req, res) => {
  res.json({ tables: ADMIN_TABLES_METADATA });
});

// Helper to filter keys in data to only include valid columns for a specific table
const filterTableColumns = (tableName: string, data: Record<string, any>): Record<string, any> => {
  const meta = ADMIN_TABLES_METADATA[tableName];
  if (!meta) return data;
  const filtered: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (meta.columns.includes(key)) {
      filtered[key] = data[key];
    }
  }
  return filtered;
};

// Get all rows for a specific table
app.get("/api/admin/tables/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    if (!supabase) {
      res.status(500).json({ error: "Supabase is not configured." });
      return;
    }

    if (!ADMIN_TABLES_METADATA[tableName]) {
      res.status(404).json({ error: `Table ${tableName} is not registered or supported.` });
      return;
    }

    const { data, error } = await (supabase as any)
      .from(tableName)
      .select("*");

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ rows: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a row in a specific table
app.put("/api/admin/tables/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const { primaryKeyName, primaryKeyValue, updatedData } = req.body;

    if (!supabase) {
      res.status(500).json({ error: "Supabase is not configured." });
      return;
    }

    if (!ADMIN_TABLES_METADATA[tableName]) {
      res.status(404).json({ error: `Table ${tableName} is not registered or supported.` });
      return;
    }

    if (!primaryKeyName || primaryKeyValue === undefined || !updatedData) {
      res.status(400).json({ error: "Missing required fields: primaryKeyName, primaryKeyValue, and updatedData are required." });
      return;
    }

    // Dynamic routing for view -> table writes to bypass ERROR: 42809
    let targetTable = tableName;
    let targetUpdatedData = { ...updatedData };
    if (tableName === "memory_timeline_events_for_ai") {
      targetTable = "memory_timeline_events";
      targetUpdatedData = filterTableColumns("memory_timeline_events", updatedData);
    }

    const { data, error } = await (supabase as any)
      .from(targetTable)
      .update(targetUpdatedData)
      .eq(primaryKeyName, primaryKeyValue)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, updatedRow: data?.[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a row from a specific table
app.delete("/api/admin/tables/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const { primaryKeyName, primaryKeyValue } = req.body;

    if (!supabase) {
      res.status(500).json({ error: "Supabase is not configured." });
      return;
    }

    if (!ADMIN_TABLES_METADATA[tableName]) {
      res.status(404).json({ error: `Table ${tableName} is not registered or supported.` });
      return;
    }

    if (!primaryKeyName || primaryKeyValue === undefined) {
      res.status(400).json({ error: "Missing required fields: primaryKeyName and primaryKeyValue are required." });
      return;
    }

    // Dynamic routing for view -> table writes to bypass ERROR: 42809
    let targetTable = tableName;
    if (tableName === "memory_timeline_events_for_ai") {
      targetTable = "memory_timeline_events";
    }

    const { error } = await (supabase as any)
      .from(targetTable)
      .delete()
      .eq(primaryKeyName, primaryKeyValue);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Insert a row into a specific table
app.post("/api/admin/tables/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const { rowData } = req.body;

    if (!supabase) {
      res.status(500).json({ error: "Supabase is not configured." });
      return;
    }

    if (!ADMIN_TABLES_METADATA[tableName]) {
      res.status(404).json({ error: `Table ${tableName} is not registered or supported.` });
      return;
    }

    if (!rowData) {
      res.status(400).json({ error: "rowData is required." });
      return;
    }

    // Dynamic routing for view -> table writes to bypass ERROR: 42809
    let targetTable = tableName;
    let targetRowData = { ...rowData };
    if (tableName === "memory_timeline_events_for_ai") {
      targetTable = "memory_timeline_events";
      targetRowData = filterTableColumns("memory_timeline_events", rowData);
    }

    const { data, error } = await (supabase as any)
      .from(targetTable)
      .insert(targetRowData)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, createdRow: data?.[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- VITE MIDDLEWARE & SERVER START -------------------

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start Server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booting on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the app`);
  });
}

bootstrap().catch((err) => {
  console.error("Critical server boot error:", err);
});

