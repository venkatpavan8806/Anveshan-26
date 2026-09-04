import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// sanitize-html is pure JS (no jsdom/canvas) — isomorphic-dompurify needs
// jsdom, which crashed with a 500 in Vercel's serverless Node runtime even
// though it worked fine locally.
export function Markdown({ content }: { content: string }) {
  const rawHtml = marked.parse(content, { async: false }) as string;
  const html = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt"],
    },
  });
  // eslint-disable-next-line react/no-danger
  return <div className="prose-anv" dangerouslySetInnerHTML={{ __html: html }} />;
}
