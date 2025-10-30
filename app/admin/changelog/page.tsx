import { getTranslations } from 'next-intl/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BackButton } from "@/app/components/BackButton";

export const dynamic = 'force-dynamic';

export default async function ChangelogPage() {
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  // Read CHANGELOG.md file
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelogContent = await fs.readFile(changelogPath, 'utf-8');

  // Simple markdown parsing for display
  const lines = changelogContent.split('\n');
  const parsedContent: JSX.Element[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('# ')) {
      parsedContent.push(
        <h1 key={index} className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6 mt-8">
          {line.replace('# ', '')}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      parsedContent.push(
        <h2 key={index} className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4 mt-8 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      parsedContent.push(
        <h3 key={index} className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('- ')) {
      parsedContent.push(
        <li key={index} className="text-gray-700 dark:text-gray-300 ml-6 mb-2">
          {line.replace('- ', '')}
        </li>
      );
    } else if (line.startsWith('  - ')) {
      parsedContent.push(
        <li key={index} className="text-gray-700 dark:text-gray-300 ml-12 mb-1">
          {line.replace('  - ', '')}
        </li>
      );
    } else if (line.trim().startsWith('[')) {
      // Parse markdown links
      const linkMatch = line.match(/\[(.*?)\]: (.*)/);
      if (linkMatch) {
        parsedContent.push(
          <p key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            <a href={linkMatch[2]} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              [{linkMatch[1]}]
            </a>
          </p>
        );
      } else {
        parsedContent.push(
          <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">
            {line}
          </p>
        );
      }
    } else if (line.trim() === '') {
      parsedContent.push(<div key={index} className="h-2" />);
    } else if (!line.startsWith('#')) {
      parsedContent.push(
        <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">
          {line}
        </p>
      );
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <BackButton className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-gray-700 dark:text-gray-200"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </BackButton>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('changelog')}</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-8">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {parsedContent}
          </div>
        </div>

      </div>
    </div>
  );
}
