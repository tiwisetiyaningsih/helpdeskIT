"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import AuthGuard from "@/components/auth/AuthGuard";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 xl:flex">
        <AppSidebar />
        <Backdrop />

        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <AppHeader />

          <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
            <div className="mx-auto max-w-(--breakpoint-2xl)">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}