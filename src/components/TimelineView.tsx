import React from "react";
import { TimelineLog } from "../types";
import { Clock, Calendar as CalendarIcon, Trash2, Eye, EyeOff, Sparkles, RefreshCw, Layers, Pencil, Check, X, Smile, ChevronDown, ChevronUp } from "lucide-react";
import { DETAILED_EMOTIONS } from "../utils/emotions";

interface TimelineViewProps {
  logs: TimelineLog[];
  activeLogId: string | null;
  onSelectLog: (id: string | null) => void;
  onDeleteLog: (id: string) => void;
  onDeleteMultipleLogs?: (ids: string[], toastMessage?: string) => void;
  onRegenerateAiData: (id: string) => Promise<void>;
  onUpdateLog?: (id: string, updatedOriginal: { transcription: string; manualNote: string; tags: string[]; datetime: string; emotions?: string[] }) => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  isAnalyzing: boolean;
  showLibrarianCat?: boolean;
}

export default function TimelineView({
  logs,
  activeLogId,
  onSelectLog,
  onDeleteLog,
  onDeleteMultipleLogs,
  onRegenerateAiData,
  onUpdateLog,
  onToast,
  isAnalyzing,
  showLibrarianCat = true,
}: TimelineViewProps) {
  // Sort logs chronological descending (latest on top)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.original.datetime).getTime() - new Date(a.original.datetime).getTime()
  );

  // Editing State
  const [activeTab, setActiveTab] = React.useState<"today" | "past">("today");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTranscription, setEditTranscription] = React.useState("");
  const [editManualNote, setEditManualNote] = React.useState("");
  const [editTags, setEditTags] = React.useState<string[]>([]);
  const [editTagInput, setEditTagInput] = React.useState("");
  const [editDatetime, setEditDatetime] = React.useState("");
  const [editEmotions, setEditEmotions] = React.useState<string[]>([]);
  const [showEditEmotions, setShowEditEmotions] = React.useState(false);

  const [isConfirmingDeleteToday, setIsConfirmingDeleteToday] = React.useState(false);
  const [isConfirmingDeletePast, setIsConfirmingDeletePast] = React.useState(false);
  const [confirmingDeleteLogId, setConfirmingDeleteLogId] = React.useState<string | null>(null);

  const toLocalDatetimeString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      const YYYY = date.getFullYear();
      const MM = String(date.getMonth() + 1).padStart(2, '0');
      const DD = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
    } catch {
      return "";
    }
  };

  const startEditing = (log: TimelineLog) => {
    setEditingId(log.id);
    setEditTranscription(log.original.transcription);
    setEditManualNote(log.original.manualNote || "");
    setEditTags(log.original.tags || []);
    setEditTagInput("");
    setEditDatetime(toLocalDatetimeString(log.original.datetime));
    setEditEmotions(log.original.emotions || []);
    setShowEditEmotions(false);
  };

  const handleAddEditTag = () => {
    const trimmed = editTagInput.trim().replace(/^#/, "");
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setEditTagInput("");
    }
  };

  const handleRemoveEditTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const handleSaveEdit = (logId: string) => {
    if (!editTranscription.trim() && !editManualNote.trim()) {
      onToast?.("なにか文字起こしデータか、補足手メモを入力してくださいにゃ🐾", "error");
      return;
    }

    let finalIsoString = "";
    try {
      finalIsoString = editDatetime ? new Date(editDatetime).toISOString() : new Date().toISOString();
    } catch {
      finalIsoString = new Date().toISOString();
    }

    if (onUpdateLog) {
      onUpdateLog(logId, {
        transcription: editTranscription.trim(),
        manualNote: editManualNote.trim(),
        tags: editTags,
        datetime: finalIsoString,
        emotions: editEmotions,
      });
    }

    if (onToast) {
      onToast("記録をアップデートしたにゃ！AI編集を最新にしたい場合は「再生成」を押してにゃ🐾", "success");
    }
    setEditingId(null);
  };

  const formatDisplayTime = (isoString: string, detectedDateStr?: string) => {
    if (detectedDateStr) {
      return detectedDateStr;
    }
    try {
      const date = new Date(isoString);
      return date.toLocaleString("ja-JP", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Find logs that happened "today" (local date matching today)
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const todayLogs = sortedLogs.filter(log => {
    try {
      const d = new Date(log.original.datetime);
      const logStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return logStr === todayStr;
    } catch {
      return false;
    }
  });

  const pastLogs = sortedLogs.filter(log => {
    try {
      const d = new Date(log.original.datetime);
      const logStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return logStr !== todayStr;
    } catch {
      return true;
    }
  });

  // Automatically switch tab on initial load or sync if there are no logs today but there are past logs
  React.useEffect(() => {
    if (todayLogs.length === 0 && pastLogs.length > 0) {
      setActiveTab("past");
    } else if (todayLogs.length > 0) {
      setActiveTab("today");
    }
  }, [logs.length, todayLogs.length, pastLogs.length]);

  const renderLogItem = (log: TimelineLog, isPast: boolean) => {
    const isActive = activeLogId === log.id;
    const original = log.original;
    const aiData = log.aiData;

    return (
      <div
        key={log.id}
        id={`log-item-${log.id}`}
        className={`bg-white border transition-all duration-300 text-left ${
          isPast ? "p-3.5 rounded-2xl shadow-2xs" : "p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
        } ${
          isActive
            ? "ring-2 ring-[#4A5D4E] border-transparent shadow-md"
            : isPast
              ? "border-black/[0.03] hover:border-black/[0.07]"
              : "border-black/[0.04] hover:border-black/[0.09]"
        }`}
      >
        {/* Header info */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Emotion dot indicator */}
            {showLibrarianCat !== false ? (
              <>
                <span
                  className={`rounded-full shadow-xs shrink-0 ${isPast ? "w-2 h-2" : "w-3 h-3"}`}
                  style={{ backgroundColor: aiData?.emotionColor || "#E2F0D9" }}
                  title={`感情状態: ${aiData?.emotion || "未解析"}`}
                ></span>
                <span className={`font-bold text-[#33332D] ${isPast ? "text-[11px]" : "text-xs"}`}>
                  {aiData?.emotion || "感情の整理中..."}
                </span>
              </>
            ) : (
              <span className={`font-extrabold text-[#4A5D4E] flex items-center gap-1 ${isPast ? "text-[10.5px]" : "text-xs"}`}>
                📝 自省ログ
              </span>
            )}
            <span className={`text-[#8A8471] font-mono flex items-center gap-1 ${isPast ? "text-[9.5px]" : "text-[10px]"}`}>
              <Clock className={isPast ? "w-3 h-3" : "w-3.5 h-3.5"} />
              {formatDisplayTime(original.datetime, original.detectedDateStr)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ms-auto">
            {/* Edit button */}
            {editingId !== log.id && (
              <button
                onClick={() => startEditing(log)}
                className={`hover:bg-[#4A5D4E]/10 font-bold text-[#4A5D4E] rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isPast ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
                }`}
                title="記録内容を編集する🐾"
              >
                <Pencil className={isPast ? "w-2.5 h-2.5" : "w-3 h-3"} />
                編集
              </button>
            )}

            <button
              onClick={() => onSelectLog(isActive ? null : log.id)}
              className={`hover:bg-black/[0.03] font-bold text-[#4A5D4E] rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                isPast ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
              }`}
            >
              {isActive ? (
                <>
                  <EyeOff className={isPast ? "w-3 h-3" : "w-3.5 h-3.5"} />
                  閉じる
                </>
              ) : (
                <>
                  <Eye className={isPast ? "w-3 h-3" : "w-3.5 h-3.5"} />
                  {isPast ? "詳細" : "詳細（記録とAI編集）"}
                </>
              )}
            </button>
            {confirmingDeleteLogId === log.id ? (
              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg text-[9px] font-bold animate-fadeIn">
                <span className="text-rose-950 font-black">消去？🐾</span>
                <button
                  onClick={() => {
                    onDeleteLog(log.id);
                    setConfirmingDeleteLogId(null);
                  }}
                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black cursor-pointer transition-all"
                >
                  はい
                </button>
                <button
                  onClick={() => setConfirmingDeleteLogId(null)}
                  className="px-1 py-0.5 bg-[#8A8471] hover:bg-black text-white rounded text-[9px] cursor-pointer transition-all"
                >
                  やめる
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDeleteLogId(log.id)}
                className="p-1 text-[#8A8471] hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                title="この記憶を海馬から消去"
              >
                <Trash2 className={isPast ? "w-3 h-3" : "w-3.5 h-3.5"} />
              </button>
            )}
          </div>
        </div>

        {editingId === log.id ? (
          <div className="space-y-3 bg-[#F9F8F6] p-4 rounded-2xl border border-black/[0.04] mt-2 animate-fadeIn text-xs">
            <span className="text-[11px] text-[#4A5D4E] font-bold block pb-1 border-b border-black/[0.03]">✏️ 記録を編集するにゃ</span>
            
            {/* Timestamp selection */}
            <div className="space-y-1">
              <label className="block text-[10px] text-[#817A63] font-bold">📅 記録日時:</label>
              <input
                type="datetime-local"
                value={editDatetime}
                onChange={(e) => setEditDatetime(e.target.value)}
                className="w-full bg-white border border-black/[0.08] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
              />
            </div>

            {/* Transcription input */}
            <div className="space-y-1">
              <label className="block text-[10px] text-[#817A63] font-bold">
                {original.isImported ? "📋 インポート本文:" : "🎤 音声文字起こし (本文):"}
              </label>
              <textarea
                value={editTranscription}
                onChange={(e) => setEditTranscription(e.target.value)}
                rows={3}
                className="w-full bg-white border border-black/[0.08] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] font-serif leading-relaxed text-[#33332D]"
                placeholder={original.isImported ? "インポートした本文の内容..." : "音声文字起こしの内容..."}
              />
            </div>

            {/* Manual hand note input */}
            <div className="space-y-1">
              <label className="block text-[10px] text-[#817A63] font-bold">📝 本人の補足手メモ:</label>
              <textarea
                value={editManualNote}
                onChange={(e) => setEditManualNote(e.target.value)}
                rows={2}
                className="w-full bg-white border border-black/[0.08] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
                placeholder="補足や追記したい手メモ..."
              />
            </div>

            {/* Tags input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-[#817A63] font-bold">🏷️ 記憶のタグ (クリックして除外にゃ):</label>
              <div className="flex flex-wrap gap-1 mb-1 min-h-[20px]">
                {editTags.length === 0 ? (
                  <span className="text-[10px] text-[#8A8471] italic">タグなし</span>
                ) : (
                  editTags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-black/[0.05] hover:bg-red-50 hover:text-red-700 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 cursor-pointer transition-all"
                      onClick={() => handleRemoveEditTag(t)}
                      title="クリックで削除"
                    >
                      #{t} <span className="text-[8px] opacity-60">×</span>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEditTag();
                    }
                  }}
                  placeholder="新しいタグ..."
                  className="flex-1 bg-white border border-black/[0.08] px-3 py-1 rounded-xl text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddEditTag}
                  className="px-3 py-1 bg-stone-100 border border-black/[0.08] hover:bg-stone-200 text-[#33332D] font-bold rounded-xl text-[11px] transition-all cursor-pointer"
                >
                  追加
                </button>
              </div>
            </div>

            {/* --- DETAILED EDIT EMOTIONS ACCORDION --- */}
            <div className="bg-[#FFF9F2] rounded-xl p-2.5 border border-[#F0EAD6] space-y-1">
              <button
                type="button"
                onClick={() => setShowEditEmotions(!showEditEmotions)}
                className="w-full flex items-center justify-between text-[10px] font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>🎭 今日感じた細やかな感情を紐づける（46種類の色分け）</span>
                  {editEmotions.length > 0 && (
                    <span className="bg-amber-600 text-white font-mono text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                      {editEmotions.length}点
                    </span>
                  )}
                </span>
                <span className="text-[8.5px] bg-white px-1 py-0.5 rounded flex items-center gap-0.5 font-bold border border-black/[0.04]">
                  {showEditEmotions ? (
                    <>閉じる <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>編集する <ChevronDown className="w-3 h-3 text-stone-500" /></>
                  )}
                </span>
              </button>

              {showEditEmotions && (
                <div className="mt-2 space-y-2 border-t border-black/5 pt-2 max-h-52 overflow-y-auto pr-1">
                  {[
                    { id: "positive", label: "💚 喜び・嬉しさ・心地よさ" },
                    { id: "sad", label: "💙 悲しみ・切なさ・寂しさ" },
                    { id: "angry", label: "❤️ 怒り・不快・悔しさ" },
                    { id: "anxious", label: "💜 不安・緊張・モヤモヤ・葛藤" },
                    { id: "physical", label: "🍊 身体感覚・疲労・生理症状" },
                    { id: "neutral", label: "🔘 その他・中立" }
                  ].map((group) => {
                    const list = DETAILED_EMOTIONS.filter((e) => e.category === group.id);
                    return (
                      <div key={group.id} className="space-y-1">
                        <p className="text-[8.5px] font-extrabold text-stone-400 tracking-tight">{group.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {list.map((emo) => {
                            const isSelected = editEmotions.includes(emo.name);
                            return (
                              <button
                                key={emo.code}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setEditEmotions(editEmotions.filter((x) => x !== emo.name));
                                  } else {
                                    setEditEmotions([...editEmotions, emo.name]);
                                  }
                                }}
                                className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold border transition-all duration-150 cursor-pointer flex items-center gap-0.5 ${emo.color} ${emo.borderColor} ${emo.textColor} ${
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

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.03] mt-3">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-2.5 py-1 border border-black/[0.08] hover:bg-stone-50 text-stone-500 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(log.id)}
                className="px-3.5 py-1 bg-[#4A5D4E] hover:bg-[#3d4d3f] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                保存する🐾
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Plain / Transcription Body */}
            <div className="space-y-1.5">
              <div className="text-[15px] text-stone-405 font-mono">
                {original.isImported ? "📋 インポート本文 (日記原本):" : "🎤 音声文字起こし:"}
              </div>
              <p className={`text-[#33332D] font-serif leading-relaxed font-semibold ${
                isPast ? "text-[19.5px]" : "text-[21px]"
              }`}>
                {original.transcription || "（データなし）"}
              </p>

              {/* Manual supplementary handwritten notes */}
              {original.manualNote && (
                <div className="bg-[#FBF9F6] p-3 rounded-2xl border border-black/[0.02] mt-1">
                  <span className="text-[14.25px] text-stone-400 font-bold block mb-0.5">📝 本人の補足手メモ:</span>
                  <p className="text-[17.25px] text-stone-700 leading-relaxed italic">{original.manualNote}</p>
                </div>
              )}
            </div>

            {/* Sub tags list */}
            {original.tags && original.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {original.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9.5px] bg-black/[0.03] text-[#8A8471] px-1.5 py-0.5 rounded font-mono"
                    style={{ fontSize: isPast ? '9px' : '9.5px' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Fine-grained Labeled Emotions */}
            {original.emotions && original.emotions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {original.emotions.map((emoName) => {
                  const emoInfo = DETAILED_EMOTIONS.find((e) => e.name === emoName);
                  return (
                    <span
                      key={emoName}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                        emoInfo
                          ? `${emoInfo.color} ${emoInfo.borderColor} ${emoInfo.textColor}`
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {emoName}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Active expansion card: Separate Original and AI analysis clearly */}
        {isActive && (
          <div className="mt-3.5 pt-3.5 border-t border-dashed border-black/[0.08] space-y-3.5 animate-fadeIn text-xs">
            <div className={showLibrarianCat !== false ? "grid grid-cols-1 md:grid-cols-2 gap-3.5" : "w-full"}>
              {/* Left: Original Details Metadata */}
              <div className="bg-[#FBF9F6] p-3 rounded-xl border border-black/[0.02] space-y-1.5 w-full">
                <span className="text-[9px] uppercase font-bold text-[#8A8471] block border-b border-black/[0.03] pb-1 font-mono">
                  📁 あなたの記録 (Your Log)
                </span>
                <div className="text-[10.5px] text-stone-700 space-y-1">
                  <div>
                    <span className="text-stone-400">・入力ステータス:</span>{" "}
                    <span className="font-bold text-[#4A5D4E]">
                      {original.isImported 
                        ? "インポート機能による一括入力" 
                        : original.transcription 
                        ? "正常に音声ディクテーション完了" 
                        : "キーボードでの手入力のみ"}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400">・確定日時:</span>{" "}
                    <span className="font-mono">{original.datetime}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8471] font-bold">・本人のタグ:</span>{" "}
                    <span className="font-mono">{original.tags.join(", ") || "なし"}</span>
                  </div>
                  {original.emotions && original.emotions.length > 0 && (
                    <div>
                      <span className="text-amber-800 font-bold">・付随する心象:</span>{" "}
                      <span className="font-extrabold text-stone-850 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/50">{original.emotions.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

               {/* Right: AI analysis overview metadata */}
              {showLibrarianCat !== false && (
                <div className="bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/30 space-y-1.5 font-sans">
                  <div className="flex justify-between items-center border-b border-emerald-900/10 pb-1">
                    <span className="text-[9px] uppercase font-bold text-[#4A5D4E] font-mono">
                      🤖 AI司書編集版 (Librarian Analysis)
                    </span>
                    <button
                      onClick={() => onRegenerateAiData(log.id)}
                      disabled={isAnalyzing || log.isAnalyzing}
                      className="text-[9.5px] text-emerald-800 hover:text-black hover:underline flex items-center gap-0.5 font-bold disabled:opacity-50 cursor-pointer"
                      title="AI編集結果をサーバーで再生成します🐾"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 text-emerald-700 ${log.isAnalyzing ? "animate-spin" : "animate-pulse"}`} />
                      再生成
                    </button>
                  </div>

                  {log.isAnalyzing ? (
                    <div className="py-4 flex flex-col items-center justify-center space-y-1.5 text-stone-500 font-bold">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#4A5D4E]/80" />
                      <span className="text-[10px] animate-pulse">AI司書猫がカルテを自動執筆中だにゃ...🐾</span>
                    </div>
                  ) : aiData ? (
                    <div className="text-[10.5px] text-[#33332D] space-y-1.5">
                      <div>
                        <span className="font-bold text-[#4A5D4E]">✏️ 要約:</span>
                        <p className="text-stone-750 mt-0.5 leading-relaxed bg-white/70 p-2 rounded-lg border border-black/[0.02]">
                          {aiData.summary || "要約未生成"}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-[#4A5D4E]">🔍 発見されたパターン:</span>
                        <ul className="list-disc list-inside mt-0.5 text-stone-600 space-y-0.5">
                          {aiData.patterns?.emotionPattern && (
                            <li>感情: {aiData.patterns.emotionPattern}</li>
                          )}
                          {aiData.patterns?.behaviorPattern && (
                            <li>行動: {aiData.patterns.behaviorPattern}</li>
                          )}
                          {aiData.patterns?.circumstancePattern && (
                            <li>環境: {aiData.patterns.circumstancePattern}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-stone-500 italic">
                      （AI編集データがありません。「再生成」をクリックしてにゃ🐾）
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cat Librarian interactive block */}
            {showLibrarianCat !== false && (
              log.isAnalyzing ? (
                <div className="bg-[#4A5D4E] text-white p-3 py-4 rounded-xl text-[11px] space-y-1.5 relative overflow-hidden animate-pulse">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <span className="animate-bounce">🐱</span>
                    <span>司書猫が新着の記憶を読み込み中...</span>
                  </span>
                  <p className="text-stone-200 text-[10.5px] leading-relaxed italic">
                    「インポートされたばかりの記憶原本を読んで、これから独自の解説とマインドフルネスアドバイスを書き下ろすにゃ。少しお待ちいただくにゃ🐾」
                  </p>
                </div>
              ) : aiData?.catComment ? (
                <div className="bg-[#4A5D4E] text-white p-3 rounded-xl text-[11px] space-y-1 relative">
                  <span className="font-bold text-emerald-300 block">🐱 司書猫コメント:</span>
                  <p className="leading-relaxed whitespace-pre-wrap italic">{aiData.catComment}</p>
                  
                  {aiData.reflectiveQuestion && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/10 text-emerald-200">
                      <span className="font-bold">🐾 心の問いかけ:</span>
                      <p className="mt-0.5">{aiData.reflectiveQuestion}</p>
                    </div>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="timeline-group" className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-black/[0.05] gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#4A5D4E]" />
          <h2 className="font-serif text-base font-black text-[#33332D]">本日・過去のタイムライン</h2>
          <span className="text-[11px] bg-black/[0.04] px-2 py-0.5 rounded-full text-[#8A8471] font-mono font-black">
            合計 {sortedLogs.length}件の記憶
          </span>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto font-bold text-xs">
          {todayLogs.length > 0 && (
            <div className="flex items-center gap-1.5 transition-all">
              {isConfirmingDeleteToday ? (
                <>
                  <button
                    onClick={() => {
                      if (onDeleteMultipleLogs) {
                        onDeleteMultipleLogs(todayLogs.map(l => l.id), `本日（${todayStr}）の記憶を ${todayLogs.length}件、一括で綺麗に消去（忘却）したにゃ！🐈🐾`);
                      } else {
                        todayLogs.forEach(l => onDeleteLog(l.id));
                      }
                      setIsConfirmingDeleteToday(false);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md font-black text-[11px] animate-pulse flex items-center gap-1"
                    title="本当に完全に削除します"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>本当に消去するにゃ！🐈🔥</span>
                  </button>
                  <button
                    onClick={() => setIsConfirmingDeleteToday(false)}
                    className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-all cursor-pointer font-bold text-[11px]"
                  >
                    キャンセル🐾
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsConfirmingDeleteToday(true)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs font-extrabold text-[11px]"
                  title={`本日(${todayStr})の記憶を一括で削除します🐾`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>本日のログを一括削除 ({todayLogs.length}件) 🐾</span>
                </button>
              )}
            </div>
          )}

          <span className="text-[10px] text-[#8A8471] font-mono font-semibold uppercase tracking-wider hidden sm:inline">
            CHRONOLOGICAL AUDIT
          </span>
        </div>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-black/[0.04] text-[#8A8471] space-y-2">
          <Sparkles className="w-10 h-10 text-[#D4CFC4] mx-auto animate-pulse" />
          <p className="text-xs font-bold">まだ音声ログがありませんにゃ。</p>
          <p className="text-[11px]">
            上のマイクボタンや手入力用メモに書き書きして、最初の一歩を記してにゃお🐾
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline Tab Navigation - Responsive & Elegant */}
          <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-xl border border-stone-200/50 w-full animate-fadeIn">
            <button
              onClick={() => setActiveTab("today")}
              className={`py-2 px-3 text-center rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none select-none active:scale-95 ${
                activeTab === "today"
                  ? "bg-[#81C784] text-white shadow-xs font-black"
                  : "text-[#455A64] hover:bg-stone-200/40"
              }`}
            >
              <span>📅</span> 本日の記憶 ({todayLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`py-2 px-3 text-center rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none select-none active:scale-95 ${
                activeTab === "past"
                  ? "bg-[#81C784] text-white shadow-xs font-black"
                  : "text-[#455A64] hover:bg-stone-200/40"
              }`}
            >
              <span>📜</span> 過去の記憶 ({pastLogs.length})
            </button>
          </div>

          {activeTab === "today" ? (
            /* SECTION 1: TODAY'S LOGS */
            <div className="space-y-3 p-1 animate-fadeIn">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-black text-[#4A5D4E] flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                  <span>📅</span> 本日の記憶 (Today)
                  <span className="font-mono bg-[#4A5D4E] text-white rounded-full text-[9.5px] px-1.5 font-bold">
                    {todayLogs.length}
                  </span>
                </span>
                <span className="text-[10px] font-bold text-[#8A8471] font-mono bg-stone-50 px-2.5 py-0.5 rounded-md border border-stone-100">
                  {todayStr}
                </span>
              </div>

              {todayLogs.length === 0 ? (
                <div className="bg-[#FAF9F5]/45 border border-dashed border-stone-200 p-6 rounded-2xl text-center text-[#8A8471]">
                  <p className="text-xs font-extrabold">本日はまだ記憶が記されていませんにゃ💤</p>
                  <p className="text-[10.5px] text-stone-400 mt-1 font-medium">
                    上のマイクや手入力メモフォームから、今日のストーリーを残してにゃあ🐾
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayLogs.map(log => renderLogItem(log, false))}
                </div>
              )}
            </div>
          ) : (
            /* SECTION 2: PAST LOGS */
            <div className="space-y-3 p-1 animate-fadeIn pt-1">
              <div className="flex items-center justify-between pb-1 gap-2 flex-wrap">
                <span className="text-xs font-black text-[#8A8471] flex items-center gap-1.5 bg-stone-50 px-3 py-1 rounded-full border border-stone-100">
                  <span>📜</span> 過去の記憶・書庫 (Past Archives)
                  <span className="font-mono bg-[#8A8471] text-white rounded-full text-[9px] px-1.5 font-bold">
                    {pastLogs.length}
                  </span>
                </span>

                {pastLogs.length > 0 && (
                  <div className="flex items-center gap-1.5 transition-all font-bold text-xs">
                    {isConfirmingDeletePast ? (
                      <>
                        <button
                          onClick={() => {
                            if (onDeleteMultipleLogs) {
                              onDeleteMultipleLogs(pastLogs.map(l => l.id), `過去の記憶を ${pastLogs.length}件、一括で綺麗に消去（忘却）したにゃ！🐈🐾`);
                            } else {
                              pastLogs.forEach(l => onDeleteLog(l.id));
                            }
                            setIsConfirmingDeletePast(false);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md font-black text-[11px] animate-pulse flex items-center gap-1"
                          title="本当に完全に削除します"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>本当に消去するにゃ！🐈🔥</span>
                        </button>
                        <button
                          onClick={() => setIsConfirmingDeletePast(false)}
                          className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-all cursor-pointer font-bold text-[11px]"
                        >
                          キャンセル🐾
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsConfirmingDeletePast(true)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs font-extrabold text-[11px]"
                        title="過去の記憶を一括で削除します🐾"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>過去のログを一括削除 ({pastLogs.length}件) 🐾</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {pastLogs.length === 0 ? (
                <div className="bg-stone-50 border border-dashed border-stone-200 p-4 rounded-xl text-center text-[#8A8471]">
                  <p className="text-xs font-bold">過去の記憶はまだありませんにゃ🐾</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pastLogs.map(log => renderLogItem(log, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
