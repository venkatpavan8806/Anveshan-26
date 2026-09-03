import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export function Markdown({ content }: { content: string }) {
  const html = DOMPurify.sanitize(marked.parse(content, { async: false }) as string);
  return <div className="prose-anv" dangerouslySetInnerHTML={{ __html: html }} />;
}
