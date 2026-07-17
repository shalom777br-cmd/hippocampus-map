import React, { useState } from "react";
import { BoundBook, TimelineLog, CatAnnouncement } from "../types";
import { BookOpen, Sparkles, Plus, AlertCircle, Bookmark, Check, Calendar, Notebook, Layers, Eye, X, Clock, Tag, Trash2, ArrowUpDown, Filter } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Helper for ISO week number and range calculation
const getWeekRangeAndCode = (d: Date) => {
  const temp = new Date(d.getTime());
  const day = temp.getDay();
  const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(temp.setDate(diff));
  
  const sunday = new Date(monday.getTime());
  sunday.setDate(monday.getDate() + 6);
  
  const target = new Date(monday.getTime());
  target.setDate(target.getDate() + 3); // Thursday
  const firstJan = new Date(target.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((target.getTime() - firstJan.getTime()) / 86400000) + 1) / 7);
  
  const year = target.getFullYear();
  const code = `${year}-W${weekNo.toString().padStart(2, "0")}`;
  const rangeStr = `${monday.getMonth() + 1}/${monday.getDate()}〜${sunday.getMonth() + 1}/${sunday.getDate()}`;
  const title = `${year}年 第${weekNo}週 (${rangeStr})`;
  
  return { code, title, monday, sunday, weekNo, year };
};

const handlePrintPDF = async (
  book: BoundBook,
  bookLogs: any[],
  onToast: (msg: string, type?: "success" | "error" | "info") => void,
  showLibrarianCat: boolean = true
) => {
  onToast("PDFの電子製本を編纂中だにゃ🐾 少々お待ちください...", "info");

  // Create temporary container offscreen but visible for rendering
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#FFFFFF";
  document.body.appendChild(container);

  // Cover Page
  const coverPage = document.createElement("div");
  coverPage.style.width = "794px";
  coverPage.style.height = "1123px";
  coverPage.style.padding = "100px 60px";
  coverPage.style.display = "flex";
  coverPage.style.flexDirection = "column";
  coverPage.style.justifyContent = "space-between";
  coverPage.style.boxSizing = "border-box";
  coverPage.style.backgroundColor = "#FDFBF7";
  coverPage.style.border = "1px solid #E6DEC9";

  coverPage.innerHTML = `
    <div style="text-align: center; margin-top: 40px; font-family: serif;">
      <span style="font-size: 11px; letter-spacing: 0.3em; color: #8A8471; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 20px;">- HIPPOCAMPUS BOUND RECOLLECTION -</span>
      <h1 style="font-size: 32px; font-weight: 900; color: #1c1917; line-height: 1.4; margin: 30px 0;">『${book.title}』</h1>
      <div style="font-size: 16px; font-weight: bold; color: #b45309; margin-bottom: 4px;">テーマ：「${book.theme}」</div>
    </div>
    
    ${showLibrarianCat ? `
    <div style="background: #FFFDF9; padding: 30px; border: 1px dashed #E6DEC9; border-radius: 12px; margin: 40px 0; text-align: left;">
      <div style="font-size: 12px; font-weight: bold; color: #b45309; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; font-family: sans-serif;">
        <span>🐈</span> <span>司書長ノアの解説 (Cat Annotation)</span>
      </div>
      <p style="font-size: 13px; line-height: 1.8; color: #453c2a; font-family: serif; white-space: pre-wrap; margin: 0; font-style: italic;">${book.catComment || "解説はありません。"}</p>
    </div>
    ` : ""}

    <div style="font-size: 11px; color: #78716c; text-align: center; border-top: 1px solid #E6DEC9; padding-top: 20px; font-family: monospace;">
      <div>収蔵記憶数：${book.logCount} 件</div>
      <div style="margin-top: 6px;">海馬図書館 編纂${showLibrarianCat ? "：司書猫ノア🐾" : ""}</div>
    </div>
  `;
  container.appendChild(coverPage);

  const pages: HTMLDivElement[] = [coverPage];

  if (bookLogs.length === 0) {
    const emptyPage = document.createElement("div");
    emptyPage.style.width = "794px";
    emptyPage.style.height = "1123px";
    emptyPage.style.padding = "100px 60px";
    emptyPage.style.backgroundColor = "#FDFBF7";
    emptyPage.style.boxSizing = "border-box";
    emptyPage.style.border = "1px solid #E6DEC9";
    emptyPage.style.display = "flex";
    emptyPage.style.alignItems = "center";
    emptyPage.style.justifyContent = "center";
    emptyPage.innerHTML = `<div style="text-align: center; color: #78716c; font-weight: bold; font-family: serif; font-style: italic;">白紙のページが広がっているにゃ🐾</div>`;
    container.appendChild(emptyPage);
    pages.push(emptyPage);
  } else {
    bookLogs.forEach((log, index) => {
      const logPage = document.createElement("div");
      logPage.style.width = "794px";
      logPage.style.height = "1123px";
      logPage.style.padding = "60px 50px";
      logPage.style.backgroundColor = "#FDFBF7";
      logPage.style.display = "flex";
      logPage.style.flexDirection = "column";
      logPage.style.justifyContent = "space-between";
      logPage.style.boxSizing = "border-box";
      logPage.style.border = "1px solid #E6DEC9";

      const displayDate = log.original?.detectedDateStr || new Date(log.original?.datetime || Date.now()).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
      const transcription = log.original?.transcription || log.original?.manualNote || "（テキスト形式の記憶はありませんにゃ）";
      const summary = log.aiData?.summary || "";
      const catComment = log.aiData?.catComment || "";
      const emotion = log.aiData?.emotion || "";
      const tags = log.original?.tags ? log.original.tags.join(", ") : "";

      logPage.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: flex-start; height: 100%;">
          <div style="font-size: 11px; color: #78716c; font-family: monospace; border-bottom: 1px solid #E6DEC9; padding-bottom: 8px; margin-bottom: 30px; display: flex; justify-content: space-between;">
            <span>PAGE ${index + 1}</span>
            <span>${displayDate}</span>
          </div>
          
          <div style="margin-bottom: 25px;">
            <div style="font-size: 16.5px; font-weight: bold; color: #8A8471; text-transform: uppercase; margin-bottom: 10px; font-family: sans-serif;">📖 記録された言葉</div>
            <p style="font-size: 20.25px; line-height: 1.8; text-indent: 1em; color: #1c1917; white-space: pre-wrap; font-family: serif; margin: 0;">${transcription}</p>
          </div>

          ${summary ? `
          <div style="margin-bottom: 20px; background: #F8F6F0; padding: 16px; border-radius: 8px; border: 1px solid #E6DEC9;">
            <div style="font-size: 16.5px; font-weight: bold; color: #4A5D4E; margin-bottom: 6px; font-family: sans-serif;">💡 記憶要約 (Summary)</div>
            <p style="font-size: 18px; line-height: 1.7; color: #33322d; margin: 0; font-family: serif;">${summary}</p>
          </div>
          ` : ""}

          ${showLibrarianCat && catComment ? `
          <div style="background: #FFFDF9; padding: 16px; border-radius: 8px; border: 1px solid #F1E5CB; font-style: italic; margin-bottom: auto;">
            <div style="font-size: 16.5px; font-weight: bold; color: #b45309; margin-bottom: 6px; font-family: sans-serif;">🐈 司書猫の特別評釈</div>
            <p style="font-size: 18px; line-height: 1.7; color: #524B3B; margin: 0; font-family: serif;">${catComment}</p>
          </div>
          ` : ""}
        </div>

        <div style="margin-top: auto; display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #78716c; font-family: sans-serif; border-top: 1px solid #E6DEC9; padding-top: 15px;">
          ${showLibrarianCat && emotion ? `<span style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; padding: 2px 8px; border-radius: 4px; font-weight: bold;">感情: ${emotion}</span>` : ""}
          ${tags ? `<span style="background: #FAFaf9; border: 1px solid #E7E5E4; padding: 2px 8px; border-radius: 4px;">タグ: ${tags}</span>` : ""}
        </div>
      `;
      container.appendChild(logPage);
      pages.push(logPage);
    });
  }

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const pageEl = pages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FDFBF7"
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    }

    const title = `hippocampus_book_${book.id}_${Date.now().toString().slice(-6)}.pdf`;
    
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, "_blank");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      pdf.save(title);
      onToast(`ポップアップがブロックされましたが、PDF「${title}」を直接保存しましたにゃ！🐾`, "success");
    } else {
      onToast(`「${title}」をブラウザ別ウィンドウでPDF表示しましたにゃ！🐾🎉`, "success");
    }
  } catch (err: any) {
    console.error(err);
    onToast("PDF変換中にエラーが発生しましたにゃ: " + err.message, "error");
  } finally {
    container.remove();
  }
};

interface BookShelfProps {
  logs: TimelineLog[];
  books: BoundBook[];
  announcements: CatAnnouncement[];
  onBindBook: (period: string, type: "weekly" | "monthly" | "yearly") => Promise<void>;
  onMarkNotificationRead: (id: string) => void;
  isBinding: boolean;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
  onDeleteBook: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
  showLibrarianCat?: boolean;
}

export default function BookShelf({
  logs,
  books,
  announcements,
  onBindBook,
  onMarkNotificationRead,
  isBinding,
  onToast,
  onDeleteBook,
  onDeleteNotification,
  onClearAllNotifications,
  showLibrarianCat = true,
}: BookShelfProps) {
  const [selectedBook, setSelectedBook] = useState<BoundBook | null>(null);
  const [readingBook, setReadingBook] = useState<BoundBook | null>(null);
  const [bindMonth, setBindMonth] = useState("2026-05");
  const [bindYear, setBindYear] = useState("2026");
  const [bindWeek, setBindWeek] = useState(() => {
    const info = getWeekRangeAndCode(new Date());
    return info.code;
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [shelfGroupOption, setShelfGroupOption] = useState<"series" | "year">("year"); // Default to year grouping for easier sorting!
  const [shelfSortDirection, setShelfSortDirection] = useState<"older_bottom" | "newer_bottom">("older_bottom");
  const [bookInShelfSort, setBookInShelfSort] = useState<"asc" | "desc">("asc");

  // 登録されている日記ログ（logs）から、存在する年と年月、週を動的に抽出
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    logs.forEach((log) => {
      try {
        const d = new Date(log.original.datetime);
        if (!isNaN(d.getTime())) {
          years.add(d.getFullYear().toString());
        }
      } catch (e) {}
    });
    // 現在の年も確実に入れておき、数値を降順でソート
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [logs]);

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    logs.forEach((log) => {
      try {
        const d = new Date(log.original.datetime);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear().toString();
          const m = (d.getMonth() + 1).toString().padStart(2, "0");
          months.add(`${y}-${m}`);
        }
      } catch (e) {}
    });
    // 現在の年月も一応含める
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    months.add(currentMonthStr);
    return Array.from(months).sort().reverse();
  }, [logs]);

  const availableWeeks = React.useMemo(() => {
    const weeks = new Map<string, { title: string; count: number }>();
    
    // Add dynamically based on logs
    logs.forEach((log) => {
      try {
        const d = new Date(log.original.datetime);
        if (!isNaN(d.getTime())) {
          const info = getWeekRangeAndCode(d);
          const existing = weeks.get(info.code);
          if (existing) {
            existing.count += 1;
          } else {
            weeks.set(info.code, { title: info.title, count: 1 });
          }
        }
      } catch (e) {}
    });

    // Also guarantee current week is present
    const curInfo = getWeekRangeAndCode(new Date());
    if (!weeks.has(curInfo.code)) {
      weeks.set(curInfo.code, { title: curInfo.title, count: 0 });
    }

    return Array.from(weeks.entries())
      .map(([code, value]) => ({ code, title: value.title, count: value.count }))
      .sort((a, b) => b.code.localeCompare(a.code));
  }, [logs]);

  // logsが更新された際に、最新のログに合わせた年・月・週を初期として自動選択
  React.useEffect(() => {
    if (logs.length > 0) {
      try {
        const sortedLogs = [...logs].sort((a, b) => {
          return new Date(b.original.datetime).getTime() - new Date(a.original.datetime).getTime();
        });
        const newestLog = sortedLogs[0];
        const date = new Date(newestLog.original.datetime);
        if (!isNaN(date.getTime())) {
          const y = date.getFullYear().toString();
          const m = `${y}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
          const wInfo = getWeekRangeAndCode(date);
          setBindYear(y);
          setBindMonth(m);
          setBindWeek(wInfo.code);
        }
      } catch (e) {
        console.error("Failed to parse automatic binding years", e);
      }
    }
  }, [logs]);

  // Filter book series
  const weeklyBooks = books.filter((b) => b.type === "weekly");
  const monthlyBooks = books.filter((b) => b.type === "monthly");
  const yearlyBooks = books.filter((b) => b.type === "yearly");
  const lifeBooks = books.filter((b) => b.type === "life");

  const processedShelfGroups = React.useMemo(() => {
    if (shelfGroupOption === "series") {
      // Group by series
      const groups = [
        { key: "weekly", label: "🎙️ 週刊アーカイブ (Weekly Bound Series)", list: [...weeklyBooks] },
        { key: "monthly", label: "📚 月刊アーカイブ (Monthly Bound Series)", list: [...monthlyBooks] },
        { key: "yearly", label: "👑 年間アーカイブ (Yearly Anniversary Archives)", list: [...yearlyBooks] },
        { key: "life", label: "💎 人生アーカイブ (Life-Scale Summary Masterpieces)", list: [...lifeBooks] }
      ];

      // Sort books inside each list
      groups.forEach(g => {
        g.list.sort((a, b) => {
          const comp = a.periodCode.localeCompare(b.periodCode);
          return bookInShelfSort === "asc" ? comp : -comp;
        });
      });

      return groups.filter(g => g.list.length > 0);
    } else {
      // Group by Year!
      const yearMap = new Map<string, BoundBook[]>();
      books.forEach((book) => {
        let yearKey = "その他";
        if (book.periodCode === "life") {
          yearKey = "人生全史";
        } else {
          const match = book.periodCode.match(/^(\d{4})/);
          if (match) {
            yearKey = `${match[1]}年`;
          }
        }
        if (!yearMap.has(yearKey)) {
          yearMap.set(yearKey, []);
        }
        yearMap.get(yearKey)!.push(book);
      });

      // Sort books inside each year key
      yearMap.forEach((list) => {
        list.sort((a, b) => {
          const comp = a.periodCode.localeCompare(b.periodCode);
          return bookInShelfSort === "asc" ? comp : -comp;
        });
      });

      // Convert map to array of shelves
      const sortedKeys = Array.from(yearMap.keys()).sort((a, b) => {
        if (a === "人生全史") return 1;
        if (b === "人生全史") return -1;
        const yearA = parseInt(a, 10);
        const yearB = parseInt(b, 10);
        return yearA - yearB; // ascending
      });

      // "古いのが下" (older_bottom) means top shelfs are newer years, bottom shelfs are older years.
      // So sortedKeys should go from Newest to Oldest (reverse of ascending: yearB - yearA)
      // So if "older_bottom", we reverse sortedKeys.
      if (shelfSortDirection === "older_bottom") {
        sortedKeys.reverse();
      }

      return sortedKeys.map((yearKey) => ({
        key: yearKey,
        label: `🏰 ${yearKey}の書架 (${yearKey} Collection)`,
        list: yearMap.get(yearKey)!
      }));
    }
  }, [books, shelfGroupOption, shelfSortDirection, bookInShelfSort, weeklyBooks, monthlyBooks, yearlyBooks, lifeBooks]);

  const unreadAnnouncements = announcements.filter((a) => !a.isRead);

  // Helper colors for spines to represent life aesthetic content!
  const getSpineColorPattern = (themeName: string) => {
    if (themeName.includes("音楽") || themeName.includes("歌い") || themeName.includes("メロディ")) {
      return "bg-gradient-to-t from-pink-700 via-pink-600 to-rose-400 text-white";
    }
    if (themeName.includes("回復") || themeName.includes("しつけ") || themeName.includes("静か") || themeName.includes("整理")) {
      return "bg-gradient-to-t from-indigo-800 via-indigo-600 to-blue-400 text-white";
    }
    if (themeName.includes("挑戦") || themeName.includes("旅") || themeName.includes("新しい") || themeName.includes("穏やか")) {
      return "bg-gradient-to-t from-[#B37d14] via-amber-600 to-yellow-500 text-white";
    }
    if (themeName.includes("散歩") || themeName.includes("緑") || themeName.includes("春") || themeName.includes("のんびり")) {
      return "bg-gradient-to-t from-emerald-800 via-emerald-600 to-emerald-400 text-white";
    }
    // fallbacks
    const hashes = themeName.length % 5;
    if (hashes === 0) return "bg-gradient-to-t from-[#4A5D4E] to-[#6e8573] text-white";
    if (hashes === 1) return "bg-gradient-to-t from-[#8A8471] to-[#b0aa96] text-[#33332D]";
    if (hashes === 2) return "bg-gradient-to-t from-orange-850 via-orange-700 to-orange-450 text-white";
    if (hashes === 3) return "bg-gradient-to-t from-violet-850 via-violet-700 to-purple-400 text-white";
    return "bg-gradient-to-t from-stone-850 via-stone-700 to-stone-450 text-white";
  };

  const executeManualBinding = async (type: "weekly" | "monthly" | "yearly") => {
    const period = type === "weekly" ? bindWeek : type === "monthly" ? bindMonth : bindYear;
    onToast("司書猫が過去の全記憶をかき集めて、製本作業に入ったにゃあ！📚", "info");
    await onBindBook(period, type);
  };

  return (
    <div id="librarian-bookshelf-root" className="space-y-6">
      
      {/* 1. Librarian Announcements (司書猫からのお知らせ) */}
      {announcements.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/50 rounded-3xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-amber-250/20">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
              📢 司書長からのお手紙・お知らせ ({unreadAnnouncements.length}通の未読)
            </span>
            {onClearAllNotifications && (
              <button
                onClick={() => {
                  onClearAllNotifications();
                  onToast("お知らせをすべて消去しましたにゃ！🧹🐾", "success");
                }}
                className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-red-700 font-bold px-2 py-1 bg-white/60 hover:bg-white rounded-lg border border-stone-200 transition-all cursor-pointer"
                title="すべてのお知らせを消去する"
              >
                <Trash2 className="w-3 h-3" />
                <span>すべて消去にゃ</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`p-2.5 rounded-2xl text-xs flex justify-between items-start gap-4 transition-all ${
                  ann.isRead ? "bg-stone-50 text-stone-500" : "bg-white border border-amber-100 text-stone-900 shadow-2xs font-semibold"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-amber-800">
                    <Bookmark className="w-3 h-3 fill-amber-500 text-transparent shrink-0" />
                    <span className="truncate">{ann.title}</span>
                  </div>
                  <p className="mt-1 pl-4 text-stone-700 leading-relaxed font-serif text-[11px] break-words">{ann.message}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!ann.isRead && (
                    <button
                      onClick={() => onMarkNotificationRead(ann.id)}
                      className="p-1 px-2 bg-amber-500 hover:bg-black text-white text-[10px] rounded-lg transition-all cursor-pointer"
                    >
                      了解にゃ
                    </button>
                  )}
                  {onDeleteNotification && (
                    <button
                      onClick={() => {
                        onDeleteNotification(ann.id);
                        onToast("お知らせを1件削除しましたにゃ🐾", "info");
                      }}
                      className="p-1 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100/50 transition-all cursor-pointer"
                      title="この通知を削除する"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Visual Book shelf spine list */}
      <div className="bg-[#EBE6DC] rounded-3xl p-6 border border-stone-300 shadow-inner relative">
        <div className="absolute top-3 right-3 text-[10px] font-mono text-stone-600 bg-white/50 px-2 py-0.5 rounded">
          LOCKED MEMORIES
        </div>

        <h3 className="font-serif text-sm font-black text-stone-900 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-stone-850" />
          現在の海馬本棚（人生の背表紙ギャラリー）
        </h3>

        {/* Sorting and Grouping Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5 p-3 bg-[#f8f5ee] rounded-2xl border border-stone-300/60 text-xs text-stone-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold flex items-center gap-1 text-[#8A8471] text-[11px]">
              <Filter className="w-3.5 h-3.5" />
              本棚の整理方法:
            </span>
            <button
              onClick={() => setShelfGroupOption("series")}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                shelfGroupOption === "series" ? "bg-[#4A5D4E] text-white shadow-xs" : "bg-white hover:bg-stone-50 border border-stone-300 text-stone-700"
              }`}
            >
              📚 分類別（週刊/月刊/年間）
            </button>
            <button
              onClick={() => setShelfGroupOption("year")}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                shelfGroupOption === "year" ? "bg-[#4A5D4E] text-white shadow-xs" : "bg-white hover:bg-stone-50 border border-stone-300 text-stone-700"
              }`}
            >
              📅 年代別（古い順・新しい順）
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {shelfGroupOption === "year" && (
              <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-1.5">
                <span className="text-[9px] text-stone-400 font-bold px-1">棚の配置:</span>
                <button
                  onClick={() => setShelfSortDirection("older_bottom")}
                  className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition-all ${
                    shelfSortDirection === "older_bottom" ? "bg-amber-100 text-amber-950 font-black border border-amber-300/30" : "text-stone-500 hover:text-stone-900"
                  }`}
                  title="最新年が上、古い年が一番下（底側）になります"
                >
                  古いのが下 🔽
                </button>
                <button
                  onClick={() => setShelfSortDirection("newer_bottom")}
                  className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition-all ${
                    shelfSortDirection === "newer_bottom" ? "bg-amber-100 text-amber-950 font-black border border-amber-300/30" : "text-stone-500 hover:text-stone-900"
                  }`}
                  title="古い年が一番上、最新年が一番下（底側）になります"
                >
                  古いのが上 🔼
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-1.5">
              <span className="text-[9px] text-stone-400 font-bold px-1">本の並び:</span>
              <button
                onClick={() => setBookInShelfSort("asc")}
                className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition-all ${
                  bookInShelfSort === "asc" ? "bg-amber-100 text-amber-950 font-black border border-amber-300/30" : "text-stone-500 hover:text-stone-900"
                }`}
                title="左端が古く、右へ進むにつれて新しくなります"
              >
                古い順 ◀
              </button>
              <button
                onClick={() => setBookInShelfSort("desc")}
                className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition-all ${
                  bookInShelfSort === "desc" ? "bg-amber-100 text-amber-950 font-black border border-amber-300/30" : "text-stone-500 hover:text-stone-900"
                }`}
                title="左端が新しく、右へ進むにつれて古くなります"
              >
                新しい順 ◀
              </button>
            </div>
          </div>
        </div>

        {shelfSortDirection === "older_bottom" && shelfGroupOption === "year" && (
          <div className="mb-4 bg-amber-50/50 text-[#8A8471] text-[10.5px] px-3.5 py-2 rounded-xl border border-amber-200/40 flex items-center justify-between font-bold animate-fadeIn">
            <span>💡 ご要望の「年ごと並び替え：古い年代を下に配置（最新年が上）」が適用されていますにゃ🐾</span>
            <span className="text-[9.5px] bg-amber-100/80 text-[#5c5443] px-1.5 py-0.5 rounded-full font-bold">配置：古いのが下 🔽</span>
          </div>
        )}

        {books.length === 0 ? (
          <div className="bg-white/80 rounded-2xl p-8 text-center text-stone-600 border border-dashed border-stone-400">
            <p className="text-xs font-bold">本棚にはまだ背表紙がありませんにゃ。</p>
            <p className="text-[11px] mt-1 text-stone-500">
              右記の「製本マシン」から指定の月・年を指定して『自動製本』を行うと、ここに背表紙が並びます。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Gallery shelves layout depending on series or year grouping */}
            {processedShelfGroups.map((shelfGroup, idx) => {
              if (shelfGroup.list.length === 0) return null;

              return (
                <div key={idx} className="space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-stone-700 font-bold block mb-1">
                    {shelfGroup.label}
                  </span>

                  {/* Wood shelf effect with lined spines */}
                  <div className="bg-stone-300/40 rounded-2xl p-4 border border-stone-200 shadow-md relative min-h-[140px]">
                    <div className="flex flex-wrap items-end gap-1.5 pb-2">
                      {shelfGroup.list.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => {
                            setSelectedBook(book);
                            setReadingBook(book);
                            setShowDeleteConfirm(false);
                          }}
                          className={`w-12 sm:w-14 h-32 p-2 rounded-sm hover:-translate-y-2 hover:shadow-lg focus:outline-none transition-all duration-300 relative group text-center flex flex-col justify-between select-none border-r border-[#000]/15 ${getSpineColorPattern(
                            book.theme
                          )}`}
                          title={`「${book.title}」をクリックして本を開き、司書猫のコメントを読むにゃ`}
                        >
                          {/* Top vintage style separator line */}
                          <div className="w-full border-t-2 border-b border-amber-300/40 h-1"></div>
                          
                          {/* Centered Large Period Display as the hero of the spine */}
                          <div className="flex-1 flex items-center justify-center py-2.5">
                            <span 
                              className="text-[11px] sm:text-[11.5px] font-black tracking-[0.15em] font-serif select-none"
                              style={{ 
                                writingMode: "vertical-rl",
                                textShadow: "0px 1px 3px rgba(0,0,0,0.7)"
                              }}
                            >
                              {book.type === "weekly" ? (
                                `${book.periodCode.split("-")[0]}年 ${book.periodCode.split("-")[1].replace("W", "第")}週`
                              ) : book.type === "monthly" ? (
                                `${book.periodCode.split("-")[0]}年  ${parseInt(book.periodCode.split("-")[1], 10)}月`
                              ) : book.type === "yearly" ? (
                                `${book.periodCode}年`
                              ) : (
                                "人生全史"
                              )}
                            </span>
                          </div>

                          {/* Bottom vintage style separator line */}
                          <div className="w-full border-t border-b-2 border-amber-300/40 h-1"></div>
                        </button>
                      ))}
                    </div>
                    {/* Shelf bottom wood line */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#A38D75] rounded-b-2xl border-t border-[#8B735B] shadow-inner"></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Automatic binding portal (製本自動抽出) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* binder controls */}
        <div className="bg-white rounded-3xl p-5 border border-black/[0.04] space-y-4">
          <div>
            <h4 className="text-xs font-serif font-black text-[#4A5D4E] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              自動製本マシン (Automatic Bookbuilder)
            </h4>
            <p className="text-[10px] text-[#8A8471] leading-relaxed">
              指定した週、月または年のタイムライン記憶をまとめ、司書猫が自動テーマ・背表紙を引き出して本棚へ収納しますにゃ🐾
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-1">
            {/* Weekly */}
            <div className="bg-[#FBF9F6] p-2 rounded-2xl border border-black/[0.02] space-y-2 text-xs flex flex-col justify-between">
              <div className="space-y-1">
                <span className="font-bold text-[#8A8471] font-mono block text-[9px]">🎙️ 週刊製本 (Weekly)</span>
                <select
                  value={bindWeek}
                  onChange={(e) => setBindWeek(e.target.value)}
                  className="w-full p-1 bg-white border border-black/[0.06] rounded-lg text-[9px] text-center cursor-pointer font-medium font-serif"
                >
                  {availableWeeks.map((w) => {
                    return (
                      <option key={w.code} value={w.code}>
                        {w.title} ({w.count}件)
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={() => executeManualBinding("weekly")}
                disabled={isBinding || logs.length === 0}
                className="w-full py-1 bg-amber-600 hover:bg-black text-white rounded-lg text-[9px] font-bold transition-all disabled:opacity-45 cursor-pointer mt-1"
              >
                {isBinding ? "製本中..." : "週刊本で製本 🎙️"}
              </button>
            </div>

            {/* Monthly */}
            <div className="bg-[#FBF9F6] p-2 rounded-2xl border border-black/[0.02] space-y-2 text-xs flex flex-col justify-between">
              <div className="space-y-1">
                <span className="font-bold text-[#8A8471] font-mono block text-[9px]">📅 月刊製本 (Monthly)</span>
                <select
                  value={bindMonth}
                  onChange={(e) => setBindMonth(e.target.value)}
                  className="w-full p-1 bg-white border border-black/[0.06] rounded-lg text-[9px] text-center cursor-pointer font-medium font-serif"
                >
                  {availableMonths.map((m) => {
                    const parts = m.split("-");
                    const displayStr = parts.length === 2 ? `${parts[0]}年${parts[1]}月` : m;
                    const count = logs.filter((l) => {
                      const d = new Date(l.original.datetime);
                      return !isNaN(d.getTime()) && 
                        d.getFullYear().toString() === parts[0] && 
                        (d.getMonth() + 1).toString().padStart(2, "0") === parts[1];
                    }).length;
                    return (
                      <option key={m} value={m}>
                        {displayStr} ({count}件)
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={() => executeManualBinding("monthly")}
                disabled={isBinding || logs.length === 0}
                className="w-full py-1 bg-[#4A5D4E] hover:bg-black text-white rounded-lg text-[9px] font-bold transition-all disabled:opacity-45 cursor-pointer mt-1"
              >
                {isBinding ? "製本中..." : "月刊誌で製本 📘"}
              </button>
            </div>

            {/* Yearly */}
            <div className="bg-[#FBF9F6] p-2 rounded-2xl border border-black/[0.02] space-y-2 text-xs flex flex-col justify-between">
              <div className="space-y-1">
                <span className="font-bold text-[#8A8471] font-mono block text-[9px]">👑 年間製本 (Yearly)</span>
                <select
                  value={bindYear}
                  onChange={(e) => setBindYear(e.target.value)}
                  className="w-full p-1 bg-white border border-black/[0.06] rounded-lg text-[9px] text-center cursor-pointer font-medium font-serif"
                >
                  {availableYears.map((y) => {
                    const count = logs.filter((l) => {
                      const d = new Date(l.original.datetime);
                      return !isNaN(d.getTime()) && d.getFullYear().toString() === y;
                    }).length;
                    return (
                      <option key={y} value={y}>
                        {y}年 ({count}件)
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={() => executeManualBinding("yearly")}
                disabled={isBinding || logs.length === 0}
                className="w-full py-1 bg-[#8A8471] hover:bg-black text-white rounded-lg text-[9px] font-bold transition-all disabled:opacity-45 cursor-pointer mt-1"
              >
                {isBinding ? "製本中..." : "年間本で製本 👑"}
              </button>
            </div>
          </div>
        </div>

        {/* Selected book detail inspector */}
        <div className="bg-white rounded-3xl p-5 border border-black/[0.04]">
          {selectedBook ? (
            <div className="space-y-4 text-xs text-[#33332D]">
              <div className="flex items-center justify-between border-b border-black/[0.04] pb-2">
                <span className="font-bold text-[#4A5D4E] flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  本棚の本: 『{selectedBook.title}』
                </span>
                <span className="text-[9px] bg-amber-500/10 text-amber-800 font-bold px-2 py-0.5 rounded font-mono">
                  {selectedBook.type.toUpperCase()}_BOOK
                </span>
              </div>

              <div className="space-y-1 bg-[#FFFBF5]/90 p-3 rounded-xl border border-amber-100/50">
                <span className="text-[10px] font-mono uppercase text-amber-850 font-black">
                  📖 抽出された人生のテーマ (EXTRACTED THEME):
                </span>
                <p className="text-xs font-serif font-bold text-amber-950 mt-0.5">
                  「 {selectedBook.theme} 」
                </p>
              </div>

              {showLibrarianCat !== false && (
                <div className="bg-[#4A5D4E] text-white p-3 rounded-xl relative overflow-hidden">
                  <span className="font-bold">🐱 司書長からの製本解説コメント:</span>
                  <p className="mt-1 font-serif leading-relaxed italic">{selectedBook.catComment}</p>
                </div>
              )}

              <div className="text-[10px] text-[#8A8471] flex justify-between pt-1 border-t border-black/[0.02]">
                <span>作成日時: {new Date(selectedBook.createdAt).toLocaleString("ja-JP")}</span>
                <span>製本内の記憶数: {selectedBook.logCount} 件</span>
              </div>

              {/* Immersive Book Reader Trigger Button */}
              <button
                onClick={() => setReadingBook(selectedBook)}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <BookOpen className="w-4 h-4 animate-bounce" />
                <span>この本を開いて中身を読む 📖</span>
              </button>

              {/* Delete Button with confirmation */}
              {showDeleteConfirm ? (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-[10px] text-rose-800 font-bold leading-tight text-left">
                    ⚠️ この本を廃棄（本棚から削除）しますか？製本データは削除されますが、元々の日記（タイムライン記憶）自体は削除されませんので、安心してくださいにゃ。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDeleteBook(selectedBook.id);
                        onToast(`製本「${selectedBook.title}」を本棚から整理（削除）したにゃ🐾`, "success");
                        setSelectedBook(null);
                        setReadingBook(null);
                        setShowDeleteConfirm(false);
                      }}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-center text-[10px] shadow-xs cursor-pointer"
                    >
                      はい、廃棄する🗑️
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-[#EBE6DC] hover:bg-stone-300 text-stone-700 font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full mt-2 py-1.5 bg-stone-50 hover:bg-rose-50 border border-stone-200/60 hover:border-rose-100 text-stone-500 hover:text-rose-600 font-medium rounded-xl transition-all text-center flex items-center justify-center gap-1 cursor-pointer text-[10px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>この本を本棚から廃棄する🐾</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#8A8471] py-8">
              <Notebook className="w-10 h-10 text-[#D4CFC4] animate-pulse mb-2" />
              <p className="text-xs font-bold">背表紙をクリックすると本が開きます。</p>
              <p className="text-[10px] mt-0.5">司書猫がまとめたコメントや抽出テーマが表示されます🐾</p>
            </div>
          )}
        </div>

      </div>

      {/* --- IMMERSIVE BOOK READING MODAL (本を読むビューア) --- */}
      {readingBook && (() => {
        const getBookLogs = (book: BoundBook) => {
          if (book.logIds && book.logIds.length > 0) {
            return logs.filter((l) => book.logIds.includes(l.id));
          }
          // fallback filter by period prefix
          return logs.filter((log) => {
            const logDate = new Date(log.original.datetime);
            if (isNaN(logDate.getTime())) return false;
            const year = logDate.getFullYear().toString();
            const month = (logDate.getMonth() + 1).toString().padStart(2, "0");
            const code = `${year}-${month}`;
            if (book.type === "monthly") {
              return code === book.periodCode;
            } else if (book.type === "yearly") {
              return year === book.periodCode;
            } else if (book.type === "weekly") {
              const wInfo = getWeekRangeAndCode(logDate);
              return wInfo.code === book.periodCode;
            }
            return true;
          });
        };

        const bookLogs = getBookLogs(readingBook);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#FAF6EE] border border-[#E6DEC9] text-[#33332D] rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="p-4 border-[#E6DEC9] border-b flex items-center justify-between bg-[#F3ECE0] gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <span className="p-1 px-2.5 bg-amber-700 text-white text-[9px] font-black rounded-full font-mono uppercase shrink-0">
                    {readingBook.type === "yearly" ? "👑 年間書庫" : readingBook.type === "monthly" ? "📘 月刊書庫" : readingBook.type === "weekly" ? "🎙️ 週刊書庫" : "💎 特別記念"}
                  </span>
                  <h3 className="font-serif font-black text-xs sm:text-sm text-stone-950 truncate max-w-[150px] sm:max-w-xs md:max-w-md shrink-0">
                    『{readingBook.title}』の記憶ページ
                  </h3>
                  
                  {/* GREEN PDF EXPORT BUTTON RIGHT NEXT TO THE TITLE */}
                  <button
                    id="export-pdf-btn"
                    onClick={() => handlePrintPDF(readingBook, bookLogs, onToast)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-sm hover:shadow-md hover:brightness-105 shrink-0"
                    title="この本を高品質なPDF形式でダウンロード・印刷するにゃ！"
                  >
                    <span>🖨️ PDF・印刷出力</span>
                  </button>
                </div>
                <button
                  onClick={() => setReadingBook(null)}
                  className="p-1.5 hover:bg-stone-200 rounded-full text-stone-600 hover:text-stone-950 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Contents representing pages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-[radial-gradient(#F9F2E7_1px,transparent_1px)] [background-size:16px_16px]">
                
                {/* 2. COMPILED MEMORY LOG PAGES */}
                <div className="max-w-3xl mx-auto space-y-4">
                  {bookLogs.length === 0 ? (
                    <div className="text-center py-12 text-stone-500 bg-white/40 rounded-2xl border border-dashed border-stone-300">
                      <p className="text-xs font-bold">白紙のページが広がっているにゃ🐾</p>
                      <p className="text-[10px] text-stone-400 mt-1">タイムラインにこの期間の記憶を書き残すと、製本時にここに反映されますにゃ</p>
                    </div>
                  ) : (
                    bookLogs.map((log, index) => {
                      const displayDate = log.original.detectedDateStr || new Date(log.original.datetime).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div key={log.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs hover:border-amber-300 transition-all space-y-3 relative group">
                          {/* Page index badge */}
                          <div className="absolute top-4 right-4 text-[9px] font-mono font-bold text-stone-400">
                            PAGE {index + 1}
                          </div>

                          <div className="flex items-center gap-1.5 text-stone-500 font-bold text-[10px] sm:text-[11px] font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#8A8471]" />
                            <span>{displayDate}</span>
                          </div>

                          {/* Original note */}
                          <div className="space-y-1">
                            <div className="text-[13.5px] text-stone-400 font-black uppercase tracking-wider font-mono">記録した言葉</div>
                            <p className="text-[18px] text-stone-900 leading-relaxed font-serif pl-1.5 whitespace-pre-wrap">
                              {log.original.transcription || log.original.manualNote || "（テキスト形式の記憶はありませんにゃ）"}
                            </p>
                          </div>

                          {/* AI Summary/Comment */}
                          {log.aiData && (
                            <div className="pt-2 border-t border-stone-100 flex flex-col md:flex-row gap-3">
                              <div className="flex-1 space-y-1 bg-stone-50/50 p-2.5 rounded-xl border border-stone-100">
                                <div className="text-[13.5px] text-[#4A5D4E] font-black uppercase tracking-wider font-mono">要約</div>
                                <p className="text-[18px] text-[#333333] leading-relaxed">{log.aiData.summary}</p>
                              </div>

                              {showLibrarianCat !== false && (
                                <div className="flex-1 space-y-1 bg-amber-50/30 p-2.5 rounded-xl border border-amber-100/30">
                                  <div className="text-[13.5px] text-amber-800 font-bold flex items-center gap-1 font-mono">
                                    <span>🐱</span>
                                    <span>司書猫解説</span>
                                  </div>
                                  <p className="text-[18px] text-stone-700 leading-relaxed font-serif italic">
                                    {log.aiData.catComment}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tags & Emotion Footer */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {showLibrarianCat !== false && log.aiData?.emotion && (
                              <span
                                className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full text-white font-serif"
                                style={{ backgroundColor: log.aiData.emotionColor || "#8A8471" }}
                              >
                                {log.aiData.emotion}
                              </span>
                            )}

                            {log.original.tags && log.original.tags.map((t) => (
                              <span key={t} className="text-[9px] bg-stone-50 text-stone-600 font-mono px-2 py-0.5 rounded border border-stone-100 flex items-center gap-0.5">
                                <Tag className="w-2.5 h-2.5 text-stone-400" />
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#F3ECE0] border-t border-[#E6DEC9] flex items-center justify-between">
                <span className="text-[9px] text-[#8A8471] font-mono leading-none">
                  HIPPOCAMPUS LIBRARIAN SYSTEM 2026
                </span>
                <button
                  onClick={() => setReadingBook(null)}
                  className="px-5 py-2 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  本を閉じる🐾
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
