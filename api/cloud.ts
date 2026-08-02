import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors.js";
import { getSupabaseClient } from "./_lib/supabase.js";

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
      return undefined;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const action = req.query.action || req.body?.action;
  const supabase = getSupabaseClient();

  try {
    switch (action) {
      case "sync-pull": {
        const userId = req.query.userId || req.body?.userId;
        if (!userId || typeof userId !== "string") {
          res.status(400).json({ message: "ユーザーIDが必要です。" });
          return;
        }

        const limitStr = req.query.limit || req.body?.limit;
        const offsetStr = req.query.offset || req.body?.offset;

        let query = (supabase as any)
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

        const { data: rows, error } = await query;

        if (error) {
          throw error;
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

        const hasMore = limit !== null && rows ? rows.length === limit : false;

        res.status(200).json(safeJsonValue({ logs, books, settings, reviews, hasMore }));
        break;
      }

      case "sync-push": {
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

        // 1. Delete all existing logs for this user first
        const { error: deleteError } = await (supabase as any)
          .from("hippocampus_logs")
          .delete()
          .eq("user_id", userId)
          .in("entry_type", ["log", "timeline_import", "received_memory", "book", "settings", "review"]);

        if (deleteError) {
          throw deleteError;
        }

        // 2. Batch insert (50 rows at a time)
        if (rowsToInsert.length > 0) {
          for (let i = 0; i < rowsToInsert.length; i += 50) {
            const batch = rowsToInsert.slice(i, i + 50);
            const { error: insertError } = await (supabase as any)
              .from("hippocampus_logs")
              .insert(batch);

            if (insertError) {
              throw insertError;
            }
          }
        }

        res.status(200).json({ message: "クラウド同期が完了しました🐾" });
        break;
      }

      case "receive-memory": {
        const { userId, memory } = req.body || {};
        if (!userId || !memory) {
          res.status(400).json({ message: "userIdとmemoryが必要です。" });
          return;
        }

        const newMemory = {
          ...memory,
          receivedFrom: "luca",
          receivedAt: new Date().toISOString(),
        };

        // Insert as a new individual row into hippocampus_logs
        const { error: insertError } = await (supabase as any)
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

        res.status(200).json({ message: "記憶を受け取りましたにゃ🐾" });
        break;
      }

      default: {
        res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }
  } catch (err: any) {
    const errMsg = typeof err === "string" ? err : err?.message || String(err);
    console.error(`Error in cloud sync API [${action}]:`, errMsg);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${errMsg}` });
  }
}
