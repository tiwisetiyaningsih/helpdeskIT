"use client";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type UserRole = "Admin" | "Employee" | "IT HelpDesk";

type LoginUser = {
  id: number;
  email: string;
  nama: string;
  role: UserRole | string;
};

type LoginResponse = {
  success?: boolean;
  token?: string;
  message?: string;
  user?: LoginUser;
};

function getDashboardPath(role?: string) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  if (normalizedRole === "employee") {
    return "/user/dashboard";
  }

  if (
    normalizedRole === "it helpdesk" ||
    normalizedRole === "it-helpdesk" ||
    normalizedRole === "it_helpdesk"
  ) {
    return "/it-helpdesk/dashboard";
  }

  if (normalizedRole === "admin" || normalizedRole === "administrator") {
    return "/dashboard";
  }

  return "/signin";
}

export default function SignInForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-login kalau sesi masih tersimpan — TAPI diverifikasi dulu ke
  // server (bukan asal percaya localStorage).
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      return;
    }

    let cancelled = false;

    (async () => {
      let currentUser: LoginUser;

      try {
        currentUser = JSON.parse(storedUser) as LoginUser;
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return;
      }

      const dashboardPath = getDashboardPath(currentUser.role);

      if (dashboardPath === "/signin") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          credentials: "include",
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          return;
        }

        router.replace(dashboardPath);
      } catch {
        if (!cancelled) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const expiredMessage = sessionStorage.getItem("sessionExpiredMessage");

    if (expiredMessage) {
      setError(expiredMessage);
      sessionStorage.removeItem("sessionExpiredMessage");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();
        console.error("Response login bukan JSON:", responseText);
        throw new Error("Backend tidak mengembalikan JSON.");
      }

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Email atau password salah.");
      }

      if (!data.token) {
        throw new Error("Token tidak ditemukan dari server.");
      }

      if (!data.user) {
        throw new Error("Data pengguna tidak ditemukan dari server.");
      }

      const dashboardPath = getDashboardPath(data.user.role);

      if (dashboardPath === "/signin") {
        throw new Error(
          `Role "${data.user.role}" belum memiliki akses dashboard.`
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess("Login berhasil. Mengarahkan ke dashboard...");

      setTimeout(() => {
        router.replace(dashboardPath);
      }, 700);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Terjadi kesalahan saat login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-gray-950">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes floatY {
          0%,
          100% {
            transform: translateY(0) rotate(-6deg);
          }
          50% {
            transform: translateY(-10px) rotate(-6deg);
          }
        }
        @keyframes blobPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.85;
          }
        }
        @keyframes drawLine {
          from {
            stroke-dashoffset: 240;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .fade-up {
          opacity: 0;
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .float-bubble {
          animation: floatY 3.6s ease-in-out infinite;
        }
        .blob-pulse {
          animation: blobPulse 7s ease-in-out infinite;
        }
        .draw-line {
          stroke-dasharray: 240;
          animation: drawLine 1.8s ease-out 0.5s forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-up,
          .float-bubble,
          .blob-pulse,
          .draw-line {
            animation: none !important;
            opacity: 1 !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      {/* ================= LEFT: FORM ================= */}
      <div className="relative flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[46%] lg:px-16 xl:px-20">
        {/* dot grid decoration */}
        <div
          className="pointer-events-none absolute right-8 top-10 hidden h-24 w-24 opacity-70 sm:block"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1.4px, transparent 1.4px)",
            backgroundSize: "10px 10px",
            color: "rgb(199 210 254)",
          }}
        />

        <div className="mx-auto w-full max-w-sm">
          {/* Logo asli project */}
          <div className="fade-up mb-9" style={{ animationDelay: "0s" }}>
            <Image
              src="/images/logo/auth-logo.svg"
              alt="HelpDesk IT"
              width={180}
              height={44}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>

          <h1
            className="fade-up text-[26px] font-semibold leading-snug tracking-tight text-gray-900 dark:text-white"
            style={{ animationDelay: "0.08s" }}
          >
            Selamat datang{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              kembali
            </span>
            ! 👋
          </h1>
          <p
            className="fade-up mt-2 text-sm text-gray-500 dark:text-gray-400"
            style={{ animationDelay: "0.14s" }}
          >
            Silakan login untuk melanjutkan ke sistem Help Desk IT
          </p>

          {error && (
            <div
              role="alert"
              className="fade-up mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.9" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="fade-up mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="fade-up mt-6 space-y-5"
            style={{ animationDelay: "0.2s" }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
                    <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m4 7 7.4 5.3a1 1 0 0 0 1.2 0L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <Input
                  id="email"
                  name="email"
                  placeholder="name@helpdesk.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading}
                  className="pl-10 transition-shadow duration-200 focus:shadow-md focus:shadow-indigo-500/10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
                    <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  className="pl-10 pr-11 transition-shadow duration-200 focus:shadow-md focus:shadow-indigo-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3.5 top-1/2 z-30 -translate-y-1/2 cursor-pointer text-gray-400 transition hover:scale-110 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeCloseIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full !rounded-xl !bg-gradient-to-r !from-indigo-600 !to-violet-600 !py-3 !font-medium !shadow-lg !shadow-indigo-600/25 transition-all duration-200 hover:!-translate-y-0.5 hover:!shadow-xl hover:!shadow-indigo-600/35 active:!translate-y-0 disabled:!opacity-60"
              size="sm"
              disabled={!mounted || loading || Boolean(success)}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                  </svg>
                  Memproses login...
                </span>
              ) : (
                <span className="group flex items-center justify-center gap-2">
                  Login
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </Button>
          </form>

          <p
            className="fade-up mt-7 text-center text-sm text-gray-500 dark:text-gray-400"
            style={{ animationDelay: "0.28s" }}
          >
            Belum memiliki akun?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* ================= RIGHT: SHOWCASE ================= */}
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-[#0b1030] via-[#141b4d] to-[#1c1f66] lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-20">
        {/* decorations */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="blob-pulse pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 blur-2xl" />
        <div
          className="blob-pulse pointer-events-none absolute bottom-0 left-0 h-72 w-72 -translate-x-1/3 translate-y-1/3 rounded-full bg-blue-500/20 blur-3xl"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="relative z-10 max-w-xl">
          <h2
            className="fade-up text-[34px] font-semibold leading-tight tracking-tight text-white xl:text-4xl"
            style={{ animationDelay: "0.1s" }}
          >
            Kelola tiket IT dengan lebih{" "}
            <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">
              cepat, mudah
            </span>{" "}
            &amp; terorganisir
          </h2>
          <p
            className="fade-up mt-4 max-w-md text-[15px] text-indigo-100/70"
            style={{ animationDelay: "0.18s" }}
          >
            Sistem Help Desk IT untuk memudahkan pelaporan, pemantauan, dan
            penyelesaian masalah IT di perusahaan.
          </p>

          {/* Dashboard mockup card */}
          <div
            className="fade-up group relative mt-9 rotate-1 rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-black/5 transition-transform duration-500 hover:rotate-0 xl:p-4"
            style={{ animationDelay: "0.28s" }}
          >
            <div className="flex gap-3">
              {/* mini sidebar */}
              <div className="hidden w-32 flex-col gap-1 border-r border-gray-100 pr-3 sm:flex">
                <div className="mb-2 flex items-center gap-1.5 px-1.5">
                  <Image
                    src="/images/logo/logo-icon.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded object-contain"
                  />
                  <span className="text-[10px] font-semibold text-gray-800">HelpDesk IT</span>
                </div>
                {[
                  { label: "Dashboard", active: true },
                  { label: "Tickets" },
                  { label: "SLA Monitoring" },
                  { label: "Users" },
                  { label: "Reports" },
                  { label: "Settings" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-md px-1.5 py-1 text-[9px] font-medium transition-colors ${item.active ? "bg-indigo-50 text-indigo-600" : "text-gray-400"
                      }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              {/* main preview */}
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-gray-800">
                  Selamat datang kembali, Admin!
                </p>
                <p className="text-[9px] text-gray-400">
                  Berikut ringkasan aktivitas sistem Help Desk IT.
                </p>

                <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Total Ticket", value: "128", trend: "↑ 12%", color: "text-blue-500" },
                    { label: "On Going", value: "45", trend: "↑ 8%", color: "text-amber-500" },
                    { label: "Pending", value: "18", trend: "↓ 5%", color: "text-red-500" },
                    { label: "Completed", value: "65", trend: "↑ 15%", color: "text-emerald-500" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-gray-100 p-1.5 transition-shadow duration-200 hover:shadow-sm"
                    >
                      <p className="text-[7.5px] text-gray-400">{stat.label}</p>
                      <p className="text-[13px] font-semibold text-gray-800">{stat.value}</p>
                      <p className={`text-[7px] font-medium ${stat.color}`}>{stat.trend} minggu lalu</p>
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  <div className="col-span-3 rounded-lg border border-gray-100 p-1.5">
                    <p className="text-[7.5px] font-medium text-gray-600">Statistik Ticket 7 Hari Terakhir</p>
                    <svg viewBox="0 0 160 46" className="mt-1 h-11 w-full">
                      <polyline
                        points="0,30 25,18 50,26 75,10 100,20 125,8 150,16"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="draw-line"
                      />
                      <polyline
                        points="0,38 25,34 50,36 75,28 100,32 125,24 150,28"
                        fill="none"
                        stroke="#c7d2fe"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="draw-line"
                        style={{ animationDelay: "0.7s" }}
                      />
                    </svg>
                  </div>
                  <div className="col-span-2 rounded-lg border border-gray-100 p-1.5">
                    <p className="text-[7.5px] font-medium text-gray-600">Ticket Terbaru</p>
                    <div className="mt-1 space-y-1">
                      {[
                        { id: "#HD-00128", status: "OPEN", color: "bg-amber-100 text-amber-600" },
                        { id: "#HD-00127", status: "ON GOING", color: "bg-blue-100 text-blue-600" },
                        { id: "#HD-00126", status: "DONE", color: "bg-emerald-100 text-emerald-600" },
                      ].map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between">
                          <span className="text-[7px] text-gray-500">{ticket.id}</span>
                          <span className={`rounded px-1 py-0.5 text-[6px] font-semibold ${ticket.color}`}>
                            {ticket.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* floating bubble pakai logo icon asli */}
            <div className="float-bubble absolute -bottom-5 -right-5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl shadow-xl">
              <Image
                src="/images/logo/logo-icon.svg"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 object-cover"
              />
            </div>
          </div>

          {/* feature row */}
          <div
            className="fade-up mt-11 grid grid-cols-2 gap-6"
            style={{ animationDelay: "0.45s" }}
          >
            {[
              {
                title: "Cepat",
                desc: "Respon lebih cepat, solusi lebih tepat",
                icon: (
                  <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                ),
              },
              {
                title: "Terpantau",
                desc: "Pantau status tiket secara real-time",
                icon: (
                  <path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                ),
              },
            ].map((feature) => (
              <div key={feature.title} className="group flex items-start gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-indigo-200 ring-1 ring-white/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
                    {feature.icon}
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-xs leading-snug text-indigo-100/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}