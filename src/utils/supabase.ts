/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { UserProfile, TimelineLog, BoundBook, AppSettings, ReviewResult } from "../types";
import { apiFetch } from "./api";

// Robust log normalizer to safely parse and structure any row from the hippocampus_logs table
export function normalizeRowToTimelineLog(row: any): TimelineLog | null {
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
      parsed = row.content;
      isJson = true;
    }
  } catch (e) {
    console.warn("Failed parsing JSON content for row:", row.id, e);
  }

  // Fallback to raw content if not a valid JSON object
  if (!parsed || typeof parsed !== "object") {
    parsed = { transcription: row.content || "" };
  }

  // Ensure robust original sub-object
  const original = parsed.original || {
    transcription: parsed.transcription || parsed.text || parsed.content || (isJson ? "" : row.content) || "",
    manualNote: parsed.manualNote || parsed.memo || "",
    datetime: parsed.datetime || row.occurred_at || row.created_at || new Date().toISOString(),
    tags: Array.isArray(parsed.tags) ? parsed.tags : []
  };

  if (!original.transcription) {
    original.transcription = parsed.transcription || parsed.text || parsed.content || row.content || "";
  }
  if (!original.datetime) {
    original.datetime = row.occurred_at || row.created_at || new Date().toISOString();
  }
  if (!original.tags || !Array.isArray(original.tags)) {
    original.tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  }

  // Ensure robust aiData sub-object to prevent frontend rendering crashes
  const aiData = parsed.aiData || {
    summary: parsed.summary || "インポートされた外部記憶",
    analysisStr: parsed.analysisStr || "外部データベースから読み出された記憶データですにゃ。",
    emotion: parsed.emotion || row.entry_type || "記憶",
    emotionColor: parsed.emotionColor || "#E3ECF5",
    catComment: parsed.catComment || "海馬の書庫から見つかった大切な思い出にゃ。",
    reflectiveQuestion: parsed.reflectiveQuestion || "この記憶から新しく思い返すことはありますくにゃ？",
    patterns: parsed.patterns,
    scenariomap: parsed.scenariomap
  };

  return {
    id: parsed.id || row.id || `log-${row.id || Math.random().toString(36).substr(2, 9)}`,
    userId: row.user_id,
    entryType: row.entry_type || "log",
    original,
    aiData,
    createdTime: parsed.createdTime || new Date(original.datetime).getTime() || Date.now()
  };
}

// Check if credentials exist for direct Supabase usage
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isRealSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith("http") && 
  !supabaseUrl.includes("YOUR_SUPABASE_URL") && 
  !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
);

// Actual Supabase Client (if configured)
export const realSupabase = isRealSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Local Sandbox Mock database for un-deployed static envs (e.g. Vercel)
function getLocalUsers(): Record<string, { profile: UserProfile; password?: string }> {
  const data = localStorage.getItem("hippocampus_local_users");
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveLocalUsers(users: Record<string, { profile: UserProfile; password?: string }>) {
  localStorage.setItem("hippocampus_local_users", JSON.stringify(users));
}

// User session management state
export interface UserSession {
  user: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
      address: string;
      phone: string;
      birthDate: string;
    }
  } | null;
}

// In-Memory state for the Simulator (backed up in LocalStorage and Express APIs for Cross-Device Sync)
class CloudSupabaseService {
  private activeUser: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];
  
  // Real-time synchronization state feedback
  private syncStatus: "idle" | "pending" | "syncing" | "success" | "error" = "idle";
  private syncListeners: ((status: "idle" | "pending" | "syncing" | "success" | "error") => void)[] = [];
  private debounceTimeout: NodeJS.Timeout | null = null;
  private currentPullPromise: Promise<{ logs: TimelineLog[]; books: BoundBook[]; settings: AppSettings | null; reviews?: ReviewResult[] } | null> | null = null;

  getSyncStatus() {
    return this.syncStatus;
  }

  subscribeSyncStatus(callback: (status: "idle" | "pending" | "syncing" | "success" | "error") => void) {
    this.syncListeners.push(callback);
    callback(this.syncStatus);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== callback);
    };
  }

  private notifySyncStatus() {
    this.syncListeners.forEach(cb => cb(this.syncStatus));
  }

  constructor() {
    // Initial load from local
    const saved = localStorage.getItem("hippocampus_session_user");
    if (saved) {
      try {
        this.activeUser = JSON.parse(saved);
      } catch {
        this.activeUser = null;
      }
    }

    // Direct registration of onAuthStateChange if real Supabase client is present
    if (isRealSupabaseConfigured && realSupabase) {
      realSupabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          const user = session.user;
          let uProfile: UserProfile = {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.name || "ユーザー",
            address: user.user_metadata?.address || "",
            phone: user.user_metadata?.phone || "",
            birthDate: user.user_metadata?.birthDate || ""
          };

          try {
            const { data: profData } = await Promise.race([
              realSupabase.from("hippocampus_users").select("*").eq("id", user.id).maybeSingle(),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase auth state profile fetch timed out")), 1500))
            ]);
            if (profData) {
              uProfile = {
                id: profData.id,
                email: profData.email,
                name: profData.name || uProfile.name,
                address: profData.address || uProfile.address,
                phone: profData.phone || uProfile.phone,
                birthDate: profData.birth_date || uProfile.birthDate
              };
            }
          } catch (err) {
            console.warn("Auth status hippocampus_users table fetch failed or timed out:", err);
          }

          this.activeUser = uProfile;
          localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
          this.notifyListeners();
        } else if (event === "SIGNED_OUT") {
          // Explicit Sign Out clears active user
          this.activeUser = null;
          localStorage.removeItem("hippocampus_session_user");
          this.notifyListeners();
        } else if (event === "INITIAL_SESSION" && !session) {
          // Only clear active user on INITIAL_SESSION if there is strictly no token cache in storage,
          // which avoids flushing the preloaded user before the SDK has completed its async checks.
          const hasLocalToken = Object.keys(localStorage).some(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
          if (!hasLocalToken) {
            this.activeUser = null;
            localStorage.removeItem("hippocampus_session_user");
            this.notifyListeners();
          }
        }
      });
    }
  }

  getActiveUser(): UserProfile | null {
    return this.activeUser;
  }

  getStorageMode(): "local" | "supabase" {
    if (isRealSupabaseConfigured && realSupabase) {
      return "supabase";
    }
    return "local";
  }

  subscribeAuthChange(callback: (user: UserProfile | null) => void) {
    this.listeners.push(callback);
    // Emit immediate current state
    callback(this.activeUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.activeUser));
  }

  // Authentic Supabase DB Sync & Auth proxy or high-fidelity simulated cloud DB
  async signUp(profile: Omit<UserProfile, "id">, password: string): Promise<{ data: any; error: any }> {
    if (isRealSupabaseConfigured && realSupabase) {
      // Execute genuine Supabase Registration
      const { data, error } = await Promise.race([
        realSupabase.auth.signUp({
          email: profile.email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name: profile.name,
              address: profile.address,
              phone: profile.phone,
              birthDate: profile.birthDate,
            }
          }
        }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase Auth direct signUp timed out")), 2000))
      ]);
      if (error) return { data: null, error };
      
      // Save profile metadata to db
      const user = data.user;
      const session = data.session;
      const isEmailConfirmationRequired = !session; // If no session yielded, email confirmation is active and required first

      if (user) {
        const uProfile: UserProfile = {
          id: user.id,
          email: profile.email,
          name: profile.name,
          address: profile.address,
          phone: profile.phone,
          birthDate: profile.birthDate
        };

        // Seed to public.hippocampus_users standard if session is already open
        if (session) {
          try {
            await Promise.race([
              realSupabase.from('hippocampus_users').upsert({
                id: user.id,
                email: profile.email,
                name: profile.name,
                address: profile.address,
                phone: profile.phone,
                birth_date: profile.birthDate
              }),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB profile seed timed out")), 1500))
            ]);
          } catch (e) {
            console.error("Failed to seed public profile:", e);
          }

          this.activeUser = uProfile;
          localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
          this.notifyListeners();
        }

        return { data: { user: uProfile, isEmailConfirmationRequired }, error: null };
      }
      return { data, error: null };
    }

    // Server-Side Hybrid Cloud Database Registration with Sandbox Fallback
    let response: Response | null = null;
    let isServerDownOr404 = false;

    try {
      response = await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", profile, password }),
      });

      if (!response || response.status === 404) {
        isServerDownOr404 = true;
      }
    } catch {
      isServerDownOr404 = true;
    }

    if (isServerDownOr404) {
      console.warn("Express server returned 404/offline. Using client-side Local Sandbox DB.");
      const users = getLocalUsers();
      const normalizedEmail = profile.email.toLowerCase().trim();

      if (users[normalizedEmail]) {
        return { data: null, error: { message: "このメールアドレスは既に登録されていますにゃ。" } };
      }

      const mockId = "usr_" + Math.random().toString(36).substring(2, 11);
      const createdProfile: UserProfile = {
        id: mockId,
        email: normalizedEmail,
        name: profile.name || "探求者",
        address: profile.address || "",
        phone: profile.phone || "",
        birthDate: profile.birthDate || "",
      };

      // Securely hash the password using bcryptjs client-side
      const hashedPassword = bcrypt.hashSync(password, 10);

      users[normalizedEmail] = {
        profile: createdProfile,
        password: hashedPassword,
      };
      saveLocalUsers(users);

      this.activeUser = createdProfile;
      localStorage.setItem("hippocampus_session_user", JSON.stringify(createdProfile));
      this.notifyListeners();
      return { data: { user: createdProfile }, error: null };
    }

    // Continue with normal server registration handling if server was online
    try {
      let res: any = {};
      const contentType = response!.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        res = await response!.json();
      } else {
        const text = await response!.text();
        return { data: null, error: { message: `サーバーエラーが発生しました (${response!.status}): ${text.substring(0, 150)}` } };
      }

      if (!response!.ok) {
        return { data: null, error: { message: res.message || "アカウント作成に失敗しました" } };
      }

      const uProfile: UserProfile = res.user;
      this.activeUser = uProfile;
      localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
      this.notifyListeners();
      return { data: { user: uProfile }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "サーバー通信エラーが発生しました。" } };
    }
  }

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    if (isRealSupabaseConfigured && realSupabase) {
      try {
        const { data, error } = await Promise.race([
          realSupabase.auth.signInWithPassword({
            email,
            password
          }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase Auth direct signIn timed out")), 2000))
        ]);
        
        if (!error && data?.user) {
          const user = data.user;
          let uProfile: UserProfile = {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.name || "ユーザー",
            address: user.user_metadata?.address || "",
            phone: user.user_metadata?.phone || "",
            birthDate: user.user_metadata?.birthDate || ""
          };

          try {
            const { data: profData } = await Promise.race([
              realSupabase.from('hippocampus_users').select('*').eq('id', user.id).maybeSingle(),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB profile fetch timed out")), 1500))
            ]);
            if (profData) {
              uProfile = {
                id: profData.id,
                email: profData.email,
                name: profData.name || uProfile.name,
                address: profData.address || uProfile.address,
                phone: profData.phone || uProfile.phone,
                birthDate: profData.birth_date || uProfile.birthDate
              };
            } else {
              // Seed profile standard if missing
              await Promise.race([
                realSupabase.from('hippocampus_users').upsert({
                  id: user.id,
                  email: uProfile.email,
                  name: uProfile.name,
                  address: uProfile.address,
                  phone: uProfile.phone,
                  birth_date: uProfile.birthDate
                }),
                new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB profile seed timed out")), 1500))
              ]);
            }
          } catch (e) {
            console.warn("Failed to retrieve or seed profile standard:", e);
          }

          this.activeUser = uProfile;
          localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
          this.notifyListeners();
          return { data: { user: uProfile }, error: null };
        } else {
          console.warn("Direct Supabase Auth signIn returned error, falling back to server-side API login:", error?.message);
        }
      } catch (err) {
        console.warn("Exception in direct Supabase Auth signIn, falling back to server-side API login:", err);
      }
    }

    // Server-Side Cloud Sync Login with Sandbox Fallback
    let response: Response | null = null;
    let isServerDownOr404 = false;

    try {
      response = await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });

      if (!response || response.status === 404) {
        isServerDownOr404 = true;
      }
    } catch {
      isServerDownOr404 = true;
    }

    if (isServerDownOr404) {
      console.warn("Express server returned 404/offline. Using client-side Local Sandbox DB.");
      const users = getLocalUsers();
      const normalizedEmail = email.toLowerCase().trim();
      const user = users[normalizedEmail];

      // Verify hashed password safely with backward-compatible plain text fallback
      const isPasswordCorrect = user && user.password && (
        (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))
          ? bcrypt.compareSync(password, user.password)
          : user.password === password
      );

      if (!user || !isPasswordCorrect) {
        return { data: null, error: { message: "メールアドレス、またはパスワードに誤りがありますにゃ。" } };
      }

      this.activeUser = user.profile;
      localStorage.setItem("hippocampus_session_user", JSON.stringify(user.profile));
      this.notifyListeners();
      return { data: { user: user.profile }, error: null };
    }

    try {
      let res: any = {};
      const contentType = response!.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        res = await response!.json();
      } else {
        const text = await response!.text();
        return { data: null, error: { message: `サーバーエラーが発生しました (${response!.status}): ${text.substring(0, 150)}` } };
      }

      if (!response!.ok) {
        return { data: null, error: { message: res.message || "ログインに失敗しました" } };
      }

      const uProfile: UserProfile = res.user;
      this.activeUser = uProfile;
      localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
      this.notifyListeners();
      return { data: { user: uProfile }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "サーバー連携エラーが発生しました" } };
    }
  }

  async signOut(): Promise<{ error: any }> {
    let signOutError: any = null;
    if (isRealSupabaseConfigured && realSupabase) {
      try {
        // Force a short safety timeout (e.g. 800ms) so that if Supabase network/auth server hangs,
        // we still proceed with client-side cleanup and sign out successfully.
        await Promise.race([
          realSupabase.auth.signOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("SignOut timeout")), 800))
        ]).catch(err => {
          console.warn("Supabase auth.signOut timed out or failed, proceeding with client-side sign out:", err);
          signOutError = err;
        });
      } catch (err: any) {
        console.error("Exception in Supabase auth.signOut, but proceeding with client sign out:", err);
        signOutError = err;
      }
    }
    
    this.activeUser = null;
    
    // Clear Legacy Keys
    localStorage.removeItem("hippocampus_logs");
    localStorage.removeItem("hippocampus_reviews");
    localStorage.removeItem("hippocampus_settings");
    localStorage.removeItem("hippocampus_books");
    
    // Clear V2 Keys to prevent data leaking to guest mode or other users
    const keysToClear = [
      "hippocampus_logs_v2",
      "hippocampus_books_v2",
      "hippocampus_reviews_v2",
      "hippocampus_settings_v2",
      "hippocampus_announcements_v2",
      "hippocampus_session_user",
      "hippocampus_migrated",
      "hippocampus_sync_time",
      "hippocampus_sync_count",
      "hippocampus_sync_status",
      "hippocampus_last_imported_ids",
      "hippocampus_custom_events"
    ];

    // Delete keys
    keysToClear.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Verification step: Ensure no target keys remain in localStorage
    const remainingKeys: string[] = [];
    keysToClear.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val !== null) {
        remainingKeys.push(key);
      }
    });

    if (remainingKeys.length > 0) {
      console.warn("Security Warning: Some keys were not fully cleared from localStorage upon signOut:", remainingKeys);
      // Double check force deletion via direct object property deletion
      remainingKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
          delete (localStorage as any)[key];
        } catch (e) {
          console.error(`Failed to force delete localStorage key: ${key}`, e);
        }
      });
      
      // Final recheck
      const finalCheck: string[] = [];
      remainingKeys.forEach((key) => {
        if (localStorage.getItem(key) !== null) {
          finalCheck.push(key);
        }
      });
      if (finalCheck.length > 0) {
        console.error("Critical Security Failure: Unable to clear some localStorage keys:", finalCheck);
      } else {
        console.log("Security Verification successfully completed after force-clear: All personal localStorage keys have been fully purged.");
      }
    } else {
      console.log("Security Verification successfully completed: All personal localStorage keys have been fully purged upon signOut.");
    }
    
    this.notifyListeners();
    return { error: null };
  }

  async resetPassword(email: string): Promise<{ message: string; error: any }> {
    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await Promise.race([
        realSupabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase Auth direct resetPasswordForEmail timed out")), 2000))
      ]);
      if (error) return { message: "", error };
      return { message: "パスワード再設定用のメールを送信しましたにゃ✉️", error: null };
    }

    // Call simulated reset endpoint on Server with Sandbox Fallback
    let response: Response | null = null;
    let isServerDownOr404 = false;

    try {
      response = await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", email }),
      });

      if (!response || response.status === 404) {
        isServerDownOr404 = true;
      }
    } catch {
      isServerDownOr404 = true;
    }

    if (isServerDownOr404) {
      console.warn("Express server offline. Simulating direct local reset.");
      const users = getLocalUsers();
      const normalizedEmail = email.toLowerCase().trim();
      if (!users[normalizedEmail]) {
        return { message: "", error: { message: "登録されていないメールアドレスですにゃ。" } };
      }
      return { message: `（シミュレータお知らせ）「${normalizedEmail}」宛てにパスワード再設定URLを送信しましたにゃ🐾 有効期限は24時間ですにゃ。`, error: null };
    }

    try {
      const res = await response!.json();
      if (!response!.ok) {
        return { message: "", error: { message: res.message } };
      }
      return { message: res.message || "パスワード再設定メールをシミュレート送信しました", error: null };
    } catch (err: any) {
      return { message: "", error: { message: err.message } };
    }
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<{ data: any; error: any }> {
    if (!this.activeUser) {
      return { data: null, error: { message: "ログインしていませんにゃ。" } };
    }

    if (isRealSupabaseConfigured && realSupabase) {
      const { data, error } = await Promise.race([
        realSupabase.auth.updateUser({
          data: {
            name: profile.name !== undefined ? profile.name : this.activeUser.name,
            address: profile.address !== undefined ? profile.address : this.activeUser.address,
            phone: profile.phone !== undefined ? profile.phone : this.activeUser.phone,
            birthDate: profile.birthDate !== undefined ? profile.birthDate : this.activeUser.birthDate,
          }
        }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase Auth direct updateUser timed out")), 2000))
      ]);
      if (error) return { data: null, error };

      const user = data.user;
      if (user) {
        const uProfile: UserProfile = {
          id: this.activeUser.id,
          email: this.activeUser.email,
          name: user.user_metadata?.name || this.activeUser.name,
          address: user.user_metadata?.address || this.activeUser.address,
          phone: user.user_metadata?.phone || this.activeUser.phone,
          birthDate: user.user_metadata?.birthDate || this.activeUser.birthDate,
        };

        // Sync with standard hippocampus_users table
        try {
          await Promise.race([
            realSupabase.from('hippocampus_users').upsert({
              id: uProfile.id,
              email: uProfile.email,
              name: uProfile.name,
              address: uProfile.address,
              phone: uProfile.phone,
              birth_date: uProfile.birthDate
            }),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB profile update upsert timed out")), 1500))
          ]);
        } catch (e) {
          console.warn("Failed to sync profile update to PostgreSQL database table:", e);
        }

        this.activeUser = uProfile;
        localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
        this.notifyListeners();
        return { data: { user: uProfile }, error: null };
      }
      return { data, error: null };
    }

    // Server-Side Cloud profile update with Sandbox Fallback
    let response: Response | null = null;
    let isServerDownOr404 = false;

    try {
      response = await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-profile", email: this.activeUser.email, profile }),
      });

      if (!response || response.status === 404) {
        isServerDownOr404 = true;
      }
    } catch {
      isServerDownOr404 = true;
    }

    if (isServerDownOr404) {
      console.warn("Express server offline. Using client-side Local Sandbox DB update.");
      const users = getLocalUsers();
      const normalizedEmail = this.activeUser.email.toLowerCase().trim();
      const user = users[normalizedEmail];

      if (!user) {
        return { data: null, error: { message: "ユーザーが見つかりませんにゃ。" } };
      }

      user.profile.name = profile.name !== undefined ? profile.name : user.profile.name;
      user.profile.address = profile.address !== undefined ? profile.address : user.profile.address;
      user.profile.phone = profile.phone !== undefined ? profile.phone : user.profile.phone;
      user.profile.birthDate = profile.birthDate !== undefined ? profile.birthDate : user.profile.birthDate;

      users[normalizedEmail] = user;
      saveLocalUsers(users);

      this.activeUser = user.profile;
      localStorage.setItem("hippocampus_session_user", JSON.stringify(user.profile));
      this.notifyListeners();
      return { data: { user: user.profile }, error: null };
    }

    try {
      const res = await response!.json();
      if (!response!.ok) {
        return { data: null, error: { message: res.message || "プロフィールの更新に失敗しましたにゃ" } };
      }

      const uProfile: UserProfile = res.user;
      this.activeUser = uProfile;
      localStorage.setItem("hippocampus_session_user", JSON.stringify(uProfile));
      this.notifyListeners();
      return { data: { user: uProfile }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "サーバー通信エラーが発生しました。" } };
    }
  }

  // Account Removal and complete data wipes
  async deleteAccount(): Promise<{ error: any }> {
    if (this.activeUser) {
      try {
        await apiFetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-account", email: this.activeUser.email }),
        });
      } catch (e) {
        console.warn("Server delete profile failed, wiping client-side contents anyway.", e);
      }
    }

    return await this.signOut();
  }

  // Sync state data to Cloud Database (includes debounced automatic write to prevent redundant performance queues)
  async pushDataToCloud(
    logs: TimelineLog[],
    books: BoundBook[],
    settings: AppSettings,
    reviews?: ReviewResult[],
    isForce: boolean = false
  ): Promise<boolean> {
    if (!this.activeUser) return false;

    if (!isForce) {
      this.syncStatus = "pending";
      this.notifySyncStatus();
      localStorage.setItem("hippocampus_sync_status", "pending");

      if (this.debounceTimeout) clearTimeout(this.debounceTimeout);

      return new Promise<boolean>((resolve) => {
        this.debounceTimeout = setTimeout(async () => {
          const success = await this.executePush(logs, books, settings, reviews);
          resolve(success);
        }, 1500); // 1.5-second debounce for automatic background pushes
      });
    } else {
      if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
      return await this.executePush(logs, books, settings, reviews);
    }
  }

  private async executePush(
    logs: TimelineLog[],
    books: BoundBook[],
    settings: AppSettings,
    reviews?: ReviewResult[]
  ): Promise<boolean> {
    const syncTime = new Date().toISOString();
    const finalReviews = reviews || [];
    const syncCount = logs.length + books.length + finalReviews.length;

    this.syncStatus = "syncing";
    this.notifySyncStatus();
    localStorage.setItem("hippocampus_sync_status", "syncing");

    localStorage.setItem("hippocampus_sync_time", syncTime);
    localStorage.setItem("hippocampus_sync_count", String(syncCount));

    // 1. Always prefer the Server-Side Synchronous Push API to handle database mutations cleanly
    try {
      const response = await apiFetch("/api/cloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-push",
          userId: this.activeUser!.id,
          logs,
          books,
          settings,
          reviews: finalReviews
        })
      });
      if (response.ok) {
        this.syncStatus = "success";
        this.notifySyncStatus();
        localStorage.setItem("hippocampus_sync_status", "success");
        return true;
      }
    } catch (err) {
      console.warn("Server-side sync-push API failed, trying direct Supabase fallback:", err);
    }

    // 2. Direct client-side push fallback (if configured)
    if (isRealSupabaseConfigured && realSupabase) {
      try {
        const userId = this.activeUser!.id;

        // Delete all existing logs in hippocampus_logs for this user first
        const { error: deleteError } = await Promise.race([
          realSupabase
            .from("hippocampus_logs")
            .delete()
            .eq("user_id", userId)
            .in("entry_type", ["log", "timeline_import", "received_memory", "book", "settings", "review"]),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB push delete timed out")), 2000))
        ]);

        if (deleteError) throw deleteError;

        // Prepare batch insertion
        const rowsToInsert: any[] = [];

        // Push logs
        if (Array.isArray(logs)) {
          for (const log of logs) {
            rowsToInsert.push({
              user_id: userId,
              entry_type: log.entryType || "log",
              content: JSON.stringify(log),
              received_from: (log as any).receivedFrom || "app",
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
              content: JSON.stringify(book),
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
            content: JSON.stringify(settings),
            received_from: "app",
            occurred_at: new Date().toISOString()
          });
        }

        // Push reviews
        if (Array.isArray(finalReviews)) {
          for (const rev of finalReviews) {
            rowsToInsert.push({
              user_id: userId,
              entry_type: "review",
              content: JSON.stringify(rev),
              received_from: "app",
              occurred_at: rev.generatedAt || new Date().toISOString()
            });
          }
        }

        // Batch insert (50 rows at a time)
        if (rowsToInsert.length > 0) {
          for (let i = 0; i < rowsToInsert.length; i += 50) {
            const batch = rowsToInsert.slice(i, i + 50);
            const { error: insertError } = await Promise.race([
              realSupabase
                .from("hippocampus_logs")
                .insert(batch),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB push insert timed out")), 2500))
            ]);

            if (insertError) throw insertError;
          }
        }

        this.syncStatus = "success";
        this.notifySyncStatus();
        localStorage.setItem("hippocampus_sync_status", "success");
        return true;
      } catch (err) {
        console.error("Direct fallback Supabase synchronization push failed too:", err);
      }
    }

    this.syncStatus = "error";
    this.notifySyncStatus();
    localStorage.setItem("hippocampus_sync_status", "error");
    return false;
  }

  // Restore state data from Cloud Database
  async pullDataFromCloud(): Promise<{ logs: TimelineLog[]; books: BoundBook[]; settings: AppSettings | null; reviews?: ReviewResult[] } | null> {
    if (!this.activeUser) return null;

    if (this.currentPullPromise) {
      return this.currentPullPromise;
    }

    const runPull = async () => {
      // 1. Always prefer the Server-side secure API utilizing Service Role to avoid direct client-side selection discrepancies
      try {
        const response = await apiFetch(`/api/cloud?action=sync-pull&userId=${this.activeUser!.id}`);
        if (response.ok) {
          const data = await response.json();
          return {
            logs: data.logs || [],
            books: data.books || [],
            settings: data.settings || null,
            reviews: data.reviews || []
          };
        }
      } catch (err) {
        console.warn("Server-side sync-pull API failed, trying direct query fallback:", err);
      }

      // 2. Direct client-side fallback query
      if (isRealSupabaseConfigured && realSupabase) {
        try {
          const userId = this.activeUser!.id;

          const { data: rows, error } = await Promise.race([
            realSupabase
              .from("hippocampus_logs")
              .select("*")
              .eq("user_id", userId),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase DB pull timed out")), 2500))
          ]);

          if (error) {
            throw error;
          }

          const logs: TimelineLog[] = [];
          const books: BoundBook[] = [];
          let settings: AppSettings | null = null;
          const reviews: ReviewResult[] = [];

          if (rows && rows.length > 0) {
            for (const row of rows) {
              try {
                if (row.entry_type === "book") {
                  books.push(JSON.parse(row.content));
                } else if (row.entry_type === "settings") {
                  settings = JSON.parse(row.content);
                } else if (row.entry_type === "review") {
                  reviews.push(JSON.parse(row.content));
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

          return {
            logs,
            books,
            settings,
            reviews
          };
        } catch (err) {
          console.error("Direct fallback Supabase select pull failed too:", err);
        }
      }

      return null;
    };

    this.currentPullPromise = runPull().finally(() => {
      this.currentPullPromise = null;
    });

    return this.currentPullPromise;
  }
}

export const cloudSupabase = new CloudSupabaseService();
