// src/editor/adapters/contentAdapter.ts
// Shared transforms: keep these stable so integration later is trivial.

export function htmlToMarkdown(html: string): string {
  return (html || "")
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/g, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/g, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/g, "###### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n\n")
    .replace(/<ul[^>]*>/g, "")
    .replace(/<\/ul>/g, "\n")
    .replace(/<ol[^>]*>/g, "")
    .replace(/<\/ol>/g, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/g, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/g, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/g, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function mdToHtml(md: string): string {
  if (!md) return "<p></p>";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inUL = false, inOL = false;

  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^#{1,6}\s+/.test(line)) {
      closeLists();
      const m = line.match(/^(#{1,6})\s+(.*)$/)!;
      const lvl = m[1].length;
      out.push(`<h${lvl}>${esc(m[2])}</h${lvl}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inUL) { closeLists(); out.push("<ul>"); inUL = true; }
      out.push(`<li>${esc(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inOL) { closeLists(); out.push("<ol>"); inOL = true; }
      out.push(`<li>${esc(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (line === "") { closeLists(); out.push(""); continue; }
    closeLists();
    out.push(`<p>${esc(line)}</p>`);
  }
  closeLists();
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
