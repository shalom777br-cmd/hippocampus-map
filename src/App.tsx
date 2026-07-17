import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  TimelineLog,
  BoundBook,
  UserProfile,
  CatAnnouncement,
  AppSettings,
  ReviewResult,
  OriginalData,
  AiGeneratedData
} from "./types";
import {
  getLogs,
  saveLogs,
  getSettings,
  saveSettings,
  getBooks,
  saveBooks,
  getAnnouncements,
  saveAnnouncements,
  getReviews,
  saveReviews,
  generateJSONExport,
  generateCSVExport,
  generateMarkdownExport,
  generateRawTextExport,
  generateZipExportBlob,
  importSyncPayload,
  parseRawTextImport
} from "./utils/storage";
import { cloudSupabase } from "./utils/supabase";
import { apiFetch } from "./utils/api";
import LibrarianCat from "./components/LibrarianCat";
import AuthScreen from "./components/AuthScreen";
import AudioLogger from "./components/AudioLogger";
import TimelineView from "./components/TimelineView";
import DiscoveryBoard from "./components/DiscoveryBoard";
import BookShelf from "./components/BookShelf";
import AvatarSimulator from "./components/AvatarSimulator";
import TableManager from "./components/TableManager";
import MindMap from "./components/MindMap";
import SearchManager from "./components/SearchManager";
import { DETAILED_EMOTIONS } from "./utils/emotions";

import {
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
  FolderDown,
  FolderUp,
  Settings,
  CloudLightning,
  RefreshCw,
  X,
  BookMarked,
  Home,
  Database,
  Network,
  Search as SearchIcon
} from "lucide-react";

export default function App() {
  // Sync core states
  const [user, setUser] = useState<UserProfile | null>(() => cloudSupabase.getActiveUser());
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [books, setBooks] = useState<BoundBook[]>([]);
  const [announcements, setAnnouncements] = useState<CatAnnouncement[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings(cloudSupabase.getActiveUser()?.id));
  const [reviews, setReviews] = useState<ReviewResult[]>([]);

  // Real-time synchronization tracking states
  const [syncStatus, setSyncStatus] = useState<"idle" | "pending" | "syncing" | "success" | "error">("idle");
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"record" | "library" | "analysis" | "simulator" | "shelf" | "history" | "auth" | "settings" | "database" | "map" | "search">("record");
  const [bottomTab, setBottomTab] = useState<"home" | "memory" | "map" | "search" | "settings">("home");
  const [lastHomeTab, setLastHomeTab] = useState<"record" | "library" | "analysis" | "simulator" | "shelf" | "history" | "auth">("record");

  // Interaction loaders
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClassBinding, setIsClassBinding] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [latestCatComment, setLatestCatComment] = useState<string>("");
  const [activeReviewResult, setActiveReviewResult] = useState<ReviewResult | null>(null);
  const [confirmingLedgerId, setConfirmingLedgerId] = useState<string | null>(null);

  // Exporters selection
  const [exportMode, setExportMode] = useState<"raw_only" | "plus_ai" | "ai_only" | "full_backup">("plus_ai");
  const [importText, setImportText] = useState("");
  const [rawImportText, setRawImportText] = useState("");
  const [lastImportedIds, setLastImportedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("hippocampus_last_imported_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showLsaModal, setShowLsaModal] = useState(false);
  const [lsaInputVal, setLsaInputVal] = useState("");
  const [showPrintOverlay, setShowPrintOverlay] = useState(false);


  // PDF Exporter State
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);
  const [pdfGeneratingStatus, setPdfGeneratingStatus] = useState<"" | "preparing" | "rendering" | "completed">("");
  const [pdfYearMonthFilter, setPdfYearMonthFilter] = useState<string>("all");
  const [pdfIncludeAi, setPdfIncludeAi] = useState<boolean>(true);
  const [pdfSortOrder, setPdfSortOrder] = useState<"asc" | "desc">("asc");
  const [pdfTemplateStyle, setPdfTemplateStyle] = useState<"washo" | "western">("washo");

  const updateLastImportedIds = (ids: string[]) => {
    setLastImportedIds(ids);
    try {
      localStorage.setItem("hippocampus_last_imported_ids", JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenLsaModal = () => {
    const rawSaved = localStorage.getItem("hippocampus_last_imported_ids") || "[]";
    setLsaInputVal(rawSaved);
    setShowLsaModal(true);
  };

  const renderLibrarianCatSection = () => {
    if (settings.showLibrarianCat !== false) {
      return (
        <LibrarianCat
          settings={settings}
          latestComment={latestCatComment}
          isAnalyzing={isAnalyzing}
          onUpdateSettings={handleSettingsChange}
          onToast={showToast}
          onImportRawText={handleImportRawTextDirect}
          onImportBackupJson={handleImportJsonDirect}
          onUndoImport={handleUndoRawImportDirect}
          canUndoImport={lastImportedIds.length > 0}
          onOpenLsaModal={handleOpenLsaModal}
        />
      );
    }

    return (
      <div className="bg-amber-50/25 border border-dashed border-[#F0EAD6]/80 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-700 animate-fade-in shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce select-none">💤</span>
          <div className="text-left">
            <h4 className="font-serif font-black text-xs text-amber-900 flex items-center gap-1.5 leading-none">
              🐈 AI司書猫「ノア」はお休み中だにゃ🐾
            </h4>
            <p className="text-[10px] text-stone-500 mt-1">
              司書猫機能をオンにすると、応接室が開き、タイムラインに基づいた読書推薦や対話をいつでもお楽しみいただけます。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const updated = { ...settings, showLibrarianCat: true };
            setSettings(updated);
            saveSettings(updated);
            showToast("AI司書猫（ノア）の活動を開始したにゃ🐾", "info");
          }}
          className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black rounded-xl transition-all shadow-sm shrink-0 border border-amber-300 flex items-center gap-1.5 cursor-pointer hover:scale-[1.01]"
        >
          <span>🐈 司書猫ノアを呼ぶ</span>
        </button>
      </div>
    );
  };

  const renderLoginRequirementPrompt = () => {
    return (
      <div id="login-required-prompt" className="bg-[#FFFDF9] border border-amber-200/60 p-8 rounded-3xl text-center text-[#5D5D55] space-y-4 shadow-sm max-w-md mx-auto my-6">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-3xl animate-pulse">🔑</div>
        <h3 className="font-serif font-black text-base text-[#4D4D44]">ログインすると記録を閲覧できます</h3>
        <p className="text-xs text-[#7A7A70] leading-relaxed font-sans">
          あなたのタイムライン、背表紙本棚、AI脳内自己分析はログイン後に安全に保護・閲覧できます。アカウントのログインまたは新規登録をお願いするにゃ🐾
        </p>
        <button
          onClick={() => setActiveTab("auth")}
          className="px-5 py-2.5 bg-[#81C784] hover:bg-[#66BB6A] text-white text-xs font-black rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] select-none"
        >
          ログイン/新規登録へ進む 🐾
        </button>
      </div>
    );
  };

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Safeguard state to prevent premature cloud-overwrites before initial pull completes
  const [hasPulled, setHasPulled] = useState(false);

  // Local-to-Cloud Migration Wizard states
  const [showMigrator, setShowMigrator] = useState(false);
  const [migratorStep, setMigratorStep] = useState<"ready" | "migrating" | "done">("ready");

  // Synchronize bottomTab with activeTab to ensure backwards compatibility with all links
  useEffect(() => {
    if (activeTab === "settings") {
      setBottomTab("settings");
    } else if (activeTab === "auth") {
      setBottomTab("settings");
    } else if (activeTab === "database") {
      setBottomTab("memory");
    } else if (activeTab === "map") {
      setBottomTab("map");
    } else if (activeTab === "search") {
      setBottomTab("search");
    } else if (["record", "library", "analysis", "simulator", "shelf", "history"].includes(activeTab)) {
      setBottomTab("home");
      setLastHomeTab(activeTab as any);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      const migrated = localStorage.getItem("hippocampus_migrated") === "true";
      // Only trigger migration if the local guest storage has actual user-created logs
      // (not just the 2 initial template welcome logs) or contains books.
      const localLogs = getLogs();
      const hasActualLocalLogs = localLogs.length > 2 || (localLogs.length > 0 && localLogs.some(l => l.id !== "init-1" && l.id !== "init-2"));
      const hasLocalBooks = getBooks().length > 0;
      if (!migrated && (hasActualLocalLogs || hasLocalBooks)) {
        setShowMigrator(true);
      } else {
        setShowMigrator(false);
      }
    } else {
      setShowMigrator(false);
    }
  }, [user]);

  const handleMigrateLocalData = async () => {
    setMigratorStep("migrating");
    try {
      const localLogs = getLogs();
      const localBooks = getBooks();
      const localSettings = getSettings();
      const localReviews = getReviews();

      const success = await cloudSupabase.pushDataToCloud(localLogs, localBooks, localSettings, localReviews);
      if (success) {
        setMigratorStep("done");
        localStorage.setItem("hippocampus_migrated", "true");
        showToast("すべての本棚・記憶データがクラウド（Supabase）に統合されたにゃあ！🐾", "success");
        
        const payload = await cloudSupabase.pullDataFromCloud();
        if (payload) {
          if (payload.logs.length > 0) {
            setLogs(payload.logs);
            saveLogs(payload.logs);
          }
          if (payload.books.length > 0) {
            setBooks(payload.books);
            saveBooks(payload.books);
          }
          if (payload.settings) {
            setSettings(payload.settings);
            saveSettings(payload.settings);
          }
          if (payload.reviews && payload.reviews.length > 0) {
            setReviews(payload.reviews);
            saveReviews(payload.reviews);
          }
        }
      } else {
        setMigratorStep("ready");
        showToast("クラウドへの統合に失敗しましたにゃ。ネットワーク等を確認してにゃ🐾", "error");
      }
    } catch (e) {
      console.error(e);
      setMigratorStep("ready");
      showToast("エラーによりデータの統合が完了できませんでしたにゃ🐾", "error");
    }
  };

  // Load database on Boot/login
  useEffect(() => {
    const unsubscribe = cloudSupabase.subscribeAuthChange((u) => {
      setUser(u);
    });
    
    const unsubSync = cloudSupabase.subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
      unsubSync();
    };
  }, []);

  const handleManualForceSync = async () => {
    if (!user) {
      showToast("クラウド同期にはログインが必要ですにゃ🐾", "info");
      return;
    }
    setIsManualSyncing(true);
    showToast("クラウドから最新データを確認・取得中だにゃ🐾", "info");
    
    try {
      // 1. Pull from Cloud FIRST to ensure we do not overwrite cloud data with empty local state!
      const cloudPayload = await cloudSupabase.pullDataFromCloud();
      
      let mergedLogs = logs;
      let mergedBooks = books;
      let mergedReviews = reviews;
      let mergedSettings = settings;

      if (cloudPayload) {
        // If local logs has only initial logs or is empty, overwrite with cloud logs
        const isLocalClean = logs.length === 0 || (logs.length <= 2 && logs.every(l => l.id === "init-1" || l.id === "init-2"));
        
        if (isLocalClean && cloudPayload.logs.length > 0) {
          mergedLogs = cloudPayload.logs;
          setLogs(cloudPayload.logs);
          saveLogs(cloudPayload.logs, user.id);
        } else {
          // Merge logic: Add cloud logs that are not present locally
          const localIds = new Set(logs.map(l => l.id));
          const newCloudLogs = cloudPayload.logs.filter(cl => !localIds.has(cl.id));
          if (newCloudLogs.length > 0) {
            mergedLogs = [...logs, ...newCloudLogs];
            setLogs(mergedLogs);
            saveLogs(mergedLogs, user.id);
          }
        }

        // Same for books
        if (books.length === 0 && cloudPayload.books.length > 0) {
          mergedBooks = cloudPayload.books;
          setBooks(cloudPayload.books);
          saveBooks(cloudPayload.books, user.id);
        } else {
          const localBookIds = new Set(books.map(b => b.id));
          const newCloudBooks = cloudPayload.books.filter(cb => !localBookIds.has(cb.id));
          if (newCloudBooks.length > 0) {
            mergedBooks = [...books, ...newCloudBooks];
            setBooks(mergedBooks);
            saveBooks(mergedBooks, user.id);
          }
        }

        // Same for reviews
        if (reviews.length === 0 && cloudPayload.reviews && cloudPayload.reviews.length > 0) {
          mergedReviews = cloudPayload.reviews;
          setReviews(cloudPayload.reviews);
          saveReviews(cloudPayload.reviews, user.id);
        } else if (cloudPayload.reviews && cloudPayload.reviews.length > 0) {
          const localReviewIds = new Set(reviews.map(r => r.id));
          const newCloudReviews = cloudPayload.reviews.filter(cr => !localReviewIds.has(cr.id));
          if (newCloudReviews.length > 0) {
            mergedReviews = [...reviews, ...newCloudReviews];
            setReviews(mergedReviews);
            saveReviews(mergedReviews, user.id);
          }
        }

        if (cloudPayload.settings) {
          mergedSettings = { ...settings, ...cloudPayload.settings };
          setSettings(mergedSettings);
          saveSettings(mergedSettings, user.id);
        }
      }

      // 2. Now push the safely merged state back to cloud to guarantee synchronization!
      const pushSuccess = await cloudSupabase.pushDataToCloud(mergedLogs, mergedBooks, mergedSettings, mergedReviews, true);
      
      if (pushSuccess) {
        showToast("クラウドとの同期編纂が完了しました🐾 最新の状態にアップデートされたにゃ！🎉", "success");
      } else {
        showToast("データの同期取得は完了しましたにゃ！🐾", "success");
      }
    } catch (err: any) {
      console.error(err);
      showToast("同期処理の途中でエラーが発生しましたにゃ: " + err.message, "error");
    } finally {
      setIsManualSyncing(false);
    }
  };

  useEffect(() => {
    setLogs(getLogs(user?.id));
    setBooks(getBooks(user?.id));
    setAnnouncements(getAnnouncements(user?.id));
    setReviews(getReviews(user?.id));

    // Reset safety block on user-auth transitions
    if (!user) {
      setHasPulled(false);
    }

    // Silent cross-refresh background sync with the cloud database for logged in profiles
    if (user) {
      cloudSupabase.pullDataFromCloud().then((cloudPayload) => {
        if (cloudPayload) {
          if (cloudPayload.logs.length > 0) {
            setLogs(cloudPayload.logs);
            saveLogs(cloudPayload.logs, user.id);
          }
          if (cloudPayload.books.length > 0) {
            setBooks(cloudPayload.books);
            saveBooks(cloudPayload.books, user.id);
          }
          if (cloudPayload.settings) {
            setSettings(cloudPayload.settings);
            saveSettings(cloudPayload.settings, user.id);
          }
          if (cloudPayload.reviews && cloudPayload.reviews.length > 0) {
            setReviews(cloudPayload.reviews);
            saveReviews(cloudPayload.reviews, user.id);
          }
        }
      }).catch((err) => {
        console.warn("Background cloud sync pull on boot failed:", err);
      }).finally(() => {
        setHasPulled(true);
      });
    }
  }, [user]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync state data safely across state and local storage, and optionally Cloud Database push
  const handleLogsChange = (newLogs: TimelineLog[]) => {
    setLogs(newLogs);
    saveLogs(newLogs, user?.id);
    if (user && hasPulled) {
      cloudSupabase.pushDataToCloud(newLogs, books, settings, reviews);
    }
  };

  const handleBooksChange = (newBooks: BoundBook[]) => {
    setBooks(newBooks);
    saveBooks(newBooks, user?.id);
    if (user && hasPulled) {
      cloudSupabase.pushDataToCloud(logs, newBooks, settings, reviews);
    }
  };

  const handleAnnouncementsChange = (newAnn: CatAnnouncement[]) => {
    setAnnouncements(newAnn);
    saveAnnouncements(newAnn, user?.id);
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, user?.id);
    if (user && hasPulled) {
      cloudSupabase.pushDataToCloud(logs, books, newSettings, reviews);
    }
  };

  // On Login/Logout transitions, pull or clean states
  const handleAuthChange = async (newUser: UserProfile | null) => {
    setUser(newUser);
    if (newUser) {
      setHasPulled(false);
      // Pull saved cloud data
      showToast("クラウドからあなたの本棚と海馬データを同期・復元中にゃ...", "info");
      try {
        const cloudPayload = await cloudSupabase.pullDataFromCloud();
        if (cloudPayload) {
          if (cloudPayload.logs.length > 0) {
            setLogs(cloudPayload.logs);
            saveLogs(cloudPayload.logs, newUser.id);
          }
          if (cloudPayload.books.length > 0) {
            setBooks(cloudPayload.books);
            saveBooks(cloudPayload.books, newUser.id);
          }
          if (cloudPayload.settings) {
            setSettings(cloudPayload.settings);
            saveSettings(cloudPayload.settings, newUser.id);
          }
          if (cloudPayload.reviews && cloudPayload.reviews.length > 0) {
            setReviews(cloudPayload.reviews);
            saveReviews(cloudPayload.reviews, newUser.id);
          }
          showToast("クラウド同期が完了しました🐾 本棚が最新になったにゃ！", "success");
          
          // Auto navigate to timeline (library) on login so they can immediately see their data!
          setActiveTab("library");
        }
      } catch (err) {
        console.error("Cloud pull failed during auth change:", err);
      } finally {
        setHasPulled(true);
      }
    } else {
      setHasPulled(false);
      // Local clean resets are handled inside cloudSupabase.signOut
      setLogs(getLogs(undefined));
      setBooks([]);
      setAnnouncements([]);
      setReviews([]);
    }
  };

  // Adding primary audio transcript/entry points
  const handleAddNewEntry = async (text: string, manual: string, tags: string[], dateTime: string, emotions?: string[]) => {
    setIsAnalyzing(true);
    
    try {
      const resp = await apiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          text: text || manual,
          tags: tags,
          aiEngine: settings.aiEngine,
          history: logs.slice(0, 10)
        })
      });

      if (!resp.ok) throw new Error("AI解析エラーにゃ。");
      const analysis = await resp.json();

      const newId = "log_" + Date.now() + "_" + Math.floor(Math.random() * 100);
      const newLog: TimelineLog = {
        id: newId,
        userId: user?.id,
        original: {
          transcription: text,
          manualNote: manual,
          datetime: dateTime || new Date().toISOString(),
          tags: tags,
          emotions: emotions || [],
        },
        aiData: {
          summary: analysis.summary || "出来事の要録",
          analysisStr: analysis.analysisStr || "特記事項なしにゃ。",
          emotion: (emotions && emotions.length > 0) ? emotions[0] : (analysis.emotion || "穏やか"),
          emotionColor: analysis.emotionColor || "#E2F0D9",
          catComment: analysis.catComment || "いつも頑張っているあなたを、私は見てるにゃあ。",
          reflectiveQuestion: analysis.reflectiveQuestion || "今日、一瞬でも肩の力を抜けた瞬間はあったかにゃ？",
          patterns: analysis.patterns,
          scenariomap: analysis.scenariomap
        },
        createdTime: Date.now()
      };

      const updated = [newLog, ...logs];
      handleLogsChange(updated);
      setActiveLogId(newId);
      if (newLog.aiData?.catComment) {
        setLatestCatComment(newLog.aiData.catComment);
      }
      showToast("新しい音声日記を海馬に保存して、AI編集を施したにゃ♪🐾", "success");
    } catch {
      // Robust offline fallback simulation
      const fallbackId = "fallback_" + Date.now();
      const fallbackLog: TimelineLog = {
        id: fallbackId,
        userId: user?.id,
        original: {
          transcription: text,
          manualNote: manual,
          datetime: dateTime || new Date().toISOString(),
          tags: tags,
          emotions: emotions || [],
        },
        aiData: {
          summary: "（ローカル保存）つぶやきの仮保存",
          analysisStr: "ローカル環境で安全にお預かりしました。ネットワーク復帰時にいつでも再生成できますにゃ🐾",
          emotion: (emotions && emotions.length > 0) ? emotions[0] : "内省的",
          emotionColor: "#EAE6DF",
          catComment: `（※オフライン/キー未設定）「${text || manual}」という出来事について、頭と体に負荷がかかりすぎていないか、お茶を淹れてゆっくり紐解くにゃ。`,
          reflectiveQuestion: "思い出すと、こころの温度はどれくらいになるにゃあ？",
          patterns: {
            emotionPattern: "時を問わず、内省する機会が増えているにゃ。",
            behaviorPattern: "ご自身を客観視するために記録しているにゃ。"
          }
        },
        createdTime: Date.now()
      };

      const updated = [fallbackLog, ...logs];
      handleLogsChange(updated);
      setActiveLogId(fallbackId);
      if (fallbackLog.aiData?.catComment) {
        setLatestCatComment(fallbackLog.aiData.catComment);
      }
      showToast("通信制限中のため、原本のみ安全に海馬へ仮保存したにゃ🌿", "info");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Saved manual Avatar logs registry
  const handleSaveAvatarLog = (text: string, emotionTag: string, customPayload?: any) => {
    const newId = "log_avatar_" + Date.now();
    const newLog: TimelineLog = {
      id: newId,
      userId: user?.id,
      original: {
        transcription: "",
        manualNote: text,
        datetime: new Date().toISOString(),
        tags: ["#インナーアバター", "#心象セルフチェック"],
      },
      aiData: {
        summary: customPayload ? `感情アバター状態: 安心感${customPayload.avatarState.safety}% / ストレス${customPayload.avatarState.stress}%` : "感情アバターの記録",
        analysisStr: `自己理解を深めるための客観的な外在化記録データです。自身の手動により心境レベルが調整されました。\nイベント背景: ${customPayload?.contextNotes || "なし"}`,
        emotion: emotionTag,
        emotionColor: emotionTag === "過緊張・疲労" ? "#FCE4D6" : emotionTag === "大いなる喜び" ? "#FFF2CC" : emotionTag === "寂しさ・孤独" ? "#D9E1F2" : emotionTag === "安心・安らぎ" ? "#E2F0D9" : "#EAEAEA",
        catComment: `あなたのアバターが「${emotionTag}」のバランスを示したにゃ！こうして数値にして外在化すること自体が、不安やモヤモヤを脳内（海馬）の外へ連れ出す強力なマインドフルネススキルにゃ。えらいにゃあ🐾`,
        reflectiveQuestion: "このアバターのスライダーを調整してみて、自分の身体のどの部位（胸、お腹、頭など）が今一番反応していると感じたかにゃ？",
        scenariomap: ["アバター状態の記録", emotionTag, `ストレス度: ${customPayload?.avatarState?.stress}%`]
      },
      createdTime: Date.now()
    };
    const updated = [newLog, ...logs];
    handleLogsChange(updated);
    setActiveLogId(newId);
    if (newLog.aiData?.catComment) {
      setLatestCatComment(newLog.aiData.catComment);
    }
    showToast("感情アバターログを海馬マップに保存したにゃ🐾", "success");
  };

  // Regenerate individual AI commentary for flexible recovery logic
  const handleRegenerateAi = async (id: string) => {
    const target = logs.find((l) => l.id === id);
    if (!target) return;

    setIsAnalyzing(true);
    showToast("AI司書がカルテを読み直し、分析レポートを再編成中だにゃ...", "info");

    try {
      const resp = await apiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          text: target.original.transcription || target.original.manualNote,
          tags: target.original.tags,
          aiEngine: settings.aiEngine,
          history: logs.filter((l) => l.id !== id).slice(0, 10)
        })
      });

      if (!resp.ok) throw new Error("再生成エラー");
      const analysis = await resp.json();

      const updatedLogs = logs.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            aiData: {
              summary: analysis.summary || "要録を再作成",
              analysisStr: analysis.analysisStr || "再構成された分析",
              emotion: analysis.emotion || "探求的",
              emotionColor: analysis.emotionColor || "#E3ECF5",
              catComment: analysis.catComment || "深呼吸して、自分に優しくにゃ。",
              reflectiveQuestion: analysis.reflectiveQuestion || "自分自身にどんな労いの言葉をかけたいにゃ？",
              patterns: analysis.patterns,
              scenariomap: analysis.scenariomap
            }
          };
        }
        return l;
      });

      handleLogsChange(updatedLogs);
      const renewed = updatedLogs.find(l => l.id === id);
      if (renewed?.aiData?.catComment) {
        setLatestCatComment(renewed.aiData.catComment);
      }
      showToast("AI編集版の再構成が成功したにゃあ！🐾", "success");
    } catch {
      showToast("AI司書猫が居眠りして再生成に失敗したにゃ。また後でお試しにゃ🐾", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Delete Log
  const handleDeleteLog = (id: string) => {
    const filtered = logs.filter((l) => l.id !== id);
    handleLogsChange(filtered);
    if (activeLogId === id) setActiveLogId(null);
    showToast("脳内からきれいに消去（忘却）したにゃ。新しい幸せで満たしてにゃ🌿", "info");
  };

  // Delete Multiple Logs
  const handleDeleteMultipleLogs = (ids: string[], toastMessage?: string) => {
    const filtered = logs.filter((l) => !ids.includes(l.id));
    handleLogsChange(filtered);
    if (activeLogId && ids.includes(activeLogId)) {
      setActiveLogId(null);
    }
    const msg = toastMessage || `${ids.length}件の記憶を海馬から一括で消去（忘却）したにゃ。新しい幸せで満たしてにゃ🌿`;
    showToast(msg, "info");
  };

  // Update Log Original Description & Metadata
  const handleUpdateLog = (id: string, updatedOriginal: { transcription: string; manualNote: string; tags: string[]; datetime: string; emotions?: string[] }) => {
    const updated = logs.map((l) => {
      if (l.id === id) {
        return {
          ...l,
          original: {
            ...l.original,
            ...updatedOriginal,
          },
        };
      }
      return l;
    });
    handleLogsChange(updated);
  };

  // 1-Week Timeline Review (Wednesday to Tuesday) range definitions
  const getWednesdayToTuesdayRange = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 3 is Wednesday, ..., 6 is Saturday
    
    // Find the most recent Tuesday
    let daysToTuesday = 2 - currentDay;
    if (daysToTuesday > 0) {
      daysToTuesday -= 7; // Go back to the previous Tuesday
    }
    
    const tuesday = new Date(now);
    tuesday.setDate(now.getDate() + daysToTuesday);
    tuesday.setHours(23, 59, 59, 999);
    
    const wednesday = new Date(tuesday);
    wednesday.setDate(tuesday.getDate() - 6); // 6 days before Tuesday is Wednesday
    wednesday.setHours(0, 0, 0, 0);
    
    return { start: wednesday, end: tuesday };
  };

  const getWeeklyPrintLogsRange = () => {
    const { start, end } = getWednesdayToTuesdayRange();
    let filtered = logs.filter((log) => {
      const logTime = new Date(log.original.datetime);
      return logTime >= start && logTime <= end;
    });
    
    // Fallback: If empty, use all logs so the user has content to test print
    let isFallback = false;
    if (filtered.length === 0) {
      filtered = [...logs];
      isFallback = true;
    }
    
    // Sort oldest first chronologically for weekly printout
    const sorted = filtered.sort((a, b) => new Date(a.original.datetime).getTime() - new Date(b.original.datetime).getTime());
    return {
      rangeLogs: sorted,
      isFallback,
      start,
      end
    };
  };

  // Periodic Summaries & Bookbinding logic
  const handleGenerateReview = async (range: "週間" | "月間" | "年間") => {
    if (logs.length === 0) {
      showToast("要約を生成するための履歴がタイムラインにありませんにゃ", "error");
      return;
    }

    setIsGeneratingReview(true);
    try {
      const resp = await apiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          logs: logs.slice(0, 15),
          range: range
        })
      });

      if (!resp.ok) throw new Error("要約作成失敗");
      const res = await resp.json();

      const newReview: ReviewResult = {
        id: "rev_" + Date.now(),
        range: range,
        generatedAt: new Date().toLocaleDateString("ja-JP"),
        ...res
      };

      const updated = [newReview, ...reviews];
      setReviews(updated);
      saveReviews(updated);
      setActiveReviewResult(newReview);
      showToast(`${range}の脳内インサイトマップを製本したにゃあ！🐾`, "success");
    } catch {
      // Fallback Reviewer
      const fallbackReview: ReviewResult = {
        id: "mock_" + Date.now(),
        range: range,
        generatedAt: new Date().toLocaleDateString("ja-JP"),
        summary: "（簡易生成）直近のつぶやき・お散歩や、穏やかな休息の習慣により、心身の乱れが少しずつ整えられ、ご自身を大切にする『自愛の種』がしっかりと育っている様子が見えるにゃ。",
        growthFocus: "不安に過剰に囚われず、スマホを置いて早めにお茶を飲むなど、迅速な回復行動を起こせているにゃ！",
        topEmotions: ["穏やか", "内省", "満足"],
        stressTriggers: ["SNSスクロール", "オンライン疲れ"],
        recoveryElements: ["お散歩", "美味しいお茶", "セルフケア"],
        connectionMap: {
          frequentPeople: ["古い友人"],
          frequentPlaces: ["陽のあたる公園", "我が家のリビング"],
          frequentActivities: ["カフェ巡り", "音楽鑑賞"]
        },
        catConsolation: "がんばり屋のあなたへ。完璧な日なんて作らなくていいにゃ。毎日息をして、ここに美味しい空気をお話ししに来るだけで100点満点にゃあ🐾",
        deepReflections: [
          "今日一日で、自分を1ミリでも『よくがんばったにゃ』と認めてあげられる点はどこかにゃ？",
          "思わず目を閉じて深呼吸したくなるような、心地よい瞬間を5分だけ作るとしたら何をしたいにゃ？"
        ]
      };
      const updated = [fallbackReview, ...reviews];
      setReviews(updated);
      saveReviews(updated);
      setActiveReviewResult(fallbackReview);
      showToast("通信環境により、簡易的なレポートを出力したにゃ🌿", "info");
    } finally {
      setIsGeneratingReview(false);
    }
  };

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

  // 製本機能 (Book Binding Ceremony)
  const handleBindBook = async (period: string, type: "weekly" | "monthly" | "yearly") => {
    setIsClassBinding(true);

    // Filter matching logs to bind
    const targetLogs = logs.filter((log) => {
      const logDate = new Date(log.original.datetime);
      if (isNaN(logDate.getTime())) return false;
      const year = logDate.getFullYear().toString();
      const month = (logDate.getMonth() + 1).toString().padStart(2, "0");
      const code = `${year}-${month}`; // "2026-05"

      if (type === "weekly") {
        const info = getWeekRangeAndCode(logDate);
        return info.code === period;
      } else if (type === "monthly") {
        return code === period;
      } else {
        return year === period;
      }
    });

    if (targetLogs.length === 0) {
      showToast(`「${period}」期間の対象ログが見つからないため、白紙の本は作れなかったにゃ🐾`, "error");
      setIsClassBinding(false);
      return;
    }

    // Extraction Themes & Cat commentaries depending on context moods:
    // Simple custom classifier/analyzer (Or we can dynamically request Gemini!)
    let themeTitle = type === "weekly" ? "穏やかな日々の週" : type === "monthly" ? "静かな回復の月" : "新しい挑戦の一年";
    let catVerdict = `「${period}」のたくさんの記憶をまとめたにゃ。素晴らしい一歩を踏みしめた形跡がいっぱい本棚に追加されていくにゃ。`;

    // extract positive tags to paint theme titles
    const allTags = targetLogs.flatMap((l) => l.original.tags);
    if (allTags.includes("散歩") && allTags.includes("音楽")) {
      themeTitle = type === "weekly" ? "お散歩とメロディの週" : type === "monthly" ? "歌声が戻ってきたお散歩の月" : "音楽と対話あふれる一年";
    } else if (allTags.includes("仕事") && allTags.includes("もやもや")) {
      themeTitle = type === "weekly" ? "一歩ずつ心の整理を試みた週" : type === "monthly" ? "静かに心を守りぬいた月" : "葛藤から深い自愛に向き合った一年";
    } else if (allTags.includes("自然") || allTags.includes("ご自愛")) {
      themeTitle = type === "weekly" ? "のんびり自分に還る週" : type === "monthly" ? "陽のあたる温かな休息月" : "自分を愛しぬいた一年";
    }

    let bookTitle = "";
    if (type === "weekly") {
      const yearAndWeek = period.split("-W");
      const year = yearAndWeek[0];
      const week = yearAndWeek[1] ? parseInt(yearAndWeek[1], 10) : "";
      bookTitle = `${year}年 第${week}週号`;
      catVerdict = `「${year}年 第${week}週」の記憶をぎゅっと１冊の手帳に仕立てたにゃ。この１週間にあなたが感じた喜びも悩みも、すべて大切な心の物語にゃ。`;
    } else if (type === "monthly") {
      bookTitle = `${period}月号`;
      catVerdict = `「${period}」の記憶をきれいに１冊の本に編纂したにゃ🐾 今月は、スマホから距離を置いたりお散歩する習慣があなたの心の防波堤になっていたよ。よくやりきったにゃ。`;
    } else {
      bookTitle = `『${period}年の記録』`;
      catVerdict = `大きな『${period}年の記録』という傑作が完成したにゃあ！嬉しいことも、不安だった夜も、すべてがあなたを形づくる貴重な１ページにゃ。本棚にずっと大切に飾っておくにゃ。`;
    }

    const newBook: BoundBook = {
      id: "book_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      userId: user?.id,
      title: bookTitle,
      type: type,
      periodCode: period,
      theme: themeTitle,
      catComment: catVerdict,
      createdAt: new Date().toISOString(),
      logCount: targetLogs.length,
      logIds: targetLogs.map((l) => l.id),
    };

    const updatedBooks = [newBook, ...books];
    handleBooksChange(updatedBooks);

    // post cat librarian notice
    const newNotice: CatAnnouncement = {
      id: "notice_" + Date.now(),
      title: "司書長ノアより製本のお知らせ",
      message: `「${newBook.title}」の製本がすてきに完了したにゃあ！書棚の背表紙ギャラリーに並べておいたので、いつでも本をクリックして眺めてみてにゃ🐾`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    const updatedNotices = [newNotice, ...announcements];
    handleAnnouncementsChange(updatedNotices);

    showToast(`製本「${newBook.title}（テーマ: ${themeTitle}）」が本棚に自動収納されたにゃ！📚`, "success");
    setIsClassBinding(false);
  };

  const handleMarkNoticeRead = (id: string) => {
    const updated = announcements.map((a) => (a.id === id ? { ...a, isRead: true } : a));
    handleAnnouncementsChange(updated);
  };

  const handleDeleteNotice = (id: string) => {
    const updated = announcements.filter((a) => a.id !== id);
    handleAnnouncementsChange(updated);
  };

  const handleClearAllNotices = () => {
    handleAnnouncementsChange([]);
  };

  const handleDeleteBook = (id: string) => {
    const updatedBooks = books.filter((b) => b.id !== id);
    handleBooksChange(updatedBooks);
  };

  // PDF年月日用フィルタ月リスト
  const getAvailableYearsMonths = () => {
    const list = new Set<string>();
    logs.forEach(l => {
      if (l.original && l.original.datetime) {
        try {
          const d = new Date(l.original.datetime);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            list.add(`${year}-${month}`); // "YYYY-MM"
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
    return Array.from(list).sort((a, b) => b.localeCompare(a));
  };

  // フィルタおよびソート済みのPDF用データを取得
  const getFilteredLogsForPdf = () => {
    let filtered = [...logs];
    if (pdfYearMonthFilter !== "all") {
      filtered = filtered.filter(l => {
        if (!l.original || !l.original.datetime) return false;
        try {
          const d = new Date(l.original.datetime);
          if (isNaN(d.getTime())) return false;
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return ym === pdfYearMonthFilter;
        } catch {
          return false;
        }
      });
    }
    filtered.sort((a, b) => {
      const timeA = new Date(a.original.datetime).getTime() || 0;
      const timeB = new Date(b.original.datetime).getTime() || 0;
      return pdfSortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
    return filtered;
  };

  // PDF用のログのグループ分け（1ページあたりに収めるデータ）
  const getPdfChunks = (filteredList: TimelineLog[]) => {
    const chunks: TimelineLog[][] = [];
    const itemsPerPage = pdfIncludeAi ? 1 : 2; // 原本+AIなら1ページ1ログ、原本のみなら1ページ2ログ
    
    for (let i = 0; i < filteredList.length; i += itemsPerPage) {
      chunks.push(filteredList.slice(i, i + itemsPerPage));
    }
    return chunks;
  };

  const handleGeneratePDF = async () => {
    const filteredList = getFilteredLogsForPdf();
    if (filteredList.length === 0) {
      showToast("対象の期間内にエクスポートできる記憶がありませんにゃ🐾", "error");
      return;
    }

    try {
      setPdfGeneratingStatus("preparing");
      showToast("PDFの製本準備中だにゃ🐾", "info");

      // 少し待ってからレンダリングを反映
      await new Promise(resolve => setTimeout(resolve, 800));
      setPdfGeneratingStatus("rendering");

      const printArea = document.getElementById("pdf-render-area");
      if (!printArea) {
        showToast("PDFレンダリング領域の作成に失敗しましたにゃ🐾", "error");
        setPdfGeneratingStatus("");
        return;
      }

      const pages = printArea.querySelectorAll(".pdf-page");
      if (pages.length === 0) {
        showToast("印刷ページが見つかりませんにゃ🐾期間フィルターを調整してにゃ。", "error");
        setPdfGeneratingStatus("");
        return;
      }

      showToast(`全 ${pages.length} ページのPDFを編纂中... 少々お待ちくださいにゃ🎨`, "info");
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2, // 高解像度（にじみ防止・画像拡大耐性）
          useCORS: true,
          allowTaint: true,
          backgroundColor: pdfTemplateStyle === "washo" ? "#FDFBF7" : "#FFFFFF"
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      const dateStr = pdfYearMonthFilter === "all" ? "full" : pdfYearMonthFilter;
      const title = `hippocampus_diary_${dateStr}_${Date.now().toString().slice(-6)}.pdf`;
      
      // Directly output PDF page to browser new window/tab instead of downloading directly
      try {
        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, "_blank");
        if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
          pdf.save(title);
          showToast(`ポップアップがブロックされましたが、PDF「${title}」を直接保存しましたにゃ！🐾`, "success");
        } else {
          showToast(`「${title}」をブラウザ別ウィンドウでPDF表示しましたにゃ！🐾🎉`, "success");
        }
      } catch (err) {
        pdf.save(title);
        showToast(`「${title}」の美しい電子製本PDFが保存されましたにゃ！🐾🎉`, "success");
      }

      setPdfGeneratingStatus("completed");

      setTimeout(() => {
        setPdfGeneratingStatus("");
        setShowPdfExportModal(false);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      showToast("PDF変換中にエラーが発生しましたにゃ: " + err.message, "error");
      setPdfGeneratingStatus("");
    }
  };

  const [weeklyPdfGenerating, setWeeklyPdfGenerating] = useState(false);

  const handleGenerateWeeklyPDF = async () => {
    const printArea = document.getElementById("print-area");
    if (!printArea) {
      showToast("レンダリング対象が見つかりませんにゃ🐾", "error");
      return;
    }

    try {
      setWeeklyPdfGenerating(true);
      showToast("1週間の振り返りPDFを編纂中だにゃ🐾", "info");
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FFFFFF"
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pageHeightInPixel = (imgWidth / pdfWidth) * pdfHeight;
      
      let leftHeight = imgHeight;
      let position = 0;
      let isFirstPage = true;

      while (leftHeight > 0) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, (imgHeight * pdfWidth) / imgWidth, undefined, "FAST");
        
        leftHeight -= pageHeightInPixel;
        position -= pdfHeight;
        isFirstPage = false;
      }

      const title = `hippocampus_weekly_${Date.now().toString().slice(-6)}.pdf`;
      
      try {
        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, "_blank");
        if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
          pdf.save(title);
          showToast(`ポップアップがブロックされましたが、1週間振り返りPDF「${title}」を直接保存しましたにゃ！🐾`, "success");
        } else {
          showToast(`「${title}」をブラウザ別ウィンドウでPDF表示しましたにゃ！🐾🎉`, "success");
        }
      } catch (err) {
        pdf.save(title);
        showToast(`「${title}」の1週間振り返りPDFが保存されましたにゃ！🐾🎉`, "success");
      }

      setWeeklyPdfGenerating(false);
      setShowPrintOverlay(false);
    } catch (err: any) {
      console.error(err);
      showToast("PDF変換中にエラーが発生しましたにゃ: " + err.message, "error");
      setWeeklyPdfGenerating(false);
    }
  };

  // Exporters execution
  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`エクスポート書類「${filename}」を書き出しましたにゃ💾`, "success");
  };

  const handleTriggerExport = async (format: "TXT" | "Markdown" | "JSON" | "ZIP") => {
    if (logs.length === 0) {
      showToast("書き出せる記憶データがありませんにゃ", "error");
      return;
    }

    if (format === "JSON") {
      const data = generateJSONExport(logs, exportMode, user?.id);
      handleDownloadFile(data, `hippocampus_export_${exportMode}.json`, "application/json");
    } else if (format === "TXT") {
      const data = generateRawTextExport(logs, exportMode);
      handleDownloadFile(data, `hippocampus_plain_${exportMode}.txt`, "text/plain;charset=utf-8");
    } else if (format === "Markdown") {
      const data = generateMarkdownExport(logs, exportMode);
      handleDownloadFile(data, `hippocampus_diary_${exportMode}.md`, "text/markdown;charset=utf-8");
    } else if (format === "ZIP") {
      try {
        showToast("完全バックアップZIPを作成中だにゃ...", "info");
        const blob = await generateZipExportBlob(logs, exportMode);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `hippocampus_package_${exportMode}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("ZIPファイルのダンロードが始まりましたにゃ！🐾", "success");
      } catch (e: any) {
        showToast("ZIP圧縮中に失敗しました: " + e.message, "error");
      }
    }
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) {
      showToast("インポートするJSONテキストを貼り付けてくださいにゃ🐾", "error");
      return;
    }
    const result = importSyncPayload(importText, user?.id);
    if (result.success) {
      showToast(result.message, "success");
      setLogs(getLogs(user?.id));
      setBooks(getBooks(user?.id));
      setAnnouncements(getAnnouncements(user?.id));
      setReviews(getReviews(user?.id));
      setSettings(getSettings(user?.id));
      setImportText("");
    } else {
      showToast(result.message, "error");
    }
  };

  const runBackgroundAnalysisForLogs = async (newLogs: TimelineLog[]) => {
    // 1. Mark all newly imported logs as isAnalyzing: true in state
    setLogs((currentLogs) => {
      const updated = currentLogs.map((l) => {
        const isNewImported = newLogs.some((nl) => nl.id === l.id);
        if (isNewImported) {
          return { ...l, isAnalyzing: true };
        }
        return l;
      });
      return updated;
    });

    // 2. Process each log sequentially
    for (const log of newLogs) {
      try {
        const resp = await apiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "analyze",
            text: log.original.transcription || log.original.manualNote,
            tags: log.original.tags,
            aiEngine: settings.aiEngine,
            history: logs.filter((l) => l.id !== log.id).slice(0, 10)
          })
        });

        if (resp.ok) {
          const analysis = await resp.json();
          setLogs((currentLogs) => {
            const updated = currentLogs.map((l) => {
              if (l.id === log.id) {
                return {
                  ...l,
                  isAnalyzing: false,
                  aiData: {
                    summary: analysis.summary || "要録をインポート作成",
                    analysisStr: analysis.analysisStr || "再構成された分析",
                    emotion: analysis.emotion || "探求的",
                    emotionColor: analysis.emotionColor || "#E3ECF5",
                    catComment: analysis.catComment || "深呼吸して、自分に優しくにゃ。",
                    reflectiveQuestion: analysis.reflectiveQuestion || "自分自身にどんな労いの言葉をかけたいにゃ？",
                    patterns: analysis.patterns,
                    scenariomap: analysis.scenariomap
                  }
                };
              }
              return l;
            });
            // Persist updated logs
            saveLogs(updated, user?.id);
            if (user) {
              cloudSupabase.pushDataToCloud(updated, books, settings, reviews);
            }
            return updated;
          });
        } else {
          setLogs((currentLogs) => {
            const updated = currentLogs.map((l) => {
              if (l.id === log.id) {
                return { ...l, isAnalyzing: false };
              }
              return l;
            });
            saveLogs(updated, user?.id);
            return updated;
          });
        }
      } catch (err) {
        console.error("Failed background analysis for log", log.id, err);
        setLogs((currentLogs) => {
          const updated = currentLogs.map((l) => {
            if (l.id === log.id) {
              return { ...l, isAnalyzing: false };
            }
            return l;
          });
          saveLogs(updated, user?.id);
          return updated;
        });
      }
    }
  };

  const handleRawImportSubmit = () => {
    if (!rawImportText.trim()) {
      showToast("インポートするテキストを入力または貼り付けてくださいにゃ🐾", "error");
      return;
    }

    const parsedNewLogs = parseRawTextImport(rawImportText);
    if (parsedNewLogs.length === 0) {
      showToast("有効な記憶テキストを読み取れなかったにゃ。1行に「日付 + 内容 #タグ」のような形式で入力してにゃ💬", "error");
      return;
    }

    const updatedLogs = [...parsedNewLogs, ...logs];
    handleLogsChange(updatedLogs);

    // Save ids for undo
    updateLastImportedIds(parsedNewLogs.map(log => log.id));

    setRawImportText("");
    showToast(`${parsedNewLogs.length}件の記憶原本を復元インポートしたにゃ！バックグラウンドでAI司書猫が順番に自動評釈・要約を執筆中だにゃ🐾`, "success");

    // Trigger background AI reviews and updates
    runBackgroundAnalysisForLogs(parsedNewLogs);
  };

  const handleImportRawTextDirect = (text: string): boolean => {
    const parsedNewLogs = parseRawTextImport(text);
    if (parsedNewLogs.length === 0) {
      return false;
    }
    const updatedLogs = [...parsedNewLogs, ...logs];
    handleLogsChange(updatedLogs);

    // Save ids for undo
    updateLastImportedIds(parsedNewLogs.map(log => log.id));
    showToast(`${parsedNewLogs.length}件の記憶原本をインポートしたにゃ！バックグラウンドでAI司書猫が順番に自動要約を作成中だにゃ🐾`, "success");

    // Trigger background AI reviews and updates
    runBackgroundAnalysisForLogs(parsedNewLogs);
    return true;
  };

  const handleUndoRawImportDirect = () => {
    if (lastImportedIds.length === 0) {
      showToast("直前にインポートされたデータは見つからないにゃ🐾", "info");
      return;
    }
    const filtered = logs.filter(log => !lastImportedIds.includes(log.id));
    handleLogsChange(filtered);
    showToast(`直前に一括インポートした ${lastImportedIds.length} 件の文章を一括削除して、復元したにゃ！🐾`, "success");
    updateLastImportedIds([]);
  };

  const handleImportJsonDirect = (text: string): boolean => {
    const result = importSyncPayload(text, user?.id);
    if (result.success) {
      setLogs(getLogs(user?.id));
      setBooks(getBooks(user?.id));
      setAnnouncements(getAnnouncements(user?.id));
      setReviews(getReviews(user?.id));
      const newSettings = getSettings(user?.id);
      setSettings(newSettings);
      return true;
    }
    return false;
  };

  return (
    <div className={`min-h-screen bg-[#F5FAF6] text-[#455A64] flex flex-col font-sans antialiased pb-24`}>
      {/* Universal Global Undo Emergency Banner / Bar at the Absolute Top! */}
      {lastImportedIds.length > 0 && (
        <div className="bg-rose-100 border-b-2 border-rose-300 text-rose-900 px-4 py-3 shadow-md relative z-50 animate-fadeIn">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-start gap-2.5">
              <span className="text-xl shrink-0 animate-bounce">🐾↩️</span>
              <div>
                <p className="text-xs font-black flex flex-wrap items-center gap-2 text-rose-900">
                  <span>直前のインポートを一括で取り消せますにゃ！</span>
                  <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                    対象: {lastImportedIds.length}件
                  </span>
                </p>
                <p className="text-[11px] text-rose-700/90 font-medium mt-0.5">
                  もし「日付がおかしかったり」「間違えた」等で入力を間違えてしまった場合は、お隣の赤いボタンで一瞬で一括削除して元に戻せます。
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={handleUndoRawImportDirect}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02] transform cursor-pointer flex items-center justify-center gap-1 shrink-0 select-none"
              >
                <span>インポートを一括削除する ↩️🐾</span>
              </button>
              <button
                type="button"
                onClick={() => updateLastImportedIds([])}
                className="p-1 px-2.5 text-rose-600 hover:text-rose-950 font-bold text-xs rounded-lg hover:bg-rose-200/50 transition-all cursor-pointer"
                title="この取消バーを閉じる（以降は取り消せなくなります）"
              >
                ✕ 閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* localStorage ID Manager Modal */}
      {showLsaModal && (
        <div 
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fadeIn overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLsaModal(false);
            }
          }}
        >
          <div className="bg-[#F5F2ED] rounded-2xl border-2 border-amber-950/20 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-left font-sans animate-scaleIn">
            <div className="p-4 md:p-5 border-b border-amber-900/5 bg-[#FAF9F5] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋🐾</span>
                <h3 className="font-serif font-black text-[#4A5D4E] text-sm">
                  ローカルストレージ (インポートID履歴) 管理
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLsaModal(false)}
                className="text-stone-600 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full text-xs font-black shadow-2xs"
                title="閉じて元の画面に戻る🐾"
              >
                <X className="w-4 h-4" />
                <span>✕ 閉じて戻る🐾</span>
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-[11px] leading-relaxed text-amber-900 font-medium">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-955">
                  <span>🐾 インポート履歴とは？</span>
                  <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                    Key: hippocampus_last_imported_ids
                  </span>
                </p>
                タイムラインへの一括インポート完了時、「直後に間違えて取り消したい場合」のために、インポートされた各記憶ログのユニークID群をブラウザのローカルストレージに安全に保管しているにゃ。
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  💾 保存されているID配列 (JSON形式文字列):
                </label>
                <textarea
                  value={lsaInputVal}
                  onChange={(e) => setLsaInputVal(e.target.value)}
                  placeholder='例: ["id_1", "id_2"]'
                  className="w-full h-24 p-2.5 bg-[#FAF9F5] border border-black/[0.1] rounded-2xl font-mono text-[11px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]/30"
                />
                <p className="text-[10px] text-stone-500 leading-normal pl-1">
                  ※IDリストの内容を手動で書き換えることができます。配列の書式が正しくない場合（JSONパースエラー等）、保存時にアラートが表示されますにゃ。
                </p>
              </div>

              {/* Status and Action controls */}
              <div className="border-t border-amber-900/5 pt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs text-stone-700 font-bold px-1">
                  <span>IDリストに定義されている数:</span>
                  <span className="bg-[#4A5D4E] text-white font-mono px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {(() => {
                      try {
                        const parsed = JSON.parse(lsaInputVal || "[]");
                        return Array.isArray(parsed) ? `${parsed.length} 件` : "配列エラー ❌";
                      } catch {
                        return "JSONパースエラー ❌";
                      }
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(lsaInputVal || "[]");
                        if (!Array.isArray(parsed)) {
                          throw new Error("配列ではありません");
                        }
                        updateLastImportedIds(parsed);
                        showToast("ローカルストレージの値を手動更新したにゃ！🐾", "success");
                      } catch (err) {
                        showToast(`保存エラー: 正しいJSON配列(例: ["id1", "id2"])で入力してくださいにゃ🐾`, "error");
                      }
                    }}
                    className="py-2.5 px-3 bg-[#4A5D4E] hover:bg-[#3d4c40] text-white rounded-xl shadow-xs transition-all text-center cursor-pointer font-bold"
                  >
                    💾 履歴IDを更新保存
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLsaInputVal("[]");
                      updateLastImportedIds([]);
                      showToast("インポート履歴のID群を完全に消去（クリア）したにゃ！🧹🐾", "success");
                    }}
                    className="py-2.5 px-3 bg-stone-200 hover:bg-stone-300 text-stone-850 rounded-xl transition-all text-center cursor-pointer font-bold"
                    title="履歴インポートID情報のみをお掃除します。実際のタイムラインの記憶データは削除されませんにゃ。"
                  >
                    🧹 ID履歴をクリア
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(lsaInputVal || "[]");
                      if (!Array.isArray(parsed) || parsed.length === 0) {
                        showToast("削除対象のIDが見当たらず空欄にゃ🐾", "info");
                        return;
                      }
                      const countBefore = logs.length;
                      const filtered = logs.filter(log => !parsed.includes(log.id));
                      const removedCount = countBefore - filtered.length;
                      
                      handleLogsChange(filtered);
                      showToast(`インポート履歴のIDに基づき、対応する記憶をタイムラインから ${removedCount} 件手動削除したにゃ！🐾`, "success");
                      
                      setLsaInputVal("[]");
                      updateLastImportedIds([]);
                      setShowLsaModal(false);
                    } catch (err) {
                      showToast("JSONのパースに失敗したため、一括削除できませんでしたにゃ。", "error");
                    }
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none animate-pulse"
                >
                  <span>↩️ この履歴IDに該当する記憶をタイムラインから一括削除する 🐾</span>
                </button>
              </div>
            </div>

            <div className="bg-[#FAF9F5] px-4 py-3.5 border-t border-amber-900/5 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-stone-500 font-semibold select-none">
                💡 枠外（グレー部分）をクリックしても閉じられますにゃ🐾
              </span>
              <button
                type="button"
                onClick={() => setShowLsaModal(false)}
                className="px-5 py-2.5 bg-stone-850 hover:bg-black text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
              >
                <span>元の画面に戻る 🐾</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-bounce">
          <div className={`rounded-2xl p-4 shadow-lg border text-xs flex items-center justify-between font-bold ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
            toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-800" :
            "bg-amber-50 border-amber-200 text-amber-850"
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-stone-400 hover:text-black">
              <X className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Header section */}
      <header className="max-w-5xl w-full mx-auto px-4 md:px-8 pt-1.5 pb-0.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.05] pb-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-xs bg-stone-100 border border-black/[0.04]">
              <svg viewBox="0 0 100 100" className="w-10 h-10 select-none">
                {/* Background color */}
                <circle cx="50" cy="50" r="50" fill={settings.aiEngine === "ChatGPT" ? "#E2F2E4" : settings.aiEngine === "Claude" ? "#EFEBE3" : "#FAF2E7"} />
                {/* Cat face details */}
                {/* Ears */}
                <path d="M 22 42 Q 13 14 36 24 Z" fill={settings.aiEngine === "ChatGPT" ? "#E2E8F0" : settings.aiEngine === "Claude" ? "#E7E5E4" : "#FEF3C7"} />
                <path d="M 24 38 Q 18 21 32 28 Z" fill={settings.aiEngine === "ChatGPT" ? "#A7F3D0" : settings.aiEngine === "Claude" ? "#FECACA" : "#FCD34D"} />
                
                <path d="M 78 42 Q 87 14 64 24 Z" fill={settings.aiEngine === "ChatGPT" ? "#E2E8F0" : settings.aiEngine === "Claude" ? "#E7E5E4" : "#FEF3C7"} />
                <path d="M 76 38 Q 82 21 68 28 Z" fill={settings.aiEngine === "ChatGPT" ? "#A7F3D0" : settings.aiEngine === "Claude" ? "#FECACA" : "#FCD34D"} />
                
                {/* Face base */}
                <ellipse cx="50" cy="55" rx="34" ry="28" fill={settings.aiEngine === "ChatGPT" ? "#F1F5F9" : settings.aiEngine === "Claude" ? "#F5F5F4" : "#FEF3C7"} />
                
                {/* Stripes */}
                <path d="M 44 28 L 50 36 L 56 28 Z" fill={settings.aiEngine === "ChatGPT" ? "#CBD5E1" : settings.aiEngine === "Claude" ? "#D6D3D1" : "#FDE68A"} />
                <path d="M 33 32 L 40 38 L 37 40 Z" fill={settings.aiEngine === "ChatGPT" ? "#CBD5E1" : settings.aiEngine === "Claude" ? "#D6D3D1" : "#FDE68A"} />
                <path d="M 67 32 L 60 38 L 63 40 Z" fill={settings.aiEngine === "ChatGPT" ? "#CBD5E1" : settings.aiEngine === "Claude" ? "#D6D3D1" : "#FDE68A"} />
                
                {/* Eyes */}
                <circle cx="36" cy="54" r="4.5" fill="#4B3C31" />
                <circle cx="64" cy="54" r="4.5" fill="#4B3C31" />
                {/* Eye highlights */}
                <circle cx="34.5" cy="52.5" r="1.5" fill="#FFFFFF" />
                <circle cx="62.5" cy="52.5" r="1.5" fill="#FFFFFF" />
                
                {/* Cheeks blush */}
                <ellipse cx="27" cy="61" rx="4.5" ry="2.5" fill="#FFB2B2" opacity="0.6" />
                <ellipse cx="73" cy="61" rx="4.5" ry="2.5" fill="#FFB2B2" opacity="0.6" />
                
                {/* Nose and mouth */}
                <polygon points="48,60 52,60 50,62" fill="#E18A3C" />
                <path d="M 46 64 C 48 66, 50 66, 50 64 C 50 66, 52 66, 54 64" stroke="#4B3C31" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-serif font-black tracking-tight flex items-center gap-1.5 text-stone-850">
                脳内図書館
                <span className="text-[10px] bg-black/[0.05] text-[#8A8471] px-1.5 py-0.5 rounded-sm font-mono tracking-widest uppercase">
                  Hippocampus Map
                </span>
                
                {user && (
                  <div className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-[#F3EFE0] border border-[#D6CFC7] font-mono font-bold select-none cursor-pointer hover:bg-[#EAE5CE] transition-colors"
                       onClick={() => setActiveTab("settings")}
                       title="クラウド同期のステータス。クリックでお部屋設定へ">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === "syncing" ? "bg-blue-500 animate-ping" :
                      syncStatus === "pending" ? "bg-amber-500 animate-pulse" :
                      syncStatus === "error" ? "bg-red-500" :
                      "bg-emerald-500"
                    }`}></span>
                    <span className={
                      syncStatus === "syncing" ? "text-blue-600" :
                      syncStatus === "pending" ? "text-amber-600" :
                      syncStatus === "error" ? "text-red-500 font-extrabold" :
                      "text-emerald-700"
                    }>
                      {syncStatus === "syncing" ? "SYNCING🐾" :
                       syncStatus === "pending" ? "PENDING⏳" :
                       syncStatus === "error" ? "SYNC_ERR⚠" :
                       "CLOUD_OK✓"}
                    </span>
                  </div>
                )}
              </h1>
              <p className="text-[10px] tracking-wide text-[#8A8471] font-medium mt-0.5">
                音声メモから頭と体の文脈を発見する行動パターン発見器
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 w-full sm:w-auto">
            {bottomTab === "home" && (
              <button
                onClick={() => setShowPrintOverlay(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A5D4E] hover:bg-[#3b4c3e] text-white font-extrabold text-[10px] sm:text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer border border-[#A5D6A7]/30 select-none shrink-0"
                title="過去1週間（水曜日〜火曜日締め）の振り返りタイムラインを簡単PDF出力"
              >
                📄 過去1週間の振り返りPDF
              </button>
            )}

            {bottomTab === "home" && (
              <nav className="flex flex-wrap sm:items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#8A8471] w-full sm:w-auto">
                <button
                  id="record-tab-btn"
                  onClick={() => { setActiveTab("record"); setLastHomeTab("record"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === "record"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  🎙️ 音声録音
                </button>
                <button
                  id="library-tab-btn"
                  onClick={() => { setActiveTab("library"); setLastHomeTab("library"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === "library"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  📅 タイムライン表示
                </button>
                <button
                  id="analysis-tab-btn"
                  onClick={() => { setActiveTab("analysis"); setLastHomeTab("analysis"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === "analysis"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  🧠 脳内分析・発見
                </button>
                <button
                  id="supabase-analysis-tab-btn"
                  onClick={() => { setActiveTab("supabase_analysis"); setLastHomeTab("supabase_analysis"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === "supabase_analysis"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  ⛪ Supabase 史実データ分析
                </button>
                <button
                  id="simulator-tab-btn"
                  onClick={() => { setActiveTab("simulator"); setLastHomeTab("simulator"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === "simulator"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  🎭 シュミレータ
                </button>
                <button
                  id="shelf-tab-btn"
                  onClick={() => { setActiveTab("shelf"); setLastHomeTab("shelf"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === "shelf"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  📚 背表紙本棚
                </button>
                <button
                  id="history-tab-btn"
                  onClick={() => { setActiveTab("history"); setLastHomeTab("history"); }}
                  className={`p-2.5 sm:px-3 sm:py-1.5 rounded-xl transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === "history"
                      ? "text-[#4A5D4E] bg-white border border-black/10 shadow-xs ring-1 ring-emerald-600/10 font-extrabold"
                      : "hover:text-[#33332D] bg-stone-100/50 hover:bg-stone-100"
                  }`}
                >
                  📋 インポート履歴
                  {lastImportedIds.length > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold animate-pulse">
                      {lastImportedIds.length}
                    </span>
                  )}
                </button>

                {settings.showLibrarianCat === false && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...settings, showLibrarianCat: true };
                      setSettings(updated);
                      saveSettings(updated);
                      showToast("AI司書猫（ノア）の活動を開始したにゃ🐾", "info");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-100 text-amber-950 border border-amber-300 transition-all font-black flex items-center gap-1 cursor-pointer scale-95 origin-left animate-pulse"
                    title="AI司書猫機能を有効にして、ノアの応接室とアドバイスを表示します🐾"
                  >
                    <span>🐈 司書猫をオン🐾</span>
                  </button>
                )}
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 mt-0.5 sm:mt-1 space-y-4">

        {/* Local-to-Cloud Migration Wizard */}
        {showMigrator && (
          <div className="bg-gradient-to-br from-[#FAF5EC]/95 to-[#FFFBF4]/100 border-2 border-[#4A5D4E]/10 p-5 rounded-3xl shadow-sm text-xs text-stone-850 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#4A5D4E]/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-start gap-4 flex-1">
              <span className="text-3xl select-none" role="img" aria-label="paw">🐾</span>
              <div>
                <h3 className="font-serif font-black text-sm tracking-tight text-[#4A5D4E] flex flex-wrap items-center gap-1.5">
                  一時保存されていた記録が見つかったにゃ！
                  <span className="bg-emerald-500/15 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold">
                    推奨
                  </span>
                </h3>
                <p className="text-stone-600 mt-1.5 leading-relaxed">
                  これまでログイン前に作成されたタイムラインの記録、本、および自己分析が
                  ブラウザに保存されています。これらをあなたが今ログインした
                  <strong>バックアップサーバー</strong> 上のアカウントへ安全に引き継ぎ・統合しませんか？
                </p>
                <div className="flex flex-wrap gap-2.5 mt-2.5 text-[10px] text-stone-500 font-mono">
                  <span>・タイムライン: <strong className="text-stone-850">{logs.length}件</strong></span>
                  <span>・製本: <strong className="text-stone-850">{books.length}冊</strong></span>
                  <span>・自己分析: <strong className="text-stone-850">{reviews.length}枚</strong></span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full md:w-auto">
              {migratorStep === "ready" && (
                <>
                  <button
                    type="button"
                    onClick={handleMigrateLocalData}
                    className="w-full sm:w-auto py-2.5 px-5 bg-[#4A5D4E] hover:bg-[#3D4F41] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
                  >
                    <span>クラウドへ引き継ぎ開始🐾</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("hippocampus_migrated", "true");
                      setShowMigrator(false);
                    }}
                    className="w-full sm:w-auto py-2.5 px-3 hover:bg-stone-100 text-stone-500 hover:text-stone-850 transition-all text-xs font-bold rounded-xl cursor-pointer"
                  >
                    スキップ
                  </button>
                </>
              )}
              {migratorStep === "migrating" && (
                <div className="flex items-center gap-2 text-[#4A5D4E] font-bold text-xs px-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>移行処理を実行中...</span>
                </div>
              )}
              {migratorStep === "done" && (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <span className="text-lg">✨</span>
                  <span>完了したにゃ！</span>
                  <button
                    type="button"
                    onClick={() => setShowMigrator(false)}
                    className="ml-2 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Dynamic Display Router based on navigation */}
        {bottomTab === "home" && activeTab === "record" && (
          <div className="space-y-4">
            {/* 1. TOP: Audio recording widget - Primary entry point */}
            <AudioLogger
              onAddEntry={handleAddNewEntry}
              isAnalyzing={isAnalyzing}
              onToast={showToast}
            />

            {/* AI Advisor Cat space */}
          </div>
        )}

        {bottomTab === "home" && activeTab === "simulator" && (
          <div className="space-y-4">
            {/* 1.5. NEW: Emotion/State Avatar Simulator integration */}
            <AvatarSimulator
              logs={logs}
              reviews={reviews}
              onAddManualLog={handleSaveAvatarLog}
              onToast={showToast}
            />
          </div>
        )}

        {bottomTab === "home" && activeTab === "library" && (
          <div className="space-y-4">

            {/* 1.5. NEW: Guest mode warning */}
            {!user && (
              <div id="guest-mode-timeline-banner" className="bg-[#FAF8F5]/90 border border-amber-900/10 p-4 rounded-3xl text-stone-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs animate-fade-in text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl select-none" role="img" aria-label="paws">🐾</span>
                  <div className="text-left">
                    <h4 className="font-serif font-black text-xs text-amber-950">
                      ゲストモード（ローカル保存中）で利用中だにゃ🐾
                    </h4>
                    <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                      記録した内容はあなたのブラウザに安全に保存されています。別の端末と同期したり、より強力にバックアップするにはアカウントを作成（無料）がおすすめです。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="guest-tab-auth-btn"
                  onClick={() => setActiveTab("auth")}
                  className="px-3.5 py-1.5 bg-[#4A5D4E] hover:bg-[#3D4F41] text-white text-[10px] font-black rounded-xl transition-all shadow-sm shrink-0 cursor-pointer hover:scale-[1.01]"
                >
                  ログインして同期する 🔑
                </button>
              </div>
            )}

            <TimelineView
              logs={logs}
              activeLogId={activeLogId}
              onSelectLog={setActiveLogId}
              onDeleteLog={handleDeleteLog}
              onDeleteMultipleLogs={handleDeleteMultipleLogs}
              onRegenerateAiData={handleRegenerateAi}
              onUpdateLog={handleUpdateLog}
              onToast={showToast}
              isAnalyzing={isAnalyzing}
              showLibrarianCat={settings.showLibrarianCat !== false}
            />

            {/* 4. BOTTOM: Librarian Cat space (acts as guide, ~15-20% height profile) */}

          </div>
        )}

        {bottomTab === "home" && (activeTab === "analysis" || activeTab === "supabase_analysis") && (
          <div className="space-y-4">
            <DiscoveryBoard
              logs={logs}
              reviews={reviews}
              onGenerateReview={handleGenerateReview}
              isGeneratingReview={isGeneratingReview}
              currentReview={activeReviewResult}
              initialTab={activeTab === "supabase_analysis" ? "supabase" : "personal"}
            />

            {renderLibrarianCatSection()}
          </div>
        )}

        {bottomTab === "home" && activeTab === "shelf" && (
          <div className="space-y-4">
            {!user && (
              <div id="guest-mode-shelf-banner" className="bg-[#FAF8F5]/90 border border-amber-900/10 p-4 rounded-3xl text-stone-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs animate-fade-in text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl select-none" role="img" aria-label="paws">🐾</span>
                  <div className="text-left">
                    <h4 className="font-serif font-black text-xs text-amber-950">
                      ゲストモード（ローカル保存中）で書棚を編纂中だにゃ🐾
                    </h4>
                    <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                      製本した日記や本はブラウザに保存中。アカウントを作成すると、クラウド上で完全にバックアップ・多端末閲覧ができます。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="guest-shelf-auth-btn"
                  onClick={() => setActiveTab("auth")}
                  className="px-3.5 py-1.5 bg-[#4A5D4E] hover:bg-[#3D4F41] text-white text-[10px] font-black rounded-xl transition-all shadow-sm shrink-0 cursor-pointer hover:scale-[1.01]"
                >
                  ログインして同期する 🔑
                </button>
              </div>
            )}

            <BookShelf
              logs={logs}
              books={books}
              announcements={announcements}
              onBindBook={handleBindBook}
              onMarkNotificationRead={handleMarkNoticeRead}
              isBinding={isClassBinding}
              onToast={showToast}
              onDeleteBook={handleDeleteBook}
              onDeleteNotification={handleDeleteNotice}
              onClearAllNotifications={handleClearAllNotices}
              showLibrarianCat={settings.showLibrarianCat !== false}
            />

          </div>
        )}

        {bottomTab === "settings" && (
          <div className="space-y-4 animate-fadeIn mb-2">
            {/* Settings Tab Sub Navigation */}
            <div className="flex border-b border-black/[0.05] pb-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-[#4A5D4E] text-white font-extrabold shadow-sm"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                }`}
              >
                ⚙️ お部屋カスタマイズ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("auth")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "auth"
                    ? "bg-[#4A5D4E] text-white font-extrabold shadow-sm"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                }`}
              >
                👤 アカウント同期設定
              </button>
            </div>
          </div>
        )}

        {bottomTab === "settings" && activeTab === "auth" && (
          <div className="space-y-4">
            <AuthScreen
              user={user}
              onAuthChange={handleAuthChange}
              onToast={showToast}
            />

            {/* Cloud Status indicator in auth tab */}
            {user && (
              <div className="bg-[#FFF9F2] p-4 rounded-3xl border border-[#F0EAD6] text-xs space-y-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 font-serif">
                  <CloudLightning className="w-4 h-4 text-amber-600" />
                  クラウド多端末自動同期（スマホ変更・バックアップ復元）
                </span>
                <p className="text-stone-700 leading-relaxed pl-5 font-medium">
                  ログイン中は、タイムライン、手書き追加メモ、背表紙本棚、AI編集履歴が
                  クラウドデータベースに自動的に保存されます。
                  もしスマートフォンや端末を変更しても、同一アカウントでログインすれば、
                  司書猫があなたに代わって記憶データをすべて元の位置に並べ戻して復元しますにゃ🐾
                </p>
              </div>
            )}

          </div>
        )}

        {bottomTab === "settings" && activeTab === "settings" && (
          <div className="space-y-4">
            
            {/* Room configuration form */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05] space-y-4">
              <div className="border-b border-black/[0.03] pb-2">
                <h2 className="font-serif text-base font-black text-[#4A5D4E] flex items-center gap-1.5">
                  <Settings className="w-5 h-5 text-[#4A5D4E]" />
                  図書館のお部屋設定（NPC・書棚カスタマイズ）
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#8A8471] mb-1">あなたの名前 （探求者名）</label>
                  <input
                    type="text"
                    value={settings.userName}
                    onChange={(e) => {
                      const updated = { ...settings, userName: e.target.value };
                      setSettings(updated);
                      saveSettings(updated);
                    }}
                    className="w-full p-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#8A8471] mb-1">AI司書猫の名前 （NPCキャスティング）</label>
                  <input
                    type="text"
                    value={settings.catNpcName}
                    onChange={(e) => {
                      const updated = { ...settings, catNpcName: e.target.value };
                      setSettings(updated);
                      saveSettings(updated);
                    }}
                    className="w-full p-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#8A8471] mb-1">AIチャネリングエンジン （司書パーソナリティ）</label>
                  <select
                    value={settings.aiEngine}
                    onChange={(e) => {
                      const updated = { ...settings, aiEngine: e.target.value as any };
                      setSettings(updated);
                      saveSettings(updated);
                      showToast(`AI司書を『${updated.catNpcName} (${updated.aiEngine}魂)』に変更したにゃ！`, "info");
                    }}
                    className="w-full p-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                  >
                    <option value="Gemini">Geminiにゃん（親友/冒険家トーン）</option>
                    <option value="ChatGPT">ChatGPTにゃん（論理派/丁寧プロトーン）</option>
                    <option value="Claude">Claudeにゃん（お上品な詩人トーン）</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#8A8471] mb-1">書棚の読書灯モード （カラーテーマ）</label>
                  <select
                    value={settings.themeMode}
                    onChange={(e) => {
                      const updated = { ...settings, themeMode: e.target.value as any };
                      setSettings(updated);
                      saveSettings(updated);
                    }}
                    className="w-full p-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                    disabled
                  >
                    <option value="light">暖色の春光（ライトセコンド）</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#8A8471] mb-1">AI司書猫機能の表示設定</label>
                  <select
                    value={settings.showLibrarianCat !== false ? "on" : "off"}
                    onChange={(e) => {
                      const updated = { ...settings, showLibrarianCat: e.target.value === "on" };
                      setSettings(updated);
                      saveSettings(updated);
                      showToast(
                        updated.showLibrarianCat 
                          ? "AI司書猫（ノア）の活動を開始したにゃ🐾" 
                          : "AI司書猫はお休み（非表示）になりましたにゃ💤", 
                        "info"
                      );
                    }}
                    className="w-full p-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                  >
                    <option value="on">🐈 活性中（司書猫の応接室とアドバイスを表示）</option>
                    <option value="off">💤 非表示（司書猫機能をオフ・隠す）</option>
                  </select>
                </div>
              </div>

              {/* SAVE BUTTON FOR ROOM SETTINGS */}
              <div className="flex justify-end pt-3 border-t border-black/[0.03] mt-2">
                <button
                  type="button"
                  onClick={() => {
                    saveSettings(settings, user?.id);
                    showToast("お部屋設定を保存しましたにゃ！🐈✨", "success");
                  }}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💾 お部屋設定を保存する</span>
                </button>
              </div>
            </div>

            {/* ターゲットID & 外部バックエンド接続設定 (Moved from TableManager) */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05] space-y-4">
              <div className="border-b border-black/[0.03] pb-2">
                <h2 className="font-serif text-base font-black text-[#4A5D4E] flex items-center gap-1.5">
                  <Database className="w-5 h-5 text-[#4A5D4E]" />
                  外部サーバー & アカウント接続設定
                </h2>
              </div>

              {/* Info notice about current link */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold">
                    ターゲットID: <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-900 text-xs">1dec38f0-1076-43e9-bfe6-63b76d2b7e2f</code> (shalom777br@gmail.com)
                  </p>
                  <p className="text-stone-600 font-sans text-xs">
                    前回のマージ処理により、他の重複アカウント（<code>a88390b6...</code> と <code>5fb13a09...</code>）が保持していた履歴やログは、すべてこの本命IDに統合され、古い重複ユーザーアカウントは完全に削除・整理されております。
                  </p>
                </div>
              </div>


            </div>

            {/* Storage Mode Display Block */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05] space-y-4">
              <div className="border-b border-black/[0.03] pb-2 flex items-center justify-between">
                <h2 className="font-serif text-base font-black text-[#4A5D4E] flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-[#4A5D4E]" />
                  システムセキュリティ & 保存情報
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cloudSupabase.getStorageMode() === "supabase" ? "bg-emerald-500 animate-ping" : "bg-[#C15C3D] animate-pulse"}`}></span>
                  <span className="text-[10px] font-mono font-bold text-stone-500 bg-black/[0.04] px-2 py-0.5 rounded-lg select-none">
                    {cloudSupabase.getStorageMode() === "supabase" ? "Supabase ACTIVE" : "LOCAL SANDBOX"}
                  </span>
                </div>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-bold text-[#8A8471] block mb-1">保存データベース種別</span>
                  <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-black/[0.05] space-y-3">
                    {cloudSupabase.getStorageMode() === "supabase" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>・Supabaseクラウド同期（本番モード）</span>
                        </div>
                        <p className="text-[11px] text-stone-500 leading-relaxed font-semibold pl-4">
                          ※ あなたの独自のクラウドストレージ（Supabase）にすべてのタイムラインログ、背表紙本、自己診断レビューデータが統合同期されています。本棚データは暗号学的に安全に分離・保護されています。
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 text-[#C15C3D] font-bold mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#C15C3D]"></span>
                          <span>・ローカル保存（開発モード）</span>
                        </div>
                        <p className="text-[11px] text-[#8A8471] pl-4 leading-relaxed font-semibold">
                          ※ 現在はローカルのセキュアなlocalStorageおよびExpressサンドボックスを利用して、データをブラウザ内に安全に保管している開発専用の保存形式です。パスワードはbcryptによる強力な暗号一方向ハッシュ化で保護されており、平文で保存される心配はありません。
                        </p>
                      </div>
                    )}

                    <div className="border-t border-dashed border-stone-200 mt-2 pt-2.5 space-y-2.5 pl-4 font-mono text-[11px] text-stone-600">
                      <div className="flex justify-between items-center">
                        <span>・クラウド接続状況:</span>
                        <strong className={cloudSupabase.getStorageMode() === "supabase" ? "text-emerald-700" : "text-[#C15C3D]"}>
                          {cloudSupabase.getStorageMode() === "supabase" ? "CONNECTED" : "OFFLINE / LOCAL"}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>・自動同期ステータス:</span>
                        <div className="flex items-center gap-1">
                          {syncStatus === "pending" && (
                            <span className="text-amber-600 font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              保存待機中 (Debouncing)
                            </span>
                          )}
                          {syncStatus === "syncing" && (
                            <span className="text-blue-600 font-extrabold flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              同期中...
                            </span>
                          )}
                          {syncStatus === "success" && (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                              ✓ 同期完了 (Success)
                            </span>
                          )}
                          {syncStatus === "error" && (
                            <span className="text-red-500 font-extrabold flex items-center gap-1">
                              ⚠ 同期エラー (Error)
                            </span>
                          )}
                          {syncStatus === "idle" && (
                            <span className="text-stone-500">
                              待機中 (Idle)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>・最終クラウド同期日時:</span>
                        <strong className="text-stone-800 font-extrabold text-[10px]">
                          {localStorage.getItem("hippocampus_sync_time") 
                            ? new Date(localStorage.getItem("hippocampus_sync_time")!).toLocaleString("ja-JP") 
                            : "未実行"}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>・同期総レコード数:</span>
                        <strong className="text-stone-800 font-extrabold">
                          {localStorage.getItem("hippocampus_sync_count") 
                            ? `${localStorage.getItem("hippocampus_sync_count")} 件` 
                            : "0 件"}
                        </strong>
                      </div>

                      {/* Manual forced synchronization button with loading visual feedback */}
                      {user && (
                        <div className="pt-2 border-t border-stone-100 flex flex-col gap-1.5 font-sans">
                          <button
                            type="button"
                            disabled={isManualSyncing}
                            onClick={handleManualForceSync}
                            className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isManualSyncing 
                                ? "bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed"
                                : "bg-emerald-50 hover:bg-emerald-100/80 active:scale-97 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {isManualSyncing ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>完全に同期編纂中...</span>
                              </>
                            ) : (
                              <>
                                <span>🔄 今すぐ手動クラウド同期</span>
                              </>
                            )}
                          </button>
                          <p className="text-[9.5px] text-stone-500 leading-normal font-medium">
                            ※ クラウド同期は入力終了後1.5秒待ってから自動的・非同期にバックグラウンドで行われますが、このボタンを押すことで、すべての資料（記憶、本、自己レビュー）のクラウド・ローカル状態を即時に完全統合・双方向マッピングできますにゃ🐾
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DB Script viewer */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("supabase-sql-pane");
                      if (el) el.classList.toggle("hidden");
                    }}
                    className="w-full text-left py-2 px-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold font-serif text-[#4A5D4E] flex items-center justify-between border border-black/[0.04] transition-all cursor-pointer select-none"
                  >
                    <span>🐾 Supabaseテーブル作成SQLを表示する (RLSポリシー付)</span>
                    <span className="text-[10px] bg-white text-stone-500 px-1.5 py-0.5 rounded border border-black/[0.05] font-sans">クリックで表示</span>
                  </button>
                  <div id="supabase-sql-pane" className="hidden mt-2 p-3 bg-stone-900 text-stone-200 rounded-2xl font-mono text-[10px] leading-relaxed relative border border-stone-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const sqlText = `-- Supabase profiles standard table creation SQL\ncreate table public.profiles (\n  id uuid references auth.users on delete cascade primary key,\n  email text,\n  name text,\n  address text,\n  phone text,\n  birth_date text,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- App Settings table\ncreate table public.app_settings (\n  user_id uuid references auth.users on delete cascade primary key,\n  settings jsonb not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- Timeline Logs\ncreate table public.timeline_logs (\n  id text primary key,\n  user_id uuid references auth.users on delete cascade not null,\n  original text not null,\n  ai_data jsonb,\n  created_time bigint not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- Bound Books\ncreate table public.bound_books (\n  id text primary key,\n  user_id uuid references auth.users on delete cascade not null,\n  title text not null,\n  type text not null,\n  period_code text not null,\n  theme text,\n  cat_comment text,\n  created_at text not null,\n  log_count integer not null,\n  log_ids text[] not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- Review Results\ncreate table public.review_results (\n  id text primary key,\n  user_id uuid references auth.users on delete cascade not null,\n  range text not null,\n  generated_at text not null,\n  summary text,\n  growth_focus text,\n  top_emotions text[] not null,\n  stress_triggers text[] not null,\n  recovery_elements text[] not null,\n  connection_map jsonb,\n  cat_consolation text,\n  deep_reflections text[] not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- Mindmap nodes table\ncreate table public.graph_nodes (\n  id text primary key,\n  label text not null,\n  node_type text not null,\n  user_id uuid references auth.users on delete cascade,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- Mindmap edges table\ncreate table public.graph_edges (\n  id text primary key,\n  parent_id text not null,\n  child_id text not null,\n  user_id uuid references auth.users on delete cascade,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- Enable Row Level Security (RLS) on all tables\nalter table public.profiles enable row level security;\nalter table public.app_settings enable row level security;\nalter table public.timeline_logs enable row level security;\nalter table public.bound_books enable row level security;\nalter table public.review_results enable row level security;\nalter table public.graph_nodes enable row level security;\nalter table public.graph_edges enable row level security;\n\n-- Setup RLS Policies (Owner Auth Isolate)\ncreate policy "Users can manage profiles" on public.profiles for all using (auth.uid() = id);\ncreate policy "Users can manage settings" on public.app_settings for all using (auth.uid() = user_id);\ncreate policy "Users can manage logs" on public.timeline_logs for all using (auth.uid() = user_id);\ncreate policy "Users can manage books" on public.bound_books for all using (auth.uid() = user_id);\ncreate policy "Users can manage reviews" on public.review_results for all using (auth.uid() = user_id);\ncreate policy "Users can manage graph nodes" on public.graph_nodes for all using (auth.uid() = user_id or (auth.uid() is null and user_id is null));\ncreate policy "Users can manage graph edges" on public.graph_edges for all using (auth.uid() = user_id or (auth.uid() is null and user_id is null));`;
                        navigator.clipboard.writeText(sqlText);
                        showToast("SQLテーブル作成スクリプトをコピーしたにゃ！🐾", "success");
                      }}
                      className="absolute top-2 right-2 bg-stone-850 hover:bg-stone-700 text-stone-200 px-3 py-1 rounded-lg border border-stone-700 text-[9px] font-bold cursor-pointer select-none"
                    >
                      コピー
                    </button>
                    <div className="overflow-y-auto max-h-48 whitespace-pre text-stone-300 scrollbar-thin">
{`-- SQL Table definitions & row isolation policies
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  address text,
  phone text,
  birth_date text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.app_settings (
  user_id uuid references auth.users on delete cascade primary key,
  settings jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.timeline_logs (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  original text not null,
  ai_data jsonb,
  created_time bigint not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.bound_books (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  type text not null,
  period_code text not null,
  theme text,
  cat_comment text,
  created_at text not null,
  log_count integer not null,
  log_ids text[] not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.review_results (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  range text not null,
  generated_at text not null,
  summary text,
  growth_focus text,
  top_emotions text[] not null,
  stress_triggers text[] not null,
  recovery_elements text[] not null,
  connection_map jsonb,
  cat_consolation text,
  deep_reflections text[] not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.graph_nodes (
  id text primary key,
  label text not null,
  node_type text not null,
  user_id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.graph_edges (
  id text primary key,
  parent_id text not null,
  child_id text not null,
  user_id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Isolation Policies
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.timeline_logs enable row level security;
alter table public.bound_books enable row level security;
alter table public.review_results enable row level security;
alter table public.graph_nodes enable row level security;
alter table public.graph_edges enable row level security;

-- Setup RLS Policies (Owner Auth Isolate)
create policy "Users can manage profiles" on public.profiles for all using (auth.uid() = id);
create policy "Users can manage settings" on public.app_settings for all using (auth.uid() = user_id);
create policy "Users can manage logs" on public.timeline_logs for all using (auth.uid() = user_id);
create policy "Users can manage books" on public.bound_books for all using (auth.uid() = user_id);
create policy "Users can manage reviews" on public.review_results for all using (auth.uid() = user_id);
create policy "Users can manage graph nodes" on public.graph_nodes for all using (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "Users can manage graph edges" on public.graph_edges for all using (auth.uid() = user_id or (auth.uid() is null and user_id is null));`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {bottomTab === "memory" && (
          <div className="space-y-6 animate-fadeIn">
            <TableManager user={user} showToast={showToast} />
          </div>
        )}

        {bottomTab === "map" && (
          <div className="space-y-6 animate-fadeIn">
            <MindMap user={user} showToast={showToast} />
          </div>
        )}

        {bottomTab === "search" && (
          <div className="space-y-6 animate-fadeIn">
            <SearchManager
              logs={logs}
              books={books}
              user={user}
              showToast={showToast}
              onSelectLog={(log) => {
                setBottomTab("home");
                setActiveTab("library");
                setActiveLogId(log.id);
              }}
            />
          </div>
        )}

        {bottomTab === "home" && activeTab === "history" && (
          <div className="space-y-6 animate-fadeIn">
            {/* 📥 一括インポート入力欄 (Bulk Text/Memo Importer at Tab Top) */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05] space-y-4 font-sans text-left">
              <div className="border-b border-black/[0.03] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="font-serif text-sm font-black text-[#4A5D4E] flex items-center gap-1.5">
                    <span className="text-xl">🌱</span>
                    簡易テキスト・メモの一括インポート欄
                  </h2>
                  <p className="text-[11px] text-[#8A8471] font-bold mt-1">
                    日付と内容を含むテキストや任意のメモから、タイムラインにまとめて自動搬入します🐾
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <textarea
                  placeholder="ここに日付や項目、文章テキストなどをコピー＆ペースト、または直接入力してにゃ🐾"
                  value={rawImportText}
                  onChange={(e) => setRawImportText(e.target.value)}
                  className="flex-1 h-32 p-3 text-xs bg-[#F9F8F6] border border-black/[0.06] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] font-semibold text-stone-800"
                ></textarea>
                <button
                  onClick={handleRawImportSubmit}
                  className="px-5 py-3 bg-[#4A5D4E] hover:bg-black text-white font-bold rounded-2xl text-xs transition-all flex flex-col items-center justify-center gap-2 shrink-0 cursor-pointer w-full sm:w-28 text-center shadow-md hover:scale-[1.01] active:scale-95"
                >
                  <span className="text-xl">📥</span>
                  <span>タイムラインに<br />一括搬入する🐾</span>
                </button>
              </div>

              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-amber-900/10 font-mono text-[11px] text-amber-955/80 leading-relaxed space-y-1.5">
                <div className="font-bold text-amber-955 flex items-center gap-1">
                  <span>💡 インポート日付け自動採用機能 of 案内:</span>
                </div>
                <p className="text-[10.5px]">
                  貼り付けた文章内にある【日付・時刻】（例: <b>2024年3月2日 12:58</b>、や <b>2026/06/15 15:30</b> など）をシステムが自動検知し、その時刻をタイムライン上の正式な<b>「記憶の記録日」</b>としてセットします。手動で日記や過去ログを貼るのに最適にゃ🐾
                </p>
                <div className="bg-white/60 p-2 rounded-xl text-[10px] space-y-0.5 border border-amber-900/5">
                  <p><b>入力例：</b></p>
                  <p>2024年3月2日 12:58 ピアノコンサートに行った想い出。演奏にとても感動した！ #音楽</p>
                  <p>6/14 公園を散歩、とてもいい天気だった #日記</p>
                </div>
              </div>
            </div>

            {/* Top overview card */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05] space-y-4 font-sans text-left">
              <div className="border-b border-black/[0.03] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h2 className="font-serif text-base font-black text-[#4A5D4E] flex items-center gap-1.5">
                    <span className="text-xl">📋</span>
                    インポート記憶ID台帳 ＆ 履歴管理（ローカル）
                  </h2>
                  <p className="text-[11px] text-[#8A8471] font-bold mt-1">
                    インポートで一括登録された記憶を1件ずつ、あるいは一括で追跡・精査・取り消し（削除）できます。
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center text-xs shrink-0 font-bold">
                  <button
                    type="button"
                    onClick={handleOpenLsaModal}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-[#4A5D4E] border border-amber-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="生のローカルストレージ情報に直接編集アクセスします"
                  >
                    <span>🛠️ 履歴コード直接編集 🐾</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateLastImportedIds([]);
                      showToast("インポート履歴リストを完全に空にしました🐾", "success");
                    }}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-all cursor-pointer"
                    title="ID履歴情報のみをお掃除します（実際のタイムライン記憶データは削除されません）"
                  >
                    <span>🧹 追跡IDのみ消去</span>
                  </button>
                </div>
              </div>

              {lastImportedIds.length > 0 ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold">
                  <div className="space-y-1 text-rose-950 leading-relaxed">
                    <p className="font-black flex items-center gap-1.5 text-rose-900">
                      <span className="animate-bounce">⚠️</span>
                      <span>一括やり直し・インポート取消</span>
                    </p>
                    <p className="text-[11px] text-stone-600">
                      ここに記録されている記憶（現在：<b>{lastImportedIds.length}件</b>）をすべてタイムラインから一瞬で、安全に削除・一括取消できます。日付がズレてしまったり、重複した場合などの救済策です。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUndoRawImportDirect}
                    className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all self-start sm:self-center shrink-0"
                  >
                    <span>インポートを一括削除 ↩️🐾</span>
                  </button>
                </div>
              ) : null}

              {/* ID List container */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#8A8471] font-bold px-1">
                  <span>履歴台帳内の記憶ID一覧</span>
                  <span>追跡件数: {lastImportedIds.length} 件</span>
                </div>

                {lastImportedIds.length === 0 ? (
                  <div className="text-center py-10 bg-[#F9F8F6] rounded-2xl border border-dashed border-stone-200 space-y-3">
                    <span className="text-3xl block">🐾💤</span>
                    <p className="text-xs text-[#8A8471] font-bold">
                      現在、インポートされた記憶の履歴はありません
                    </p>
                    <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed px-4">
                      「お部屋設定」タブの下部にある<b>「簡易テキスト・メモの一括インポート」</b>や、バックアップデータから記憶の搬入を行うと、いつでもここで一括取消ができるように自動で履歴がたまりますにゃ！
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("settings")}
                      className="px-4 py-2 bg-[#4A5D4E] hover:bg-[#3d4c40] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>📥 一括インポート設定ページへ行くにゃ 🐾</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {lastImportedIds.map((id, index) => {
                      const matchingLog = logs.find(l => l.id === id);
                      return (
                        <div
                          key={id}
                          className={`p-3.5 rounded-2xl border text-xs transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            matchingLog
                              ? "bg-[#FAF9F5]/70 hover:bg-[#FAF9F5] border-amber-900/10"
                              : "bg-stone-50 text-stone-400 border-dashed border-stone-200"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Serial count badge */}
                              <span className="font-mono bg-stone-200 text-stone-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                                #{index + 1}
                              </span>

                              {matchingLog ? (
                                <>
                                  <span className="font-mono font-bold text-[#4A5D4E] bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-md px-2 py-0.5 text-[10px]">
                                    📅 {new Date(matchingLog.createdTime).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {matchingLog.original.tags && matchingLog.original.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 font-semibold">
                                      {matchingLog.original.tags.map(tag => (
                                        <span key={tag} className="text-[10px] text-[#868F7E]">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="font-mono font-bold text-stone-500 bg-stone-100 rounded-md px-2 py-0.5 text-[10px]">
                                  ID: {id}
                                </span>
                              )}
                            </div>

                            {/* Content preview */}
                            {matchingLog ? (
                              <p className="text-stone-800 font-semibold truncate leading-relaxed text-[11px] max-w-2xl break-all">
                                {matchingLog.original.transcription || matchingLog.aiData?.summary || "（中身がありません）"}
                              </p>
                            ) : (
                              <p className="text-stone-400 italic text-[11px] leading-relaxed">
                                ⚠️ この記憶は既にタイムラインから削除されたか、見つからないにゃ🐾
                              </p>
                            )}
                          </div>

                          {/* Quick Action triggers for items */}
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center font-bold text-[11px]">
                            {matchingLog ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab("library");
                                    setActiveLogId(matchingLog.id);
                                    showToast(`タイムラインで「${new Date(matchingLog.createdTime).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}」の記憶を選択したにゃ！🎯🐾`, "success");
                                  }}
                                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-black/[0.06] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  title="音声タイムラインタブを開き、この記憶をハイライト表示します"
                                >
                                  <span>🔎 タイムラインで見る</span>
                                </button>
                                {confirmingLedgerId === matchingLog.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1.5 rounded-lg text-[10px] font-bold animate-fadeIn">
                                    <span className="text-rose-950 font-black">本当に消すにゃ？🐾</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedLogs = logs.filter(l => l.id !== matchingLog.id);
                                        handleLogsChange(updatedLogs);
                                        showToast("タイムラインから対象記憶を削除したにゃ！🐾", "success");
                                        setConfirmingLedgerId(null);
                                      }}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9.5px] font-black cursor-pointer transition-all"
                                    >
                                      消す
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingLedgerId(null)}
                                      className="px-1.5 py-1 bg-stone-200 hover:bg-stone-350 text-stone-705 rounded-md text-[9.5px] font-bold cursor-pointer transition-all"
                                    >
                                      やめる
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingLedgerId(matchingLog.id)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                    title="タイムラインの記憶データとこの履歴から即時クリアします"
                                  >
                                    <span>🗑️ データ削除</span>
                                  </button>
                                )}
                              </>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                const remaining = lastImportedIds.filter(x => x !== id);
                                updateLastImportedIds(remaining);
                                showToast("ID履歴追跡リストから除外したにゃ！🧹", "info");
                              }}
                              className="px-2.5 py-1.5 hover:bg-stone-200 text-stone-500 rounded-lg transition-all cursor-pointer bg-stone-100/70"
                              title="IDの記録のみを取り除きます（実際のタイムラインデータは消えません）"
                            >
                              <span>🧹 履歴から消去</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER SECTION: Login status button at the very bottom */}
      <footer className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 border-t border-black/[0.05] mt-10 mb-6 flex flex-col items-center gap-4 text-xs text-[#8A8471]">
        <div className="flex flex-col items-center gap-2">
          <button
            id="footer-auth-badge"
            onClick={() => setActiveTab("auth")}
            className={`px-5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              activeTab === "auth"
                ? "bg-[#4A5D4E] text-white border-[#4A5D4E] ring-2 ring-[#4A5D4E]/10"
                : "bg-white hover:bg-[#F9F8F6] text-[#33332D] border-black/[0.06]"
            }`}
          >
            {user ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>👤 アカウント接続状態: <strong className="font-extrabold">{user.name || "探求者"}</strong> さん (クラウド自動保存中🐾)</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                </span>
                <span className="text-[#8A8471] font-medium">現在はゲストモード（ブラウザ保存）にゃ</span>
                <span className="border-l border-black/[0.08] pl-2.5 text-[#4A5D4E] font-black flex items-center gap-1 animate-pulse">
                  🔑 ログイン / アカウント作成 🐾
                </span>
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-stone-400 text-center font-medium">
          脳内図書館 Hippocampus Map &copy; 司書猫プロデュース 🐾
        </p>
      </footer>

      {/* 📱 iOS-Style Floating Sticky Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFA]/95 backdrop-blur-md border-t border-stone-200/80 px-4 py-2.5 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] flex justify-around items-center max-w-5xl mx-auto sm:rounded-t-3xl select-none">
        <button
          onClick={() => {
            setActiveTab(lastHomeTab || "record");
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all select-none cursor-pointer ${
            bottomTab === "home" ? "text-[#4A5D4E] scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-extrabold">ホーム</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("database");
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all select-none cursor-pointer ${
            bottomTab === "memory" ? "text-[#4A5D4E] scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-extrabold">記憶</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("map");
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all select-none cursor-pointer ${
            bottomTab === "map" ? "text-[#4A5D4E] scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Network className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-extrabold">地図</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("search");
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all select-none cursor-pointer ${
            bottomTab === "search" ? "text-[#4A5D4E] scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <SearchIcon className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-extrabold">検索</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("settings");
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all select-none cursor-pointer ${
            bottomTab === "settings" ? "text-[#4A5D4E] scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-extrabold">設定</span>
        </button>
      </div>

      {/* 5. PDF EXPORT MODAL */}
      {showPdfExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-black/10 relative space-y-6">
            <button
              onClick={() => {
                if (pdfGeneratingStatus === "") {
                  setShowPdfExportModal(false);
                }
              }}
              disabled={pdfGeneratingStatus !== ""}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-all cursor-pointer disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <span className="text-4xl animate-bounce inline-block">📚</span>
              <h3 className="font-serif text-lg font-black text-amber-950">
                脳内記憶録・特別PDF製本
              </h3>
              <p className="text-xs text-stone-500">
                あなたと司書猫ノアが紡いだ日々を、美しい愛蔵本に仕上げるにゃ🐾
              </p>
            </div>

            {pdfGeneratingStatus ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-emerald-950">
                    {pdfGeneratingStatus === "preparing" && "製本用のレイアウトを組み立てる準備中だにゃ..."}
                    {pdfGeneratingStatus === "rendering" && "文字やお部屋の心象グラフを高画質で描画中だにゃ..."}
                    {pdfGeneratingStatus === "completed" && "製本完了！お手元に保存するにゃ🐾"}
                  </p>
                  <p className="text-[10px] text-stone-400 animate-pulse">
                    ※ページ数が多い場合は3〜10秒ほどかかる場合があります
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-medium">
                {/* 期間選択 */}
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-800 flex items-center gap-1">
                    <span>📅</span> 対象の年月日（絞り込み）:
                  </label>
                  <select
                    value={pdfYearMonthFilter}
                    onChange={(e) => setPdfYearMonthFilter(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 cursor-pointer font-bold"
                  >
                    <option value="all">すべての年月日を一括 （全 {logs.length} 件）</option>
                    {getAvailableYearsMonths().map((ym) => (
                      <option key={ym} value={ym}>
                        {ym.replace("-", "年")}度 （{logs.filter(l => l.date && l.date.substring(0, 7) === ym).length} 件）
                      </option>
                    ))}
                  </select>
                </div>

                {/* テンプレートスタイル */}
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-800 flex items-center gap-1">
                    <span>🎨</span> 製本装丁スタイル:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPdfTemplateStyle("washo")}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        pdfTemplateStyle === "washo"
                          ? "bg-amber-50/70 border-amber-300 text-amber-950 font-black shadow-xs"
                          : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                      }`}
                    >
                      <span className="block text-lg mb-0.5">📜</span>
                      <span className="block text-xs font-bold">和風・極上明朝紙</span>
                      <span className="block text-[9px] opacity-75 font-normal">温かみ溢れる文集風</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfTemplateStyle("western")}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        pdfTemplateStyle === "western"
                          ? "bg-slate-50 border-slate-350 text-slate-950 font-black shadow-xs"
                          : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                      }`}
                    >
                      <span className="block text-lg mb-0.5">📚</span>
                      <span className="block text-xs font-bold">モダン洋書風</span>
                      <span className="block text-[9px] opacity-75 font-normal">清潔感のある洗練された構成</span>
                    </button>
                  </div>
                </div>

                {/* 追加オプション */}
                <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/50 space-y-2 text-[11px] text-stone-700">
                  <span className="font-bold text-stone-850 block">⚙️ 編集オプション</span>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-600">AI司書ノアの解説・要約を含める:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdfIncludeAi}
                        onChange={(e) => setPdfIncludeAi(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-600">日付の順序:</span>
                    <div className="flex bg-white border border-stone-200 rounded-lg p-0.5 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPdfSortOrder("asc")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                          pdfSortOrder === "asc" ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-850"
                        }`}
                      >
                        古い順
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfSortOrder("desc")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                          pdfSortOrder === "desc" ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-850"
                        }`}
                      >
                        新しい順
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPdfExportModal(false)}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 font-bold rounded-2xl text-center text-stone-700 transition-all cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePDF}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 font-bold rounded-2xl text-center text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🎨</span>
                    <span>PDF製本を開始する</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 5B. PAST WEEK TIMELINE PRINT/PDF OVERLAY --- */}
      {showPrintOverlay && (() => {
        const { rangeLogs, isFallback, start, end } = getWeeklyPrintLogsRange();
        
        // Count aggregated emotions in this weekly set
        const emoCounts: { [name: string]: number } = {};
        rangeLogs.forEach(l => {
          if (l.original.emotions) {
            l.original.emotions.forEach(e => {
              emoCounts[e] = (emoCounts[e] || 0) + 1;
            });
          }
        });
        const sortedEmosInWeek = Object.entries(emoCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4 overflow-y-auto print-container-wrapper">
            {/* Custom Print CSS */}
            <style>{`
              @media print {
                html, body {
                  background: #FFFFFF !important;
                  color: #1c1917 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                }
                /* Hide standard app elements completely */
                #root, header, main, footer, .no-print-element {
                  display: none !important;
                  height: 0 !important;
                  overflow: hidden !important;
                }
                .print-container-wrapper {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  background: white !important;
                  z-index: 99999 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  overflow: visible !important;
                }
                .printable-card {
                  box-shadow: none !important;
                  border: none !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 2.5cm 1.5cm !important;
                  margin: 0 !important;
                  background: white !important;
                }
                .print-break-inside-none {
                  page-break-inside: avoid !important;
                }
              }
            `}</style>

            <div className="bg-white max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-3xl shadow-3xl border border-black/10 flex flex-col no-print-element printable-card animate-fadeIn">
              {/* Overlay Interactive Header */}
              <div className="px-6 py-4 bg-stone-50 border-b border-stone-200/65 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500">📄</span>
                  <div>
                    <h3 className="font-serif font-black text-[#4A5D4E] text-xs sm:text-sm">
                      1週間振り返り心象タイムライン・印刷プレビュー
                    </h3>
                    <p className="text-[10px] text-stone-500 font-bold">
                      水曜日始まり、火曜日締め（過去1サイクルを自動計算）
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateWeeklyPDF}
                    disabled={weeklyPdfGenerating}
                    className="px-3.5 py-1.5 bg-[#4A5D4E] hover:bg-[#3b4c3e] text-white font-extrabold text-[11px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {weeklyPdfGenerating ? "⌛ レンダリング中..." : "💾 PDF画面を出力するにゃ"}
                  </button>
                  <button
                    onClick={() => setShowPrintOverlay(false)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Printable Body Content */}
              <div className="p-8 space-y-6 flex-1 text-xs text-stone-850" id="print-area">
                {isFallback && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-2 no-print-element text-[10px] font-bold">
                    <span>⚠️</span>
                    <span>
                      対象期間（水曜日〜火曜日締め）の記録が無いため、テストプレビューとして最近のすべての記憶を表示していますにゃ！
                    </span>
                  </div>
                )}

                {/* Cover header block */}
                <div className="border-b-2 border-stone-800 pb-5 text-center space-y-2">
                  <p className="text-[9.5px] font-mono tracking-widest text-[#8A8471] uppercase">
                    Brain Library • Hippocampus Map • Past Week Review Digest
                  </p>
                  <h1 className="text-xl sm:text-2xl font-serif font-black text-stone-900 leading-tight">
                    過去1週間 脳内記憶振り返りタイムライン
                  </h1>
                  <p className="text-[11px] text-stone-600 font-serif">
                    対象期間: <strong className="text-stone-900">{start.toLocaleDateString("ja-JP")} (水)</strong> 〜 <strong className="text-stone-900">{end.toLocaleDateString("ja-JP")} (火)</strong>
                  </p>
                </div>

                {/* High level analytics section */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-[#4A5D4E]">📊 1週間の健康活動スコア</h4>
                    <ul className="space-y-0.5 text-stone-600 text-[11px]">
                      <li>・対象期間中の総記録数: <strong>{rangeLogs.length}件</strong></li>
                      <li>・記録完了率: <strong>100%</strong> （海馬データベース保護対応）</li>
                      <li>・AI司書猫のコメント: <strong>全件アドバイス付与済み🐾</strong></li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-[#4A5D4E]">🎭 この週に特筆すべき心象（トップ感情）</h4>
                    {sortedEmosInWeek.length === 0 ? (
                      <p className="text-[10px] text-stone-400 italic">タグ・感情は記録されていません</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sortedEmosInWeek.map(([name, count]) => {
                          const emoInfo = DETAILED_EMOTIONS.find(e => e.name === name);
                          return (
                            <span
                              key={name}
                              className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border flex items-center gap-0.5 ${
                                emoInfo ? `${emoInfo.color} ${emoInfo.borderColor} ${emoInfo.textColor}` : "bg-stone-100 text-stone-700"
                              }`}
                            >
                              <span>{name}</span>
                              <span className="opacity-70 font-mono">({count}回)</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chronic Timeline chronological list */}
                <div className="space-y-5">
                  <h3 className="font-serif font-black text-[#4A5D4E] border-b border-black/5 pb-1 text-xs">
                    📅 日付順・心象タイムライン一覧
                  </h3>
                  {rangeLogs.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 italic">
                      この週に記憶は登録されていません。音声メモから新しい出来事を記録してにゃ🌿
                    </div>
                  ) : (
                    <div className="relative border-l border-stone-200 ml-4 pl-4 space-y-6">
                      {rangeLogs.map((log) => {
                        const dateObj = new Date(log.original.datetime);
                        const days = ["日", "月", "火", "水", "木", "金", "土"];
                        const dayStr = days[dateObj.getDay()];
                        const dateString = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${dayStr}) ${dateObj.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;

                        return (
                          <div key={log.id} className="relative space-y-1.5 print-break-inside-none">
                            {/* Dot indicator */}
                            <div className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-stone-500 border-2 border-white"></div>
                            
                            {/* Entry Header */}
                            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-dashed border-stone-100 pb-0.5">
                              <span className="font-bold text-stone-900 font-mono">{dateString}</span>
                              <span className="text-[10px] text-stone-400">
                                #{log.original.tags?.join(" #") || "日常"}
                              </span>
                            </div>

                            {/* Transcription Text */}
                            <p className="font-serif text-[11.5px] text-stone-850 leading-relaxed pl-1 pb-1">
                              {log.original.transcription || "（文字起こしデータなし）"}
                            </p>

                            {/* User notes secondary */}
                            {log.original.manualNote && (
                              <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-stone-200/40 text-[10.5px] leading-relaxed text-stone-600">
                                <strong>📝 本人の手メモ:</strong> {log.original.manualNote}
                              </div>
                            )}

                            {/* Selected user emotions */}
                            {log.original.emotions && log.original.emotions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-1">
                                {log.original.emotions.map((e) => {
                                  const emoInfo = DETAILED_EMOTIONS.find(x => x.name === e);
                                  return (
                                    <span
                                      key={e}
                                      className={`text-[8.5px] font-black px-1.5 py-0.2 rounded border ${
                                        emoInfo ? `${emoInfo.color} ${emoInfo.borderColor} ${emoInfo.textColor}` : "bg-stone-100 text-stone-700"
                                      }`}
                                    >
                                      {e}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* AI Analysis details */}
                            {settings.showLibrarianCat !== false && log.aiData && (
                              <div className="pl-1 space-y-0.5 text-[10.5px] text-[#5c5443]">
                                {log.aiData.stressors && log.aiData.stressors.length > 0 && (
                                  <p>
                                    <strong>🔍 AI特定トリガー:</strong> {log.aiData.stressors.join("、")}
                                  </p>
                                )}
                                {log.aiData.librarianComment && (
                                  <p className="italic text-stone-500 pl-1 border-l border-stone-300">
                                    🐈 司書猫「{log.aiData.librarianComment}」
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer sign off */}
                <div className="border-t border-stone-300 pt-5 text-center text-stone-400 text-[10px] space-y-1">
                  <p>脳内図書館 Hippocampus Map / 司書猫ノア編纂 🐾</p>
                  <p>心と体を整え、今日も心地よい一日をお過ごしにゃ🌿</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. SECRET REGION FOR HIGH-RESOLUTION PDF RENDERING (A4 Proportion: 794px x 1123px per page) */}
      <div
        id="pdf-render-area"
        className="absolute opacity-0 pointer-events-none select-none overflow-hidden"
        style={{ top: "-9999px", left: "-9999px", width: "794px" }}
      >
        {/* PAGE 1: COVER PAGE */}
        <div 
          className="pdf-page w-[794px] h-[1123px] relative flex flex-col justify-between p-16 select-none border border-stone-200/20"
          style={{ 
            backgroundColor: pdfTemplateStyle === "washo" ? "#FDFBF7" : "#FFFFFF",
            fontFamily: pdfTemplateStyle === "washo" ? "'Noto Serif JP', serif" : "'Inter', 'Noto Sans JP', sans-serif"
          }}
        >
          {/* Header decorative */}
          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono tracking-wider border-b border-stone-200/70 pb-3">
            <span>BRAIN LIBRARY: HIPPOCAMPUS ANTHOLOGY</span>
            <span>NO.{Date.now().toString().slice(-6)}</span>
          </div>

          {/* Book title content */}
          <div className="my-auto space-y-8 text-center">
            <div className="inline-block p-4 border border-amber-900/10 rounded-full bg-amber-50/30">
              <span className="text-5xl">🐈🐾</span>
            </div>
            
            <div className="space-y-4">
              <h1 
                className="text-4xl text-amber-950 font-black tracking-tight leading-relaxed"
                style={{ fontFamily: pdfTemplateStyle === "washo" ? "'Noto Serif JP', serif" : "inherit" }}
              >
                {pdfYearMonthFilter === "all" ? "すべての歳時記憶" : `${pdfYearMonthFilter.replace("-", "年")}度 脳内記憶録`}
              </h1>
              <p className="text-sm text-stone-500 tracking-widest font-serif italic">
                〜 司書猫ノアが編む心象と日誌アンソロジー 〜
              </p>
            </div>

            <div className="w-16 h-0.5 bg-amber-700/30 mx-auto my-8"></div>

            <div className="space-y-1 text-stone-700">
              <p className="text-xs font-bold">著者: {settings.userName || "悠久の探求者"}</p>
              <p className="text-[10px] text-stone-400">編纂: 司書猫ノア （AI: {settings.aiEngine}魂）</p>
            </div>
          </div>

          {/* Footer decorative */}
          <div className="flex flex-col items-center justify-between text-[10px] text-stone-400 pt-3 border-t border-stone-200/70">
            <p className="font-serif italic text-[#8A8471]">
              "記憶は美しき蔵書となり、あなたの棚に並び続けるにゃ🐾"
            </p>
            <p className="font-mono mt-1 text-[9px]">
              Published by Hippocampus Map • {new Date().toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>

        {/* PAGE 2+: LOG PAGES */}
        {getPdfChunks(getFilteredLogsForPdf()).map((chunk, pageIdx) => (
          <div
            key={`pdf-page-${pageIdx}`}
            className="pdf-page w-[794px] h-[1123px] relative flex flex-col justify-between p-14 select-none border border-stone-200/20"
            style={{ 
              backgroundColor: pdfTemplateStyle === "washo" ? "#FDFBF7" : "#FFFFFF",
              fontFamily: pdfTemplateStyle === "washo" ? "'Noto Serif JP', serif" : "'Inter', 'Noto Sans JP', sans-serif"
            }}
          >
            {/* Page Header */}
            <div className="flex justify-between items-center text-[9px] text-[#8A8471] font-mono tracking-wider border-b border-stone-200/70 pb-2.5">
              <span className="font-serif">脳内記憶録 — {settings.userName} 著</span>
              <span>{pdfYearMonthFilter === "all" ? "全歳時録" : `${pdfYearMonthFilter.replace("-", "年")}度`}</span>
            </div>

            {/* Page Main Content Area (A4 height space) */}
            <div className="flex-1 mt-6 mb-6 space-y-6 flex flex-col justify-start">
              {chunk.map((log) => {
                const emotionText = log.aiData?.emotion || "平穏";
                const emotionColor = log.aiData?.emotionColor || "#90A4AE";
                const displayDate = log.original && log.original.detectedDateStr
                  ? log.original.detectedDateStr
                  : log.original && log.original.datetime
                    ? new Date(log.original.datetime).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "";
                
                return (
                  <div 
                    key={log.id} 
                    className={`flex-1 flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                      pdfTemplateStyle === "washo" 
                        ? "bg-[#FAF8F4]/80 border-amber-900/10" 
                        : "bg-stone-50/70 border-stone-200"
                    }`}
                  >
                    {/* Log Date & Emotion Header */}
                    <div className="flex justify-between items-center border-b border-stone-200/50 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-stone-800 font-serif">
                          📅 {displayDate}
                        </span>
                      </div>
                      
                      {/* Emotion Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: emotionColor }}></span>
                        <span className="text-[10px] font-black text-stone-700 font-sans">心象: {emotionText}</span>
                      </div>
                    </div>

                    {/* Original Memory Block */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-start">
                      <h4 className="text-[10px] text-[#A29A88] font-bold tracking-widest font-sans">【記憶の原本】</h4>
                      <p className="text-xs text-stone-900 font-serif leading-relaxed pl-2 italic whitespace-pre-wrap">
                        {log.original?.transcription || log.original?.manualNote || "(原本なし)"}
                      </p>
                    </div>

                    {/* AI & Librarian Analysis (Conditional) */}
                    {pdfIncludeAi && log.aiData && (
                      <div className="mt-4 pt-3 border-t border-dashed border-stone-200 space-y-3">
                        {/* Summary / Analysis */}
                        <div className="grid grid-cols-2 gap-4 text-[10.5px]">
                          <div>
                            <span className="font-bold text-[#8A8471] block mb-0.5 font-sans">✍️ AI司書 要約</span>
                            <p className="text-stone-800 leading-relaxed font-serif pl-1">
                              {log.aiData.summary}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-[#8A8471] block mb-0.5 font-sans">🔍 精神・心象分析</span>
                            <p className="text-stone-800 leading-relaxed font-serif pl-1">
                              {log.aiData.analysisStr}
                            </p>
                          </div>
                        </div>

                        {/* Cat Librarian Custom annotation */}
                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 space-y-1 text-[10px]">
                          <div className="flex items-center gap-1 font-bold text-stone-800 font-sans">
                            <span>🐈</span>
                            <span>司書猫ノアの特別解説</span>
                          </div>
                          <p className="text-[#6E6454] leading-relaxed italic font-serif">
                            {log.aiData.catComment}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Page Footer */}
            <div className="flex justify-between items-center text-[9px] text-[#8A8471] font-mono border-t border-stone-200/70 pt-2.5">
              <span>脳内図書館 Hippocampus Map 📚</span>
              <span>第 {pageIdx + 1 + 1} 頁</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
