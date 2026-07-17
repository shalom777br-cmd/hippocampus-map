import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors";
import { getSupabaseClient } from "./_lib/supabase";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { action } = req.body || {};
  const supabase = getSupabaseClient();

  try {
    switch (action) {
      case "register": {
        const { profile, password } = req.body || {};
        if (!profile || !profile.email || !password) {
          res.status(400).json({ message: "必須項目が不足しています。" });
          return;
        }

        const normalizedEmail = profile.email.toLowerCase().trim();

        // Check if user already exists
        const { data: existingUser, error: findError } = await (supabase as any)
          .from("hippocampus_users")
          .select("email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (findError) {
          console.error("Error checking existing user in register:", findError);
        }

        if (existingUser) {
          res.status(400).json({ message: "このメールアドレスは既に登録されていますにゃ。" });
          return;
        }

        const newId = "usr_" + Math.random().toString(36).substring(2, 11);
        const createdProfile = {
          id: newId,
          email: normalizedEmail,
          name: profile.name || "探求者",
          address: profile.address || "",
          phone: profile.phone || "",
          birthDate: profile.birthDate || "",
        };

        // Securely hash the password using bcryptjs
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert user into hippocampus_users table
        const { error: insertError } = await (supabase as any)
          .from("hippocampus_users")
          .insert({
            id: newId,
            email: normalizedEmail,
            password_hash: hashedPassword,
            name: profile.name || "探求者",
            address: profile.address || "",
            phone: profile.phone || "",
            birth_date: profile.birthDate || "",
          });

        if (insertError) {
          throw insertError;
        }

        res.status(200).json({ message: "アカウント登録が完了しました！", user: createdProfile });
        break;
      }

      case "login": {
        const { email, password } = req.body || {};
        if (!email || !password) {
          res.status(400).json({ message: "メールアドレスとパスワードを入力してください。" });
          return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Fetch user from hippocampus_users
        const { data: user, error: fetchError } = await (supabase as any)
          .from("hippocampus_users")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        const passwordHash = user ? (user.password_hash || user.password) : null;

        // Verify hashed password safely with backward-compatible plain text fallback
        const isPasswordCorrect = user && passwordHash && (
          (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$"))
            ? bcrypt.compareSync(password, passwordHash)
            : passwordHash === password
        );

        if (!user || !isPasswordCorrect) {
          res.status(401).json({ message: "メールアドレス、またはパスワードに誤りがありますにゃ。" });
          return;
        }

        const returnedProfile = {
          id: user.id,
          email: user.email,
          name: user.name || "探求者",
          address: user.address || "",
          phone: user.phone || "",
          birthDate: user.birth_date || user.birthDate || "",
        };

        res.status(200).json({ message: "ログイン成功！データをマッピングするにゃ🐾", user: returnedProfile });
        break;
      }

      case "update-profile": {
        const { email, profile } = req.body || {};
        if (!email || !profile) {
          res.status(400).json({ message: "必須項目が不足しています。" });
          return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Fetch the current user to get their current profile
        const { data: user, error: fetchError } = await (supabase as any)
          .from("hippocampus_users")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (!user) {
          res.status(404).json({ message: "ユーザーが見つかりませんにゃ。" });
          return;
        }

        const updatedFields: any = {};
        if (profile.name !== undefined) updatedFields.name = profile.name;
        if (profile.address !== undefined) updatedFields.address = profile.address;
        if (profile.phone !== undefined) updatedFields.phone = profile.phone;
        if (profile.birthDate !== undefined) updatedFields.birth_date = profile.birthDate;

        // Update profile in hippocampus_users
        const { error: updateError } = await (supabase as any)
          .from("hippocampus_users")
          .update(updatedFields)
          .eq("email", normalizedEmail);

        if (updateError) {
          throw updateError;
        }

        const updatedProfile = {
          id: user.id,
          email: normalizedEmail,
          name: profile.name !== undefined ? profile.name : (user.name || "探求者"),
          address: profile.address !== undefined ? profile.address : (user.address || ""),
          phone: profile.phone !== undefined ? profile.phone : (user.phone || ""),
          birthDate: profile.birthDate !== undefined ? profile.birthDate : (user.birth_date || ""),
        };

        res.status(200).json({ message: "プロフィールが更新されました🐾", user: updatedProfile });
        break;
      }

      case "reset-password": {
        const { email } = req.body || {};
        if (!email) {
          res.status(400).json({ message: "メールアドレスが必要です。" });
          return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const { data: user, error: fetchError } = await (supabase as any)
          .from("hippocampus_users")
          .select("email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (!user) {
          res.status(404).json({ message: "登録されていないメールアドレスですにゃ。" });
          return;
        }

        res.status(200).json({
          message: `（シミュレータお知らせ）「${normalizedEmail}」宛てにパスワード再設定URLを送信しましたにゃ🐾 有効期限は24時間ですにゃ。`,
        });
        break;
      }

      case "delete-account": {
        const { email } = req.body || {};
        if (!email) {
          res.status(400).json({ message: "メールアドレスが必要です。" });
          return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Fetch the user first to obtain the user_id (required to clear hippocampus_logs)
        const { data: user, error: fetchError } = await (supabase as any)
          .from("hippocampus_users")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (user) {
          const userId = user.id;

          // 1. Delete logs in hippocampus_logs
          const { error: logsDeleteError } = await (supabase as any)
            .from("hippocampus_logs")
            .delete()
            .eq("user_id", userId);

          if (logsDeleteError) {
            console.error("Error deleting logs from hippocampus_logs:", logsDeleteError);
          }

          // 2. Delete user from hippocampus_users
          const { error: userDeleteError } = await (supabase as any)
            .from("hippocampus_users")
            .delete()
            .eq("email", normalizedEmail);

          if (userDeleteError) {
            throw userDeleteError;
          }
        }

        res.status(200).json({ message: "お部屋と全ての記憶を忘却し、アカウントを完全に消去しましたにゃ。" });
        break;
      }

      default: {
        res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }
  } catch (err: any) {
    console.error(`Error in auth API [${action}]:`, err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
}
