import React, { useState, useEffect } from "react";
import { TimelineLog, ReviewResult } from "../types";
import { Sparkles, Heart, AlertTriangle, HelpCircle, Activity, Landmark, MapPin, ListCollapse, BookOpen, BarChart2, Calendar, Database, RefreshCw } from "lucide-react";
import { DETAILED_EMOTIONS } from "../utils/emotions";
import { apiFetch } from "../utils/api";
import { realSupabase, isRealSupabaseConfigured } from "../utils/supabase";

interface DiscoveryBoardProps {
  logs: TimelineLog[];
  reviews: ReviewResult[];
  onGenerateReview: (range: "週間" | "月間" | "年間") => Promise<void>;
  isGeneratingReview: boolean;
  currentReview: ReviewResult | null;
  initialTab?: "personal" | "supabase";
}

export default function DiscoveryBoard({
  logs,
  reviews,
  onGenerateReview,
  isGeneratingReview,
  currentReview,
  initialTab,
}: DiscoveryBoardProps) {
  const [rangeType, setRangeType] = useState<"週間" | "月間" | "年間">("週間");
  const [selectedEmoCategory, setSelectedEmoCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"personal" | "supabase">(initialTab || "personal");
  const [supabaseEvents, setSupabaseEvents] = useState<any[]>([]);
  const [loadingSupabase, setLoadingSupabase] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const fetchSupabaseEvents = async () => {
    setLoadingSupabase(true);
    setSupabaseError(null);

    // Helper to sort events chronologically / newest first safely in client memory
    const sortEventsInMemory = (list: any[]) => {
      return [...list].sort((a: any, b: any) => {
        const dateA = a.event_date || "";
        const dateB = b.event_date || "";
        if (dateA && dateB) {
          return dateB.localeCompare(dateA);
        }
        const yrA = parseInt(a.year) || 0;
        const yrB = parseInt(b.year) || 0;
        if (yrB !== yrA) return yrB - yrA;
        return (b.order_no || 0) - (a.order_no || 0);
      });
    };

    // 1. Try direct Supabase query first if configured in the client
    if (isRealSupabaseConfigured && realSupabase) {
      try {
        const { data, error } = await realSupabase
          .from("memory_timeline_events")
          .select("*");
        
        if (error) throw error;
        if (data) {
          const sorted = sortEventsInMemory(data);
          setSupabaseEvents(sorted);
          setLoadingSupabase(false);
          return;
        }
      } catch (err: any) {
        console.warn("Direct Supabase fetch failed, trying express API endpoint...", err);
      }
    }

    // 2. Fallback to API route (apiFetch)
    apiFetch("/api/admin-tables?tableName=memory_timeline_events")
      .then(async (res: any) => {
        if (res.ok) {
          const data = await res.json();
          if (data && data.rows) {
            const sorted = sortEventsInMemory(data.rows);
            setSupabaseEvents(sorted);
          } else {
            setSupabaseError("イベントデータの取得に失敗したにゃ🐾");
          }
        } else {
          setSupabaseError(`サーバーがエラー ${res.status} を返したにゃ🐾`);
        }
      })
      .catch((err: any) => {
        console.error("Error fetching events:", err);
        setSupabaseError("データ読み込み中にエラーが発生したにゃ。");
      })
      .finally(() => {
        setLoadingSupabase(false);
      });
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "supabase" && supabaseEvents.length === 0) {
      fetchSupabaseEvents();
    }
  }, [activeTab]);

  // Aggregate recent statistics from user original logs & AI data
  const totalEntries = logs.length;
  
  // Extract all lifters and stressors safely
  const allLifters: string[] = [];
  const allStressors: string[] = [];
  const emotionMap: { [key: string]: number } = {};

  // Aggregate detailed emotion frequencies (combining user selected and AI identified)
  const detailedEmotionCounts: { [name: string]: number } = {};
  DETAILED_EMOTIONS.forEach((e) => {
    detailedEmotionCounts[e.name] = 0;
  });

  logs.forEach((log) => {
    // 1. Collect from user manual fine-grained selections
    if (log.original.emotions && Array.isArray(log.original.emotions)) {
      log.original.emotions.forEach((emoName) => {
        if (detailedEmotionCounts[emoName] !== undefined) {
          detailedEmotionCounts[emoName] += 1;
        } else {
          const found = DETAILED_EMOTIONS.find(d => emoName.includes(d.name) || d.name.includes(emoName));
          if (found) {
            detailedEmotionCounts[found.name] += 1;
          }
        }
      });
    }

    // 2. Collect from AI generated emotions
    if (log.aiData?.emotion) {
      const e = log.aiData.emotion;
      emotionMap[e] = (emotionMap[e] || 0) + 1;
      
      if (detailedEmotionCounts[e] !== undefined) {
        detailedEmotionCounts[e] += 1;
      } else {
        const found = DETAILED_EMOTIONS.find(d => d.name.includes(e) || e.includes(d.name));
        if (found) {
          detailedEmotionCounts[found.name] += 1;
        }
      }
    }

    // Collect custom tag patterns or stabilizers
    if (log.original.tags) {
      log.original.tags.forEach((t) => {
        // Tag classifier
        if (["散歩", "お茶", "音楽", "料理", "睡眠", "リラックス", "ご自愛"].includes(t)) {
          if (!allLifters.includes(t)) allLifters.push(t);
        } else {
          if (!allStressors.includes(t)) allStressors.push(t);
        }
      });
    }
  });

  const maxCount = Math.max(...Object.values(detailedEmotionCounts), 1);

  // Filter & Map detailed emotions
  const emotionStats = DETAILED_EMOTIONS.map((d) => ({
    ...d,
    count: detailedEmotionCounts[d.name] || 0
  })).filter((item) => {
    if (selectedEmoCategory === "all") return true;
    return item.category === selectedEmoCategory;
  });

  // Sort: highest occurrence on top. If counts match, fall back to standard code order
  const sortedEmotionStats = [...emotionStats].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return parseInt(a.code) - parseInt(b.code);
  });

  const topEmotions = Object.entries(emotionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // --- Supabase Missionary events calculations ---
  const supabaseTotalCount = supabaseEvents.length;
  
  // 1. Categories
  const sbCategoryCounts: { [cat: string]: number } = {};
  supabaseEvents.forEach((ev) => {
    const cats = ev.categories || (ev.primary_category ? [ev.primary_category] : []);
    if (Array.isArray(cats)) {
      cats.forEach((c) => {
        if (c) sbCategoryCounts[c] = (sbCategoryCounts[c] || 0) + 1;
      });
    } else if (ev.primary_category) {
      sbCategoryCounts[ev.primary_category] = (sbCategoryCounts[ev.primary_category] || 0) + 1;
    }
  });
  const sbMaxCatCount = Math.max(...Object.values(sbCategoryCounts), 1);
  const sortedSbCategories = Object.entries(sbCategoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // 2. Years
  const sbYearCounts: { [yr: string]: number } = {};
  supabaseEvents.forEach((ev) => {
    const yr = ev.year || ev.year_label;
    if (yr) sbYearCounts[yr] = (sbYearCounts[yr] || 0) + 1;
  });
  const sortedSbYears = Object.entries(sbYearCounts).sort((a, b) => a[0].toString().localeCompare(b[0].toString()));
  const sbMaxYearCount = Math.max(...Object.values(sbYearCounts), 1);

  // 3. Locations
  const sbLocationCounts: { [loc: string]: number } = {};
  supabaseEvents.forEach((ev) => {
    const locs = ev.locations;
    if (Array.isArray(locs)) {
      locs.forEach((l) => {
        if (l) sbLocationCounts[l] = (sbLocationCounts[l] || 0) + 1;
      });
    } else if (typeof locs === "string" && locs.trim()) {
      sbLocationCounts[locs] = (sbLocationCounts[locs] || 0) + 1;
    }
  });
  const sortedSbLocations = Object.entries(sbLocationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div id="ai-discoveries-board" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#81C784]" />
          <h2 className="font-serif text-base font-black text-[#33332D]">AIによる発見・脳内分析結果</h2>
        </div>
        
        {/* Tab Selector */}
        <div className="flex gap-1 bg-stone-100 p-0.5 rounded-xl self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab("personal")}
            className={`px-3 py-1 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === "personal"
                ? "bg-[#4A5D4E] text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Activity className="w-3 h-3" />
            個人ご自愛ログ分析
          </button>
          <button
            onClick={() => setActiveTab("supabase")}
            className={`px-3 py-1 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === "supabase"
                ? "bg-[#4A5D4E] text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Database className="w-3 h-3" />
            Supabase 史実データ分析
          </button>
        </div>
      </div>

      {activeTab === "personal" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1: Core Stabilizer Analysis */}
        <div className="bg-[#FFF9F2] rounded-3xl p-5 border border-[#F0EAD6] space-y-3 shadow-xs">
          <span className="text-[10px] text-[#8A8471] block font-mono font-black uppercase tracking-wider">
            🌱 回復をもたらすトリガー (LIFTER FACTORS)
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-800 rounded-full flex items-center justify-center text-lg shrink-0">
              💚
            </div>
            <div>
              <p className="text-xs text-stone-500 font-bold">私の主な安らぎ要素</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {allLifters.length > 0 ? (
                  allLifters.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono">
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400 font-medium">お散歩や音楽が癒やしになりやすいにゃ🐾</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Box 2: Stressor analysis */}
        <div className="bg-[#FFF9F2] rounded-3xl p-5 border border-[#F0EAD6] space-y-3 shadow-xs">
          <span className="text-[10px] text-[#8A8471] block font-mono font-black uppercase tracking-wider">
            ⚠️ 心配になりやすい引き金 (STRESSOR CODES)
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-800 rounded-full flex items-center justify-center text-lg shrink-0">
              🌩️
            </div>
            <div>
              <p className="text-xs text-stone-500 font-bold">過緊張になりがちな要因</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {allStressors.length > 0 ? (
                  allStressors.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-mono">
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400 font-medium font-serif">仕事やSNSの深追いに気をつけてにゃ。</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Box 3: General Emotions Profile */}
        <div className="bg-[#FFF9F2] rounded-3xl p-5 border border-[#F0EAD6] space-y-3 shadow-xs">
          <span className="text-[10px] text-[#8A8471] block font-mono font-black uppercase tracking-wider">
            🔮 感情の周波数パターン (DOMINANT EMOTIONS)
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-800 rounded-full flex items-center justify-center text-lg shrink-0">
              🌊
            </div>
            <div>
              <p className="text-xs text-stone-500 font-bold">最近の主な心のコンディション</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {topEmotions.length > 0 ? (
                  topEmotions.map((e) => (
                    <span key={e} className="text-[10px] bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded font-bold font-serif">
                      {e}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400">穏やかな状態が検出中🐾</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DETAILED EMOTIONS MAP COMPONENT --- */}
      <div className="bg-white rounded-3xl p-5 border border-black/[0.04] space-y-4">
        <div>
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[#81C784]" />
            <h3 className="text-xs font-serif font-black text-[#4A5D4E]">📊 46種類の感情周波数マップ（起きやすい感情の分析）</h3>
          </div>
          <p className="text-[10px] text-[#8A8471] mt-0.5">
            声日記でタグ付けした感情ラベルと、司書猫AIが抽出したログの感情（{totalEntries}件の記録）を集計し、起きやすい心の揺らぎを可視化したマップにゃ。
          </p>
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap gap-1 border-b border-black/[0.02] pb-2">
          {[
            { id: "all", label: "✨ すべて" },
            { id: "positive", label: "💚 喜び・安心" },
            { id: "sad", label: "💙 悲しみ・寂しさ" },
            { id: "angry", label: "❤️ 怒り・悔しさ" },
            { id: "anxious", label: "💜 不安・葛藤" },
            { id: "physical", label: "🍊 身体・疲労" },
            { id: "neutral", label: "🔘 その他・中立" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedEmoCategory(cat.id)}
              className={`px-2 py-1 rounded-full text-[9px] font-bold cursor-pointer transition-all ${
                selectedEmoCategory === cat.id
                  ? "bg-[#81C784] text-white shadow-xs scale-102"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-600 border border-black/[0.03]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {sortedEmotionStats.filter(e => e.count > 0).length === 0 ? (
            <div className="col-span-full py-6 text-center text-[10px] text-stone-400 font-medium">
              選択したカテゴリーで検出された感情はまだありませんにゃ🐾<br />
              お部屋設定の発話や「細やかな感情ラベリング」で当てはまる気持ちを選んで記録してみてね！
            </div>
          ) : (
            sortedEmotionStats
              .filter(e => e.count > 0 || selectedEmoCategory !== "all") // active ones or all categories when filtered
              .map((emo) => {
                const percent = Math.min(100, Math.round((emo.count / maxCount) * 100));
                return (
                  <div
                    key={emo.code}
                    className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      emo.count > 0 ? "bg-stone-50/50 border-stone-200" : "bg-stone-50/20 border-stone-100 opacity-40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black border flex items-center gap-0.5 ${emo.color} ${emo.borderColor} ${emo.textColor}`}>
                        <span>{emo.name}</span>
                      </span>
                      <span className="font-mono text-[9px] font-bold text-[#455A64]">
                        {emo.count} 回
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-1">
                      <div className="w-full bg-stone-200/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-[#81C784]"
                          style={{
                            width: `${emo.count > 0 ? percent : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Structured analytical periodic reviews */}
      <div className="bg-white rounded-3xl p-5 border border-black/[0.04] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/[0.02]">
          <div>
            <h3 className="text-xs font-serif font-black text-[#4A5D4E]">定期振り返り製本センター</h3>
            <p className="text-[10px] text-[#8A8471]">司書猫に複数日分の記憶をまとめて分析・製本させますにゃ</p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <select
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value as any)}
              className="p-1 px-3 bg-[#F9F8F6] border border-black/[0.06] rounded-xl text-xs text-stone-700"
            >
              <option value="週間">週間要約</option>
              <option value="月間">月間要約</option>
              <option value="年間">年間要約</option>
            </select>
            <button
              onClick={() => onGenerateReview(rangeType)}
              disabled={isGeneratingReview || totalEntries === 0}
              className="px-4 py-1 bg-[#4A5D4E] hover:bg-black text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40"
            >
              {isGeneratingReview ? "まとめ中..." : "分析レポートを抽出 📓"}
            </button>
          </div>
        </div>

        {/* Display Current review if active */}
        {currentReview ? (
          <div className="bg-[#F9F8F6] p-4 rounded-2xl border border-black/[0.02] space-y-3 text-xs text-[#33332D]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#4A5D4E] flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {currentReview.range}・心の海馬レポート（{currentReview.generatedAt}生成）
              </span>
              <span className="text-[9px] bg-amber-500/10 text-amber-800 font-bold px-2 py-0.5 rounded">
                抽出完了
              </span>
            </div>

            <p className="leading-relaxed font-serif whitespace-pre-wrap italic">
              {currentReview.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white p-3 rounded-xl border border-black/[0.02] space-y-1">
                <span className="font-bold text-stone-600 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  主な活動・環境マップ:
                </span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5 leading-relaxed">
                  <li>よく会った人々: {currentReview.connectionMap?.frequentPeople?.join(", ") || "特になし"}</li>
                  <li>主要な滞在場所: {currentReview.connectionMap?.frequentPlaces?.join(", ") || "家庭"}</li>
                  <li>安らぎ行動: {currentReview.connectionMap?.frequentActivities?.join(", ") || "ゆっくり呼吸する"}</li>
                </ul>
              </div>

              <div className="bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/20 space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  🌱 明確に見出された成長点:
                </span>
                <p className="text-stone-800 leading-relaxed font-medium">{currentReview.growthFocus}</p>
              </div>
            </div>

            {/* Consolation from Cat */}
            {currentReview.catConsolation && (
              <div className="bg-[#4A5D4E] text-white p-3 rounded-xl">
                <span className="font-bold">🐱 司書猫からのあたたかい返事:</span>
                <p className="mt-1 font-serif leading-relaxed italic">{currentReview.catConsolation}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#8A8471] italic text-center py-4">
            （まだ現在抽出された分析レポートはありません。上部の「レポートを抽出」から自動生成を依頼できますにゃ）
          </p>
        )}
      </div>
    </>
  )}

      {activeTab === "supabase" && (
        <div className="space-y-4 animate-fadeIn text-left">
          {loadingSupabase ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-[#81C784] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-stone-500 font-bold">Supabaseから史実データをロード中だにゃ🐾...</p>
            </div>
          ) : supabaseError ? (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center text-xs text-red-800">
              {supabaseError}
            </div>
          ) : (
            <>
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#FFF9F2] rounded-3xl p-5 border border-[#F0EAD6] space-y-1 shadow-xs">
                  <span className="text-[10px] text-[#8A8471] block font-mono font-black uppercase tracking-wider">
                    総イベント数
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-serif font-black text-[#4A5D4E]">{supabaseTotalCount}</span>
                    <span className="text-xs font-bold text-stone-500">件の記録</span>
                  </div>
                  <p className="text-[10px] text-stone-400">Supabaseテーブル memory_timeline_events から抽出</p>
                </div>

                <div className="bg-[#FFF9F2] rounded-3xl p-5 border border-[#F0EAD6] space-y-1 shadow-xs">
                  <span className="text-[10px] text-[#8A8471] block font-mono font-black uppercase tracking-wider">
                    活動年代
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-serif font-black text-[#4A5D4E]">
                      {sortedSbYears.length > 0 ? `${sortedSbYears[0][0]} 〜 ${sortedSbYears[sortedSbYears.length - 1][0]}` : "データなし"}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">記録されている年代スパン</p>
                </div>

                <div className="bg-[#FFF9F2] rounded-3xl p-5 border border-[#F0EAD6] space-y-1 shadow-xs">
                  <span className="text-[10px] text-[#8A8471] block font-mono font-black uppercase tracking-wider">
                    主要な活動地
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-serif font-black text-[#4A5D4E]">{sortedSbLocations.length}</span>
                    <span className="text-xs font-bold text-stone-500">エリア</span>
                  </div>
                  <p className="text-[10px] text-stone-400">ブラジル宣教の訪問地タグ集計</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Frequencies */}
                <div className="bg-white rounded-3xl p-5 border border-black/[0.04] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-[#81C784]" />
                      <h3 className="text-xs font-serif font-black text-[#4A5D4E]">📋 史実カテゴリー・タグ分布</h3>
                    </div>
                    <button onClick={fetchSupabaseEvents} className="p-1 text-stone-400 hover:text-stone-600 transition-all cursor-pointer">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                    {sortedSbCategories.length === 0 ? (
                      <p className="text-xs text-stone-400 italic text-center py-6">カテゴリーデータがありませんにゃ</p>
                    ) : (
                      sortedSbCategories.map(([catName, count]) => {
                        const percent = Math.min(100, Math.round((count / sbMaxCatCount) * 100));
                        return (
                          <div key={catName} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-bold text-[#4A5D4E]">{catName}</span>
                              <span className="font-mono text-stone-500 font-bold">{count} 件</span>
                            </div>
                            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#81C784] h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Yearly Densities */}
                <div className="bg-white rounded-3xl p-5 border border-black/[0.04] space-y-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#81C784]" />
                    <h3 className="text-xs font-serif font-black text-[#4A5D4E]">📅 史実年次別ボリューム</h3>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                    {sortedSbYears.length === 0 ? (
                      <p className="text-xs text-stone-400 italic text-center py-6">年次データがありませんにゃ</p>
                    ) : (
                      sortedSbYears.map(([yr, count]) => {
                        const percent = Math.min(100, Math.round((count / sbMaxYearCount) * 100));
                        return (
                          <div key={yr} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-bold text-stone-700 font-mono">{yr}</span>
                              <span className="font-mono text-stone-500 font-bold">{count} 件</span>
                            </div>
                            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#4A5D4E] h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Top Locations and Sample logs */}
              <div className="bg-white rounded-3xl p-5 border border-black/[0.04] space-y-4">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#81C784]" />
                  <h3 className="text-xs font-serif font-black text-[#4A5D4E]">📍 主要宣教活動・訪問場所（頻出上位）</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sortedSbLocations.length === 0 ? (
                    <span className="text-xs text-stone-400 italic">場所データがタグ付けされていませんにゃ</span>
                  ) : (
                    sortedSbLocations.map(([loc, count]) => (
                      <span key={loc} className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 transition-all rounded-full text-[10px] font-bold text-stone-700 flex items-center gap-1">
                        📌 {loc}
                        <span className="bg-white px-1.5 py-0.2 rounded-full font-mono text-[9px] text-[#4A5D4E] border border-stone-200">
                          {count}
                        </span>
                      </span>
                    ))
                  )}
                </div>

                <div className="border-t border-stone-100 pt-3 space-y-2">
                  <p className="text-[10px] text-stone-500 font-bold">📖 最近の史実データベース記録から一部抜粋：</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {supabaseEvents.slice(0, 4).map((ev: any) => (
                      <div key={ev.id} className="p-2.5 bg-stone-50/50 hover:bg-stone-50 transition-all border border-stone-200 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="font-mono text-stone-400 font-bold">{ev.era} {ev.header_date_text}</span>
                          <span className="px-1.5 py-0.2 bg-[#4A5D4E]/10 text-[#4A5D4E] font-bold rounded">
                            {ev.primary_category}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-stone-850 font-serif line-clamp-1">{ev.title}</h4>
                        <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">{ev.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
