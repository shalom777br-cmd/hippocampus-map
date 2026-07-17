import React, { useState, useEffect } from "react";
import { Search, Calendar, Book, Database, FileText, ArrowRight, Tag, MapPin, Sparkles } from "lucide-react";
import { TimelineLog, BoundBook, UserProfile } from "../types";
import { realSupabase, isRealSupabaseConfigured } from "../utils/supabase";

interface SearchManagerProps {
  logs: TimelineLog[];
  books: BoundBook[];
  user: UserProfile | null;
  onSelectLog?: (log: TimelineLog) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

interface SearchResult {
  id: string;
  type: "timeline" | "book" | "supabase_event";
  title: string;
  subtitle: string;
  content: string;
  dateLabel?: string;
  tags?: string[];
  location?: string;
  originalItem: any;
}

export default function SearchManager({ logs, books, user, onSelectLog, showToast }: SearchManagerProps) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "timeline" | "book" | "db">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Perform search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      setResults([]);
      return;
    }

    setSearching(true);
    const found: SearchResult[] = [];

    try {
      // 1. Search local timeline logs
      if (filterType === "all" || filterType === "timeline") {
        logs.forEach((log) => {
          const titleText = log.aiData?.summary || log.original.detectedDateStr || "無題の記憶";
          const summaryText = log.aiData?.summary || log.original.manualNote || log.original.transcription;
          const bodyText = `${log.original.manualNote} ${log.original.transcription} ${log.aiData?.analysisStr || ""}`;
          const primaryCategoryText = log.aiData?.emotion || "未分類";
          const categoriesList = log.original.tags || [];
          const dateLabelText = log.original.detectedDateStr || (log.original.datetime ? new Date(log.original.datetime).toLocaleString() : "時期不詳");

          const textToSearch = `${titleText} ${summaryText} ${bodyText} ${primaryCategoryText} ${categoriesList.join(" ")}`.toLowerCase();
          if (textToSearch.includes(cleanQuery)) {
            found.push({
              id: log.id,
              type: "timeline",
              title: titleText,
              subtitle: primaryCategoryText,
              content: summaryText,
              dateLabel: dateLabelText,
              tags: categoriesList,
              originalItem: log
            });
          }
        });
      }

      // 2. Search local books
      if (filterType === "all" || filterType === "book") {
        books.forEach((book) => {
          const summaryText = `${book.theme || ""} ${book.catComment || ""}`;
          const eraText = book.periodCode || "期間不詳";
          const textToSearch = `${book.title} ${summaryText} ${eraText}`.toLowerCase();
          if (textToSearch.includes(cleanQuery)) {
            found.push({
              id: book.id,
              type: "book",
              title: book.title || "無題の本",
              subtitle: `編纂記号: ${eraText}`,
              content: book.theme || book.catComment || "内容なし",
              dateLabel: book.createdAt ? new Date(book.createdAt).toLocaleDateString() : undefined,
              originalItem: book
            });
          }
        });
      }

      // 3. Search Supabase remote events if configured
      if ((filterType === "all" || filterType === "db") && isRealSupabaseConfigured && realSupabase) {
        // Query memory_timeline_events using ILIKE
        const { data, error } = await realSupabase
          .from("memory_timeline_events")
          .select("*")
          .or(`title.ilike.%${cleanQuery}%,summary.ilike.%${cleanQuery}%,body.ilike.%${cleanQuery}%`)
          .limit(15);

        if (!error && data) {
          data.forEach((item: any) => {
            // Avoid adding duplicates if already in timeline logs list
            if (!found.some(f => f.id === item.id)) {
              found.push({
                id: item.id,
                type: "supabase_event",
                title: item.title || "無題のイベント",
                subtitle: `データベース: ${item.primary_category || "未分類"}`,
                content: item.summary || item.body || "",
                dateLabel: item.header_date_text || item.approximate_date || `${item.year_label || item.year || ""}`,
                tags: item.categories ? (typeof item.categories === "string" ? JSON.parse(item.categories) : item.categories) : [],
                originalItem: item
              });
            }
          });
        }
      }

      setResults(found);
    } catch (err: any) {
      console.warn("Search matching failed:", err);
      showToast("検索処理中にエラーが発生しました🐾", "error");
    } finally {
      setSearching(false);
    }
  };

  // Run search automatically when query or filter changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, filterType]);

  return (
    <div className="space-y-6 text-left font-sans max-w-4xl mx-auto">
      
      {/* Search Header and Input */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
        <div className="text-left">
          <h2 className="font-serif text-sm font-black text-[#4A5D4E] flex items-center gap-1.5">
            <Search className="w-4 h-4 text-[#81C784]" />
            記憶の統合検索
          </h2>
          <p className="text-[11px] text-[#8A8471] font-bold mt-1">
            すべてのタイムライン記録、コンパイルされた書物、およびクラウドデータベース内のイベントから目的の記憶を瞬時に検索しますにゃ🐾
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="キーワードを入力して検索（例: ほうじ茶、図書館、2026年...）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-stone-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] font-bold text-xs"
            />
            <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-stone-400" />
          </div>
          <button
            type="submit"
            className="px-5 py-3 bg-[#4A5D4E] hover:bg-[#3d4e41] text-white font-black text-xs rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center gap-1"
          >
            検索
          </button>
        </form>

        {/* Source selector buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-50">
          <span className="text-[10px] text-stone-400 font-bold mr-1">検索対象:</span>
          {[
            { id: "all", label: "すべて" },
            { id: "timeline", label: "タイムライン記録" },
            { id: "book", label: "編纂された本" },
            { id: "db", label: "DBテーブル" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterType(item.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer select-none ${
                filterType === item.id
                  ? "bg-[#E8F5E9] text-[#2E7D32] border-[#81C784]"
                  : "bg-white hover:bg-stone-50 text-stone-600 border-stone-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results view list */}
      <div className="space-y-4">
        {searching ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-3 border-[#81C784] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-stone-400 animate-pulse">記憶の記録棚を走査中だにゃ🐾...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <div className="text-[10px] text-stone-400 font-bold px-1 flex justify-between items-center">
              <span>検索結果: <b>{results.length}</b> 件</span>
              <span>キーワード: 「{query}」</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white hover:bg-[#FCFBF8] rounded-2xl p-5 border border-stone-200/60 hover:border-[#81C784]/40 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Title and source badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        result.type === "timeline"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : result.type === "book"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}>
                        {result.type === "timeline" ? "タイムライン" : result.type === "book" ? "書物" : "DBイベント"}
                      </span>
                      <h4 className="font-serif font-black text-[21px] text-stone-800">{result.title}</h4>
                    </div>

                    {/* Meta subtitle */}
                    <p className="text-[15px] text-[#8A8471] font-bold flex items-center gap-2">
                      {result.dateLabel && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {result.dateLabel}
                        </span>
                      )}
                      <span>•</span>
                      <span>{result.subtitle}</span>
                    </p>

                    {/* Excerpt content */}
                    <p className="text-stone-600 text-[18px] leading-relaxed font-medium line-clamp-3">
                      {result.content}
                    </p>

                    {/* Tags list */}
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {result.tags.map((tag, idx) => (
                          <span key={idx} className="bg-stone-50 border border-stone-200/60 text-stone-500 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-end justify-end shrink-0">
                    {result.type === "timeline" && onSelectLog && (
                      <button
                        onClick={() => onSelectLog(result.originalItem)}
                        className="px-3 py-1.5 bg-stone-50 hover:bg-[#E8F5E9] hover:text-[#2E7D32] border border-stone-200 text-stone-600 font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1 select-none active:scale-95"
                      >
                        タイムラインで表示
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : query.trim() ? (
          <div className="bg-white rounded-3xl py-12 text-center border border-stone-200/60">
            <Sparkles className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-500">キーワード「{query}」に一致する記憶は見つかりませんでしたにゃ🐾</p>
            <p className="text-[10px] text-stone-400 font-bold mt-1">別の言葉や、より短い文字数でお試しくださいにゃ。</p>
          </div>
        ) : (
          <div className="bg-stone-50/50 rounded-3xl py-12 text-center border border-dashed border-stone-300/60">
            <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-400">検索ワードを入力してにゃ🐾</p>
          </div>
        )}
      </div>

    </div>
  );
}
