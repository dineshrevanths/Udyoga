import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const getMarkdownText = () => {
    const rawMarkup = marked.parse(content || '');
    return { __html: rawMarkup };
  };

  return (
    <div 
      className={`prose prose-sm max-w-none text-inherit ${className} [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-2 [&>strong]:font-bold`} 
      dangerouslySetInnerHTML={getMarkdownText()} 
    />
  );
};