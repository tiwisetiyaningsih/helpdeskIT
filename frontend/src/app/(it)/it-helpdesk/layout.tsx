"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { useSidebar } from "@/context/SidebarContext";
import Backdrop from "@/layout/Backdrop";
import ItHeader from "@/layout/it/ItHeader";
import ItSidebar from "@/layout/it/ItSidebar";

import React from "react";

export default function ItLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
  } = useSidebar();

  const mainContentMargin =
    isMobileOpen
      ? "ml-0"
      : isExpanded || isHovered
        ? "lg:ml-[290px]"
        : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 xl:flex">
        <ItSidebar />

        <Backdrop />

        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <ItHeader />

          <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
            <div className="mx-auto max-w-(--breakpoint-2xl)">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}