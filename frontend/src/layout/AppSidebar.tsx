"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useSidebar } from "../context/SidebarContext";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
} from "../icons/index";

type SubItem = {
  name: string;
  path: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

const mainItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
  },
];

const masterDataItems: NavItem[] = [
  {
    icon: <EmployeeIcon />,
    name: "Data Employee",
    path: "/employees",
  },
  {
    icon: <UsersIcon />,
    name: "Manajemen User",
    path: "/users",
  },
  {
    icon: <RoleIcon />,
    name: "Manajemen Role",
    path: "/roles",
  },
];

const ticketItems: NavItem[] = [
  {
    icon: <IncomingTicketIcon />,
    name: "Ticket Masuk",
    path: "/tickets/incoming",
  },
  {
    icon: <TicketIcon />,
    name: "Semua Ticket",
    path: "/ticketing",
  },
  {
    icon: <ClockIcon />,
    name: "Monitoring SLA",
    path: "/tickets/sla",
  },
];

const reportItems: NavItem[] = [
  {
    icon: <ReportIcon />,
    name: "Rekap Ticket",
    path: "/reports/tickets",
  },
  {
    icon: <PerformanceIcon />,
    name: "Rekap Kinerja IT",
    path: "/reports/it-performance",
  },
];

const otherItems: NavItem[] = [
  {
    icon: <UserCircleIcon />,
    name: "Profil Saya",
    path: "/profile",
  },
];

type MenuType =
  | "main"
  | "master"
  | "ticket"
  | "report"
  | "other";

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
  } = useSidebar();

  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] =
    useState<{
      type: MenuType;
      index: number;
    } | null>(null);

  const [
    subMenuHeight,
    setSubMenuHeight,
  ] = useState<
    Record<string, number>
  >({});

  const subMenuRefs =
    useRef<
      Record<
        string,
        HTMLDivElement | null
      >
    >({});

  const isActive = useCallback(
    (path: string) => {
      if (path === "/dashboard") {
        return pathname === "/dashboard";
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

  const handleSubmenuToggle = (
    index: number,
    menuType: MenuType
  ) => {
    setOpenSubmenu(
      (previous) => {
        if (
          previous?.type ===
            menuType &&
          previous.index === index
        ) {
          return null;
        }

        return {
          type: menuType,
          index,
        };
      }
    );
  };

  const renderMenuItems = (
    items: NavItem[],
    menuType: MenuType
  ) => {
    return (
      <ul className="flex flex-col gap-2">
        {items.map(
          (nav, index) => {
            const submenuOpen =
              openSubmenu?.type ===
                menuType &&
              openSubmenu.index ===
                index;

            const submenuActive =
              nav.subItems?.some(
                (subItem) =>
                  isActive(
                    subItem.path
                  )
              ) || false;

            if (nav.subItems) {
              return (
                <li key={nav.name}>
                  <button
                    type="button"
                    onClick={() =>
                      handleSubmenuToggle(
                        index,
                        menuType
                      )
                    }
                    className={`menu-item group w-full cursor-pointer ${
                      submenuOpen ||
                      submenuActive
                        ? "menu-item-active"
                        : "menu-item-inactive"
                    } ${
                      !isExpanded &&
                      !isHovered &&
                      !isMobileOpen
                        ? "lg:justify-center"
                        : "lg:justify-start"
                    }`}
                  >
                    <span
                      className={
                        submenuOpen ||
                        submenuActive
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      }
                    >
                      {nav.icon}
                    </span>

                    {(isExpanded ||
                      isHovered ||
                      isMobileOpen) && (
                      <>
                        <span className="menu-item-text">
                          {nav.name}
                        </span>

                        <ChevronDownIcon
                          className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                            submenuOpen
                              ? "rotate-180 text-brand-500"
                              : ""
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {(isExpanded ||
                    isHovered ||
                    isMobileOpen) && (
                    <div
                      ref={(element) => {
                        subMenuRefs.current[
                          `${menuType}-${index}`
                        ] = element;
                      }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height:
                          submenuOpen
                            ? `${
                                subMenuHeight[
                                  `${menuType}-${index}`
                                ] || 0
                              }px`
                            : "0px",
                      }}
                    >
                      <ul className="ml-9 mt-2 space-y-1">
                        {nav.subItems.map(
                          (subItem) => (
                            <li
                              key={
                                subItem.name
                              }
                            >
                              <Link
                                href={
                                  subItem.path
                                }
                                className={`menu-dropdown-item ${
                                  isActive(
                                    subItem.path
                                  )
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                {
                                  subItem.name
                                }
                              </Link>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </li>
              );
            }

            if (!nav.path) {
              return null;
            }

            return (
              <li key={nav.name}>
                <Link
                  href={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path)
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  } ${
                    !isExpanded &&
                    !isHovered &&
                    !isMobileOpen
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  }`}
                >
                  <span
                    className={
                      isActive(nav.path)
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
          }
        )}
      </ul>
    );
  };

  useEffect(() => {
    const menuGroups: {
      type: MenuType;
      items: NavItem[];
    }[] = [
      {
        type: "main",
        items: mainItems,
      },
      {
        type: "master",
        items:
          masterDataItems,
      },
      {
        type: "ticket",
        items: ticketItems,
      },
      {
        type: "report",
        items: reportItems,
      },
      {
        type: "other",
        items: otherItems,
      },
    ];

    let matched = false;

    for (const group of menuGroups) {
      group.items.forEach(
        (nav, index) => {
          if (
            nav.subItems?.some(
              (subItem) =>
                isActive(
                  subItem.path
                )
            )
          ) {
            setOpenSubmenu({
              type: group.type,
              index,
            });

            matched = true;
          }
        }
      );
    }

    if (!matched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    if (!openSubmenu) {
      return;
    }

    const key =
      `${openSubmenu.type}-${openSubmenu.index}`;

    const element =
      subMenuRefs.current[key];

    if (!element) {
      return;
    }

    setSubMenuHeight(
      (previous) => ({
        ...previous,
        [key]:
          element.scrollHeight,
      })
    );
  }, [openSubmenu]);

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded ||
        isMobileOpen
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
          !isExpanded &&
          !isHovered
            ? "lg:justify-center"
            : "justify-start"
        }`}
      >
        <Link href="/dashboard">
          {isExpanded ||
          isHovered ||
          isMobileOpen ? (
            <>
              <Image
                className="block h-auto dark:hidden"
                src="/images/logo/logo.svg"
                alt="HelpDeskIT"
                width={150}
                height={40}
                priority
              />

              <Image
                className="hidden h-auto dark:block"
                src="/images/logo/logo-dark.svg"
                alt="HelpDeskIT"
                width={150}
                height={40}
                priority
              />
            </>
          ) : (
            <Image
              className="h-auto w-auto"
              src="/images/logo/logo-icon.svg"
              alt="HelpDeskIT"
              width={32}
              height={32}
              priority
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto pb-20 duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <MenuSection
              title="Menu"
              expanded={
                isExpanded ||
                isHovered ||
                isMobileOpen
              }
            >
              {renderMenuItems(
                mainItems,
                "main"
              )}
            </MenuSection>

            <MenuSection
              title="Master Data"
              expanded={
                isExpanded ||
                isHovered ||
                isMobileOpen
              }
            >
              {renderMenuItems(
                masterDataItems,
                "master"
              )}
            </MenuSection>

            <MenuSection
              title="Ticketing"
              expanded={
                isExpanded ||
                isHovered ||
                isMobileOpen
              }
            >
              {renderMenuItems(
                ticketItems,
                "ticket"
              )}
            </MenuSection>

            <MenuSection
              title="Laporan"
              expanded={
                isExpanded ||
                isHovered ||
                isMobileOpen
              }
            >
              {renderMenuItems(
                reportItems,
                "report"
              )}
            </MenuSection>

            <MenuSection
              title="Lainnya"
              expanded={
                isExpanded ||
                isHovered ||
                isMobileOpen
              }
            >
              {renderMenuItems(
                otherItems,
                "other"
              )}
            </MenuSection>
          </div>
        </nav>
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
        className={`mb-3 flex text-xs uppercase leading-5 text-gray-400 ${
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

function EmployeeIcon() {
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
        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584m11.022-3.894A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      />
    </svg>
  );
}

function UsersIcon() {
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
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128A6.375 6.375 0 0 0 2.25 19.125 12.318 12.318 0 0 0 8.624 21c2.331 0 4.512-.645 6.376-1.766M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}

function RoleIcon() {
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
        d="M9 12.75 11.25 15 15 9.75m5.25 2.25c0 4.97-3.58 8.842-8.25 9.75C7.33 20.842 3.75 16.97 3.75 12V5.25L12 2.25l8.25 3V12Z"
      />
    </svg>
  );
}

function IncomingTicketIcon() {
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
        d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M5.25 18.75h13.5"
      />
    </svg>
  );
}

function TicketIcon() {
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
        d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5V12l3 2"
      />
    </svg>
  );
}

function ReportIcon() {
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
        d="M7.5 3.75h9A2.25 2.25 0 0 1 18.75 6v12A2.25 2.25 0 0 1 16.5 20.25h-9A2.25 2.25 0 0 1 5.25 18V6A2.25 2.25 0 0 1 7.5 3.75Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5"
      />
    </svg>
  );
}

function PerformanceIcon() {
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
        d="M4.5 19.5V14.25m5 5.25V9.75m5 9.75V6m5 13.5V3.75"
      />
    </svg>
  );
}

export default AppSidebar;