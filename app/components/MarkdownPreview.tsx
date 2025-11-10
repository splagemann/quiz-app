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
      className={`prose prose-sm max-w-none bg-white overflow-x-hidden ${className}`}
      style={{ fontSize: '0.8rem', lineHeight: '1.4' }}
    >
      <ReactMarkdown
        components={{
          // Customize heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold text-gray-900 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold text-gray-900 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-bold text-gray-900 mb-1" {...props} />
          ),
          // Customize paragraph styles
          p: ({ node, ...props }) => (
            <p className="text-gray-900 mb-2 leading-relaxed" {...props} />
          ),
          // Customize list styles
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside text-gray-900 mb-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside text-gray-900 mb-2 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-gray-900" {...props} />
          ),
          // Customize link styles
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Customize image styles
          img: ({ node, ...props }) => (
            <img
              className="max-w-full md:max-w-2xl h-auto rounded-lg shadow-md my-2 mx-auto"
              {...props}
            />
          ),
          // Customize code blocks
          code: ({ node, inline, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-gray-100 text-gray-900 px-1 py-0.5 rounded text-xs"
                  {...props}
                />
              );
            }
            return (
              <code
                className="block bg-gray-100 text-gray-900 p-2 rounded-lg text-xs"
                {...props}
              />
            );
          },
          // Customize blockquote styles
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-3 italic text-gray-900 my-2"
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
