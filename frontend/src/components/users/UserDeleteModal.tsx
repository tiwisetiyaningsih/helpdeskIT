"use client";

import { User } from "@/services/user.service";

type UserDeleteModalProps = {
  user: User | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function UserDeleteModal({
  user,
  deleting,
  onClose,
  onConfirm,
}: UserDeleteModalProps) {
  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4"
      onClick={() => {
        if (!deleting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-7 w-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.052 3.38c.865-1.498 3.03-1.498 3.896 0l7.355 12.746ZM12 15.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Hapus User?
            </h2>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Kamu akan menghapus akun pengguna:
            </p>

            <div className="mt-3 w-full rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
                {user.employee?.nama ?? "-"}
              </p>

              <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>

            <p className="mt-4 text-sm text-error-600 dark:text-error-400">
              Data yang dihapus tidak dapat dikembalikan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}