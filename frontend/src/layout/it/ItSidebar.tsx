"use client";

import { useSidebar } from "@/context/SidebarContext";
import {
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
} from "@/icons/index";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  exact?: boolean;
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/it-helpdesk/dashboard",
    exact: true,
  },
  {
    icon: <AnalysisIcon />,
    name: "Analisis",
    path: "/it-helpdesk/analysis",
  },
  {
    icon: <WorkIcon />,
    name: "Daily Work",
    path: "/it-helpdesk/daily-work",
  },
  {
    icon: <HistoryIcon />,
    name: "Riwayat Ticket",
    path: "/it-helpdesk/history",
  },
];

const otherItems: NavItem[] = [
  {
    icon: <UserCircleIcon />,
    name: "Profil Saya",
    path: "/it-helpdesk/profile",
  },
];

const ItSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleMobileSidebar,
  } = useSidebar();

  const pathname = usePathname();

  const isActive = useCallback(
    (nav: NavItem) => {
      if (nav.exact) {
        return pathname === nav.path;
      }

      return (
        pathname === nav.path ||
        pathname.startsWith(`${nav.path}/`)
      );
    },
    [pathname]
  );

  const handleNavigation = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024 &&
      isMobileOpen
    ) {
      toggleMobileSidebar();
    }
  };

  const renderMenuItems = (
    items: NavItem[]
  ) => (
    <ul className="flex flex-col gap-2">
      {items.map((nav) => {
        const active = isActive(nav);

        return (
          <li key={nav.name}>
            <Link
              href={nav.path}
              onClick={handleNavigation}
              className={`menu-item group ${
                active
                  ? "menu-item-active"
                  : "menu-item-inactive"
              }`}
            >
              <span
                className={
                  active
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }
              >
                {nav.icon}
              </span>

              {(isExpanded ||
                isHovered ||
                isMobileOpen) && (
                <span className="menu-item-text">
                  {nav.name}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full"
      } lg:translate-x-0`}
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() =>
        setIsHovered(false)
      }
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered
            ? "lg:justify-center"
            : "justify-start"
        }`}
      >
        <Link
          href="/it-helpdesk/dashboard"
          onClick={handleNavigation}
        >
          {isExpanded ||
          isHovered ||
          isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Help Desk IT"
                width={150}
                height={40}
                priority
              />

              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Help Desk IT"
                width={150}
                height={40}
                priority
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Help Desk IT"
              width={32}
              height={32}
              priority
            />
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isExpanded &&
                  !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded ||
                isHovered ||
                isMobileOpen ? (
                  "Menu Utama"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>

              {renderMenuItems(navItems)}
            </div>

            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isExpanded &&
                  !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded ||
                isHovered ||
                isMobileOpen ? (
                  "Akun"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>

              {renderMenuItems(otherItems)}
            </div>
          </div>
        </nav>

        {(isExpanded ||
          isHovered ||
          isMobileOpen) && (
          <ItSidebarWidget />
        )}
      </div>
    </aside>
  );
};

export default ItSidebar;

function ItSidebarWidget() {
  return (
    <div></div>
    // <div className="mt-auto mb-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-500/20 dark:bg-brand-500/[0.06]">
    //   <div className="flex items-start gap-3">
    //     <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400">
    //       <HelpIcon />
    //     </div>

    //     <div>
    //       <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
    //         Alur kerja IT
    //       </p>

    //       <p className="mt-1 text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
    //         Analisis ticket baru, kerjakan di Daily Work, lalu cek riwayat ticket yang sudah selesai.
    //       </p>
    //     </div>
    //   </div>
    // </div>
  );
}

function AnalysisIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 19.5h15M6.75 16.5v-6h3v6h-3Zm5.25 0V6h3v10.5h-3Zm5.25 0v-3.75h3v3.75h-3Z"
      />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6.75h6M9 11.25h6m-6 4.5h3.75M6.75 3.75h10.5A1.5 1.5 0 0 1 18.75 5.25v13.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12a8.25 8.25 0 1 0 2.416-5.834L3.75 8.582M3.75 4.5v4.082h4.082M12 7.5V12l3 1.5"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 9a2.25 2.25 0 1 1 3.65 1.76c-.86.67-1.4 1.18-1.4 2.24M12 17h.01"
      />
    </svg>
  );
}