export function normalizeMarkdown(md: string) {
  return md
    .replace(/^[ \t]*[•*]\s+/gm, "- ")        // bullets to "- "
    .replace(/\n{3,}/g, "\n\n")               // collapse >1 blank line
    .replace(/^(#{1,6} .+)\n+/gm, "$1\n")     // 1 blank line after headings
    .replace(/^\s+/gm, (m)=>m.replace(/\t/g,"  ")); // detab
}
