"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SearchableSelectProps = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
};

export default function SearchableSelect({
  label,
  value,
  options,
  placeholder = "Pilih data",
  searchPlaceholder = "Cari data...",
  searchable = false,
  disabled = false,
  required = false,
  error = "",
  onChange,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!searchable || !keyword) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(keyword)
    );
  }, [options, search, searchable]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, searchable]);

  function handleToggle() {
    if (disabled) return;

    setIsOpen((previous) => !previous);

    if (isOpen) {
      setSearch("");
    }
  }

  function handleSelect(option: string) {
    onChange(option);
    setIsOpen(false);
    setSearch("");
  }

  function handleClear(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    onChange("");
    setSearch("");
    setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}

        {required && (
          <span className="ml-1 text-error-500">*</span>
        )}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-4 text-left text-sm outline-none transition dark:bg-gray-900 ${
          error
            ? "border-error-500 focus:border-error-500"
            : isOpen
              ? "border-brand-500 ring-3 ring-brand-500/10"
              : "border-gray-300 focus:border-brand-500 dark:border-gray-700"
        } ${
          disabled
            ? "cursor-not-allowed bg-gray-100 opacity-60 dark:bg-gray-800"
            : ""
        }`}
      >
        <span
          title={value || placeholder}
          className={`min-w-0 flex-1 truncate ${
            value
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {value || placeholder}
        </span>

        <div className="ml-3 flex shrink-0 items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              aria-label={`Hapus pilihan ${label}`}
              onClick={handleClear}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M6.22 6.22a.75.75 0 0 1 1.06 0L10 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L11.06 10l2.72 2.72a.75.75 0 1 1-1.06 1.06L10 11.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L8.94 10 6.22 7.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          )}

          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-full z-[100] mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {searchable && (
            <div className="border-b border-gray-200 p-2 dark:border-gray-700">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                  />
                </svg>

                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                Data tidak ditemukan.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="break-words">
                      {option}
                    </span>

                    {isSelected && (
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mt-0.5 h-4 w-4 shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a.75.75 0 0 1 .006 1.06l-7.25 7.333a.75.75 0 0 1-1.067.004L3.29 8.583a.75.75 0 1 1 1.06-1.06l4.57 4.57 6.72-6.797a.75.75 0 0 1 1.064-.006Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-error-500">
          {error}
        </p>
      )}
    </div>
  );
}