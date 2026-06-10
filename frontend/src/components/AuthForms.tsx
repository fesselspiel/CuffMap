"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { api, storeToken } from "@/lib/api";

export function LoginForm({ mode }: { mode: "login" | "register" }) {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(formData: FormData) {
    setMessage("");
    const remember = formData.get("remember") === "on";
    const payload = Object.fromEntries(formData.entries());
    delete payload.remember;

    try {
      const response = await api<{ access_token: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      storeToken(response.access_token, remember);
      if (remember) {
        window.localStorage.setItem("cuffmap_saved_login", String(payload.login || payload.email || ""));
      } else {
        window.localStorage.removeItem("cuffmap_saved_login");
      }
      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fehler");
    }
  }

  return (
    <form action={submit} className="mx-3 mt-6 max-w-md space-y-4 rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.12)] sm:mx-auto sm:mt-10 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">CuffMap</p>
      <h1 className="text-2xl font-semibold text-wine sm:text-3xl">{mode === "login" ? "Login" : "Registrierung"}</h1>
      {mode === "register" && (
        <>
          <input name="name" required className="min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="Name" />
          <input name="username" required minLength={3} pattern="[a-zA-Z0-9_.-]+" className="min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="Benutzername" />
          <input name="email" required type="email" className="min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="E-Mail" />
        </>
      )}
      {mode === "login" && (
        <input
          name="login"
          required
          className="min-h-11 w-full rounded-md border border-line px-3 py-2"
          placeholder="E-Mail oder Benutzername"
          defaultValue={typeof window !== "undefined" ? window.localStorage.getItem("cuffmap_saved_login") || "" : ""}
        />
      )}
      <div className="relative">
        <input
          name="password"
          required
          type={showPassword ? "text" : "password"}
          className="min-h-11 w-full rounded-md border border-line px-3 py-2 pr-11"
          placeholder="Passwort"
        />
        <button
          type="button"
          aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          title={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-rose hover:bg-blush"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm leading-5 text-ink/70">
        <input name="remember" type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-rose" />
        Logindaten auf diesem Gerät speichern
      </label>
      <button className="min-h-11 w-full rounded-md bg-wine px-4 py-2 font-medium text-white shadow-sm hover:bg-rose">{mode === "login" ? "Einloggen" : "Konto erstellen"}</button>
      {message && <p className="text-sm text-clay">{message}</p>}
    </form>
  );
}
