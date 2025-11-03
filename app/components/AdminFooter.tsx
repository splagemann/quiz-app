"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import packageJson from "@/package.json";

export function AdminFooter() {
  const t = useTranslations("admin");

  return (
    <footer className="mt-8 py-6">
      <div className="flex flex-row flex-wrap justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
        <Link
          href="/"
          className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Quiz App
        </Link>
        <span>•</span>
        <Link
          href="/admin/changelog"
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          v{packageJson.version}
        </Link>
        <span>•</span>
        <Link
          href="https://github.com/splagemann/quiz-app"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Made with ✨
        </Link>
      </div>
    </footer>
  );
}
