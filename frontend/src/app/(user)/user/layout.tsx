"use client";

import React from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { useSidebar } from "@/context/SidebarContext";
import Backdrop from "@/layout/Backdrop";
import UserHeader from "@/layout/user/UserHeader";
import UserSidebar from "@/layout/user/UserSidebar";

export default function UserLayout({
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
        <UserSidebar />
        <Backdrop />

        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <UserHeader />

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