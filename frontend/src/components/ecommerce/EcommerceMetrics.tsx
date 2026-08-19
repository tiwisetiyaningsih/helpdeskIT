"use client";

import React from "react";
import Badge from "../ui/badge/Badge";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  BoxIconLine,
  GroupIcon,
} from "@/icons";

export const EcommerceMetrics = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {/* Total Tiket */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
          <GroupIcon className="text-blue-600 size-6" />
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Tiket
            </p>

            <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              245
            </h3>
          </div>

          <Badge color="success">
            <ArrowUpIcon />
            +12%
          </Badge>
        </div>
      </div>

      {/* Tiket Open */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
          <BoxIconLine className="text-red-600 size-6" />
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tiket Open
            </p>

            <h3 className="mt-2 text-3xl font-bold text-red-500">
              18
            </h3>
          </div>

          <Badge color="error">
            <ArrowDownIcon />
            5%
          </Badge>
        </div>
      </div>

      {/* Diproses */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
          <BoxIconLine className="text-yellow-600 size-6" />
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Diproses
            </p>

            <h3 className="mt-2 text-3xl font-bold text-yellow-500">
              32
            </h3>
          </div>

          <Badge color="warning">
            13%
          </Badge>
        </div>
      </div>

      {/* Selesai */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
          <GroupIcon className="text-green-600 size-6" />
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Selesai
            </p>

            <h3 className="mt-2 text-3xl font-bold text-green-500">
              195
            </h3>
          </div>

          <Badge color="success">
            <ArrowUpIcon />
            18%
          </Badge>
        </div>
      </div>
    </div>
  );
};