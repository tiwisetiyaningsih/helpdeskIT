import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Profil Pengguna | Help Desk IT",
  description: "Halaman profil pengguna sistem Help Desk IT",
};

export default function Profile() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white lg:mb-7">
          Profil Pengguna
        </h3>

        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
        </div>
      </div>
    </div>
  );
}