import React, { useState, useEffect } from "react";
import { 
  Database, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Save, 
  RefreshCw, 
  FileJson, 
  AlertCircle, 
  Check, 
  ChevronRight, 
  Eye, 
  Info 
} from "lucide-react";
import { UserProfile } from "../types";
import { realSupabase, isRealSupabaseConfigured } from "../utils/supabase";
import { apiFetch } from "../utils/api";

interface TableManagerProps {
  user: UserProfile | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

interface TableMeta {
  primaryKey: string;
  columns: string[];
}

// Local fallback table structures for standalone static environments (e.g. Vercel)
const LOCAL_TABLES_METADATA: Record<string, TableMeta> = {
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

// Helper to determine if a specific column in a specific table should be treated and validated as JSON
const isJsonField = (tableName: string, colName: string, value: string): boolean => {
  if (tableName === "temote_user_data") {
    return ["projects", "tasks", "history", "settings", "events"].includes(colName);
  }
  if (tableName === "memory_timeline_events" || tableName === "memory_timeline_events_for_ai") {
    return ["categories", "locations", "scripture_refs", "meta", "ai_context"].includes(colName);
  }
  if (tableName === "memory_sources") {
    return ["meta"].includes(colName);
  }
  if (tableName === "memory_event_embeddings") {
    return ["embedding"].includes(colName);
  }
  if (tableName === "hippocampus_logs") {
    return ["content"].includes(colName);
  }
  if (tableName === "memory_chatgpt") {
    // content in memory_chatgpt is plain text, not JSON
    return false;
  }
  
  // Dynamic fallback check: if the value looks like JSON, let's treat it as JSON
  const trimmed = value.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

// Helper to determine if a column is multiline text or JSON and should be rendered as a textarea
const isTextAreaField = (colName: string): boolean => {
  return [
    "content", "projects", "tasks", "history", "settings", "events", 
    "meta", "categories", "locations", "scripture_refs", "ai_context",
    "body", "summary", "raw_markdown", "raw_text"
  ].includes(colName);
};

export default function TableManager({ user, showToast }: TableManagerProps) {
  const [tables, setTables] = useState<Record<string, TableMeta>>({});
  const [selectedTable, setSelectedTable] = useState<string>("hippocampus_logs");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [currentRowData, setCurrentRowData] = useState<Record<string, string>>({});
  const [jsonFieldsError, setJsonFieldsError] = useState<Record<string, string>>({});
  const [viewingRow, setViewingRow] = useState<any | null>(null);

  // Helper to run a promise with a timeout to prevent hanging forever
  const runWithTimeout = async <T,>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`接続タイムアウト (${timeoutMs}ms) — 応答がありません。ネットワーク設定やバックエンドURLが正しいか確認してくださいにゃ🐾`));
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Load registered tables
  const loadTableMetadata = async () => {
    try {
      const res = await apiFetch("/api/admin-tables", undefined, 6000);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setTables(data.tables || {});
        // Select first available table if present
        const tableKeys = Object.keys(data.tables || {});
        if (tableKeys.length > 0 && !tableKeys.includes(selectedTable)) {
          setSelectedTable(tableKeys[0]);
        }
      } else {
        console.warn("Express API /api/admin/tables not available. Falling back to local table metadata.");
        setTables(LOCAL_TABLES_METADATA);
        const tableKeys = Object.keys(LOCAL_TABLES_METADATA);
        if (tableKeys.length > 0 && !tableKeys.includes(selectedTable)) {
          setSelectedTable(tableKeys[0]);
        }
      }
    } catch (err: any) {
      console.warn("Error fetching table metadata, falling back to local metadata:", err);
      setTables(LOCAL_TABLES_METADATA);
      const tableKeys = Object.keys(LOCAL_TABLES_METADATA);
      if (tableKeys.length > 0 && !tableKeys.includes(selectedTable)) {
        setSelectedTable(tableKeys[0]);
      }
    }
  };

  // Load rows for the selected table
  const loadRows = async (tableName: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      let success = false;
      let lastErrMessage = "";
      
      // 1. Try Express API first
      try {
        console.log(`TableManager: Fetching rows for table ${tableName}...`);
        const res = await apiFetch(`/api/admin-tables?tableName=${tableName}`, undefined, 8000);
        console.log(`TableManager: Response status = ${res.status}`);
        const contentType = res.headers.get("content-type");
        
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setRows(data.rows || []);
          success = true;
          setFetchError(null);
        } else if (res.status === 404 || (contentType && !contentType.includes("application/json"))) {
          console.warn(`Express API not available or returned html for table ${tableName}.`);
          lastErrMessage = `API未稼働 (ステータス: ${res.status})`;
        } else {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error || `HTTPステータス ${res.status}`;
          lastErrMessage = msg;
          setFetchError(`バックエンドサーバーエラー: ${msg}`);
          showToast(`行データの取得に失敗しました: ${msg}`, "error");
          success = true; // Stop here if we got an explicit server-side error
        }
      } catch (apiErr: any) {
        console.warn("Express API fetch failed, trying client-side fallback:", apiErr);
        lastErrMessage = apiErr.message || String(apiErr);
        setFetchError(`バックエンド接続エラーにゃ😿\n理由: ${lastErrMessage}`);
      }

      // 2. Client-side fallback if Express API failed or wasn't available
      if (!success) {
        if (isRealSupabaseConfigured && realSupabase) {
          console.log(`Directly querying table ${tableName} from client-side Supabase client with timeout.`);
          try {
            const queryPromise = (realSupabase as any).from(tableName).select("*");
            const { data, error } = await runWithTimeout(queryPromise, 8000) as any;
            if (error) {
              setFetchError(`Supabase直接取得エラー: ${error.message}`);
              showToast(`Supabase直接取得エラー: ${error.message}`, "error");
            } else {
              setRows(data || []);
              setFetchError(null); // Success! Clear previous connection errors
            }
          } catch (timeoutErr: any) {
            console.error("Supabase direct query timeout/error:", timeoutErr);
            setFetchError(`Supabase直接取得失敗: ${timeoutErr.message}`);
            showToast(`データベース接続に失敗しました: ${timeoutErr.message}`, "error");
          }
        } else {
          // If both failed and we don't have direct Supabase keys either, show a clear guide
          setFetchError(`API接続エラーにゃ😿\n詳細: ${lastErrMessage || "接続を確立できません。"}\n\n※データベース設定やサーバーの起動状態を確認してください。`);
          showToast("データベース接続を確立できませんでしたにゃ🐾", "error");
        }
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(`例外エラー: ${err.message || err}`);
      showToast("データの読み込み中に想定外のエラーが発生しましたにゃ🐾", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTableMetadata();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadRows(selectedTable);
    }
  }, [selectedTable]);

  const activeMeta = React.useMemo(() => {
    const rawMeta = tables[selectedTable];
    if (!rawMeta) return null;
    
    // Create a copy of the columns to avoid side effects
    let cols = [...(rawMeta.columns || [])];
    // Deduplicate the columns to prevent double rendering of body/content columns
    cols = Array.from(new Set(cols));
    
    const pk = rawMeta.primaryKey || "id";
    
    if (cols.includes(pk)) {
      let targetCol: string | null = null;
      if (cols.includes("body")) {
        targetCol = "body";
      } else if (cols.includes("content")) {
        targetCol = "content";
      }
      
      if (targetCol && targetCol !== pk) {
        // Remove the target column from its current location
        cols = cols.filter(c => c !== targetCol);
        // Find the index of the primary key
        const pkIndex = cols.indexOf(pk);
        // Insert the target column immediately before the primary key
        cols.splice(pkIndex, 0, targetCol);
      }
    }
    
    return {
      ...rawMeta,
      columns: cols
    };
  }, [tables, selectedTable]);

  // Filter rows based on search query
  const filteredRows = rows.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === "object") {
        return JSON.stringify(val).toLowerCase().includes(query);
      }
      return String(val).toLowerCase().includes(query);
    });
  });

  // Handle Edit row clicked
  const handleEditClick = (row: any) => {
    setEditingRow(row);
    const initialData: Record<string, string> = {};
    const pk = activeMeta.primaryKey;
    
    activeMeta.columns.forEach((col) => {
      const val = row[col];
      if (val === null || val === undefined) {
        initialData[col] = "";
      } else if (typeof val === "object") {
        initialData[col] = JSON.stringify(val, null, 2);
      } else {
        initialData[col] = String(val);
      }
    });
    
    setCurrentRowData(initialData);
    setJsonFieldsError({});
    setIsEditModalOpen(true);
  };

  // Handle Add row clicked
  const handleAddClick = () => {
    const initialData: Record<string, string> = {};
    activeMeta.columns.forEach((col) => {
      if (col === activeMeta.primaryKey) {
        // Generate random uuid-like or string id
        if (col === "id" || col === "event_id") {
          initialData[col] = crypto.randomUUID();
        } else if (col === "email") {
          initialData[col] = user?.email || "";
        } else {
          initialData[col] = "";
        }
      } else if (col === "created_at" || col === "updated_at") {
        initialData[col] = new Date().toISOString();
      } else {
        initialData[col] = "";
      }
    });
    setCurrentRowData(initialData);
    setJsonFieldsError({});
    setIsAddModalOpen(true);
  };

  // Validate and parse row input
  const preparePayload = (): Record<string, any> | null => {
    const payload: Record<string, any> = {};
    const errors: Record<string, string> = {};
    
    for (const col of activeMeta.columns) {
      const rawVal = currentRowData[col] || "";
      
      // We don't touch primary key on update if it is read-only, but let's parse normal values.
      // Check if it should be treated as JSON using the table-specific helper
      const isJsonCol = isJsonField(selectedTable, col, rawVal);

      if (isJsonCol && rawVal.trim()) {
        try {
          payload[col] = JSON.parse(rawVal);
        } catch (e: any) {
          errors[col] = `JSONの形式が正しくありません: ${e.message}`;
        }
      } else {
        // Handle null values
        if (rawVal === "" && col !== activeMeta.primaryKey) {
          payload[col] = null;
        } else {
          // Keep as string or numbers if appropriate
          if (!isNaN(Number(rawVal)) && rawVal.trim() !== "" && (col === "order_no" || col === "year" || col === "month" || col === "day" || col === "section_no")) {
            payload[col] = Number(rawVal);
          } else {
            payload[col] = rawVal;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setJsonFieldsError(errors);
      showToast("入力エラーを修正してくださいにゃ🐾", "error");
      return null;
    }

    return payload;
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = preparePayload();
    if (!payload) return;

    const pk = activeMeta.primaryKey;
    const pkValue = editingRow[pk];

    const updatedData = { ...payload };
    delete updatedData[pk]; // Prevent altering the primary key itself

    try {
      let success = false;
      // 1. Try Express API first
      try {
        const res = await apiFetch(`/api/admin-tables?tableName=${selectedTable}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            primaryKeyName: pk,
            primaryKeyValue: pkValue,
            updatedData
          })
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          showToast("行を更新しましたにゃ！🐾", "success");
          setIsEditModalOpen(false);
          loadRows(selectedTable);
          success = true;
        } else if (res.status === 404 || (contentType && !contentType.includes("application/json"))) {
          console.warn("Express API not available for update.");
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(`更新に失敗しました: ${errData.error || ""}`, "error");
          success = true;
        }
      } catch (apiErr) {
        console.warn("Express API update failed, trying direct fallback:", apiErr);
      }

      // 2. Fallback to client-side direct Supabase
      if (!success) {
        if (isRealSupabaseConfigured && realSupabase) {
          let targetTable = selectedTable;
          let targetUpdatedData = { ...updatedData };
          if (selectedTable === "memory_timeline_events_for_ai") {
            targetTable = "memory_timeline_events";
            const allowedCols = LOCAL_TABLES_METADATA.memory_timeline_events.columns;
            targetUpdatedData = {};
            Object.keys(updatedData).forEach(key => {
              if (allowedCols.includes(key)) {
                targetUpdatedData[key] = updatedData[key];
              }
            });
          }

          const { error } = await (realSupabase as any)
            .from(targetTable)
            .update(targetUpdatedData)
            .eq(pk, pkValue);
          if (error) {
            showToast(`Supabase更新エラー: ${error.message}`, "error");
          } else {
            showToast("行を直接更新しましたにゃ！🐾", "success");
            setIsEditModalOpen(false);
            loadRows(selectedTable);
          }
        } else {
          showToast("データベースへの接続が構成されていませんにゃ🐾", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("更新エラーが発生しました🐾", "error");
    }
  };

  // Submit add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = preparePayload();
    if (!payload) return;

    try {
      let success = false;
      // 1. Try Express API first
      try {
        const res = await apiFetch(`/api/admin-tables?tableName=${selectedTable}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            rowData: payload
          })
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          showToast("新規行を追加しましたにゃ！🐾", "success");
          setIsAddModalOpen(false);
          loadRows(selectedTable);
          success = true;
        } else if (res.status === 404 || (contentType && !contentType.includes("application/json"))) {
          console.warn("Express API not available for insert.");
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(`追加に失敗しました: ${errData.error || ""}`, "error");
          success = true;
        }
      } catch (apiErr) {
        console.warn("Express API insert failed, trying direct fallback:", apiErr);
      }

      // 2. Fallback to client-side direct Supabase
      if (!success) {
        if (isRealSupabaseConfigured && realSupabase) {
          let targetTable = selectedTable;
          let targetPayload = { ...payload };
          if (selectedTable === "memory_timeline_events_for_ai") {
            targetTable = "memory_timeline_events";
            const allowedCols = LOCAL_TABLES_METADATA.memory_timeline_events.columns;
            targetPayload = {};
            Object.keys(payload).forEach(key => {
              if (allowedCols.includes(key)) {
                targetPayload[key] = payload[key];
              }
            });
          }

          const { error } = await (realSupabase as any)
            .from(targetTable)
            .insert(targetPayload);
          if (error) {
            showToast(`Supabase追加エラー: ${error.message}`, "error");
          } else {
            showToast("新規行を直接追加しましたにゃ！🐾", "success");
            setIsAddModalOpen(false);
            loadRows(selectedTable);
          }
        } else {
          showToast("データベースへの接続が構成されていませんにゃ🐾", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("追加エラーが発生しました🐾", "error");
    }
  };

  // Delete row
  const handleDeleteClick = async (row: any) => {
    const pk = activeMeta.primaryKey;
    const pkValue = row[pk];

    const confirmed = window.confirm(`本当にこの行（${pk}: ${pkValue}）を削除してよろしいですかにゃ？🐾`);
    if (!confirmed) return;

    try {
      let success = false;
      // 1. Try Express API first
      try {
        const res = await apiFetch(`/api/admin-tables?tableName=${selectedTable}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            primaryKeyName: pk,
            primaryKeyValue: pkValue
          })
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          showToast("行を削除しましたにゃ🐾", "success");
          loadRows(selectedTable);
          success = true;
        } else if (res.status === 404 || (contentType && !contentType.includes("application/json"))) {
          console.warn("Express API not available for delete.");
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(`削除に失敗しました: ${errData.error || ""}`, "error");
          success = true;
        }
      } catch (apiErr) {
        console.warn("Express API delete failed, trying direct fallback:", apiErr);
      }

      // 2. Fallback to client-side direct Supabase
      if (!success) {
        if (isRealSupabaseConfigured && realSupabase) {
          let targetTable = selectedTable;
          if (selectedTable === "memory_timeline_events_for_ai") {
            targetTable = "memory_timeline_events";
          }

          const { error } = await (realSupabase as any)
            .from(targetTable)
            .delete()
            .eq(pk, pkValue);
          if (error) {
            showToast(`Supabase削除エラー: ${error.message}`, "error");
          } else {
            showToast("行を直接削除しましたにゃ🐾", "success");
            loadRows(selectedTable);
          }
        } else {
          showToast("データベースへの接続が構成されていませんにゃ🐾", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("削除エラーが発生しました🐾", "error");
    }
  };

  const handleRowView = (row: any) => {
    setViewingRow(row);
    setIsDetailModalOpen(true);
  };

  return (
    <div id="supabase-table-manager" className="bg-[#FAF9F5] rounded-3xl p-6 border border-[#EAE6D8] space-y-6 shadow-sm">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE6D8] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-700" />
            <h2 className="font-serif font-black text-[27px] text-[#33332D]">
              Supabase データベース管理パネル
            </h2>
          </div>
          <p className="text-[18px] text-stone-500 font-sans leading-relaxed">
            Supabaseの全テーブルを直接一覧表示、検索、編集、削除できる管理者向け統合ツールにゃ🐾
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadRows(selectedTable)}
            className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all border border-stone-300 flex items-center gap-2 text-[18px] font-bold cursor-pointer"
            title="最新データにリフレッシュ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>再読み込み</span>
          </button>
          
          <button
            onClick={handleAddClick}
            className="p-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-2 text-[18px] font-black cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>新規レコード追加</span>
          </button>
        </div>
      </div>



      {/* Grid Layout for selector and results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Tables selection list */}
        <div className="lg:col-span-1 space-y-3.5">
          <h3 className="font-serif font-extrabold text-[18px] text-stone-500 uppercase tracking-wider">
            テーブル選択 ({Object.keys(tables).length})
          </h3>
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {Object.entries(tables).map(([name, meta]) => {
              const isSelected = selectedTable === name;
              return (
                <button
                  key={name}
                  onClick={() => {
                    setSelectedTable(name);
                    setSearchQuery("");
                  }}
                  className={`flex items-center justify-between gap-3 p-3.5 text-left rounded-xl transition-all border text-[18px] cursor-pointer shrink-0 lg:shrink-1 ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-black shadow-xs"
                      : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Database className={`w-4 h-4 shrink-0 ${isSelected ? "text-emerald-700" : "text-stone-400"}`} />
                    <span className="truncate font-mono">{name}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 hidden lg:block ${isSelected ? "text-emerald-600" : "text-stone-300"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Rows display grid */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search bar & Metadata context */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="テーブル内をクイック検索..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 text-[18px] text-stone-800 placeholder-stone-400 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-[16.5px] text-stone-500 font-mono flex items-center gap-3">
              <span>主キー: <strong className="text-[#33332D] text-[16.5px]">{activeMeta?.primaryKey}</strong></span>
              <span className="text-stone-300">|</span>
              <span>該当件数: <strong className="text-emerald-700 font-sans font-bold text-[18px]">{filteredRows.length}件</strong> / {rows.length}件</span>
            </div>
          </div>

          {/* Database Grid view */}
          {loading ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-500 font-sans flex flex-col items-center justify-center gap-3.5">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
              <p className="text-[18px]">データを読み込み中だにゃ🐾 暫くお待ちくださいにゃ...</p>
              {fetchError && (
                <div className="mt-2 text-[16.5px] text-amber-700 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200 max-w-lg font-mono text-left whitespace-pre-line">
                  <strong>現在の状況:</strong> {fetchError}
                </div>
              )}
            </div>
          ) : fetchError ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-500 font-sans flex flex-col items-center justify-center gap-5">
              <span className="text-4xl">⚠️</span>
              <div className="space-y-1.5">
                <p className="text-[18px] font-bold text-stone-800">データベースから行データを取得できませんでしたにゃ🐾</p>
                <div className="mt-2 text-[16.5px] text-rose-600 bg-rose-50 px-4 py-3.5 rounded-xl border border-rose-100 max-w-lg font-mono text-left whitespace-pre-line">
                  {fetchError}
                </div>
              </div>
              <button
                onClick={() => loadRows(selectedTable)}
                className="px-5 py-2.5 bg-[#4A5D4E] hover:bg-[#3D4F41] text-white text-[18px] font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                再試行する🐾
              </button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400 font-sans space-y-3">
              <Database className="w-12 h-12 text-stone-300 mx-auto" />
              <p className="text-[18px] font-medium">表示可能なレコードがありませんにゃ🐾</p>
              {searchQuery && <p className="text-[15px] text-stone-400">検索条件に一致するレコードが存在しません。</p>}
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left font-sans text-[18px]">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-700 font-bold font-mono text-[18px]">
                      <th className="p-4.5 pl-6 w-28">操作</th>
                      {activeMeta?.columns.map((col) => (
                        <th key={col} className="p-4.5 whitespace-nowrap min-w-[150px]">
                          {col} {col === activeMeta.primaryKey && "🔑"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredRows.slice(0, 100).map((row, idx) => {
                      const pkValue = row[activeMeta?.primaryKey];
                      return (
                        <tr key={pkValue || idx} className="hover:bg-stone-50/50 transition-colors">
                          {/* Row actions */}
                          <td className="p-4.5 pl-6 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRowView(row)}
                                className="p-2 text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-all cursor-pointer"
                                title="詳細表示"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleEditClick(row)}
                                className="p-2 text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all cursor-pointer"
                                title="編集"
                              >
                                <Edit className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(row)}
                                className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                                title="削除"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>

                          {/* Column values */}
                          {activeMeta?.columns.map((col) => {
                            const val = row[col];
                            let displayVal = "";
                            let isJson = false;

                            if (val === null || val === undefined) {
                                displayVal = "NULL";
                            } else if (typeof val === "object") {
                                displayVal = JSON.stringify(val);
                                isJson = true;
                            } else {
                                displayVal = String(val);
                            }

                            return (
                              <td 
                                key={col} 
                                className={`p-4.5 max-w-xs truncate font-mono text-[16.5px] ${
                                  val === null ? "text-stone-300 italic" : "text-stone-600"
                                }`}
                                title={displayVal}
                              >
                                {isJson ? (
                                  <span className="inline-flex items-center gap-1.5 text-[15px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold">
                                    <FileJson className="w-4 h-4 shrink-0" />
                                    <span>JSON</span>
                                  </span>
                                ) : (
                                  displayVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > 100 && (
                <div className="bg-stone-50 border-t border-stone-200 p-4.5 text-center text-[16.5px] text-stone-500 font-medium">
                  ⚠️ 大容量データ保護のため、上位100件を表示中だにゃ🐾（検索・フィルタは全件対象です）
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row Detail View Modal */}
      {isDetailModalOpen && viewingRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-3">
                <Database className="w-7 h-7 text-emerald-700" />
                <h3 className="font-serif font-black text-[21px] text-[#33332D]">
                  レコード詳細ビュー: <span className="font-mono text-[18px]">{selectedTable}</span>
                </h3>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              {activeMeta?.columns.map((col) => {
                const val = viewingRow[col];
                const isObject = val !== null && typeof val === "object";
                
                return (
                  <div key={col} className="space-y-1.5 border-b border-stone-100 pb-4.5 last:border-0 last:pb-0">
                    <div className="text-[15px] uppercase font-bold text-stone-400 font-mono flex items-center gap-1.5">
                      <span>{col}</span>
                      {col === activeMeta.primaryKey && <span className="text-amber-600 text-[13.5px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">主キー 🔑</span>}
                      {isObject && <span className="text-indigo-600 text-[13.5px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">オブジェクト 📦</span>}
                    </div>
                    {isObject ? (
                      <pre className="bg-stone-50 border border-stone-200/80 p-4.5 rounded-xl text-[15px] font-mono text-stone-800 overflow-x-auto leading-relaxed max-h-60">
                        {JSON.stringify(val, null, 2)}
                      </pre>
                    ) : (
                      <div className="bg-stone-50 border border-stone-100 p-4 rounded-xl text-[18px] font-mono text-stone-800 break-all leading-relaxed whitespace-pre-wrap">
                        {val === null || val === undefined ? <span className="text-stone-300 italic">NULL</span> : String(val)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[18px] font-bold rounded-xl transition-all cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Edit Modal */}
      {isEditModalOpen && editingRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl border border-stone-200 w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-3">
                <Edit className="w-7 h-7 text-emerald-700" />
                <h3 className="font-serif font-black text-[21px] text-[#33332D]">
                  レコードの編集: <span className="font-mono text-[18px]">{selectedTable}</span>
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Body (Inputs) */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4.5 text-amber-900 text-[16.5px] leading-relaxed flex items-start gap-3">
                <AlertCircle className="w-5.5 h-5.5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  主キー（<code>{activeMeta.primaryKey}</code>）はシステム整合性保護のため変更できません。JSON対応列（<code>content</code>, <code>settings</code> 等）は正しいJSON構造で記述してください。
                </p>
              </div>

              {activeMeta?.columns.map((col) => {
                const isPrimaryKey = col === activeMeta.primaryKey;
                const isJson = isJsonField(selectedTable, col, currentRowData[col] || "");
                const isTextArea = isTextAreaField(col);
                
                return (
                  <div key={col} className="space-y-1.5">
                    <label className="text-[16.5px] uppercase font-bold text-stone-600 font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {col} {isPrimaryKey && "🔑"} {isJson && "📦 [JSON形式]"}
                      </span>
                      {isPrimaryKey && <span className="text-[13.5px] text-stone-400 normal-case">（編集不可）</span>}
                    </label>

                    {isJson || isTextArea ? (
                      <div className="space-y-1.5">
                        <textarea
                          rows={col === "body" || col === "raw_markdown" || col === "raw_text" ? 10 : 6}
                          value={currentRowData[col]}
                          onChange={(e) => setCurrentRowData({ ...currentRowData, [col]: e.target.value })}
                          placeholder={isJson ? '{"key": "value"}' : 'テキストを入力してください...'}
                          className={`w-full p-3.5 bg-stone-50 text-[18px] text-stone-800 rounded-xl border font-mono focus:outline-none transition-all ${
                            jsonFieldsError[col]
                              ? "border-rose-500 bg-rose-50/20 focus:ring-rose-500/10 focus:border-rose-500"
                              : "border-stone-200 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white"
                          }`}
                        />
                        {jsonFieldsError[col] && (
                          <p className="text-[15px] text-rose-600 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{jsonFieldsError[col]}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={currentRowData[col]}
                        onChange={(e) => setCurrentRowData({ ...currentRowData, [col]: e.target.value })}
                        disabled={isPrimaryKey}
                        className={`w-full p-3.5 text-[18px] rounded-xl border focus:outline-none transition-all ${
                          isPrimaryKey 
                            ? "bg-stone-100 text-stone-400 border-stone-200 font-mono" 
                            : "bg-stone-50 text-stone-800 border-stone-200 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white font-sans"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[18px] font-bold rounded-xl transition-all cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[18px] font-black rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-5 h-5" />
                <span>変更を保存🐾</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Row Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl border border-stone-200 w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-3">
                <Plus className="w-7 h-7 text-emerald-700" />
                <h3 className="font-serif font-black text-[21px] text-[#33332D]">
                  新規レコードの追加: <span className="font-mono text-[18px]">{selectedTable}</span>
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Body (Inputs) */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-4.5 text-emerald-900 text-[16.5px] leading-relaxed flex items-start gap-3">
                <Info className="w-5.5 h-5.5 text-emerald-700 shrink-0 mt-0.5" />
                <p>
                  新しい行を追加します。主キーには自動的に仮の一意なID（UUID等）が補完されておりますが、必要に応じて編集可能です。
                </p>
              </div>

              {activeMeta?.columns.map((col) => {
                const isPrimaryKey = col === activeMeta.primaryKey;
                const isJson = isJsonField(selectedTable, col, currentRowData[col] || "");
                const isTextArea = isTextAreaField(col);
                
                return (
                  <div key={col} className="space-y-1.5">
                    <label className="text-[16.5px] uppercase font-bold text-stone-600 font-mono flex items-center gap-1.5">
                      {col} {isPrimaryKey && "🔑 [主キー]"} {isJson && "📦 [JSON形式]"}
                    </label>

                    {isJson || isTextArea ? (
                      <div className="space-y-1.5">
                        <textarea
                          rows={col === "body" || col === "raw_markdown" || col === "raw_text" ? 10 : 5}
                          value={currentRowData[col]}
                          onChange={(e) => setCurrentRowData({ ...currentRowData, [col]: e.target.value })}
                          placeholder={
                            isJson 
                              ? (col === "categories" || col === "locations" || col === "scripture_refs"
                                ? '["value1", "value2"]'
                                : '{\n  "key": "value"\n}')
                              : 'テキストを入力してください...'
                          }
                          className={`w-full p-3.5 bg-stone-50 text-[18px] text-stone-800 rounded-xl border font-mono focus:outline-none transition-all ${
                            jsonFieldsError[col]
                              ? "border-rose-500 bg-rose-50/20 focus:ring-rose-500/10 focus:border-rose-500"
                              : "border-stone-200 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white"
                          }`}
                        />
                        {jsonFieldsError[col] && (
                          <p className="text-[15px] text-rose-600 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{jsonFieldsError[col]}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={currentRowData[col]}
                        onChange={(e) => setCurrentRowData({ ...currentRowData, [col]: e.target.value })}
                        placeholder={isPrimaryKey ? `一意の識別子 (${col})` : `${col} の値を入力`}
                        className="w-full p-3.5 bg-stone-50 text-[18px] text-stone-800 border border-stone-200 rounded-xl focus:outline-none focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white font-mono"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[18px] font-bold rounded-xl transition-all cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[18px] font-black rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>新しく作成🐾</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
