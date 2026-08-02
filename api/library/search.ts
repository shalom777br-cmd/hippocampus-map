import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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
        // Skip
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

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

// Generate snippet around first keyword match
function generateSnippet(text: string, keywords: string[], maxLength: number = 180): string {
  if (!text) return "";
  const lowerText = text.toLowerCase();
  let firstIdx = -1;

  for (const kw of keywords) {
    const idx = lowerText.indexOf(kw.toLowerCase());
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }

  if (firstIdx === -1) {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }

  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(text.length, firstIdx + maxLength - 40);
  let snippet = text.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

// Count occurrences of keywords in string
function countMatches(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;
  let count = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    try {
      const reg = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = text.match(reg);
      if (matches) count += matches.length;
    } catch {
      // Fallback simple search
      let idx = 0;
      const lower = text.toLowerCase();
      const kwLower = kw.toLowerCase();
      while ((idx = lower.indexOf(kwLower, idx)) !== -1) {
        count++;
        idx += kwLower.length;
      }
    }
  }
  return count;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const queryStr = (req.method === "POST" ? req.body?.query : req.query.query || req.query.q) || "";
    const targetUserId =
      (req.method === "POST" ? req.body?.userId : req.query.userId) ||
      "5fb13a09-5ce3-4aec-bb4e-8e357070b76b";

    if (!queryStr || typeof queryStr !== "string" || !queryStr.trim()) {
      res.status(200).json({ query: "", total: 0, results: [] });
      return;
    }

    const keywords = queryStr.trim().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) {
      res.status(200).json({ query: queryStr, total: 0, results: [] });
      return;
    }

    const supabase = getSupabaseClient();
    const results: any[] = [];

    if (supabase) {
      // 1. claude_chat_history
      try {
        let q = supabase.from("claude_chat_history").select("*");
        for (const kw of keywords) {
          q = q.ilike("content", `%${kw}%`);
        }
        const { data, error } = await q.limit(100);
        if (!error && data) {
          data.forEach(row => {
            const content = row.content || "";
            const title = row.conversation_name || row.category || "Claude Chat";
            const fullText = content + " " + title;
            const matchCount = countMatches(fullText, keywords);

            results.push({
              id: row.id,
              source: "claude_chat_history",
              sourceLabel: "Claude 会話履歴",
              title,
              category: row.category || "Claude",
              content,
              snippet: generateSnippet(content, keywords),
              occurred_at: row.occurred_at || row.created_at,
              created_at: row.created_at,
              match_count: matchCount
            });
          });
        }
      } catch (err) {
        console.warn("Error querying claude_chat_history:", err);
      }

      // 2. chatgpt_chat_history
      try {
        let q = supabase.from("chatgpt_chat_history").select("*");
        for (const kw of keywords) {
          q = q.ilike("content", `%${kw}%`);
        }
        if (targetUserId) {
          q = q.or(`user_id.eq.${targetUserId},user_id.is.null`);
        }
        const { data, error } = await q.limit(100);
        if (!error && data) {
          data.forEach(row => {
            const content = row.content || "";
            const title = row.title || row.topic || "ChatGPT Chat";
            const fullText = content + " " + title + " " + (row.topic || "");
            const matchCount = countMatches(fullText, keywords);

            results.push({
              id: row.id,
              source: "chatgpt_chat_history",
              sourceLabel: "ChatGPT 会話履歴",
              title,
              category: row.category || row.topic || "ChatGPT",
              content,
              snippet: generateSnippet(content, keywords),
              occurred_at: row.occurred_at || row.created_at,
              created_at: row.created_at,
              match_count: matchCount
            });
          });
        }
      } catch (err) {
        console.warn("Error querying chatgpt_chat_history:", err);
      }

      // 3. joanna_value
      try {
        let q = supabase.from("joanna_value").select("*");
        for (const kw of keywords) {
          q = q.ilike("content", `%${kw}%`);
        }
        const { data, error } = await q.limit(100);
        if (!error && data) {
          data.forEach(row => {
            const content = row.content || "";
            const title = row.category || "ジョアンナの価値観";
            const fullText = content + " " + title;
            const matchCount = countMatches(fullText, keywords);

            results.push({
              id: row.id,
              source: "joanna_value",
              sourceLabel: "ジョアンナ価値観",
              title,
              category: row.category || "価値観",
              content,
              snippet: generateSnippet(content, keywords),
              occurred_at: row.occurred_at || row.created_at,
              created_at: row.created_at,
              match_count: matchCount
            });
          });
        }
      } catch (err) {
        console.warn("Error querying joanna_value:", err);
      }

      // 4. hippocampus_logs
      try {
        let q = supabase.from("hippocampus_logs").select("*");
        for (const kw of keywords) {
          q = q.ilike("content", `%${kw}%`);
        }
        if (targetUserId) {
          q = q.eq("user_id", targetUserId);
        }
        const { data, error } = await q.limit(100);
        if (!error && data) {
          data.forEach(row => {
            let contentStr = "";
            let title = row.entry_type || "タイムライン記憶";
            let parsedObj: any = row.content;

            if (typeof row.content === "string") {
              try {
                parsedObj = JSON.parse(row.content);
              } catch {
                parsedObj = row.content;
              }
            }

            if (parsedObj && typeof parsedObj === "object") {
              contentStr =
                parsedObj.original?.transcription ||
                parsedObj.original?.manualNote ||
                parsedObj.aiData?.summary ||
                safeJsonStringify(parsedObj);
              if (parsedObj.aiData?.summary) {
                title = parsedObj.aiData.summary;
              }
            } else {
              contentStr = String(parsedObj || "");
            }
            const matchCount = countMatches(contentStr + " " + title, keywords);

            results.push({
              id: row.id,
              source: "hippocampus_logs",
              sourceLabel: "タイムライン記憶",
              title,
              category: row.entry_type || "ログ",
              content: contentStr,
              snippet: generateSnippet(contentStr, keywords),
              occurred_at: row.occurred_at || row.created_at,
              created_at: row.created_at,
              match_count: matchCount
            });
          });
        }
      } catch (err) {
        console.warn("Error querying hippocampus_logs:", err);
      }
    }

    // Sort results by match_count descending, then date descending
    results.sort((a, b) => {
      if (b.match_count !== a.match_count) {
        return b.match_count - a.match_count;
      }
      const timeA = new Date(a.occurred_at || a.created_at || 0).getTime();
      const timeB = new Date(b.occurred_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    res.status(200).json(safeJsonValue({
      query: queryStr,
      keywords,
      total: results.length,
      results
    }));
  } catch (error: any) {
    const errMsg = typeof error === "string" ? error : error?.message || String(error);
    console.error("Library Search error:", errMsg);
    res.status(500).json({ message: `検索中にエラーが発生しました: ${errMsg}` });
  }
}
