import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, MessagesSquare, Smile, Sparkles, Settings, Check, X } from "lucide-react";
import { AppSettings } from "../types";

interface LibrarianCatProps {
  settings: AppSettings;
  latestComment?: string;
  isAnalyzing?: boolean;
  onUpdateSettings?: (settings: AppSettings) => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  onImportRawText?: (text: string) => boolean;
  onImportBackupJson?: (text: string) => boolean;
  onUndoImport?: () => void;
  canUndoImport?: boolean;
  onOpenLsaModal?: () => void;
}

export default function LibrarianCat({
  settings,
  latestComment,
  isAnalyzing,
  onUpdateSettings,
  onToast,
  onImportRawText,
  onImportBackupJson,
  onUndoImport,
  canUndoImport,
  onOpenLsaModal
}: LibrarianCatProps) {
  const [mood, setMood] = useState<"neutral" | "happy" | "purring" | "studious" | "sleepy">("neutral");
  const [petCount, setPetCount] = useState<number>(0);
  const [chatMessage, setChatMessage] = useState<string>("");
  const [showHeart, setShowHeart] = useState(false);

  // Quick edit state inside Libraran Cat’s room
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(settings.catNpcName);
  const [tempEngine, setTempEngine] = useState(settings.aiEngine);

  // Bottom Interactive Modules states
  const [showImportSection, setShowImportSection] = useState(false);
  const [showDonationSection, setShowDonationSection] = useState(false);
  const [importTab, setImportTab] = useState<"text" | "json">("text");
  const [localTextVal, setLocalTextVal] = useState("");
  const [localJsonVal, setLocalJsonVal] = useState("");

  useEffect(() => {
    setTempName(settings.catNpcName);
    setTempEngine(settings.aiEngine);
  }, [settings.catNpcName, settings.aiEngine]);

  // Librarian cat custom prompt dialogue depending on engine and mood
  const getCatWelcome = () => {
    const engine = settings.aiEngine;
    if (engine === "ChatGPT") {
      return `「脳内図書館」へようこそにゃ。インプットを頂ければ、論理的に文脈を整理しますにゃ。右の「もふもふエリア」で撫でてもらっても大丈夫ですにゃ♪`;
    } else if (engine === "Claude") {
      return `ふふ、心の扉を開けてくれて嬉しいにゃ。あなたの言葉の奥にある繊細な心のグラデーションを、そっと読み解きますにゃ。…本を読んでいるので、お静かにもふもふしてにゃ。`;
    } else {
      return `あ、来たにゃ！今日はどんな出来事のピースを見つけたにゃ？いっぱいお話しして、あなたの頭と体の「行動地図」をつむいでいくにゃあ！🐾`;
    }
  };

  useEffect(() => {
    if (isAnalyzing) {
      setMood("studious");
      setChatMessage("あなたの海馬を一生懸命スキャン中だにゃ…！少し待っててにゃ！");
    } else if (latestComment) {
      setMood("happy");
      setChatMessage(latestComment);
    } else {
      setChatMessage(getCatWelcome());
    }
  }, [latestComment, isAnalyzing, settings.aiEngine]);

  const handlePet = () => {
    setPetCount((prev) => prev + 1);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);

    // Dynamic dialogue on pet
    const petDialogues = [
      "にゃ、にゃあお〜（目を細めて喉を鳴らしている）",
      "もっ、もふもふされて幸せそうだにゃ…ごろごろごろ…",
      "そこ、一番気持ちいいところにゃ！さすが私のパートナーにゃ！",
      "ゴロゴロゴロ……（あなたのストレスが猫に吸い取られて消えていく感覚）",
      "ふはぁ、本を読む手が止まっちゃうにゃ。でも撫でられるのは大好きにゃあ…🐾",
      "もっと！もっともふもふするにゃ！",
    ];
    
    setMood("purring");
    const randomIndex = Math.floor(Math.random() * petDialogues.length);
    setChatMessage(petDialogues[randomIndex]);

    // Revert back to happy or neutral after 4 seconds
    setTimeout(() => {
      setMood("happy");
    }, 4000);
  };

  // Fun helper to get NPC specific avatar styles or drawings using pure CSS/SVG
  // It ensures incredibly high fidelity and polished vectors!
  const renderCatSvg = () => {
    const isSleepy = mood === "sleepy";
    const isHappy = mood === "happy" || mood === "purring";
    const isStudious = mood === "studious";

    // Dynamic coloring based on AI Engine style
    let earColor = "fill-amber-300";
    let bodyColor = "fill-amber-100";
    let stripeColor = "fill-amber-200";
    let collarColor = "fill-sage-500";

    if (settings.aiEngine === "ChatGPT") {
      bodyColor = "fill-slate-100";
      earColor = "fill-emerald-300";
      stripeColor = "fill-slate-200";
      collarColor = "fill-emerald-600";
    } else if (settings.aiEngine === "Claude") {
      bodyColor = "fill-stone-100";
      earColor = "fill-red-200";
      stripeColor = "fill-stone-200";
      collarColor = "fill-amber-600";
    }

    return (
      <svg viewBox="0 0 200 200" className="w-40 h-40 drop-shadow-md mx-auto transition-all duration-300">
        {/* Cat Body */}
        <ellipse cx="100" cy="140" rx="60" ry="45" className={bodyColor} />
        
        {/* Striping / Tail details */}
        <path d="M 152 153 C 170 170, 180 140, 175 125 C 170 110, 155 120, 155 135 Z" className={stripeColor} />
        
        {/* Left Ear */}
        <motion.path 
          d="M 50 75 Q 35 30 75 45 Z" 
          className={bodyColor}
          animate={isHappy ? { rotate: [-2, 5, -2] } : {}}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <path d="M 53 68 Q 43 42 67 52 Z" className={earColor} />

        {/* Right Ear */}
        <motion.path 
          d="M 150 75 Q 165 30 125 45 Z" 
          className={bodyColor}
          animate={isHappy ? { rotate: [2, -5, 2] } : {}}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.2 }}
        />
        <path d="M 147 68 Q 157 42 133 52 Z" className={earColor} />

        {/* Head */}
        <ellipse cx="100" cy="95" rx="55" ry="45" className={bodyColor} />

        {/* Stripes on Head */}
        <path d="M 90 52 L 100 65 L 110 52 Z" className={stripeColor} />
        <path d="M 75 58 L 85 68 L 80 72 Z" className={stripeColor} />
        <path d="M 125 58 L 115 68 L 120 72 Z" className={stripeColor} />

        {/* Dynamic Eyes */}
        {isSleepy || mood === "purring" ? (
          <>
            {/* Happy closed eyes ^ ^ */}
            <path d="M 65 95 Q 75 88 85 95" stroke="#4A3B32" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M 115 95 Q 125 88 135 95" stroke="#4A3B32" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : isHappy ? (
          <>
            {/* Big happy eyes */}
            <circle cx="75" cy="95" r="7" fill="#4B3C31" />
            <circle cx="125" cy="95" r="7" fill="#4B3C31" />
            {/* Highlights */}
            <circle cx="73" cy="93" r="2.5" fill="#FFFFFF" />
            <circle cx="123" cy="93" r="2.5" fill="#FFFFFF" />
            {/* Cheeks blush */}
            <ellipse cx="62" cy="105" rx="7" ry="4" fill="#FFB2B2" opacity="0.6" />
            <ellipse cx="138" cy="105" rx="7" ry="4" fill="#FFB2B2" opacity="0.6" />
          </>
        ) : isStudious ? (
          <>
            {/* Smart analytical glasses */}
            <circle cx="75" cy="95" r="9" stroke="#E18A3C" strokeWidth="3.5" fill="none" />
            <circle cx="125" cy="95" r="9" stroke="#E18A3C" strokeWidth="3.5" fill="none" />
            <line x1="84" y1="95" x2="116" y2="95" stroke="#E18A3C" strokeWidth="3.5" />
            <circle cx="75" cy="95" r="4" fill="#2E2520" />
            <circle cx="125" cy="95" r="4" fill="#2E2520" />
          </>
        ) : (
          <>
            {/* Normal quiet eyes */}
            <circle cx="75" cy="95" r="6" fill="#4B3C31" />
            <circle cx="125" cy="95" r="6" fill="#4B3C31" />
            <circle cx="73" cy="93" r="2" fill="#FFFFFF" />
            <circle cx="123" cy="93" r="2" fill="#FFFFFF" />
          </>
        )}

        {/* Nose & Mouth */}
        <polygon points="97,105 103,105 100,108" fill="#FF9E9E" />
        <path d="M 94 112 Q 100 116 100 112 Q 100 116 106 112" stroke="#4B3C31" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Whiskers */}
        <line x1="45" y1="105" x2="15" y2="102" stroke="#4B3C31" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="45" y1="113" x2="18" y2="115" stroke="#4B3C31" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="155" y1="105" x2="185" y2="102" stroke="#4B3C31" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="155" y1="113" x2="182" y2="115" stroke="#4B3C31" strokeWidth="2.5" strokeLinecap="round" />

        {/* Cute Ribbon with Golden Bell */}
        <rect x="75" y="132" width="50" height="8" rx="4" className={collarColor} />
        {/* Bell */}
        <circle cx="100" cy="140" r="8" fill="fill-yellow-400" className="fill-yellow-400 stroke-yellow-600 stroke-1" />
        <circle cx="100" cy="142" r="2.5" fill="#5C4524" />
      </svg>
    );
  };

  return (
    <div className="bg-amber-50/40 rounded-3xl p-6 border border-amber-100/60 shadow-xs relative overflow-hidden backdrop-blur-xs">
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <div className="text-[10px] sm:text-xs bg-amber-100/80 text-amber-800 font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          司書猫の応接室
        </div>
        {onUpdateSettings && (
          <button
            type="button"
            onClick={() => {
              onUpdateSettings({ ...settings, showLibrarianCat: false });
              onToast?.("AI司書猫機能をお休み（非表示）にしたにゃ。設定タブからいつでも再開（表示）できますにゃ🐾", "info");
            }}
            className="p-1 bg-amber-100/40 text-amber-800 hover:bg-amber-100 hover:text-amber-950 rounded-full transition-all cursor-pointer flex items-center justify-center"
            title="司書猫機能をオフ（非表示）にする"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Cat Avatar Space / Pet Target */}
        <div className="md:col-span-4 flex flex-col items-center justify-center relative">
          <div 
            onClick={handlePet}
            className="cursor-pointer group relative active:scale-95 transition-all duration-150 rounded-full p-2 hover:bg-amber-100/40"
            title="なでなでもふもふする🐾"
          >
            {renderCatSvg()}

            {/* floating heart animation on pet */}
            <AnimatePresence>
              {showHeart && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 0 }}
                  animate={{ opacity: 1, scale: 1.2, y: -60 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute pointer-events-none inset-0 flex items-center justify-center text-red-500"
                >
                  <Heart className="w-12 h-12 fill-red-400" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pulsing indicator to invite pet */}
            <div className="absolute bottom-2 bg-amber-800/80 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xs pointer-events-none whitespace-nowrap">
              クリックでもふもふ🐾
            </div>
          </div>
          
          <div className="mt-2 text-center">
            <span className="font-medium text-amber-950 text-sm">{settings.catNpcName} 司書長</span>
            <div className="text-xs text-amber-700 font-mono mt-0.5">
              もふもふ：{petCount} 回
            </div>
          </div>
        </div>

        {/* Cat Speech Bubble */}
        <div className="md:col-span-8 flex flex-col">
          <div className="relative bg-white border border-amber-100 rounded-2xl p-5 shadow-xs flex-1">
            <div className="absolute left-1/2 md:left-0 top-0 md:top-1/2 transform -translate-x-1/2 md:-translate-x-3 -translate-y-4 md:-translate-y-1/2 rotate-90 md:rotate-0">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-r-12 border-r-white border-b-8 border-b-transparent"></div>
              <div className="w-0 h-0 border-t-8 border-t-transparent border-r-12 border-r-amber-100 border-b-8 border-b-transparent absolute top-0 -left-[1px] -z-10"></div>
            </div>

            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-black/[0.02]">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-800">
                <MessagesSquare className="w-4 h-4 text-amber-600" />
                <span>{settings.catNpcName} ({settings.aiEngine}エンジン)</span>
                {mood === "purring" && (
                  <span className="text-pink-600 flex items-center gap-1 animate-pulse">
                    <Smile className="w-3 h-3" /> ごロゴロ中…
                  </span>
                )}
              </div>
              
              {onUpdateSettings && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-2 py-1 bg-amber-100/40 hover:bg-amber-100/80 hover:text-amber-900 rounded-lg transition-all text-[#8A8471] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  title="司書の名前・キャラクターを変更"
                >
                  <Settings className="w-3 h-3 text-amber-700" />
                  <span>{isEditing ? "閉じる" : "名前・性格変更 🐾"}</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3 animate-fadeIn text-xs">
                {/* 1. Name edit */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-amber-850">🐈‍⬛ 司書猫の新しいお名前:</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="ノア..."
                    className="w-full bg-[#FAF9F5] border border-[#EBE1D0] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] text-[#33332D] font-medium"
                  />
                </div>

                {/* 2. AI engine / personality edit */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-amber-850">🌌 司書キャラクター (AI魂):</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTempEngine("Gemini")}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                        tempEngine === "Gemini"
                          ? "bg-[#4A5D4E] text-white border-[#4A5D4E] shadow-sm"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <span className="text-amber-400">✨</span>
                      <span>Gemini猫</span>
                      <span className="text-[8px] opacity-75 font-normal">親友・冒険</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempEngine("ChatGPT")}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                        tempEngine === "ChatGPT"
                          ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <span className="text-emerald-400">💬</span>
                      <span>ChatGPT猫</span>
                      <span className="text-[8px] opacity-75 font-normal">論理・丁寧</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempEngine("Claude")}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                        tempEngine === "Claude"
                          ? "bg-[#D97706] text-white border-[#D97706] shadow-sm"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <span className="text-orange-400">✒️</span>
                      <span>Claude猫</span>
                      <span className="text-[8px] opacity-75 font-normal">詩人コパイ</span>
                    </button>
                  </div>
                </div>

                {/* 3. Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-black/[0.02]">
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(settings.catNpcName);
                      setTempEngine(settings.aiEngine);
                      setIsEditing(false);
                    }}
                    className="px-2.5 py-1 text-[11px] text-[#8A8471] hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalName = tempName.trim() || settings.catNpcName || "司書猫";
                      if (onUpdateSettings) {
                        onUpdateSettings({
                          ...settings,
                          catNpcName: finalName,
                          aiEngine: tempEngine,
                        });
                      }
                      onToast?.(`AI司書を『${finalName} (${tempEngine}仕様)』に変更したにゃ！🐾`, "success");
                      setIsEditing(false);
                    }}
                    className="px-3.5 py-1 bg-[#4A5D4E] hover:bg-[#3b4a3e] text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3 h-3" />
                    保存するにゃ🐾
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-amber-950/90 text-sm leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto pr-1">
                {chatMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Cozy Bottom Interaction Bar (Imports & Donations) */}
      <div className="border-t border-amber-200/50 mt-5 pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-[11px] text-[#868070] font-bold flex items-center gap-1 font-mono">
            <span>🐾 司書猫へのご要望やデータのインポートはこちらからどうぞにゃ！</span>
          </p>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setShowImportSection(!showImportSection);
                setShowDonationSection(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                showImportSection 
                  ? "bg-[#4A5D4E] text-white" 
                  : "bg-white hover:bg-amber-100/30 text-[#4A5D4E] border border-amber-100/60"
              }`}
            >
              <span>インポート機能 📥</span>
              <span className="text-[9px] opacity-80">{showImportSection ? "▲ 閉じる" : "▼ 開く"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDonationSection(!showDonationSection);
                setShowImportSection(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                showDonationSection 
                  ? "bg-[#D97706] text-white animate-pulse" 
                  : "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200/50"
              }`}
            >
              <span>ご寄付待ってるにゃ ☕🐾</span>
              <span className="text-[9px] opacity-80">{showDonationSection ? "▲ 閉じる" : "▼ 開く"}</span>
            </button>

            {canUndoImport && onUndoImport && (
              <button
                type="button"
                onClick={onUndoImport}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 animate-pulse"
                title="直前に一括インポートした文章をすべて一括削除して元の状態に戻します"
              >
                <span>直前のインポート取消 ↩️🐾</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Importer Module */}
        {showImportSection && (
          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-inner space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center gap-2 border-b border-black/[0.03] pb-2">
              <button
                type="button"
                onClick={() => setImportTab("text")}
                className={`pb-1 px-1.5 font-bold transition-all cursor-pointer ${
                  importTab === "text" 
                    ? "text-[#4A5D4E] border-b-2 border-[#4A5D4E]" 
                    : "text-[#8A8471] hover:text-[#33332D]"
                }`}
              >
                ✍️ 1行メモから一括インポート
              </button>
              <button
                type="button"
                onClick={() => setImportTab("json")}
                className={`pb-1 px-1.5 font-bold transition-all cursor-pointer ${
                  importTab === "json" 
                    ? "text-[#4A5D4E] border-b-2 border-[#4A5D4E]" 
                    : "text-[#8A8471] hover:text-[#33332D]"
                }`}
              >
                💾 JSONバックアップ復元
              </button>
            </div>

            {importTab === "text" ? (
              <div className="space-y-3">
                <p className="text-[10px] text-stone-600 leading-relaxed font-semibold">
                  「日付 内容 #タグ」のように、1行につき1つのメモ・記憶を記述して、一括で脳内タイムラインに流し込めます🐾
                </p>
                <div className="bg-[#FAF9F5] p-2 rounded-xl text-[10px] text-amber-900/70 font-mono leading-relaxed max-w-full overflow-x-auto text-left whitespace-pre">
                  <span>2026/06/15 15:30 運動してたくさん汗をかいた！ #健康 #お散歩</span><br />
                  <span>6/14 公園を散歩、とてもいい天気だった #日記</span>
                </div>
                <div className="relative">
                  <textarea
                    value={localTextVal}
                    onChange={(e) => setLocalTextVal(e.target.value)}
                    onPaste={(e) => {
                      const pastedData = e.clipboardData.getData("text");
                      if (pastedData) {
                        e.preventDefault();
                        setLocalTextVal((prev) => prev ? prev + "\n" + pastedData : pastedData);
                      }
                    }}
                    placeholder="ここに日付と項目などを含むテキストを1行ずつ入力・ペーストしてくださいにゃ🐾"
                    className="w-full h-28 p-2.5 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] text-xs font-semibold text-stone-800 animate-none"
                  />
                </div>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenLsaModal && (
                      <button
                        type="button"
                        onClick={onOpenLsaModal}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#4A5D4E] border border-amber-200 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs shadow-2xs"
                        title="インポート保存されている記憶IDの履歴(localStorage)をいつでも確認・手動クリア・直接編集できます🐾"
                      >
                        <span>📋 ID履歴 (localStorage) 🐾</span>
                      </button>
                    )}
                    {canUndoImport && onUndoImport && (
                      <button
                        type="button"
                        onClick={onUndoImport}
                        className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 border-2 border-rose-300 font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-xs animate-pulse"
                        title="直前に一括インポートした文章をすべて一括削除して元の状態に戻します🐾"
                      >
                        <span>↩️ インポートを全削除（取消）</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!localTextVal.trim()) {
                        onToast?.("テキストが空っぽにゃ！", "error");
                        return;
                      }
                      if (onImportRawText) {
                        const ok = onImportRawText(localTextVal);
                        if (ok) {
                          setLocalTextVal("");
                          // Keep the import section open so that the user can immediately see the cancel/undo option!
                          onToast?.("簡易テキストから記憶のインポートに成功したにゃ！もし間違えても左下の「インポートを全削除」で元に戻せるよ🐾", "success");
                        }
                      } else {
                        onToast?.("インポート処理を呼び出せませんでしたにゃ。", "error");
                      }
                    }}
                    className="px-4 py-1.5 bg-[#4A5D4E] hover:bg-[#3b4a3e] text-white font-bold rounded-xl transition-all flex items-all gap-1 cursor-pointer text-xs justify-center"
                  >
                    タイムラインに一括インポート 🐾
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] text-stone-600 leading-relaxed font-semibold">
                  以前に「ポータビリティ」設定等から書き出したJSONバックアップデータを貼り付けることで、図書館の全データを復元します。
                </p>
                <div className="relative">
                  <textarea
                    value={localJsonVal}
                    onChange={(e) => setLocalJsonVal(e.target.value)}
                    onPaste={(e) => {
                      const pastedData = e.clipboardData.getData("text");
                      if (pastedData) {
                        e.preventDefault();
                        setLocalJsonVal(pastedData);
                      }
                    }}
                    placeholder="JSONデータをここに貼り付けてください🐾"
                    className="w-full h-28 p-2.5 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] text-xs font-mono text-stone-800"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!localJsonVal.trim()) {
                        onToast?.("JSONが空っぽにゃ！", "error");
                        return;
                      }
                      if (onImportBackupJson) {
                        const ok = onImportBackupJson(localJsonVal);
                        if (ok) {
                          setLocalJsonVal("");
                          setShowImportSection(false);
                          onToast?.("JSONバックアップから全データを完全に復元したにゃ！", "success");
                        } else {
                          onToast?.("データの復元に失敗したにゃ。ファイル内容を確認してにゃ🐾", "error");
                        }
                      } else {
                        onToast?.("インポート処理を呼び出せませんでしたにゃ。", "error");
                      }
                    }}
                    className="px-4 py-1.5 bg-[#4A5D4E] hover:bg-[#3b4a3e] text-white font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs justify-center"
                  >
                    JSONから完全復元 🐾
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Donations Module */}
        {showDonationSection && (
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-inner space-y-3 animate-fadeIn text-xs text-left">
            <div className="flex items-center gap-1.5 text-amber-900 border-b border-black/[0.03] pb-1.5">
              <span className="text-sm">☕🐾 </span>
              <span className="font-bold font-serif">司書長たちへの活動支援・お気持ちご寄付（模擬）</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
              脳内図書館および司書猫のキャットフードや読書用コーヒー差し入れの継続サポートをご支援いただけます🐾<br />
              アイテムを選択すると、司書猫が喜んで目を細め、特別な感謝メッセージを語りだしますにゃ！
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
              {[
                {
                  id: "fish",
                  emoji: "🐟",
                  title: "高級カリカリお魚缶",
                  price: "¥500",
                  desc: "おいしいご飯でお腹いっぱいにゃ！",
                  effectText: "わああ！お魚にゃ！！最高においしいご飯だにゃあ！お腹いっぱいになって、あなたの記憶分析をもっともっと頑張れるにゃあ！🐾✨"
                },
                {
                  id: "matatabi",
                  emoji: "🌿",
                  title: "極上ハーブまたたび",
                  price: "¥1,000",
                  desc: "ふにゃ〜〜極楽のごろごろ気分にゃ",
                  effectText: "ふにゃ〜〜ん♪またたびの香りで頭がとろけちゃうにゃ…ゴロゴロゴロ…あなたの物語の奥にある繊細な心のグラデーションを、もっと熱烈に分析しちゃうにゃ🐾"
                },
                {
                  id: "coffee",
                  emoji: "☕",
                  title: "挽きたて深煎りコーヒー",
                  price: "¥300",
                  desc: "夜遅くの学習・分析に集中力UPにゃ",
                  effectText: "にゃっ！挽きたてのいい香りにゃ！これで夜遅くの読書や海馬データの整理もバッチリにゃ！集中力が100倍になったにゃ🐾"
                },
                {
                  id: "fund",
                  emoji: "📜",
                  title: "書棚・古書修繕プロジェクト",
                  price: "¥3,000",
                  desc: "脳内図書館の棚をリニューアル！",
                  effectText: "にゃにゃにゃあ！！こんなにたくさんのご支援を…！？脳内図書館の棚が新しくになって、もっと多くの想い出本を並べられるにゃあ。一生ついていくにゃ🐾😭"
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPetCount((prev) => prev + 5);
                    setMood("purring");
                    setChatMessage(opt.effectText);
                    setShowHeart(true);
                    setTimeout(() => setShowHeart(false), 900);
                    onToast?.(`特別な贈り物「${opt.title} (${opt.price})」を差し入れたにゃ！大感謝にゃ！🐾💖`, "success");
                    setShowDonationSection(false);
                  }}
                  className="bg-[#FAF9F5] hover:bg-amber-50 rounded-xl p-3 border border-stone-200 transition-all hover:border-[#D97706] text-left cursor-pointer flex flex-col justify-between group active:scale-95 duration-100"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-lg group-hover:scale-125 transition-transform">{opt.emoji}</span>
                      <span className="text-[10px] font-bold bg-[#D97706]/10 text-[#D97706] px-1.5 py-0.5 rounded-sm">{opt.price}</span>
                    </div>
                    <span className="font-bold text-[11px] block text-stone-800">{opt.title}</span>
                    <span className="text-[9px] text-[#8A8471] block mt-0.5 leading-relaxed">{opt.desc}</span>
                  </div>
                  <span className="text-[9px] text-amber-700 text-right block mt-2 font-bold group-hover:text-[#D97706] transition-colors">
                    差し入れる 🐾 ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
