"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-sm md:prose-base dark:prose-invert max-w-none ${className}`}
    >
      <ReactMarkdown
        components={{
          // Customize heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2" {...props} />
          ),
          // Customize paragraph styles
          p: ({ node, ...props }) => (
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />
          ),
          // Customize list styles
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-gray-700 dark:text-gray-300" {...props} />
          ),
          // Customize link styles
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Customize image styles
          img: ({ node, ...props }) => (
            <img
              className="max-w-full h-auto rounded-lg shadow-md my-4"
              {...props}
            />
          ),
          // Customize code blocks
          code: ({ node, inline, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-sm"
                  {...props}
                />
              );
            }
            return (
              <code
                className="block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto"
                {...props}
              />
            );
          },
          // Customize blockquote styles
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 my-4"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
