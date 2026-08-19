"use client";

import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const MINIMUM_COMPLAINT_LENGTH = 10;
const MAXIMUM_COMPLAINT_LENGTH = 2000;
const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

type EmployeeData = {
  id: number;
  nik: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jobTitle?: string | null;
  isActive?: boolean;
};

type UserRole =
  | string
  | {
      id?: number;
      name?: string;
    };

type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
  employee?: EmployeeData | null;
};

type MeResponse = {
  success?: boolean;
  message?: string;
  user?: AuthUser;
};

type CreatedTicket = {
  id: number;
  noPelaporan: string;
  status: string;
};

type CreateTicketResponse = {
  success?: boolean;
  message?: string;
  ticket?: CreatedTicket;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();
    console.error("Response backend bukan JSON:", responseText);
    throw new Error(
      "Backend tidak mengembalikan JSON. Periksa endpoint dan status backend."
    );
  }

  return response.json() as Promise<T>;
}

function getRoleName(role?: UserRole) {
  if (!role) return "";
  if (typeof role === "string") return role.trim();
  return String(role.name || "").trim();
}

function isEmployeeRole(role?: UserRole) {
  return ["EMPLOYEE", "USER", "KARYAWAN"].includes(
    getRoleName(role).toUpperCase()
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getPriorityInformation(position?: string) {
  const normalized = String(position || "").trim().toUpperCase();

  if (
    normalized.includes("DIREKSI") ||
    normalized.includes("DIRECTOR")
  ) {
    return {
      value: 1,
      label: "Sangat Tinggi",
      source: "Direksi",
      className:
        "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
    };
  }

  if (
    normalized.includes("VP") ||
    normalized.includes("EVP") ||
    normalized.includes("VICE PRESIDENT")
  ) {
    return {
      value: 2,
      label: "Tinggi",
      source: "VP/EVP",
      className:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    };
  }

  if (normalized.includes("MANAGER")) {
    return {
      value: 3,
      label: "Sedang",
      source: "Manager",
      className:
        "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
    };
  }

  return {
    value: 4,
    label: "Rendah",
    source: "Staff",
    className:
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  };
}

export default function TicketCreate() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [keluhan, setKeluhan] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const getCurrentUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/signin");
        return;
      }

      try {
        setIsLoadingUser(true);
        setError("");

        const response = await apiFetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = await parseJsonResponse<MeResponse>(response);

        if (!response.ok || data.success === false || !data.user) {
          throw new Error(data.message || "Gagal mengambil data pengguna.");
        }

        if (!isEmployeeRole(data.user.role)) {
          router.replace("/dashboard");
          return;
        }

        if (!data.user.employee) {
          throw new Error(
            "Akun Anda belum terhubung dengan data employee."
          );
        }

        if (data.user.employee.isActive === false) {
          throw new Error("Data employee sedang tidak aktif.");
        }

        setUser(data.user);
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Terjadi kesalahan saat mengambil data pengguna."
        );
      } finally {
        setIsLoadingUser(false);
      }
    };

    void getCurrentUser();
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [previewUrl]);

  function resetPreviewUrl() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  function validateAndSetFile(selectedFile?: File) {
    setError("");
    setSuccess("");
    resetPreviewUrl();

    if (!selectedFile) {
      setEvidence(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      setError("Lampiran hanya boleh berupa JPG, PNG, WEBP, atau PDF.");
      setEvidence(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFile.size > MAXIMUM_FILE_SIZE) {
      setError("Ukuran lampiran maksimal 5 MB.");
      setEvidence(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setEvidence(selectedFile);

    if (selectedFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  }

  function handleEvidenceChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndSetFile(event.target.files?.[0]);
  }

  function removeEvidence() {
    setEvidence(null);
    resetPreviewUrl();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!user?.employee) {
      setError("Data employee tidak tersedia.");
      return;
    }

    const normalizedKeluhan = keluhan.trim();

    if (!normalizedKeluhan) {
      setError("Deskripsi keluhan wajib diisi.");
      return;
    }

    if (normalizedKeluhan.length < MINIMUM_COMPLAINT_LENGTH) {
      setError(
        `Deskripsi keluhan minimal ${MINIMUM_COMPLAINT_LENGTH} karakter.`
      );
      return;
    }

    if (normalizedKeluhan.length > MAXIMUM_COMPLAINT_LENGTH) {
      setError(
        `Deskripsi keluhan maksimal ${MAXIMUM_COMPLAINT_LENGTH} karakter.`
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/signin");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("keluhan", normalizedKeluhan);

      if (evidence) {
        formData.append("evidence", evidence);
      }

      const response = await apiFetch(`${API_URL}/tickets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await parseJsonResponse<CreateTicketResponse>(response);

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Keluhan gagal dikirim.");
      }

      if (!data.ticket) {
        throw new Error("Backend tidak mengembalikan data ticket.");
      }

      setSuccess(
        data.message ||
          `Keluhan ${data.ticket.noPelaporan} berhasil dikirim dan menunggu penugasan admin.`
      );

      setKeluhan("");
      removeEvidence();

      redirectTimeoutRef.current = setTimeout(() => {
        router.push("/user/tickets");
      }, 1200);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kesalahan saat mengirim keluhan."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingUser) {
    return <LoadingState />;
  }

  const employee = user?.employee;
  const priority = getPriorityInformation(employee?.jabatan);
  const characterCount = keluhan.length;

  const isDescriptionValid =
    keluhan.trim().length >= MINIMUM_COMPLAINT_LENGTH &&
    keluhan.trim().length <= MAXIMUM_COMPLAINT_LENGTH;

  const initial =
    String(employee?.nama || "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  return (
    <div className="pb-8">
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
      >
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-gray-100 px-6 py-6 dark:border-gray-800 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90 sm:text-3xl">
              Buat Keluhan IT
            </h1>

            <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
              Jelaskan kendala yang Anda alami. Keluhan akan masuk ke admin
              terlebih dahulu untuk dikategorikan dan ditugaskan kepada tim IT.
            </p>
          </div>

          {/* <Link
            href="/user/tickets"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <HistoryIcon />
            Riwayat Keluhan
          </Link> */}
        </div>

        {/* Alur */}
        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="overflow-x-auto">
            <div className="flex min-w-[760px] items-center">
              <StatusStep
                number={1}
                label="Masuk"
                description="Menunggu admin"
                active
              />
              <StepLine />
              <StatusStep
                number={2}
                label="Open"
                description="IT ditugaskan"
              />
              <StepLine />
              <StatusStep
                number={3}
                label="On Going"
                description="Sedang dikerjakan"
              />
              <StepLine />
              <StatusStep
                number={4}
                label="Completed"
                description="Selesai"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="px-6 pt-5">
            <AlertMessage type="error" message={error} />
          </div>
        )}

        {success && (
          <div className="px-6 pt-5">
            <AlertMessage type="success" message={success} />
          </div>
        )}

        {/* Konten utama */}
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[330px_1fr]">
          {/* Data pelapor */}
          <aside className="border-b border-gray-100 p-6 dark:border-gray-800 xl:border-b-0 xl:border-r">
            <SectionTitle
              icon={<UserIcon />}
              title="Data Pelapor"
              subtitle="Data diambil otomatis dari akun Anda"
              iconClass="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
            />

            <div className="mt-5 rounded-xl bg-brand-50/70 p-4 dark:bg-brand-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-bold text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400">
                  {initial}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-theme-sm font-bold text-gray-800 dark:text-white/90">
                    {employee?.nama || "-"}
                  </p>
                  <p className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                    {user?.email || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <InformationItem label="NIK" value={employee?.nik || "-"} />
              <InformationItem
                label="Jabatan"
                value={employee?.jabatan || "-"}
              />
              <InformationItem
                label="Job Title"
                value={employee?.jobTitle || "-"}
              />
              <InformationItem
                label="Unit Kerja"
                value={employee?.unitKerja || "-"}
              />
            </div>

            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Priority otomatis
              </p>

              <div className="mt-2 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${priority.className}`}
                >
                  {priority.source}
                </span>

                <span className="text-right text-theme-xs text-gray-500 dark:text-gray-400">
                  {priority.label}
                </span>
              </div>
            </div>
          </aside>

          {/* Form keluhan */}
          <main className="p-6">
            <SectionTitle
              icon={<ComplaintIcon />}
              title="Informasi Keluhan"
              subtitle="Berikan keterangan kendala secara jelas"
              iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
            />

            <div className="mt-6 space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="keluhan"
                    className="text-theme-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Deskripsi Keluhan
                    <span className="ml-1 text-error-500">*</span>
                  </label>

                  <span
                    className={`text-theme-xs ${
                      characterCount > MAXIMUM_COMPLAINT_LENGTH
                        ? "text-error-500"
                        : "text-gray-400"
                    }`}
                  >
                    {characterCount} / {MAXIMUM_COMPLAINT_LENGTH}
                  </span>
                </div>

                <textarea
                  id="keluhan"
                  name="keluhan"
                  value={keluhan}
                  onChange={(event) => setKeluhan(event.target.value)}
                  placeholder="Tuliskan secara detail kendala yang Anda alami..."
                  disabled={isSubmitting}
                  rows={6}
                  minLength={MINIMUM_COMPLAINT_LENGTH}
                  maxLength={MAXIMUM_COMPLAINT_LENGTH}
                  required
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-theme-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />

                <p className="mt-2 text-theme-xs text-gray-400">
                  Minimal {MINIMUM_COMPLAINT_LENGTH} karakter. Sertakan kondisi,
                  pesan error, dan upaya yang sudah dilakukan.
                </p>
              </div>

              <div>
                <label
                  htmlFor="evidence"
                  className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Evidence atau Lampiran
                  <span className="ml-2 text-theme-xs font-normal text-gray-400">
                    (Opsional)
                  </span>
                </label>

                {!evidence ? (
                  <label
                    htmlFor="evidence"
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      validateAndSetFile(event.dataTransfer.files?.[0]);
                    }}
                    className={`flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                      isDragging
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900"
                    } ${isSubmitting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      <UploadIcon />
                    </div>

                    <p className="mt-3 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                      Klik untuk memilih file atau drag & drop
                    </p>

                    <p className="mt-1 text-theme-xs text-gray-400">
                      JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.
                    </p>
                  </label>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                    {previewUrl ? (
                      <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt={`Preview ${evidence.name}`}
                          className="mx-auto max-h-64 w-full rounded-xl object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <div className="text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
                            <PdfIcon />
                          </div>
                          <p className="mt-3 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                            Dokumen PDF
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                          {evidence.name}
                        </p>
                        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(evidence.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeEvidence}
                        disabled={isSubmitting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error-200 bg-white px-4 text-theme-xs font-semibold text-error-600 transition hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:bg-gray-800 dark:text-error-400"
                      >
                        <TrashIcon />
                        Hapus File
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  id="evidence"
                  name="evidence"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleEvidenceChange}
                  disabled={isSubmitting}
                  className="hidden"
                />
              </div>

              <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400">
                    <InformationIcon />
                  </div>

                  <div>
                    <p className="text-theme-sm font-semibold text-brand-700 dark:text-brand-300">
                      Data yang ditentukan otomatis
                    </p>

                    <p className="mt-1 text-theme-xs leading-5 text-brand-600/80 dark:text-brand-300/80">
                      Nomor pelaporan, waktu keluhan, priority, data pelapor,
                      dan status awal <strong>MASUK</strong> akan ditentukan
                      oleh sistem dan dapat dilihat pada Riwayat Keluhan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:justify-end">
          <Link
            href="/user/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={
              isSubmitting || !isDescriptionValid || !user?.employee
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Mengirim Keluhan...
              </>
            ) : (
              <>
                <SendIcon />
                Kirim Keluhan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
  iconClass,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h2>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function StatusStep({
  number,
  label,
  description,
  active = false,
}: {
  number: number;
  label: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-[120px] shrink-0 items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-theme-sm font-bold ${
          active
            ? "bg-brand-500 text-white"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        {number}
      </div>

      <div>
        <p
          className={`text-theme-xs font-semibold ${
            active
              ? "text-brand-600 dark:text-brand-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {label}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function StepLine() {
  return (
    <div className="mx-4 h-px min-w-10 flex-1 bg-gray-200 dark:bg-gray-800" />
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="mt-1 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function AlertMessage({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const isSuccess = type === "success";

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isSuccess
          ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
          : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
      }`}
    >
      <p className="text-theme-sm font-medium leading-6">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat data pelapor...
      </p>
    </div>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.708M3 4.5v4.875h4.875M12 7.5V12l3 2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.933 17.933 0 0 1 12 21.75a17.933 17.933 0 0 1-7.5-1.632Z" />
    </svg>
  );
}

function ComplaintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75h6.75m-6.75 3.75h4.5M21 12a8.25 8.25 0 0 1-8.25 8.25 8.415 8.415 0 0 1-3.792-.901L3 21l1.651-5.958A8.415 8.415 0 0 1 3.75 11.25 8.25 8.25 0 0 1 12 3a8.25 8.25 0 0 1 9 9Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3.75m0 0 4.5 4.5M12 3.75l-4.5 4.5M3.75 15v3.375A1.875 1.875 0 0 0 5.625 20.25h12.75a1.875 1.875 0 0 0 1.875-1.875V15" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V6.75L13.5 2.25Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-1.327L4.772 5.79" />
    </svg>
  );
}

function InformationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 10.5v6m0-9h.008v.008H12V7.5Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L6 12Zm0 0h7.5" />
    </svg>
  );
}