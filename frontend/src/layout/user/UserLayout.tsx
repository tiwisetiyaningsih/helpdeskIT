"use client";

import UserHeader from "@/layout/user/UserHeader";
import UserSidebar from "@/layout/user/UserSidebar";
import Backdrop from "@/layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";
import React from "react";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
  } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <UserSidebar />
      <Backdrop />

      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <UserHeader />

        <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}