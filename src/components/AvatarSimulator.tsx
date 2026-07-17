import React, { useState, useEffect, useRef } from "react";
import {
  Smile,
  Shield,
  Activity,
  Zap,
  Frown,
  Moon,
  Flame,
  Music,
  Utensils,
  Footprints,
  MessageSquare,
  Sparkles,
  RefreshCw,
  TrendingUp,
  BookOpen,
  Info,
  Calendar,
  Layers,
  HelpCircle,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { TimelineLog, AppSettings, ReviewResult } from "../types";

interface AvatarSimulatorProps {
  logs: TimelineLog[];
  reviews: ReviewResult[];
  onAddManualLog?: (text: string, emotionTag: string, customPayload?: any) => void;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

interface AvatarStates {
  safety: number;     // 安心感
  stress: number;     // ストレス
  vitality: number;   // 活力
  focus: number;      // 集中力
  loneliness: number;  // 孤独感
  fatigue: number;     // 疲労度
  joy: number;         // 喜び
}

// Preset past similar cases for the contextual comparison
interface PastCase {
  id: string;
  date: string;
  title: string;
  stress: number;
  fatigue: number;
  commons: string;
  diffs: string;
  recoverySpeed: string;
  supportUsed: string;
  growth: string;
}

// 2. Interactive Event Schema
interface InteractiveEvent {
  id: string;
  name: string;
  emoji: string;
  deltas: Partial<AvatarStates>;
  animation: "none" | "eating" | "singing" | "walking" | "sleeping" | "music" | "talking";
  isCustom?: boolean;
}

const DEFAULT_EVENTS: InteractiveEvent[] = [
  {
    id: "eat",
    name: "ご飯を食べる",
    emoji: "🍙",
    deltas: { safety: 10, vitality: 15, fatigue: -10, loneliness: -5, joy: 15 },
    animation: "eating"
  },
  {
    id: "sing",
    name: "歌を歌う",
    emoji: "🎵",
    deltas: { vitality: 20, stress: -15, loneliness: -10, joy: 25, focus: 10 },
    animation: "singing"
  },
  {
    id: "walk",
    name: "お散歩",
    emoji: "🍃",
    deltas: { vitality: 15, stress: -20, fatigue: 10, joy: 15, safety: 10 },
    animation: "walking"
  },
  {
    id: "talk",
    name: "人と会話",
    emoji: "🗣️",
    deltas: { safety: 25, loneliness: -25, stress: -15, joy: 15 },
    animation: "talking"
  },
  {
    id: "movie",
    name: "映画鑑賞",
    emoji: "🎬",
    deltas: { stress: -20, loneliness: -10, joy: 20, fatigue: 5 },
    animation: "music"
  },
  {
    id: "gardening",
    name: "植物の水やり",
    emoji: "🌱",
    deltas: { safety: 15, stress: -15, vitality: 10, joy: 15 },
    animation: "walking"
  },
  {
    id: "aroma",
    name: "アロマを焚く",
    emoji: "🪷",
    deltas: { safety: 20, stress: -25, fatigue: -10, joy: 10 },
    animation: "sleeping"
  },
  {
    id: "stretch",
    name: "ストレッチ",
    emoji: "🙆",
    deltas: { vitality: 15, fatigue: -15, stress: -15, joy: 15 },
    animation: "walking"
  },
  {
    id: "music",
    name: "音楽を聴く",
    emoji: "🎧",
    deltas: { vitality: 10, stress: -15, loneliness: -10, joy: 15, safety: 10 },
    animation: "music"
  },
  {
    id: "sleep",
    name: "深い睡眠",
    emoji: "💤",
    deltas: { fatigue: -40, stress: -25, vitality: 30, safety: 20, focus: 20, joy: 10 },
    animation: "sleeping"
  },
  {
    id: "cat",
    name: "猫をモフる🐾",
    emoji: "🐈",
    deltas: { safety: 20, loneliness: -25, stress: -20, joy: 30 },
    animation: "music"
  },
  {
    id: "gaming",
    name: "ゲームで遊ぶ",
    emoji: "🎮",
    deltas: { stress: -15, fatigue: 10, joy: 25, focus: 10 },
    animation: "music"
  },
  {
    id: "bath",
    name: "お風呂で極楽",
    emoji: "♨️",
    deltas: { fatigue: -25, stress: -25, vitality: 15, safety: 15, joy: 15 },
    animation: "sleeping"
  },
  {
    id: "sweets",
    name: "ご褒美スイーツ",
    emoji: "🍰",
    deltas: { safety: 10, stress: -15, vitality: 10, joy: 25, fatigue: -5 },
    animation: "eating"
  },
  {
    id: "reading",
    name: "のんびり読書",
    emoji: "📚",
    deltas: { focus: 20, stress: -15, loneliness: -5, joy: 10 },
    animation: "none"
  },
  {
    id: "meditation",
    name: "マインドフルネス",
    emoji: "🧘",
    deltas: { stress: -25, focus: 20, safety: 15, fatigue: -5 },
    animation: "sleeping"
  },
  {
    id: "workout",
    name: "ちょっと筋トレ",
    emoji: "💪",
    deltas: { vitality: 25, fatigue: 15, stress: -15, focus: 15, joy: 15 },
    animation: "walking"
  },
  {
    id: "cleaning",
    name: "お部屋の片付け",
    emoji: "🧹",
    deltas: { safety: 15, stress: -15, focus: 10, fatigue: 10, joy: 15 },
    animation: "walking"
  },
  {
    id: "coffee",
    name: "カフェで一息",
    emoji: "☕",
    deltas: { stress: -15, vitality: 10, loneliness: -5, joy: 15 },
    animation: "eating"
  },
  {
    id: "oshikatsu",
    name: "全力で推し活💖",
    emoji: "🌟",
    deltas: { vitality: 35, loneliness: -20, stress: -10, joy: 40, fatigue: 5 },
    animation: "singing"
  },
  {
    id: "sns-trouble",
    name: "SNSトラブル",
    emoji: "⚠️",
    deltas: { stress: 25, focus: -15, loneliness: 15, joy: -20, safety: -20 },
    animation: "talking"
  }
];

export default function AvatarSimulator({ logs, reviews, onAddManualLog, onToast }: AvatarSimulatorProps) {
  // 1. Core State Levels (0 to 100)
  const [states, setStates] = useState<AvatarStates>({
    safety: 60,
    stress: 30,
    vitality: 50,
    focus: 70,
    loneliness: 20,
    fatigue: 30,
    joy: 60,
  });

  // Active Tab: "avatar" | "causal" | "compare"
  const [activeSubTab, setActiveSubTab] = useState<"avatar" | "causal" | "compare">("avatar");

  // Track currently playing animation state
  const [activeAnimation, setActiveAnimation] = useState<"none" | "eating" | "singing" | "walking" | "sleeping" | "music" | "talking">("none");
  const [animationTimer, setAnimationTimer] = useState<number | null>(null);

  // Notes/context text input
  const [userNote, setUserNote] = useState("");

  // Similar Past Event Selection
  const [selectedPastCaseId, setSelectedPastCaseId] = useState("past-1");

  // Floating particles helper state
  const [particles, setParticles] = useState<{ id: number; char: string; left: number; top: number; size: number; delay: number }[]>([]);

  // Custom events list backed up in local storage
  const [customEvents, setCustomEvents] = useState<InteractiveEvent[]>(() => {
    try {
      const saved = localStorage.getItem("hippocampus_custom_events");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Custom events creator form states
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventEmoji, setNewEventEmoji] = useState("✨");
  const [newEventAnim, setNewEventAnim] = useState<InteractiveEvent["animation"]>("talking");
  const [newEventDeltas, setNewEventDeltas] = useState<AvatarStates>({
    safety: 0,
    stress: 0,
    vitality: 0,
    focus: 0,
    loneliness: 0,
    fatigue: 0,
    joy: 0,
  });

  // Persist custom events to localStorage
  useEffect(() => {
    localStorage.setItem("hippocampus_custom_events", JSON.stringify(customEvents));
  }, [customEvents]);

  const resetForm = () => {
    setNewEventName("");
    setNewEventEmoji("✨");
    setNewEventAnim("talking");
    setNewEventDeltas({
      safety: 0,
      stress: 0,
      vitality: 0,
      focus: 0,
      loneliness: 0,
      fatigue: 0,
      joy: 0,
    });
    setIsCreatingEvent(false);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) {
      onToast("イベント名を入力してくださいにゃ！", "error");
      return;
    }

    const eventId = "custom_" + Date.now();
    const deltasToSave: Partial<AvatarStates> = {};
    Object.keys(newEventDeltas).forEach((key) => {
      const k = key as keyof AvatarStates;
      if (newEventDeltas[k] !== 0) {
        deltasToSave[k] = newEventDeltas[k];
      }
    });

    const newlyCreated: InteractiveEvent = {
      id: eventId,
      name: newEventName.trim(),
      emoji: newEventEmoji,
      deltas: deltasToSave,
      animation: newEventAnim,
      isCustom: true
    };

    setCustomEvents((prev) => [...prev, newlyCreated]);
    onToast(`カスタムイベント「${newEventName}」を本棚ステーションに追加したにゃ🐾`, "success");
    resetForm();
  };

  const handleDeleteEvent = (id: string, name: string) => {
    setCustomEvents((prev) => prev.filter((ev) => ev.id !== id));
    onToast(`イベント「${name}」を削除したにゃ。`, "info");
  };

  const emojiOptions = ["✨", "🍙", "🎵", "🍃", "🗣️", "🎧", "💤", "🧘", "☕", "📖", "🏃", "🎮", "🐾", "🌸", "🏥", "💡", "🛋️", "💥", "🤝", "🍎"];

  // 1. Preset Cases for context comparison
  const pastCases: PastCase[] = [
    {
      id: "past-1",
      date: "2026年5月12日",
      title: "期限に追われたマルチタスクパニック",
      stress: 85,
      fatigue: 80,
      commons: "予定外の割り込みが重なり、タスクが溢れて頭が真っ白になっていた点。自己否定に傾きかけた。",
      diffs: "今回は事前に『今は冷静に一つずつ整理するにゃ』と現状を言語化し、支援者に今のキャパオーバーを共有できたこと。",
      recoverySpeed: "回復速度が大幅に向上（前回は3日引きずったのが、今回は数時間のクールダウンで軌道修正）。",
      supportUsed: "理解ある友人へのテキスト相談、お気に入りのアンビエント音楽による聴覚リセット。",
      growth: "過労のサイン（肩がこる、呼吸が浅くなる）に早い段階で気づき、自律的に散歩に行くなどの予防的回復手段を実行できたこと。"
    },
    {
      id: "past-2",
      date: "2026年4月05日",
      title: "SNSでの冷淡なレスポンスによる疎外感",
      stress: 70,
      fatigue: 55,
      commons: "テキストの短い文面を深読みしすぎて、『嫌われたのではないか』と自動思考の罠（歪み）に陥った点。",
      diffs: "今回は『人は人、他意はないはず』と言葉と感情の切り分け（マインドフルな観察）を実施でき、無関係に心地よいご飯を食べた点。",
      recoverySpeed: "翌朝には感情のざわつきは20%以下に減衰（前回は1週間ほどモヤモヤが持続した）。",
      supportUsed: "温かいココア、電子機器の通知オフ（デジタルデトックス）、猫（アバター）とのんびり過ごす時間。",
      growth: "SNSトラブルに遭遇した際、反射的に言い返すのではなく、『画面から物理的に離れる』というコーピング（対処行動）が定着した点。"
    },
    {
      id: "past-3",
      date: "2026年3月18日",
      title: "新しい役割でのプレゼン前の極度な緊張",
      stress: 90,
      fatigue: 45,
      commons: "失敗を極度に恐れ、鼓動が早まり、うまく喋れなくなるのではないかと予期不安が強まった点。",
      diffs: "プレゼン自体を『自分のすべてが評価される場』ではなく『単なる情報交換の場』と認知再構成（リフレーミング）できたこと。",
      recoverySpeed: "本番終了と同時にストレスはゼロに急速緩和。後に引きずる緊張が減少。",
      supportUsed: "メンターからの『いつも通りで十分』という言葉、深呼吸による呼吸瞑想（4-4-8呼気法）。",
      growth: "身体の過緊張が起きた時、『これは自分のエネルギーが高まっている歓迎すべき兆候だ』と肯定的リフレーミングができるようになった。"
    }
  ];

  // Particle Generation Effect
  useEffect(() => {
    if (activeAnimation === "singing") {
      const chars = ["♪", "♫", "♬", "♩", "✧", "✨"];
      const newParticles = Array.from({ length: 8 }).map((_, i) => ({
        id: Math.random(),
        char: chars[i % chars.length],
        left: 20 + Math.random() * 60,
        top: 20 + Math.random() * 40,
        size: 14 + Math.random() * 14,
        delay: i * 0.3
      }));
      setParticles(newParticles);
    } else if (activeAnimation === "eating") {
      const foodChars = ["🍙", "🍎", "🍰", "🍕", "✨"];
      const newParticles = Array.from({ length: 5 }).map((_, i) => ({
        id: Math.random(),
        char: foodChars[i % foodChars.length],
        left: 30 + Math.random() * 40,
        top: 60 + Math.random() * 20,
        size: 16 + Math.random() * 12,
        delay: i * 0.4
      }));
      setParticles(newParticles);
    } else if (activeAnimation === "sleeping") {
      const newParticles = Array.from({ length: 6 }).map((_, i) => ({
        id: Math.random(),
        char: "zZ",
        left: 55 + Math.random() * 30,
        top: 15 + Math.random() * 40,
        size: 12 + Math.random() * 16,
        delay: i * 0.5
      }));
      setParticles(newParticles);
    } else if (activeAnimation === "music") {
      const newParticles = Array.from({ length: 6 }).map((_, i) => ({
        id: Math.random(),
        char: "♫",
        left: 15 + Math.random() * 70,
        top: 10 + Math.random() * 40,
        size: 12 + Math.random() * 12,
        delay: i * 0.3
      }));
      setParticles(newParticles);
    } else if (activeAnimation === "walking") {
      const pathChars = ["☘️", "🌸", "🍁", "✨", "🍃"];
      const newParticles = Array.from({ length: 7 }).map((_, i) => ({
        id: Math.random(),
        char: pathChars[i % pathChars.length],
        left: 10 + Math.random() * 80,
        top: 10 + Math.random() * 80,
        size: 14 + Math.random() * 12,
        delay: i * 0.2
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [activeAnimation]);

  // Clean animation timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimer) clearTimeout(animationTimer);
    };
  }, [animationTimer]);

  // Handle trigger event increments
  const triggerEvent = (
    eventName: string,
    deltas: Partial<AvatarStates>,
    animType: typeof activeAnimation
  ) => {
    // Apply changes clamped between 0 and 100
    setStates((prev) => {
      const next = { ...prev };
      Object.keys(deltas).forEach((k) => {
        const key = k as keyof AvatarStates;
        const delta = deltas[key] || 0;
        next[key] = Math.min(100, Math.max(0, prev[key] + delta));
      });
      return next;
    });

    onToast(`「${eventName}」イベントをシミュレートしたにゃ！`, "success");

    // Play visual animation
    setActiveAnimation(animType);
    if (animationTimer) clearTimeout(animationTimer);
    
    const timer = window.setTimeout(() => {
      setActiveAnimation("none");
    }, 5000); // Animation runs for 5s
    setAnimationTimer(timer);
  };

  const handleSliderChange = (key: keyof AvatarStates, val: number) => {
    setStates((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  // ----------------------------------------------------
  // Save current values as emotional map entry to timeline list
  // ----------------------------------------------------
  const handleSaveToTimeline = () => {
    if (!onAddManualLog) {
      onToast("タイムラインへ保存する機能が利用できませんにゃ", "error");
      return;
    }

    const eventDesc = userNote.trim() || "現在の状態を脳内ログにセルフチェック";
    const detailText = `【感情アバター心象ログ】
・安心感: ${states.safety}%
・ストレス: ${states.stress}%
・活力: ${states.vitality}%
・集中力: ${states.focus}%
・孤独感: ${states.loneliness}%
・疲労度: ${states.fatigue}%
・喜び: ${states.joy}%

現在の文脈: ${eventDesc}`;

    // Compute active prevailing emotional tone
    let primaryEmotion = "穏やか";
    let color = "#4A5D4E"; // default forest green
    if (states.stress > 60 && states.fatigue > 60) {
      primaryEmotion = "過緊張・疲労";
      color = "#C15C3D"; // terracotta
    } else if (states.joy > 70) {
      primaryEmotion = "大いなる喜び";
      color = "#EAA850"; // amber gold
    } else if (states.loneliness > 60) {
      primaryEmotion = "寂しさ・孤独";
      color = "#5C6A80"; // slate blue
    } else if (states.safety > 75) {
      primaryEmotion = "安心・安らぎ";
      color = "#5A8F76"; // sage green
    } else if (states.fatigue > 75) {
      primaryEmotion = "深い疲労";
      color = "#80708F"; // dusty purple
    }

    const payload = {
      avatarState: { ...states },
      savedFromAvatar: true,
      contextNotes: eventDesc
    };

    onAddManualLog(detailText, primaryEmotion, payload);
    setUserNote("");
    onToast("今日の出来事や気持ちをタイムラインに記録したにゃ！🐾", "success");
  };

  // Bookcase growth stage calculation
  const totalLogsCount = logs.length;
  let growthTierName = "小冊子 (リーフレット)";
  let growthTierDesc = "まだ脳内にまかれたばかりの小さなアイデア。あなたの今の感情の欠片が集まっている最中だにゃ。";
  let growthProgress = (totalLogsCount / 100) * 100;
  let nextMilestone = "100件の『小冊子編纂』";

  if (totalLogsCount >= 100 && totalLogsCount < 500) {
    growthTierName = "小冊子 (Booklet)";
    growthTierDesc = "小冊子の背表紙が少しずつ棚に並び始めたにゃ。日々の瞬きが言葉に綴じられているにゃ。";
    growthProgress = ((totalLogsCount - 100) / 400) * 100;
    nextMilestone = "500件の『正式な単行本製本』";
  } else if (totalLogsCount >= 500 && totalLogsCount < 1000) {
    growthTierName = "本 (Standard Volume)";
    growthTierDesc = "立派な製本としての本が本棚に並び始めたにゃ。あなたの歴史と物語が着実に重みを持つにゃ。";
    growthProgress = ((totalLogsCount - 500) / 500) * 100;
    nextMilestone = "1000件の『革装大型書籍』";
  } else if (totalLogsCount >= 1000 && totalLogsCount < 5000) {
    growthTierName = "大型書籍 (Major Heavy Tome)";
    growthTierDesc = "特注の重厚な革装の大型書籍が本棚に収まったにゃ。圧巻なる脳内記憶アーカイブにゃ。";
    growthProgress = ((totalLogsCount - 1000) / 4000) * 100;
    nextMilestone = "5000件の『究極の個人図書館』への道跡";
  } else if (totalLogsCount >= 5000) {
    growthTierName = "個人図書館 (Hippocampus Archives)";
    growthTierDesc = "もはや本棚の次元を越え、世界で唯一の『あなたの壮大な個人特設図書館』が永遠に完成したにゃあ！🐾";
    growthProgress = 100;
    nextMilestone = "極限の知恵の記録者";
  }

  // Active past case details for comparison tab
  const activePastCase = pastCases.find(c => c.id === selectedPastCaseId) || pastCases[0];

  return (
    <div className="bg-[#FAF9F6] border-2 border-[#4A5D4E]/10 rounded-3xl p-6 shadow-sm space-y-6" id="avatar-simulator-widget">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-black/[0.04] pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#415144]/10 p-2.5 rounded-2xl text-[#4A5D4E]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-black text-[#4A5D4E] flex items-center gap-1.5 leading-none">
              インナー・感情アバター シミュレーター
              <span className="bg-[#4A5D4E]/10 text-[#4A5D4E] font-sans px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                自己外在化ツール
              </span>
            </h2>
            <p className="text-stone-500 text-[10.5px] mt-1 leading-normal font-medium">
              診断ではなく、あなたの心の「安心感やストレス」をアバターの表情と体勢を通して可視化し、客観的な理解を支援する空間です🐾
            </p>
          </div>
        </div>

        {/* Outer Tabs switcher */}
        <div className="flex p-1 bg-stone-200/50 rounded-xl gap-1 w-full md:w-auto shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveSubTab("avatar")}
            className={`flex-1 md:flex-none text-[11px] font-black px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === "avatar"
                ? "bg-[#4A5D4E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            本棚アバター & 操縦
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("causal")}
            className={`flex-1 md:flex-none text-[11px] font-black px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === "causal"
                ? "bg-[#4A5D4E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            脳内因果連鎖マップ
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("compare")}
            className={`flex-1 md:flex-none text-[11px] font-black px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === "compare"
                ? "bg-[#4A5D4E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            文脈比較 & 本棚の成長
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          TAB 1: AVATAR FACE && MANIPULATION SLIDERS
         ---------------------------------------------------- */}
      {activeSubTab === "avatar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: THE INTERACTIVE GRAPHICS AVATAR & INTUITIVE INTERVENTIONS (span 6) */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            
            {/* Graphical Humanoid & Profile */}
            <div className="flex flex-col items-center justify-center p-4 bg-white/70 border border-black/[0.03] rounded-2xl relative overflow-hidden min-h-[340px] shadow-sm">
            
            {/* Ambient Background Glow matching avatar state */}
            <div 
              className="absolute inset-0 opacity-15 blur-3xl pointer-events-none transition-all duration-1000"
              style={{
                background: `radial-gradient(circle, ${
                  states.stress > 60 
                    ? "#EF4444" // hot red
                    : states.safety > 70 
                    ? "#10B981" // calm green
                    : states.joy > 70 
                    ? "#F59E0B" // sunny amber
                    : states.loneliness > 60 
                    ? "#3B82F6" // nostalgic blue
                    : "#6B7280" // neutral
                } 0%, transparent 70%)`
              }}
            ></div>

            {/* Animation Particles Overlay */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute text-stone-700 pointer-events-none animate-bounce font-serif font-black select-none opacity-80"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  fontSize: `${p.size}px`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: activeAnimation === "sleeping" ? "4s" : "2.5s",
                  transform: "translate(-50%, -50%)"
                }}
              >
                {p.char}
              </span>
            ))}

            {/* Graphic Humanoid Head & Neck SVG */}
            <div className={`transition-all duration-500 relative flex flex-col items-center justify-center ${
              activeAnimation === "walking" ? "animate-bounce" : ""
            }`}
            style={{
              transform: `translateY(${
                states.vitality < 30 ? "10px" : "0px"
              })`,
              animationDuration: "1.2s"
            }}>
              
              {/* Head Outline, shoulders & body */}
              <svg 
                width="220" 
                height="220" 
                viewBox="0 0 200 200" 
                className="drop-shadow-md select-none"
              >
                <defs>
                  {/* Eyes gradient */}
                  <radialGradient id="sparkGraduate" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFF2D4" />
                    <stop offset="100%" stopColor="#4A5D4E" />
                  </radialGradient>
                  
                  {/* Blush gradient */}
                  <radialGradient id="pinkBlush" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFC4C4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FFC4C4" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* BACKGROUND AURA STARS (if vitality is high) */}
                {states.vitality > 75 && (
                  <g className="animate-pulse">
                    <polygon points="100,5 103,12 110,12 105,17 107,24 100,20 93,24 95,17 90,12 97,12" fill="#EAA850" opacity="0.8"/>
                    <polygon points="35,35 37,39 42,39 39,42 40,46 35,44 30,46 31,42 28,39 33,39" fill="#EAA850" opacity="0.6"/>
                    <polygon points="165,35 167,39 172,39 169,42 170,46 165,44 160,46 161,42 158,39 163,39" fill="#EAA850" opacity="0.6"/>
                  </g>
                )}

                {/* SLEEPY SHADOW IN BACKGROUND (if fatigue is high) */}
                {states.fatigue > 70 && (
                  <path d="M 60 20 c 40 -10, 80 -10, 80 -10" stroke="#80708F" strokeWidth="2" strokeDasharray="3,3" fill="none" opacity="0.6"/>
                )}

                {/* STRESS SHIVER (if stress is high) */}
                {states.stress > 65 && (
                  <path d="M 17 65 l 5 -5 M 180 65 l -5 -5 M 25 150 l 5 -5" stroke="#C15C3D" strokeWidth="1.5" opacity="0.7"/>
                )}

                {/* SHOULDERS & SPINE (Posture responds to Vitality and Fatigue) */}
                {/* if vitality is high, shoulders are upright; if fatigue is high, shoulders roll forward/down */}
                <path 
                  d={`M 40,190 
                     C 55,${states.fatigue > 60 ? '165' : '155'} 
                       65,${states.vitality > 70 ? '135' : '145'} 
                       100,${states.vitality > 70 ? '135' : '145'} 
                     C 135,${states.vitality > 70 ? '135' : '145'} 
                       145,${states.fatigue > 60 ? '165' : '155'} 
                       160,190 
                     Z`} 
                  fill="#E6E4E0" 
                  stroke="#BEBCB8" 
                  strokeWidth="2.5"
                />

                {/* NECK */}
                <rect x="91" y="115" width="18" height="25" rx="5" fill="#F8EADA" stroke="#E3D1C0" strokeWidth="2" />

                {/* FACE BACKGROUND */}
                <circle cx="100" cy="85" r="44" fill="#FCEFDF" stroke="#E6D3C0" strokeWidth="2.5" />

                {/* HEADPHONES ACCESSORY (if activeAnimation is music) */}
                {activeAnimation === "music" && (
                  <g>
                    {/* Headband */}
                    <path d="M 54 85 A 46 46 0 0 1 146 85" fill="none" stroke="#4A5D4E" strokeWidth="5"/>
                    {/* Ear cushions */}
                    <rect x="50" y="70" width="10" height="25" rx="4" fill="#3D4F41" />
                    <rect x="140" y="70" width="10" height="25" rx="4" fill="#3D4F41" />
                  </g>
                )}

                {/* CHEEK BLUSH (dependent on safety + joy) */}
                {((states.safety > 50 || states.joy > 50)) && (
                  <g>
                    {/* Left blush */}
                    <circle cx="72" cy="94" r={String(8 + (states.joy + states.safety) / 25)} fill="url(#pinkBlush)" />
                    {/* Right blush */}
                    <circle cx="128" cy="94" r={String(8 + (states.joy + states.safety) / 25)} fill="url(#pinkBlush)" />
                  </g>
                )}

                {/* SWEAT DROP (if stress is high) */}
                {states.stress > 60 && (
                  <path d="M 136,65 C 136,65 140,73 140,75 C 140,77 138,78 136,78 C 134,78 132,77 132,75 C 132,73 136,65 136,65 Z" fill="#3B82F6" opacity="0.8" />
                )}

                {/* CRYING TEARDROP (if loneliness is exceptionally high) */}
                {states.loneliness > 70 && (
                  <circle cx="76" cy="96" r="3.5" fill="#93C5FD" opacity="0.9" className="animate-pulse" />
                )}

                {/* EYEBROWS (Form based on anxiety, sorrow) */}
                {/* Stress: steep angry angle. Loneliness: sad weeping angle. Normal: smooth curve */}
                {(() => {
                  let leftBrow = "M 66,66 Q 76,62 84,66";
                  let rightBrow = "M 116,66 Q 124,62 134,66";

                  if (states.stress > 60) {
                    // Angry or Tensed eyebrows pointing inwards and down
                    leftBrow = "M 66,62 Q 76,66 84,70";
                    rightBrow = "M 116,70 Q 124,66 134,62";
                  } else if (states.loneliness > 55) {
                    // Sad eyebrows pointing down at outer edges
                    leftBrow = "M 66,68 Q 76,64 84,62";
                    rightBrow = "M 116,62 Q 124,64 134,68";
                  }

                  return (
                    <g stroke="#615546" strokeWidth="2.5" strokeLinecap="round" fill="none">
                      <path d={leftBrow} />
                      <path d={rightBrow} />
                    </g>
                  );
                })()}

                {/* EYES (Interact and combine expressions) */}
                {/* Sleeping/Fatigued high OR singing: closed eyes curves. Joy/Safety: happy arc curves. Stress: small panicked circles */}
                {(() => {
                  const isClosed = activeAnimation === "sleeping" || activeAnimation === "singing" || states.fatigue > 85;
                  const isHappy = states.joy > 70 || states.safety > 80;
                  const isStressed = states.stress > 70;

                  if (isClosed) {
                    return (
                      <g stroke="#524636" strokeWidth="3" strokeLinecap="round" fill="none">
                        {/* Eye lids curved down */}
                        <path d="M 68,82 Q 77,88 84,82" />
                        <path d="M 116,82 Q 123,88 132,82" />
                      </g>
                    );
                  }

                  if (isHappy) {
                    return (
                      <g stroke="#524636" strokeWidth="3" strokeLinecap="round" fill="none">
                        {/* Eye curves pointing up ^_^ */}
                        <path d="M 68,84 Q 76,76 84,84" />
                        <path d="M 116,84 Q 124,76 132,84" />
                      </g>
                    );
                  }

                  if (isStressed) {
                    return (
                      <g fill="none" stroke="#423525" strokeWidth="2">
                        {/* Panicked tiny round circles */}
                        <circle cx="76" cy="82" r="4.5" fill="#FFF" />
                        <circle cx="76" cy="82" r="1.5" fill="#C15C3D" />
                        <circle cx="124" cy="82" r="4.5" fill="#FFF" />
                        <circle cx="124" cy="82" r="1.5" fill="#C15C3D" />
                      </g>
                    );
                  }

                  // Default Standard open eyes with beautiful dilated iris reflecting vitality
                  const sparkleRadius = states.vitality > 60 ? "3" : "1";
                  return (
                    <g>
                      {/* Left Eye */}
                      <circle cx="76" cy="82" r="6" fill="#524636" />
                      <circle cx="74.5" cy="80" r={sparkleRadius} fill="#FFF" />
                      {/* Right Eye */}
                      <circle cx="124" cy="82" r="6" fill="#524636" />
                      <circle cx="122.5" cy="80" r={sparkleRadius} fill="#FFF" />
                    </g>
                  );
                })()}

                {/* MOUTH (チェーイング、シンギング、スマイル、通常) */}
                {(() => {
                  if (activeAnimation === "eating") {
                    // Chewing mouth (dynamic circular shape that cycles as if talking/eating)
                    return (
                      <ellipse cx="100" cy="102" rx="7" ry="10" fill="#752822" stroke="#524636" strokeWidth="2" className="animate-ping" style={{ animationDuration: "0.8s" }} />
                    );
                  }

                  if (activeAnimation === "singing") {
                    // Singing mouth represents open circle ooh!
                    return (
                      <circle cx="100" cy="103" r="11" fill="#80312F" stroke="#524636" strokeWidth="2.5" />
                    );
                  }

                  if (activeAnimation === "sleeping") {
                    // Sleeping tiny mouth blowing gentle air bubble
                    return (
                      <path d="M 96,101 Q 100,105 104,101" stroke="#524636" strokeWidth="2" fill="none" strokeLinecap="round" />
                    );
                  }

                  // Expression blending for standard states
                  const isVeryHappy = states.joy > 75;
                  const isSad = states.loneliness > 60 || states.stress > 65;
                  const isCalm = states.safety > 60;

                  if (isVeryHappy) {
                    // Broad open smiling mouth
                    return (
                      <path d="M 88,98 Q 100,114 112,98 Z" fill="#82312A" stroke="#524636" strokeWidth="2" strokeLinecap="round" />
                    );
                  }

                  if (isSad) {
                    // Turned down mouth (sad arc)
                    return (
                      <path d="M 91,106 Q 100,99 109,106" stroke="#5b4832" strokeWidth="3" fill="none" strokeLinecap="round" />
                    );
                  }

                  if (isCalm) {
                    // Gentle closed smile curve
                    return (
                      <path d="M 90,99 Q 100,106 110,99" stroke="#524636" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    );
                  }

                  // Neutral slightly open line mouth
                  return (
                    <line x1="93" y1="101" x2="107" y2="101" stroke="#524636" strokeWidth="2.5" strokeLinecap="round" />
                  );
                })()}

              </svg>

              {/* Action Banner label */}
              {activeAnimation !== "none" && (
                <div className="absolute bottom-2 bg-stone-900/80 drop-shadow-sm text-white font-sans text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase flex items-center gap-1 animate-pulse">
                  <span className="text-[12px]">{
                    activeAnimation === "eating" ? "🍙 モグモグ..." :
                    activeAnimation === "singing" ? "♫ デュエット歌唱中..." :
                    activeAnimation === "walking" ? "🍃 風の中で散歩中..." :
                    activeAnimation === "sleeping" ? "💤 熟睡休息中..." :
                    activeAnimation === "talking" ? "🗣️ 信頼の対話..." :
                    activeAnimation === "music" ? "🎧 アンビエント傾聴..." : "シミュレーション中"
                  }</span>
                </div>
              )}
            </div>

            {/* Avatar Status Text Summary Indicator */}
            <div className="mt-4 text-center select-none w-full">
              <span className="text-[10px] text-stone-400 font-mono block">AVATAR EXPRESSION PROFILE</span>
              <h4 className="font-serif font-black text-xs text-[#4A5D4E] mt-0.5">
                {(() => {
                  if (states.fatigue > 80 && activeAnimation !== "sleeping") return "「極度な虚脱・疲弊にゃ💤」";
                  if (states.stress > 80) return "「限界に近いストレス緊張状態にゃ！⚠️」";
                  if (states.joy > 80) return "「弾けるような喜びの満開フロー状態だにゃ✨」";
                  if (states.safety > 80) return "「深いマインドフルネスな安心感に包まれているにゃ」";
                  if (states.loneliness > 70) return "「心の奥底で誰かを求めている寂しさにゃ…🩹」";
                  if (states.vitality < 30) return "「エネルギー出力が低下している休息期にゃ」";
                  return "「安定的でバランスのとれた心象パレットにゃ」";
                })()}
              </h4>
            </div>
          </div>

          {/* Group 2: Action event launchers & Custom Event Creator (Relocated right below the avatar!) */}
          <div className="bg-white rounded-2xl p-5 border border-[#4A5D4E]/10 shadow-sm space-y-4" id="avatar-actions-panel">
            <div className="flex items-center justify-between border-b pb-2 border-stone-100">
              <span className="text-xs font-black text-[#4A5D4E] flex items-center gap-1.5 font-serif">
                🐾 アバター行動介入シミュレーション
              </span>
              
              <button
                type="button"
                onClick={() => setIsCreatingEvent(!isCreatingEvent)}
                className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                  isCreatingEvent 
                    ? "bg-stone-200 text-stone-750" 
                    : "bg-[#4A5D4E]/10 text-[#4A5D4E] hover:bg-[#4A5D4E]/20"
                }`}
              >
                {isCreatingEvent ? <X className="w-3 h-3 text-[#4A5D4E]" /> : <Plus className="w-3 h-3 text-[#4A5D4E]" />}
                {isCreatingEvent ? "フォームを閉じる" : "イベント自作・新規作成にゃ"}
              </button>
            </div>

            {/* SECTION: Custom event creation form */}
            {isCreatingEvent && (
              <form onSubmit={handleCreateEvent} className="bg-stone-50 border border-[#4A5D4E]/10 p-4 rounded-2xl space-y-3.5">
                <div className="border-b pb-1.5 border-stone-200">
                  <span className="text-[11px] font-black text-[#4A5D4E] block">
                    🛠️ オリジナル日常イベントの新規設計
                  </span>
                  <span className="text-[9.5px] text-stone-400 block font-medium leading-relaxed">
                    日常生活の行動を心象数値変化（-50%〜+50%）としてプログラミングできるにゃ🐾
                  </span>
                </div>

                {/* Input row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 block mb-1">イベント名 (必須)</label>
                    <input 
                      type="text"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      placeholder="例: おうちヨガ、紅茶を淹れる"
                      className="w-full bg-white border border-stone-200 focus:border-[#4A5D4E]/40 focus:ring-1 focus:ring-[#4A5D4E]/20 rounded-xl py-1.5 px-3 text-xs text-stone-850 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-500 block mb-1">アバターのアクション</label>
                    <select
                      value={newEventAnim}
                      onChange={(e) => setNewEventAnim(e.target.value as any)}
                      className="w-full bg-white border border-stone-200 focus:border-[#4A5D4E]/40 rounded-xl py-1.5 px-2 text-xs text-[#5C5CD4] outline-none cursor-pointer font-bold"
                    >
                      <option value="talking">🗣️ 親身に対話 (Talking)</option>
                      <option value="eating">🍙 咀嚼お食事 (Eating)</option>
                      <option value="singing">🎵 デュエット歌唱 (Singing)</option>
                      <option value="walking">🍃 風の散歩 (Walking)</option>
                      <option value="sleeping">💤 熟睡休息 (Sleeping)</option>
                      <option value="music">🎧 アンビエント傾聴 (Music)</option>
                      <option value="none">静観 (Silent stance)</option>
                    </select>
                  </div>
                </div>

                {/* Emoji selector */}
                <div>
                  <label className="text-[10px] font-black text-stone-500 block mb-1">アイコン絵文字</label>
                  <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-stone-100 max-h-[82px] overflow-y-auto">
                    {emojiOptions.map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setNewEventEmoji(emo)}
                        className={`w-7 h-7 text-sm rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          newEventEmoji === emo 
                            ? "bg-amber-100 border border-amber-300 scale-110 font-bold" 
                            : "hover:bg-stone-50 text-stone-650"
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deltas Adjustment Sliders */}
                <div className="space-y-3 bg-white p-3 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-black text-[#5C5C55] block border-b pb-1 border-stone-100">
                    📈 アバターへのパラメータ影響度
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    
                    {/* Safety */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-[#4A5D4E] flex items-center gap-1"><Shield className="w-3 h-3" /> 安心感</span>
                        <span className={`${newEventDeltas.safety > 0 ? "text-emerald-600" : newEventDeltas.safety < 0 ? "text-red-500" : "text-stone-400"}`}>
                          {newEventDeltas.safety > 0 ? `+${newEventDeltas.safety}` : newEventDeltas.safety}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.safety}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, safety: parseInt(e.target.value) }))}
                        className="w-full accent-[#4A5D4E] h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                    {/* Stress */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-red-700 flex items-center gap-1"><Flame className="w-3 h-3" /> ストレス</span>
                        <span className={`${newEventDeltas.stress > 0 ? "text-red-500" : newEventDeltas.stress < 0 ? "text-emerald-600" : "text-stone-400"}`}>
                          {newEventDeltas.stress > 0 ? `+${newEventDeltas.stress}` : newEventDeltas.stress}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.stress}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                        className="w-full accent-red-600 h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                    {/* Vitality */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-emerald-700 flex items-center gap-1"><Activity className="w-3 h-3" /> 活力</span>
                        <span className={`${newEventDeltas.vitality > 0 ? "text-emerald-600" : newEventDeltas.vitality < 0 ? "text-red-500" : "text-stone-400"}`}>
                          {newEventDeltas.vitality > 0 ? `+${newEventDeltas.vitality}` : newEventDeltas.vitality}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.vitality}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, vitality: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-600 h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                    {/* Focus */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-amber-600 flex items-center gap-1"><Zap className="w-3 h-3" /> 集中力</span>
                        <span className={`${newEventDeltas.focus > 0 ? "text-amber-600" : newEventDeltas.focus < 0 ? "text-stone-400" : "text-stone-400"}`}>
                          {newEventDeltas.focus > 0 ? `+${newEventDeltas.focus}` : newEventDeltas.focus}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.focus}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, focus: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500 h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                    {/* Loneliness */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600 flex items-center gap-1"><Frown className="w-3 h-3" /> 孤独感</span>
                        <span className={`${newEventDeltas.loneliness > 0 ? "text-red-500" : newEventDeltas.loneliness < 0 ? "text-emerald-600" : "text-stone-400"}`}>
                          {newEventDeltas.loneliness > 0 ? `+${newEventDeltas.loneliness}` : newEventDeltas.loneliness}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.loneliness}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, loneliness: parseInt(e.target.value) }))}
                        className="w-full accent-slate-600 h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                    {/* Fatigue */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-purple-700 flex items-center gap-1"><Moon className="w-3 h-3" /> 疲労度</span>
                        <span className={`${newEventDeltas.fatigue > 0 ? "text-purple-500" : newEventDeltas.fatigue < 0 ? "text-emerald-600" : "text-stone-400"}`}>
                          {newEventDeltas.fatigue > 0 ? `+${newEventDeltas.fatigue}` : newEventDeltas.fatigue}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.fatigue}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, fatigue: parseInt(e.target.value) }))}
                        className="w-full accent-purple-600 h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                    {/* Joy */}
                    <div className="space-y-0.5 col-span-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-pink-500 flex items-center gap-1"><Smile className="w-3.5 h-3.5" /> 喜び・快感情</span>
                        <span className={`${newEventDeltas.joy > 0 ? "text-pink-500" : newEventDeltas.joy < 0 ? "text-stone-400" : "text-stone-400"}`}>
                          {newEventDeltas.joy > 0 ? `+${newEventDeltas.joy}` : newEventDeltas.joy}%
                        </span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="5"
                        value={newEventDeltas.joy}
                        onChange={(e) => setNewEventDeltas(prev => ({ ...prev, joy: parseInt(e.target.value) }))}
                        className="w-full accent-pink-500 h-1 bg-stone-100 rounded cursor-pointer"
                      />
                    </div>

                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all font-sans cursor-pointer"
                  >
                    入力をリセット
                  </button>
                  <button
                    type="submit"
                    className="bg-[#4A5D4E] hover:bg-[#3d4f40] text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm font-sans cursor-pointer"
                  >
                    💾 このイベントを作成するにゃ🐾
                  </button>
                </div>
              </form>
            )}

            {/* Event trigger buttons grid */}
            <div className="space-y-3.5">
              <span className="text-[10.5px] uppercase font-mono tracking-wider text-stone-400 block font-bold">
                イベント介入パレット (クリックでアバターシミュレート)
              </span>

              <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                
                {/* DEFAULT PRESETS */}
                {DEFAULT_EVENTS.map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => triggerEvent(evt.name, evt.deltas, evt.animation)}
                    className={`hover:brightness-95 border rounded-xl py-2 px-2.5 text-[11px] font-black flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 text-left shadow-sm ${
                      evt.id === "sns-trouble" 
                        ? "bg-red-50/70 border-red-200/50 text-red-800 col-span-2 justify-center" 
                        : "bg-white border-black/[0.04] text-stone-850 hover:border-black/[0.08]"
                    }`}
                  >
                    <span className="text-xl bg-stone-50 select-none w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-stone-100">
                      {evt.emoji}
                    </span>
                    <div className="truncate flex-1">
                      <div className="truncate leading-tight font-sans font-bold">{evt.name}</div>
                    </div>
                  </button>
                ))}

                {/* CUSTOM USER EVENTS */}
                {customEvents.length > 0 && (
                  <div className="col-span-2 border-t border-dashed border-stone-200 pt-3 mt-1">
                    <span className="text-[10px] text-stone-400 font-extrabold block mb-2.5 flex items-center gap-1">
                      ⭐ 自作したオリジナルイベント一覧 ({customEvents.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {customEvents.map((evt) => (
                        <div 
                          key={evt.id} 
                          className="group relative bg-[#FDFCF9] border border-[#4A5D4E]/20 hover:border-[#4A5D4E]/40 rounded-xl py-2 pl-2.5 pr-8 flex items-center gap-2.5 transition-all text-left shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => triggerEvent(evt.name, evt.deltas, evt.animation)}
                            className="flex-1 flex items-center gap-2.5 cursor-pointer text-[#4A5D4E] truncate text-[11px] font-bold active:scale-95"
                          >
                            <span className="text-xl bg-white shadow-sm w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-stone-100 select-none">
                              {evt.emoji}
                            </span>
                            <div className="truncate">
                              <div className="truncate leading-tight font-sans font-bold text-stone-800">{evt.name}</div>
                            </div>
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(evt.id, evt.name);
                            }}
                            className="absolute right-1 text-stone-400 hover:text-red-500 p-1.5 rounded-lg transition-all cursor-pointer opacity-40 group-hover:opacity-100"
                            title="このイベントを削除する"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          </div>

          {/* RIGHT COLUMN: MANUAL ADJUSTMENT AND ACTIONS GRID (span 6) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            
            {/* Group 1: Slide controllers (Manual Adjusters) */}
            <div className="bg-white rounded-2xl p-4 border border-black/[0.03] space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b pb-1.5 border-stone-100">
                <span className="text-xs font-black text-[#5C5C55] flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-[#4A5D4E]" />
                  脳内ステータス操作板 (0 〜 100 スライダー)
                </span>
                <span className="text-[9px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-mono font-bold">
                  リアルタイム調整可能
                </span>
              </div>

              {/* Sliders layout inside visual grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
                
                {/* 1. 安心感 */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#4A5D4E] flex items-center gap-1 text-xs">
                      <Shield className="w-3.5 h-3.5" /> 安心感
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.safety}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.safety}
                    onChange={(e) => handleSliderChange("safety", parseInt(e.target.value))}
                    className="w-full accent-[#4A5D4E] h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 2. ストレス */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-red-700 flex items-center gap-1 text-xs">
                      <Flame className="w-3.5 h-3.5" /> ストレス
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.stress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.stress}
                    onChange={(e) => handleSliderChange("stress", parseInt(e.target.value))}
                    className="w-full accent-red-600 h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 3. 活力 */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-700 flex items-center gap-1 text-xs">
                      <Activity className="w-3.5 h-3.5" /> 活力
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.vitality}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.vitality}
                    onChange={(e) => handleSliderChange("vitality", parseInt(e.target.value))}
                    className="w-full accent-emerald-600 h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 4. 集中力 */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#EAA850] flex items-center gap-1 text-xs">
                      <Zap className="w-3.5 h-3.5" /> 集中力
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.focus}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.focus}
                    onChange={(e) => handleSliderChange("focus", parseInt(e.target.value))}
                    className="w-full accent-[#EAA850] h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 5. 孤独感 */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1 text-xs">
                      <Frown className="w-3.5 h-3.5" /> 孤独感
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.loneliness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.loneliness}
                    onChange={(e) => handleSliderChange("loneliness", parseInt(e.target.value))}
                    className="w-full accent-slate-600 h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 6. 疲労度 */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-700 flex items-center gap-1 text-xs">
                      <Moon className="w-3.5 h-3.5" /> 疲労度
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.fatigue}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.fatigue}
                    onChange={(e) => handleSliderChange("fatigue", parseInt(e.target.value))}
                    className="w-full accent-purple-600 h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 7. 喜び */}
                <div className="space-y-0.5 sm:col-span-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-pink-600 flex items-center gap-1 text-xs">
                      <Smile className="w-3.5 h-3.5" /> 喜び・快感情
                    </span>
                    <span className="font-mono font-bold text-stone-600">{states.joy}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={states.joy}
                    onChange={(e) => handleSliderChange("joy", parseInt(e.target.value))}
                    className="w-full accent-pink-500 h-1 bg-stone-100 rounded-lg cursor-pointer"
                  />
                </div>

              </div>
            </div>

            {/* Group 3: Note taking and registration map */}
            <div className="bg-white/95 rounded-2xl p-4 border border-black/[0.03] shadow-sm space-y-3">
              <span className="text-xs font-black text-[#5C5C55] flex items-center gap-1 font-serif">
                <Sparkles className="w-3.5 h-3.5 text-[#4A5D4E]" />
                今日の出来事や気持ちを記録します
              </span>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="例: 散歩してココアを飲んだ🌻"
                  className="flex-1 bg-stone-50 border border-black/[0.08] focus:border-[#4A5D4E]/40 focus:bg-white rounded-xl py-2 px-3.5 text-xs text-stone-850 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleSaveToTimeline}
                  disabled={!onAddManualLog}
                  className="bg-[#4A5D4E] hover:bg-[#3C4E40] text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm sm:shrink-0 w-full sm:w-auto cursor-pointer select-none"
                >
                  保存するとタイムラインに追加されます🐾
                </button>
              </div>
              <p className="text-[9.5px] text-stone-400">
                ※保存するとタイムラインに追加されます。ログイン中は自動的にバックアップされます。
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: CAUSAL CHAIN MAP (因果連鎖を可視化)
         ---------------------------------------------------- */}
      {activeSubTab === "causal" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-black/[0.03] shadow-sm space-y-3">
            <h3 className="font-serif font-black text-sm text-[#4A5D4E] flex items-center gap-1.5">
              <span>🧠 多重因果関係の連鎖フロー (Causal Cascade Analysis)</span>
            </h3>
            <p className="text-stone-500 text-[11px] leading-relaxed">
              人間の感情は単一の出来事ではなく、ドミノ倒しのように後続の状態に影響を与え続けます。
              以下は日常生活でよく起きる**「心境の因果連鎖シナリオ」**です。各ドミノをタップすると下流効果がハイライトされます。
            </p>

            {/* Cascade Flow Node diagrams inside responsive grid */}
            <div className="space-y-5 mt-4">
              
              {/* Scenario 1: Red Cascade (Negative) */}
              <div className="bg-red-50/40 border border-red-100 p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider font-mono font-black text-red-500 bg-red-100/70 px-2 py-0.5 rounded">
                  シナリオ A：ソーシャル・過緊張ループ
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 relative">
                  
                  {/* Node 1 */}
                  <div className="bg-white p-3 rounded-lg border border-red-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">📱</span>
                    <div>
                      <h4 className="text-xs font-black text-stone-800">1. SNSトラブル</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">嫌な投稿や攻撃的リプの目撃</p>
                    </div>
                  </div>

                  {/* Arrow for MD */}
                  <div className="hidden md:flex items-center justify-center text-stone-300">
                    <span className="text-xs font-mono">➜ 【ストレス急増】</span>
                  </div>

                  {/* Node 2 */}
                  <div className="bg-white p-3 rounded-lg border border-red-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">⚡</span>
                    <div>
                      <h4 className="text-xs font-black text-red-700">2. 自律神経過緊張</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">ストレスレベル +25 上昇</p>
                    </div>
                  </div>

                  {/* Arrow for MD */}
                  <div className="hidden md:flex items-center justify-center text-stone-300">
                    <span className="text-xs font-mono">➜ 【睡眠障害】</span>
                  </div>

                  {/* Node 3 */}
                  <div className="bg-white p-3 rounded-lg border border-red-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">😴</span>
                    <div>
                      <h4 className="text-xs font-black text-stone-800">3. 睡眠深度の低下</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">夜間の交感神経優位による不眠</p>
                    </div>
                  </div>

                  {/* Arrow for MD */}
                  <div className="hidden md:flex items-center justify-center text-stone-300">
                    <span className="text-xs font-mono">➜ 【認知機能】</span>
                  </div>

                  {/* Node 4 */}
                  <div className="bg-white p-3 rounded-lg border border-red-300 bg-red-50/20 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">📉</span>
                    <div>
                      <h4 className="text-xs font-black text-red-800">4. 翌日の集中低下</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">疲労度 +30, 集中力 -40% 急低下</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Scenario 2: Green Cascade (Positive Recovery) */}
              <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider font-mono font-black text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded">
                  シナリオ B：マインドフル・予防的ケア回復
                </span>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 relative">
                  
                  {/* Node 1 */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">🍃</span>
                    <div>
                      <h4 className="text-xs font-black text-stone-800">1. 青空の下での散歩</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">セロトニン分泌促進、視覚リフレッシュ</p>
                    </div>
                  </div>

                  {/* Arrow for MD */}
                  <div className="hidden md:flex items-center justify-center text-stone-300">
                    <span className="text-xs font-mono">➜ 【疲労回復】</span>
                  </div>

                  {/* Node 2 */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">😌</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-700">2. 安心感・喜びの上昇</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">安心感 +20%, 孤独度 -15% 減少</p>
                    </div>
                  </div>

                  {/* Arrow for MD */}
                  <div className="hidden md:flex items-center justify-center text-stone-300">
                    <span className="text-xs font-mono">➜ 【心境対話】</span>
                  </div>

                  {/* Node 3 */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">🗣️</span>
                    <div>
                      <h4 className="text-xs font-black text-stone-800">3. 第三者への感情シェア</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">孤独感が徹底減衰、回復ネットワーク形成</p>
                    </div>
                  </div>

                  {/* Arrow for MD */}
                  <div className="hidden md:flex items-center justify-center text-stone-300">
                    <span className="text-xs font-mono">➜ 【レジリエンス】</span>
                  </div>

                  {/* Node 4 */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-300 bg-emerald-50/20 shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex items-center gap-3">
                    <span className="text-xl select-none">🚀</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-800">4. レジリエンス(早期回復)</h4>
                      <p className="text-[9.5px] text-stone-500 mt-0.5">蓄積成長トリガーがオンになり本棚成長</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Quick coaching info */}
            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-dashed border-stone-200 flex items-start gap-2.5 mt-2">
              <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-stone-500 leading-normal">
                <strong>海馬からの知恵：</strong> ストレスイベントを防ぐことは不可能でも、「お散歩」や「信頼対話」などのセルフヘルプ・イベントを意図的にくさびとして差し挟むことで、連鎖のループを遮断できますにゃ。アバターの操作板で実際にイベントを打ってみて、数値の変化を観察してほしいにゃ🐾
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: CONTEXT COMPARISON & LIBRARY EVOLUTION
         ---------------------------------------------------- */}
      {activeSubTab === "compare" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT PANE: CONTEXT COMPARISON (span 7) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-black/[0.03] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-stone-100">
                <div>
                  <h3 className="font-serif font-black text-sm text-[#4A5D4E] flex items-center gap-1.5 leading-none">
                    <RefreshCw className="w-4 h-4 text-[#4A5D4E]" />
                    現在と過去の「脳内文脈（背景）」比較
                  </h3>
                  <p className="text-stone-400 text-[9.5px] mt-1 font-mono">
                    COMPARING CURRENT EVENT CONTEXT WITH SPECIFIC PAST METRICS
                  </p>
                </div>
                
                {/* Past case dropdown */}
                <select
                  value={selectedPastCaseId}
                  onChange={(e) => setSelectedPastCaseId(e.target.value)}
                  className="bg-stone-100 border-none outline-none text-[10px] font-bold text-stone-700 py-1.5 px-2.5 rounded-lg focus:ring-1 focus:ring-[#4A5D4E] cursor-pointer"
                >
                  <option value="past-1">過去事例A: タスクパンク</option>
                  <option value="past-2">過去事例B: SNS疎外感</option>
                  <option value="past-3">過去事例C: 人前プレゼン</option>
                </select>
              </div>

              {/* Side-by-side comparative layout cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Selected Current Status Card */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-2">
                  <div className="flex justify-between items-center bg-[#4A5D4E]/10 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold text-[#4A5D4E]">今回のあなた</span>
                    <span className="text-[9px] text-stone-500 font-mono">NOW / CURRENT</span>
                  </div>
                  
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span>・ストレス度:</span>
                      <strong className={states.stress > 60 ? "text-red-600" : "text-stone-700"}>{states.stress}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>・疲労状況:</span>
                      <strong className={states.fatigue > 60 ? "text-purple-600" : "text-stone-700"}>{states.fatigue}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>・安心・心の余白:</span>
                      <strong className="text-emerald-700">{states.safety}%</strong>
                    </div>
                  </div>
                  
                  <p className="text-[10.5px] text-stone-600 leading-normal bg-white p-2 rounded-lg border border-stone-100 mt-2 italic">
                    「{userNote.trim() || "目立った出来事の記述なし。穏やかに自己の深呼吸中。"}」
                  </p>
                </div>

                {/* Selected Past Case Comparison Card */}
                <div className="bg-amber-50/20 p-3.5 rounded-xl border border-amber-200/50 space-y-2">
                  <div className="flex justify-between items-center bg-amber-500/10 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {activePastCase.date}
                    </span>
                    <span className="text-[9px] text-amber-600 font-mono">PAST REFERENCE</span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span>・過去ストレス:</span>
                      <strong className="text-stone-700">{activePastCase.stress}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>・過去疲労度:</span>
                      <strong className="text-stone-700">{activePastCase.fatigue}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>・事態の名称:</span>
                      <strong className="text-amber-800 text-[10px] overflow-hidden truncate max-w-[90px]">{activePastCase.title}</strong>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-stone-500 leading-normal bg-white p-2 rounded-lg border border-stone-100/50 mt-2 italic">
                    前回は余裕がなく、他者へヘルプを求めることすら罪悪感を感じていた時期にゃ。
                  </p>
                </div>

              </div>

              {/* Automatic cognitive comparison breakdown boxes */}
              <div className="space-y-2 text-xs pt-1">
                
                {/* 1. 共通点 */}
                <div className="bg-[#FDFCFB] p-3 rounded-xl border border-stone-200/60">
                  <span className="font-serif font-black text-[#5C5C55] text-[11px] block text-stone-850 mb-1">
                    🔍 本質的な共通点 (What patterns have repeating factors?)
                  </span>
                  <p className="text-stone-600 leading-relaxed text-[10.5px]">{activePastCase.commons}</p>
                </div>

                {/* 2. 違う点 */}
                <div className="bg-[#FAFBF9] p-3 rounded-xl border border-stone-200/60">
                  <span className="font-serif font-black text-emerald-800 text-[11px] block mb-1">
                    ☘️ 違う点・認知や環境の変化 (What has evolved since then?)
                  </span>
                  <p className="text-stone-600 leading-relaxed text-[10.5px]">{activePastCase.diffs}</p>
                </div>

                {/* 3. 回復速度、利用できる支援、成長ポイント */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/50">
                    <span className="font-sans font-bold text-stone-700 text-[10px] block">⏱️ 今回の回復の速さ</span>
                    <p className="text-stone-500 text-[10px] mt-1 leading-normal">{activePastCase.recoverySpeed}</p>
                  </div>
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/50">
                    <span className="font-sans font-bold text-stone-700 text-[10px] block">🛡️ 動員できた支援策</span>
                    <p className="text-stone-500 text-[10px] mt-1 leading-normal">{activePastCase.supportUsed}</p>
                  </div>
                  <div className="bg-emerald-50/20 p-2.5 rounded-lg border border-emerald-200/40">
                    <span className="font-sans font-bold text-emerald-800 text-[10px] block">✨ あなたの内的成長ポイント</span>
                    <p className="text-emerald-700 text-[10px] mt-1 leading-normal font-black">{activePastCase.growth}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT PANE: BOOKSHELF EVOLUTION PROGRESS (span 5) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-black/[0.03] shadow-sm flex flex-col justify-between space-y-4">
              <div className="border-b pb-2.5 border-stone-100">
                <h3 className="font-serif font-black text-sm text-[#4A5D4E] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#4A5D4E]" />
                  脳内本棚の成長ステータス
                </h3>
                <p className="text-stone-400 text-[9.5px] mt-1 font-mono">
                  ACCUMULATED RECORDS LIBRARY EVOLUTION PATH
                </p>
              </div>

              {/* Graphic representation of bookshelf growth */}
              <div className="py-2 flex flex-col items-center">
                <div className="w-24 h-24 bg-stone-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-[#4A5D4E]/20 relative shadow-inner">
                  {/* Floating emojis/cat badges depicting level */}
                  <span className="text-4xl animate-pulse select-none">
                    {totalLogsCount < 100 ? "📄" :
                     totalLogsCount < 500 ? "📓" :
                     totalLogsCount < 1000 ? "📚" :
                     totalLogsCount < 5000 ? "🕌" : "🏛️"}
                  </span>
                </div>
                
                <h4 className="font-serif font-black text-stone-800 text-sm mt-3">{growthTierName}</h4>
                <p className="text-center text-stone-500 text-[10px] mt-1.5 leading-relaxed px-2">
                  {growthTierDesc}
                </p>
              </div>

              {/* Progress Slider Display */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-stone-500 font-mono">記録件数: <strong className="text-stone-850 font-black">{totalLogsCount}件</strong></span>
                  <span className="text-emerald-700 font-black">次の節目まで {100 - Math.floor(growthProgress % 100)}%</span>
                </div>
                
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#4A5D4E] to-emerald-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(5, growthProgress))}%` }}
                  ></div>
                </div>

                <div className="text-[9px] text-stone-400 font-mono flex justify-between pt-0.5">
                  <span>現在: {growthTierName}</span>
                  <span>次: {nextMilestone}</span>
                </div>
              </div>

              {/* Cat Librarian tip */}
              <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 text-[10px] text-stone-600 leading-normal font-medium">
                🐈 <strong>司書猫からの応援：</strong><br />
                「アバターを操作して記録を保存する。この些細な行動があなたのタイムラインを豊かに編み上げ、脳内図書館を大きく成長させていくのにゃ。あせらず一歩ずつ綴じあげていこうにゃ🐾」
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
