"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type LoggedInUser = {
  id?: number;
  email?: string;
  nama?: string;
  name?: string;
  role?: string;
};

export default function UserDropdown() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as LoggedInUser;

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  function toggleDropdown(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();
    setIsOpen((previous) => !previous);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    closeDropdown();
    router.replace("/signin");
  }

  const displayName =
    user?.nama ||
    user?.name ||
    "User";

  const displayEmail =
    user?.email ||
    "-";

  const displayRole =
    user?.role ||
    "User";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const profilePath =
    displayRole === "Employee"
      ? "/user/profile"
      : "/profile";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
          {initials || "U"}
        </span>

        <span className="mr-1 hidden max-w-[160px] truncate font-medium text-theme-sm sm:block">
          {displayName}
        </span>

        <svg
          className={`stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[280px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-2 py-1">
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-300">
            {displayName}
          </span>

          <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {displayEmail}
          </span>

          <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {displayRole}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pb-3 pt-4 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={profilePath}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="22"
                height="22"
                viewBox="0 0 24 24"
              >
                <path d="M12 12.5A4.25 4.25 0 1 0 12 4a4.25 4.25 0 0 0 0 8.5Zm0 1.5c-4.34 0-7.5 2.2-7.5 5.25 0 .41.34.75.75.75h13.5c.41 0 .75-.34.75-.75C19.5 16.2 16.34 14 12 14Z" />
              </svg>

              Profil Saya
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={profilePath}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="22"
                height="22"
                viewBox="0 0 24 24"
              >
                <path d="M12 2a2 2 0 0 1 2 2v.35a7.9 7.9 0 0 1 1.64.68l.25-.25a2 2 0 1 1 2.83 2.83l-.25.25c.3.52.53 1.07.68 1.64H19.5a2 2 0 1 1 0 4h-.35a7.9 7.9 0 0 1-.68 1.64l.25.25a2 2 0 1 1-2.83 2.83l-.25-.25a7.9 7.9 0 0 1-1.64.68V20a2 2 0 1 1-4 0v-.35a7.9 7.9 0 0 1-1.64-.68l-.25.25a2 2 0 1 1-2.83-2.83l.25-.25a7.9 7.9 0 0 1-.68-1.64H4.5a2 2 0 1 1 0-4h.35a7.9 7.9 0 0 1 .68-1.64l-.25-.25a2 2 0 1 1 2.83-2.83l.25.25A7.9 7.9 0 0 1 10 4.35V4a2 2 0 0 1 2-2Zm0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>

              Pengaturan Akun
            </DropdownItem>
          </li>
        </ul>

        <button
          type="button"
          onClick={handleLogout}
          className="group mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-gray-700 text-theme-sm transition hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"
        >
          <svg
            className="fill-gray-500 group-hover:fill-error-600 dark:fill-gray-400 dark:group-hover:fill-error-400"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path d="M15.1 19.25a.75.75 0 0 1 0-1.5h3.4a.75.75 0 0 0 .75-.75V5.5a.75.75 0 0 0-.75-.75h-3.4a.75.75 0 0 1 0-1.5h3.4a2.25 2.25 0 0 1 2.25 2.25V17a2.25 2.25 0 0 1-2.25 2.25h-3.4ZM10.53 7.47a.75.75 0 0 1 0 1.06L7.81 11.25H16a.75.75 0 0 1 0 1.5H7.81l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z" />
          </svg>

          Logout
        </button>
      </Dropdown>
    </div>
  );
}