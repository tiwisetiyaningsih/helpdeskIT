"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/context/SidebarContext";
import {
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
} from "@/icons/index";

import UserSidebarWidget from "./UserSidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/user/dashboard",
  },
  {
    icon: <CreateTicketIcon />,
    name: "Buat Keluhan",
    path: "/user/tickets/create",
  },
  {
    icon: <TicketHistoryIcon />,
    name: "Riwayat Keluhan",
    path: "/user/tickets",
  },
];

const accountItems: NavItem[] = [
  {
    icon: <UserCircleIcon />,
    name: "Profil Saya",
    path: "/user/profile",
  },
];

const UserSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
  } = useSidebar();

  const pathname = usePathname();

  const sidebarExpanded =
    isExpanded ||
    isHovered ||
    isMobileOpen;

  const isActive = useCallback(
    (path: string) => {
      if (path === "/user/dashboard") {
        return pathname === path;
      }

      if (path === "/user/tickets/create") {
        return pathname === path;
      }

      if (path === "/user/tickets") {
        return (
          pathname === "/user/tickets" ||
          (
            pathname.startsWith(
              "/user/tickets/"
            ) &&
            pathname !==
              "/user/tickets/create"
          )
        );
      }

      return (
        pathname === path ||
        pathname.startsWith(
          `${path}/`
        )
      );
    },
    [pathname]
  );

  const renderMenuItems = (
    items: NavItem[]
  ) => {
    return (
      <ul className="flex flex-col gap-1.5">
        {items.map((nav) => {
          const active =
            isActive(nav.path);

          return (
            <li key={nav.name}>
              <Link
                href={nav.path}
                className={`menu-item group ${
                  active
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } ${
                  !sidebarExpanded
                    ? "lg:justify-center"
                    : "lg:justify-start"
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

                {sidebarExpanded && (
                  <span className="menu-item-text text-sm">
                    {nav.name}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

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
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <div
        className={`flex py-6 ${
          !isExpanded && !isHovered
            ? "lg:justify-center"
            : "justify-start"
        }`}
      >
        <Link
          href="/user/dashboard"
          className="inline-flex items-center"
        >
          {sidebarExpanded ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="HelpDeskIT"
                width={135}
                height={36}
                priority
              />

              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="HelpDeskIT"
                width={135}
                height={36}
                priority
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="HelpDeskIT"
              width={30}
              height={30}
              priority
            />
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pb-20 duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            <MenuSection
              title="Menu"
              expanded={
                sidebarExpanded
              }
            >
              {renderMenuItems(
                navItems
              )}
            </MenuSection>

            <MenuSection
              title="Akun"
              expanded={
                sidebarExpanded
              }
            >
              {renderMenuItems(
                accountItems
              )}
            </MenuSection>
          </div>
        </nav>

        {sidebarExpanded && (
          <div className="mt-auto">
            <UserSidebarWidget />
          </div>
        )}
      </div>
    </aside>
  );
};

function MenuSection({
  title,
  expanded,
  children,
}: {
  title: string;
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2
        className={`mb-2.5 flex text-[11px] font-medium uppercase leading-5 tracking-wide text-gray-400 ${
          expanded
            ? "justify-start"
            : "lg:justify-center"
        }`}
      >
        {expanded ? (
          title
        ) : (
          <HorizontaLDots />
        )}
      </h2>

      {children}
    </div>
  );
}

function CreateTicketIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function TicketHistoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
      />
    </svg>
  );
}

export default UserSidebar;