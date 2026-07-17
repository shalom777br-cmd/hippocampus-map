import React, { useState } from "react";
import { UserProfile } from "../types";
import { cloudSupabase, isRealSupabaseConfigured } from "../utils/supabase";
import { Key, Mail, User, MapPin, Phone, Calendar as CalendarIcon, ShieldCheck, LogOut, ArrowRight, Trash2 } from "lucide-react";

interface AuthProps {
  user: UserProfile | null;
  onAuthChange: (user: UserProfile | null) => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AuthScreen({ user, onAuthChange, onToast }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  // States for Profile Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [confirmingDeleteAcc, setConfirmingDeleteAcc] = useState(false);

  const startEditing = () => {
    if (user) {
      setEditName(user.name || "");
      setEditAddress(user.address || "");
      setEditPhone(user.phone || "");
      setEditBirthDate(user.birthDate || "");
      setIsEditing(true);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await cloudSupabase.updateProfile({
        name: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        birthDate: editBirthDate,
      });
      if (error) {
        onToast(error.message, "error");
      } else {
        onAuthChange(data.user);
        onToast("プロフィール情報を更新したにゃ🐾", "success");
        setIsEditing(false);
      }
    } catch (err: any) {
      onToast(err.message || "エラーが発生しました。", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isReset) {
        // Reset password
        const { message, error } = await cloudSupabase.resetPassword(email);
        if (error) {
          onToast(error.message, "error");
        } else {
          onToast(message || "パスワードリセットのご案内を送信したにゃ🐾", "success");
          setIsReset(false);
          setIsLogin(true);
        }
      } else if (isLogin) {
        // Login
        const { data, error } = await cloudSupabase.signIn(email, password);
        if (error) {
          let errorMsg = error.message;
          if (errorMsg.includes("Email not confirmed") || errorMsg.includes("verified") || errorMsg.includes("confirm")) {
            errorMsg = "メールアドレスの認証がまだ完了していないようですにゃ✉️ 受信トレイや迷惑メールフォルダを確認して、認証リンクをクリックしてくださいにゃ🐾";
          }
          onToast(errorMsg, "error");
        } else {
          onAuthChange(data.user);
          onToast(`おかえりなさい、${data.user.name}さん！`, "success");
        }
      } else {
        // Register (Signup)
        if (!email || !password) {
          onToast("メールアドレスとパスワードを入力してくださいにゃ🐾", "error");
          setLoading(false);
          return;
        }

        const finalName = name.trim() || "探求者";
        const profile: Omit<UserProfile, "id"> = {
          email,
          name: finalName,
          address: address.trim(),
          phone: phone.trim(),
          birthDate: birthDate,
        };
        const { data, error } = await cloudSupabase.signUp(profile, password);
        if (error) {
          onToast(error.message, "error");
        } else {
          if (data && data.isEmailConfirmationRequired) {
            onToast("仮登録に成功したにゃあ！メールフォルダを確認して、認証リンクをクリックして本登録を完了してにゃ✉️🐾", "info");
            setIsLogin(true); // ログイン画面に切り替える
          } else {
            onAuthChange(data.user);
            onToast(`はじめまして、${data.user.name}さん！海馬のお部屋を作成したにゃ！`, "success");
          }
        }
      }
    } catch (err: any) {
      onToast(err.message || "エラーが発生しました。", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await cloudSupabase.signOut();
      onAuthChange(null);
      onToast("安全にログアウトして海馬をロックしたにゃ。また遊びに来てにゃ🐾", "info");
    } catch (err: any) {
      console.error("Logout failed:", err);
      onToast("ログアウト処理中にエラーが発生しましたにゃ🐾", "error");
    } finally {
      setLoading(false);
    }
  };

  const SwalDeleteAccount = async () => {
    setLoading(true);
    const { error } = await cloudSupabase.deleteAccount();
    if (error) {
      onToast("エラーにより削除できませんでした: " + error.message, "error");
    } else {
      onAuthChange(null);
      onToast("あなたに関するすべての記憶（記録・分析データ・本棚）を完全抹消したにゃ。お元気で…🐾", "success");
    }
    setLoading(false);
  };

  if (user) {
    if (isEditing) {
      return (
        <div id="auth-screen-profile-edit" className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/[0.03]">
            <h2 className="font-serif text-base font-bold text-[#4A5D4E] flex items-center gap-2">
              <User className="w-5 h-5 text-[#4A5D4E]" />
              身元情報の編集
            </h2>
            <span className="text-[10px] text-[#8A8471] font-mono tracking-wider">
              EDIT PROFILE
            </span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block font-semibold text-[#8A8471] mb-1">氏名 (任意)</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="図書 太郎"
                    className="w-full pl-9 pr-3 py-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <label className="block font-semibold text-[#8A8471] mb-1">生年月日 (任意)</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-black/[0.03]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-[#8A8471] border border-black/[0.06] rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all font-bold cursor-pointer"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#4A5D4E] hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                disabled={loading}
              >
                {loading ? "更新中..." : "変更を保存する🐾"}
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div id="auth-screen-profile" className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/[0.03]">
          <h2 className="font-serif text-base font-bold text-[#4A5D4E] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ログイン中の身元証明
          </h2>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
            {isRealSupabaseConfigured ? "Supabase Cloud" : "Cloud Sandbox Sync"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#33332D]">
          <div className="space-y-2 bg-[#F9F8F6] p-4 rounded-2xl">
            <div className="flex justify-between pb-1 border-b border-black/[0.03]">
              <span className="text-[#8A8471] font-semibold">氏名:</span>
              <span className="font-bold">{user.name || "未設定"}</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-black/[0.03]">
              <span className="text-[#8A8471] font-semibold">メール:</span>
              <span className="font-bold font-mono">{user.email}</span>
            </div>
          </div>

          <div className="space-y-2 bg-[#F9F8F6] p-4 rounded-2xl">
            <div className="flex justify-between pb-1 border-b border-black/[0.03]">
              <span className="text-[#8A8471] font-semibold">生年月日:</span>
              <span className="font-bold font-mono">{user.birthDate || "未設定"}</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-black/[0.03]">
              <span className="text-[#8A8471] font-semibold">セキュリティ:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">接続安定 ●</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-black/[0.03]">
          {confirmingDeleteAcc ? (
            <div className="flex flex-col gap-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl max-w-sm animate-fadeIn">
              <span className="text-[10px] text-rose-950 font-black leading-normal">
                🚨【警告】バックアップを含むすべての脳内データを完全に抹消しますにゃ？(この操作は取り消せません)
              </span>
              <div className="flex items-center gap-1.5 font-bold text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    SwalDeleteAccount();
                    setConfirmingDeleteAcc(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer transition-all shadow-xs"
                >
                  はい、完全抹消する🐾
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteAcc(false)}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg cursor-pointer transition-all"
                >
                  やめる
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDeleteAcc(true)}
              className="px-4 py-2 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              disabled={loading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              アカウント全データの削除
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={startEditing}
              className="px-4 py-2 border border-[#4A5D4E] text-[#4A5D4E] hover:bg-[#4A5D4E]/5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              disabled={loading}
            >
              プロフィールを編集
            </button>

            {confirmingLogout ? (
              <div className="flex items-center gap-1.5 p-1.5 bg-[#8A8471]/10 rounded-xl border border-[#8A8471]/20 animate-fadeIn font-bold text-[10px]">
                <span className="text-[#8A8471] px-1">サインアウトしますにゃ？🐾</span>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setConfirmingLogout(false);
                  }}
                  className="px-2.5 py-1 bg-amber-800 hover:bg-black text-white rounded-lg cursor-pointer transition-all shadow-xs"
                >
                  はい
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingLogout(false)}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg cursor-pointer transition-all"
                >
                  いいえ
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingLogout(true)}
                className="px-5 py-2 bg-[#8A8471] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                disabled={loading}
              >
                <LogOut className="w-3.5 h-3.5" />
                {loading ? "サインアウト中..." : "ログアウトする"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-screen-login" className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-black/[0.05]">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/[0.03]">
        <h2 className="font-serif text-base font-bold text-[#4A5D4E] flex items-center gap-2">
          {isReset ? "パスワードの再設定" : isLogin ? "海馬の扉を開ける（ログイン）" : "新しい本棚室を作成（新規登録）"}
        </h2>
        <span className="text-[10px] text-[#8A8471] font-mono tracking-wider">
          MEMBER SYSTEM
        </span>
      </div>

      <p className="text-xs text-[#8A8471] mb-5 leading-relaxed">
        {isReset
          ? "ご登録のメールアドレスを入力してください。模擬リセット手順を起動しますにゃ。"
          : isLogin
          ? "ご登録のメールアドレスとパスワードでログインして、あなたのタイムラインと背表紙本棚を復元・同期しますにゃ🐾"
          : "メールアドレスとパスワードを入力するだけで海馬の作成が完了します。氏名、生年月日はいつでも任意でご登録いただけます。"}
      </p>

      {/* Supabase メール認証対策のトラブルシューティングガイド */}
      {isRealSupabaseConfigured && !isEditing && (
        <div className="bg-amber-50/75 border border-amber-200/60 p-4 rounded-2xl text-[11px] text-amber-900 leading-relaxed mb-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]">
          <p className="font-bold flex items-center gap-1.5 mb-1.5 text-xs text-amber-950 font-serif">
            <span>🐾 司書長ノアからのメール認証トラブル解説</span>
          </p>
          <div className="space-y-1">
            <p>
              Supabaseプロセスの仕様上、本物の認証を繋ぐと「登録時の確認リンク（Confirm Email）」が送信され、それを承認するまでログインできない場合がありますにゃ。
            </p>
            <p>
              もしメール内の認証リンクをクリックしてエラー（「接続が拒否されました」など）になる原因は、<b>リダイレクト先のURL不一致</b>にありますにゃ。
            </p>
            <p>
              <b>解決へのアドバイス:</b><br />
              Supabaseの管理コンソールから <b>[Project Settings] → [Auth]</b> に移動し、以下の設定を修正・確認してくださいにゃ🐾
            </p>
            <ul className="list-disc pl-4 space-y-1 text-amber-950/90 font-mono text-[10px]">
              <li>
                <b>Site URL</b>、または <b>Redirect URLs:</b><br />
                今開いているこのアプリのURL（<span className="bg-white/80 px-1 py-0.5 rounded border border-amber-200/40 select-all font-bold">{window.location.origin}</span>）を追加してくださいにゃ。
              </li>
              <li>
                <b>Confirm email（メールの必須要件）:</b><br />
                開発中の検証をスムーズにするため、一度このチェックをOFF（オフ）にすると、メール認証を挟まないノーチェック即時ログインが可能になりますにゃ！
              </li>
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4 text-xs">
        {/* Email */}
        <div>
          <label className="block font-semibold text-[#8A8471] mb-1">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full pl-9 pr-3 py-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Password */}
        {!isReset && (
          <div>
            <label className="block font-semibold text-[#8A8471] mb-1">パスワード</label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
                required
              />
            </div>
          </div>
        )}

        {/* Sign-up specifics */}
        {!isLogin && !isReset && (
          <div>
            <label className="block font-semibold text-[#8A8471] mb-1">氏名 (任意)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="図書 太郎"
                className="w-full pl-9 pr-3 py-2 bg-[#F9F8F6] border border-black/[0.06] rounded-xl focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#4A5D4E] hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            {loading ? "処理しています..." : isReset ? "パスワード再設定のご案内を送信🐾" : isLogin ? "ログインして海馬に入る" : "アカウントを登録して本棚を作る"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* One-Click Quick Login Button for shalom777br@gmail.com */}
      {isLogin && !isReset && (
        <div className="mt-4 pt-3 border-t border-dashed border-black/[0.06] text-center">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setEmail("shalom777br@gmail.com");
              setPassword("password");
              try {
                const { data, error } = await cloudSupabase.signIn("shalom777br@gmail.com", "password");
                if (error) {
                  onToast(error.message, "error");
                } else {
                  onAuthChange(data.user);
                  onToast(`おかえりなさい、${data.user.name}さん！🐾`, "success");
                }
              } catch (err: any) {
                onToast("簡単ログインに失敗しましたにゃ🐾", "error");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:scale-[1.01]"
          >
            <span className="text-sm">🔑</span>
            <span>shalom777br@gmail.com として1クリック簡単ログイン</span>
          </button>
          <p className="text-[10px] text-amber-800/80 mt-1.5 font-medium leading-normal">
            ※検証・テスト用：パスワード（password）の入力を省略して即座にログイン・データ同期できますにゃ🐾
          </p>
        </div>
      )}

      {/* Toggle View Linkages */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-[11px] text-[#8A8471] font-medium pt-2 border-t border-black/[0.03]">
        {isReset ? (
          <button onClick={() => { setIsReset(false); setIsLogin(true); }} className="hover:text-black underline">
            ログインフォームに戻るにゃ
          </button>
        ) : (
          <>
            <button onClick={() => { setIsLogin(!isLogin); setIsReset(false); }} className="hover:text-black underline">
              {isLogin ? "新しくアカウントを登録する（無料）" : "既に登録済みの方はこちら（ログイン）"}
            </button>
            {isLogin && (
              <button onClick={() => { setIsReset(true); }} className="hover:text-black underline">
                パスワードを忘れたにゃ？
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
