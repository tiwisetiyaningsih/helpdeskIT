"use client";

import { apiFetch } from "@/lib/apiFetch";
import { useEffect, useState } from "react";


type EvidenceImageProps = {
  fileUrl: string;
  alt: string;
  className?: string;
  onClick?: () => void;
};

export default function EvidenceImage({
  fileUrl,
  alt,
  className,
  onClick,
}: EvidenceImageProps) {
  const [objectUrl, setObjectUrl] = useState<
    string | null
  >(null);

  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    let currentObjectUrl: string | null = null;
    let isCancelled = false;

    async function loadImage() {
      setStatus("loading");

      try {
        const response = await apiFetch(fileUrl);

        if (!response.ok) {
          throw new Error(
            "Gagal memuat evidence."
          );
        }

        const blob = await response.blob();

        currentObjectUrl =
          URL.createObjectURL(blob);

        if (!isCancelled) {
          setObjectUrl(currentObjectUrl);
          setStatus("ready");
        }
      } catch (error) {
        console.error(
          "LOAD EVIDENCE ERROR:",
          error
        );

        if (!isCancelled) {
          setStatus("error");
        }
      }
    }

    void loadImage();

    return () => {
      isCancelled = true;

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [fileUrl]);

  if (status === "loading") {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className || ""}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700" />
      </div>
    );
  }

  if (status === "error" || !objectUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-theme-xs text-gray-400 dark:bg-gray-800 ${className || ""}`}
      >
        Gagal memuat gambar
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      onClick={onClick}
      className={className}
    />
  );
}