import React, { useState, useEffect, useRef } from "react";
import { Mic, Info, Sparkles, ChevronDown, ChevronUp, Smile, Tag, Activity } from "lucide-react";
import { DETAILED_EMOTIONS } from "../utils/emotions";

interface AudioLoggerProps {
  onAddEntry: (text: string, manualNote: string, tags: string[], date: string, emotions: string[]) => Promise<void>;
  isAnalyzing: boolean;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AudioLogger({ onAddEntry, isAnalyzing, onToast }: AudioLoggerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [recTimer, setRecTimer] = useState(0);
  const [simulatedVoicePulse, setSimulatedVoicePulse] = useState(0);
  const [inputTags, setInputTags] = useState<string[]>(["プライベート", "仕事"]);
  const [newTagInput, setNewTagInput] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [showEmotionsGrid, setShowEmotionsGrid] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Dates
  const [logDateInput, setLogDateInput] = useState("");
  const [logTimeInput, setLogTimeInput] = useState("");

  const recIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Default system date and times
    const now = new Date();
    setLogDateInput(now.toISOString().split("T")[0]);
    setLogTimeInput(now.toTimeString().substring(0, 5));

    // Web Speech API check
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "ja-JP";

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInputText((prev) => (prev ? prev + " " + finalTranscript : finalTranscript));
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsRecording(false);
        if (recIntervalRef.current) {
          clearInterval(recIntervalRef.current);
          recIntervalRef.current = null;
        }

        let errMsg = "音声認識でエラーが発生しましたにゃ。";
        if (err.error === "not-allowed" || err.error === "service-not-allowed") {
          errMsg = "マイク使用が不許可またはブロックされていますにゃ🎙️。ブラウザでマイク権限を許可するか、右上にある『新規タブで開く』から単独タブで開いてお試しください。";
          setShowTroubleshoot(true);
        } else if (err.error === "no-speech") {
          errMsg = "音声が検出されませんでしたにゃ🐾。お話し声の大きさを確認してください。";
        } else if (err.error === "network") {
          errMsg = "音声認識通信エラーですにゃ。ネットワーク接続状況をご確認ください。";
        } else if (err.error === "audio-capture") {
          errMsg = "音声入力デバイス（マイク）が見つかりませんにゃ🐾";
        }
        onToast(errMsg, "error");
      };

      recognitionRef.current = rec;
    } else {
      setIsSpeechSupported(false);
    }

    return () => {
      if (recIntervalRef.current) {
        clearInterval(recIntervalRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!isSpeechSupported) {
      onToast("お使いのブラウザは音声認識をサポートしていませんにゃ。手入力をご利用ください🐾", "info");
      return;
    }
    
    setInputText("");
    setIsRecording(true);
    setRecTimer(0);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Start recognition failed:", e);
      }
    }
    
    recIntervalRef.current = setInterval(() => {
      setRecTimer((prev) => prev + 1);
      setSimulatedVoicePulse((prev) => prev + 0.2);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recIntervalRef.current) {
      clearInterval(recIntervalRef.current);
      recIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (!inputText) {
      setInputText("（音声入力に失敗したにゃ。マイク許可を確認して手動入力をお試しくださいにゃ🐾）");
    } else {
      onToast("文字起こしに成功したにゃあ！", "success");
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, "");
    if (trimmed && !inputTags.includes(trimmed)) {
      setInputTags([...inputTags, trimmed]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setInputTags(inputTags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTranscript = inputText.trim();
    if (!finalTranscript && !manualNote.trim()) {
      onToast("なにか話すか、ペン元の補足手入力メモを入力してくださいにゃ🐾", "error");
      return;
    }

    try {
      const finalDateTimeStr = `${logDateInput}T${logTimeInput}:00`;
      await onAddEntry(finalTranscript, manualNote, inputTags, finalDateTimeStr, selectedEmotions);
      
      // Clear
      setInputText("");
      setManualNote("");
      setInputTags(["プライベート"]);
      setSelectedEmotions([]);
    } catch {
      onToast("保存プロセスに失敗しましたにゃ。", "error");
    }
  };

  return (
    <div id="audio-logger-card" className="bg-[#F7FFF7] text-[#455A64] rounded-2xl p-2.5 sm:p-3 shadow-sm border border-[#A5D6A7]/40 transition-all">
      {isRecording ? (
        <div className="bg-[#E8F5E9] border border-[#A5D6A7]/40 rounded-xl py-1.5 px-3 mb-1.5 text-center relative overflow-hidden">
          <div className="flex justify-center items-center gap-1">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
            <span className="text-[9px] font-bold text-rose-600 leading-none">
              音声聞き取り中（耳を澄ましてるにゃ🐾）
            </span>
          </div>
          <span className="font-mono text-xs block text-[#455A64] font-black my-0.5 leading-none">
            {Math.floor(recTimer / 60)}:{(recTimer % 60).toString().padStart(2, "0")}
          </span>

          {/* Waveforms - Highly height-compressed */}
          <div className="flex justify-center items-end gap-0.5 h-3.5 my-0.5">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="w-0.75 bg-[#81C784] rounded-full transition-all duration-150"
                style={{
                  height: `${Math.max(15, Math.sin(simulatedVoicePulse + i) * 75 + 10 + Math.random() * 8)}%`,
                }}
              ></div>
            ))}
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-full text-[9px] font-bold transition-all shadow mx-auto cursor-pointer leading-tight"
          >
            話すのを終了して反映にゃ🐾
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-1.5 px-2 bg-[#E8F5E9] border border-[#A5D6A7]/30 rounded-xl mb-1.5 gap-1.5">
          <button
            type="button"
            onClick={startRecording}
            className="w-10 h-10 bg-[#81C784] hover:bg-[#66BB6A] active:scale-95 text-white rounded-full flex items-center justify-center shadow hover:shadow-emerald-500/10 transition-all border-2 border-white/20 group cursor-pointer"
          >
            <Mic className="w-4.5 h-4.5 group-hover:scale-105 transition-transform text-white" />
          </button>
          <span className="text-[10px] font-bold text-[#455A64] leading-none tracking-tight">
            ワンタップで音声録音・文字起こしを開始
          </span>
          <p className="text-[8.5px] text-[#455A64]/70 leading-none tracking-tight">
            マイクをタップして話し始めるか、手入力・シミュレートをご利用ください🐾
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1.5">
        {/* Texts Row - Highly compressed textareas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold text-[#455A64] mb-1 tracking-tight leading-none">
              音声の書き起こし
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="自動テキスト変換されます。直接編集も可能です🐾"
              className="w-full h-14 sm:h-16 px-2 py-1 text-[10px] bg-white text-[#33332D] border border-[#A5D6A7]/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#81C784] resize-y leading-snug font-medium"
            ></textarea>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-[#455A64] mb-1 tracking-tight leading-none">
              私の手入力補足メモ
            </label>
            <textarea
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="状況背景や感情、余韻をさらに詳しく補いつづりたい時に📝"
              className="w-full h-14 sm:h-16 px-2 py-1 text-[10px] bg-white text-[#33332D] border border-[#A5D6A7]/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#81C784] resize-y leading-snug font-medium"
            ></textarea>
          </div>
        </div>

        {/* --- DETAILED 46 EMOTIONS ROW --- */}
        <div className="bg-white/60 rounded-xl p-2 border border-[#A5D6A7]/20">
          <button
            type="button"
            onClick={() => setShowEmotionsGrid(!showEmotionsGrid)}
            className="w-full flex items-center justify-between text-[9px] sm:text-[10px] font-black text-[#455A64] hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>🎭 今日感じた感情を紐づける（46種類のカラーラベリングボタン）</span>
              {selectedEmotions.length > 0 && (
                <span className="bg-amber-500 text-white font-mono text-[8.5px] px-1.5 py-0.2 rounded-full font-bold">
                  {selectedEmotions.length}点選択中
                </span>
              )}
            </span>
            <span className="text-[8.5px] bg-stone-100 px-1 py-0.5 rounded flex items-center gap-0.5 font-bold">
              {showEmotionsGrid ? (
                <>閉じる <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>開く <ChevronDown className="w-3 h-3 text-stone-500" /></>
              )}
            </span>
          </button>

          {showEmotionsGrid && (
            <div className="mt-2 space-y-2.5 border-t border-black/5 pt-2 max-h-56 overflow-y-auto pr-1">
              {[
                { id: "positive", label: "💚 喜び・嬉しさ・心地よさ" },
                { id: "sad", label: "💙 悲しみ・切なさ・寂しさ" },
                { id: "angry", label: "❤️ 怒り・不快・悔しさ" },
                { id: "anxious", label: "💜 不安・緊張・モヤモヤ・葛藤" },
                { id: "physical", label: "🍊 身体感覚・疲労・生理症状" },
                { id: "neutral", label: "🔘 その他・内省" }
              ].map((group) => {
                const list = DETAILED_EMOTIONS.filter((e) => e.category === group.id);
                return (
                  <div key={group.id} className="space-y-1">
                    <p className="text-[8.5px] font-extrabold text-stone-500 tracking-tight">{group.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {list.map((emo) => {
                        const isSelected = selectedEmotions.includes(emo.name);
                        return (
                          <button
                            key={emo.code}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedEmotions(selectedEmotions.filter((x) => x !== emo.name));
                              } else {
                                setSelectedEmotions([...selectedEmotions, emo.name]);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-all duration-150 cursor-pointer flex items-center gap-0.5 ${emo.color} ${emo.borderColor} ${emo.textColor} ${
                              isSelected
                                ? "ring-2 ring-amber-500 ring-offset-1 border-stone-900 scale-[1.03] shadow-xs"
                                : "opacity-80 hover:opacity-100"
                            }`}
                          >
                            <span>{emo.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Date, Time, Tag inputs in one row - Tight margins */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <div>
            <label className="block text-[8px] sm:text-[9px] text-[#455A64]/90 mb-0.5 font-bold tracking-tight leading-none">
              🗓️ 記録日付
            </label>
            <input
              type="date"
              value={logDateInput}
              onChange={(e) => setLogDateInput(e.target.value)}
              className="w-full py-0.5 px-1.5 bg-white border border-[#A5D6A7]/30 rounded-md text-[10px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#81C784]"
            />
          </div>

          <div>
            <label className="block text-[8px] sm:text-[9px] text-[#455A64]/90 mb-0.5 font-bold tracking-tight leading-none">
              ⏰ 時刻
            </label>
            <input
              type="time"
              value={logTimeInput}
              onChange={(e) => setLogTimeInput(e.target.value)}
              className="w-full py-0.5 px-1.5 bg-white border border-[#A5D6A7]/30 rounded-md text-[10px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#81C784]"
            />
          </div>

          <div>
            <label className="block text-[8px] sm:text-[9px] text-[#455A64]/90 mb-0.5 font-bold tracking-tight leading-none">
              🏷️ タグ管理
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="仕事, 散歩..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 py-0.5 px-1.5 bg-white border border-[#A5D6A7]/30 rounded-md text-[10px] text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#81C784]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-2 py-0.5 bg-[#81C784] hover:bg-[#66BB6A] text-white rounded-md text-[9px] font-bold cursor-pointer select-none"
              >
                追加
              </button>
            </div>
          </div>
        </div>

        {/* Tags and Action/Submit Button - Super compact */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
          {/* Active tags list */}
          <div className="flex flex-wrap gap-1 min-h-[14px]">
            {inputTags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-[#E8F5E9] border border-[#A5D6A7]/30 text-[#455A64] text-[8px] sm:text-[9px] rounded-md flex items-center gap-0.5 font-semibold leading-none"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[#455A64]/60 hover:text-rose-600 leading-none font-bold ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Form action button */}
          <button
            type="submit"
            disabled={isAnalyzing}
            className="ml-auto px-4 py-1.5 bg-[#81C784] hover:bg-[#66BB6A] text-white rounded-full text-[10px] sm:text-xs font-black shadow-md transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer select-none"
          >
            {isAnalyzing ? (
              <>
                <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                整理中...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-white">記憶を整理してファイリングするにゃ🐾</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Troubleshooting guide toggle */}
      <div className="bg-[#E8F5E9]/40 rounded-xl p-2 border border-[#A5D6A7]/20 mt-1.5">
        <button
          type="button"
          onClick={() => setShowTroubleshoot(!showTroubleshoot)}
          className="w-full flex items-center justify-between text-left text-[8px] sm:text-[9px] font-bold text-[#455A64] hover:text-[#3d4f40] transition-all cursor-pointer leading-none"
        >
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#81C784] rounded-full inline-block animate-pulse"></span>
            ⚠️ マイク音声入力が動かない時は？
          </span>
          <span className="text-[8px] bg-[#81C784]/15 px-1.5 py-0.5 rounded text-[#455A64] font-bold leading-none">
            {showTroubleshoot ? "閉じる" : "詳細🐾"}
          </span>
        </button>

        {showTroubleshoot && (
          <div className="mt-1.5 text-[8.5px] text-stone-600 space-y-1 border-t border-black/[0.05] pt-1.5 leading-normal">
            <div>
              <p className="font-extrabold text-amber-850">① iframeセキュリティによる権限ブロック（一番多い原因）</p>
              <p className="pl-2 mt-0.5 opacity-90 text-[8px] text-stone-500">
                現在のプレビュー画面（iframe）の影響でマイクへのアクセスが拒否されることがあります。右上にある「新規タブで開く」アイコンから別タブで極めて快適にご利用いただけます🎙️
              </p>
            </div>
            <div>
              <p className="font-extrabold text-amber-850">② 対応ブラウザ</p>
              <p className="pl-2 mt-0.5 opacity-90 text-[8px] text-stone-500">
                Google Chrome や Safari の最新版をおすすめします。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
