"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import heroImage from "@/Resources/images/img3hero.jpeg";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const [portal, setPortal] = useState<"citizen" | "authority">(
    roleParam === "authority" ? "authority" : "citizen"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "authority") {
      setPortal("authority");
      setError(null);
    } else {
      setPortal("citizen");
      setError(null);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "citizen") {
        router.push("/citizen");
      } else {
        router.push("/authority");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not sign in. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl rounded-2xl md:rounded-3xl border border-[#2C2A25] bg-[#121415] shadow-2xl overflow-hidden grid lg:grid-cols-12 min-h-[660px]">
      {/* Left Visual Panel */}
      <div className="relative lg:col-span-6 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden min-h-[300px] lg:min-h-full">
        {/* Background infrastructure photograph */}
        <Image
          src={heroImage}
          alt="Public Infrastructure Network"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover object-center scale-105"
        />

        {/* Multi-layered dark gradient overlay for contrast and engineering aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F10] via-[#0D0F10]/75 to-[#0D0F10]/40 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#121415] hidden lg:block" />

        {/* Top Technical Metadata */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151718]/85 border border-[#2C2A25] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#F4B52C] pulse-dot" />
            <span className="font-mono text-[10.5px] uppercase tracking-widest text-[#F4B52C] font-semibold">
              Public Infrastructure Intelligence
            </span>
          </div>
        </div>

        {/* Middle Brand Headline */}
        <div className="relative z-10 my-auto py-6 sm:py-8 space-y-3 sm:space-y-4">
          <h2 className="display-xl text-[clamp(26px,3.2vw,42px)] font-bold text-[#F3F0E8] leading-[1.1] tracking-tight">
            Understand what <br />
            <span className="text-[#F4B52C]">your city needs.</span>
          </h2>
          <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed text-[#A7A39A] max-w-md">
            Connect infrastructure evidence, intelligent computer vision analysis, and coordinated municipal action across civic assets.
          </p>

          {/* Scope indicator tags */}
          <div className="pt-2 flex flex-wrap gap-1.5 sm:gap-2">
            {[
              "Roads & Potholes",
              "Drainage & Water",
              "Signals & Lighting",
              "Sidewalks & Bridges",
              "Civic Assets",
            ].map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[#1B1A18]/80 border border-[#2C2A25]/90 text-[#8D918F] font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Technical Workflow Strip */}
        <div className="relative z-10 pt-4 border-t border-[#2C2A25]/70 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-[#8D918F]">
          <span className="text-[#F4B52C] font-semibold">WORKFLOW:</span>
          <span>REPORT</span>
          <span className="text-[#F4B52C]">→</span>
          <span>UNDERSTAND</span>
          <span className="text-[#F4B52C]">→</span>
          <span>PRIORITIZE</span>
          <span className="text-[#F4B52C]">→</span>
          <span>ACT</span>
          <span className="text-[#F4B52C]">→</span>
          <span>VERIFY</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center p-6 sm:p-10 lg:p-12 bg-[#151718]/95 relative z-10">
        {/* Top Header & Brand */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-2 group focus-ring rounded">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F4B52C] pulse-dot" />
            <span className="font-semibold tracking-tight text-[15px] text-[#F3F0E8]">
              INFRA<span className="text-[#F4B52C]">SENSE</span>
            </span>
          </Link>
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#8D918F] bg-[#1C1F21] px-2.5 py-1 rounded border border-[#2C2A25]">
            Secure Access
          </span>
        </div>

        <div className="mb-6">
          <h1 className="display-xl text-[22px] sm:text-[26px] font-bold text-[#F3F0E8]">
            {portal === "citizen" ? "Citizen Portal Sign In" : "Authority Portal Sign In"}
          </h1>
          <p className="text-[13px] text-[#8D918F] mt-1.5 leading-relaxed">
            {portal === "citizen"
              ? "Sign in to report civic problems, submit photos, and track resolution status in real time."
              : "Sign in with municipal credentials to monitor incoming issues, review AI analysis, and dispatch work orders."}
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25] mb-5">
          <button
            type="button"
            onClick={() => {
              setPortal("citizen");
              setError(null);
              router.replace("/login?role=citizen", { scroll: false });
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 text-[12.5px] font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              portal === "citizen"
                ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 shadow-sm font-semibold"
                : "text-[#8D918F] hover:text-[#F3F0E8] hover:bg-[#181A1B]"
            }`}
          >
            <User
              size={14}
              className={portal === "citizen" ? "text-[#F4B52C]" : "text-[#8D918F]"}
            />
            <span>Citizen Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPortal("authority");
              setError(null);
              router.replace("/login?role=authority", { scroll: false });
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 text-[12.5px] font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              portal === "authority"
                ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 shadow-sm font-semibold"
                : "text-[#8D918F] hover:text-[#F3F0E8] hover:bg-[#181A1B]"
            }`}
          >
            <Building2
              size={14}
              className={portal === "authority" ? "text-[#F4B52C]" : "text-[#8D918F]"}
            />
            <span>Authority Sign In</span>
          </button>
        </div>

        {/* Form Body */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#B23A2C]/15 border border-[#B23A2C]/40 text-[#F4F1E8] text-[12.5px] animate-fade-in"
              role="alert"
            >
              <AlertCircle size={16} className="text-[#D9694F] shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed text-[#F4F1E8]">{error}</div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#A7A39A] mb-1.5 flex items-center justify-between">
              <span>{portal === "citizen" ? "Email Address" : "Municipal Work Email"}</span>
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D918F] pointer-events-none"
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring w-full rounded-xl bg-[#1C1F21] border border-[#2C2A25] pl-10 pr-3.5 py-2.5 text-[13.5px] text-[#F3F0E8] placeholder:text-[#6F6B63] focus:border-[#F4B52C] transition-colors"
                placeholder={
                  portal === "citizen" ? "citizen@example.com" : "officer@municipality.gov"
                }
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#A7A39A] mb-1.5 flex items-center justify-between">
              <span>Password</span>
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D918F] pointer-events-none"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring w-full rounded-xl bg-[#1C1F21] border border-[#2C2A25] pl-10 pr-10 py-2.5 text-[13.5px] text-[#F3F0E8] placeholder:text-[#6F6B63] focus:border-[#F4B52C] transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D918F] hover:text-[#F3F0E8] transition-colors focus-ring p-1 rounded cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-medium text-[13.5px] bg-[#F4B52C] text-[#0D0F10] hover:bg-[#e0a424] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer font-semibold mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#0D0F10]" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>
                  {portal === "citizen" ? "Sign In as Citizen" : "Access Command Center"}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer & Signup Switcher */}
        <div className="pt-5 border-t border-[#2C2A25] mt-5 text-center space-y-2.5">
          <p className="text-[12.5px] text-[#8D918F]">
            Don&apos;t have an account?{" "}
            <Link
              href={`/signup?role=${portal}`}
              className="focus-ring text-[#F4B52C] font-medium hover:underline hover:text-[#f8c454] transition-colors"
            >
              {portal === "citizen"
                ? "Create citizen account →"
                : "Create authority account →"}
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-mono text-[#6F6B63]">
            <ShieldCheck size={12} className="text-[#8D918F]" />
            <span>InfraSense Authentication Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-screen flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-[13px] font-mono text-[var(--text-muted)] flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
            <span>Loading InfraSense Portal…</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

