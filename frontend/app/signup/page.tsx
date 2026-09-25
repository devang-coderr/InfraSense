"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { User, Building2, AlertCircle } from "lucide-react";
import { register } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const DEPARTMENTS = [
  "Roads",
  "Electrical",
  "Sanitation",
  "Water",
  "Traffic",
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const [portal, setPortal] = useState<"citizen" | "authority">(
    roleParam === "authority" ? "authority" : "citizen"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Roads");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "authority") {
      setPortal("authority");
      setError(null);
    } else if (r === "citizen") {
      setPortal("citizen");
      setError(null);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const user = await register(
        trimmedName,
        email.trim(),
        password,
        portal === "citizen" ? "citizen" : "officer",
        portal === "authority" ? department : undefined
      );
      router.push(user.role === "citizen" ? "/citizen" : "/authority");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not create your account. Please check your details and network.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <span className="font-semibold tracking-tight text-[16px] text-[var(--text)]">
          INFRA<span className="text-[var(--accent)]">SENSE</span>
        </span>
        <div className="eyebrow mt-4 mb-1">
          {portal === "citizen" ? "Create Citizen Account" : "Create Authority Account"}
        </div>
        <h1 className="display-xl text-[24px] text-[var(--text)]">Join InfraSense.</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          {portal === "citizen"
            ? "Create an account to report civic issues and receive live status updates."
            : "Register as a municipal authority officer or department administrator."}
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] mb-5">
        <button
          type="button"
          onClick={() => {
            setPortal("citizen");
            setError(null);
            router.replace("/signup?role=citizen", { scroll: false });
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
          <span>Citizen Sign Up</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPortal("authority");
            setError(null);
            router.replace("/signup?role=authority", { scroll: false });
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
          <span>Authority Sign Up</span>
        </button>
      </div>

      <form className="card-surface p-6 space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl bg-[#B23A2C]/15 border border-[#B23A2C]/40 text-[#F4F1E8] text-[12.5px]"
            role="alert"
          >
            <AlertCircle size={16} className="text-[#D9694F] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
            Full name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px]"
            placeholder={portal === "citizen" ? "Jane Doe" : "Officer Sharma"}
          />
        </div>

        {portal === "authority" && (
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px] text-[var(--text)] cursor-pointer"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d} Department
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
            {portal === "citizen" ? "Email address" : "Work email"}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px]"
            placeholder={portal === "citizen" ? "citizen@example.com" : "officer@municipality.gov"}
          />
        </div>

        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
            Password (min 8 characters)
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px]"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading
            ? "Creating account…"
            : portal === "citizen"
            ? "Create Citizen Account"
            : "Create Authority Account"}
        </Button>
      </form>

      <p className="text-center text-[12.5px] text-[var(--text-muted)] mt-6">
        Already have an account?{" "}
        <Link
          href={`/login?role=${portal}`}
          className="focus-ring text-[var(--accent)] font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="pt-28 pb-24 container-px min-h-screen flex items-start justify-center">
      <Suspense fallback={<div className="text-[13px] text-[var(--text-muted)]">Loading signup…</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
