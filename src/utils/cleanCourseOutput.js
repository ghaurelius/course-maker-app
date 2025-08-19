/**
 * Minimal fixer for messy LLM lesson output -> clean Markdown-like text
 * Targeted solution to fix specific formatting issues
 */

/**
 * Remove "Duration: minutes" variants (italics, bullets, etc.)
 * @param {string} s - Input string
 * @returns {string} String with duration placeholders removed
 */
function stripDurationPlaceholder(s) {
  // Remove "Duration: minutes" variants (italics, bullets, etc.)
  return s
    .replace(/\*?\s*Duration:\s*minutes\s*\*?/gi, '')
    .replace(/^\s*[*-]\s*Duration:\s*minutes\s*$/gmi, '')
    .replace(/\n{2,}/g, '\n\n');
}

/**
 * Fix missing spaces after commas
 * @param {string} s - Input string
 * @returns {string} String with proper comma spacing
 */
function addSpaceAfterCommas(s) {
  // Fix "messages,Identify" → "messages, Identify"
  return s.replace(/,([A-Za-z])/g, ', $1');
}

/**
 * Convert weird bullets to Markdown hyphens; collapse double spaces
 * @param {string} s - Input string
 * @returns {string} String with normalized bullets
 */
function normalizeBullets(s) {
  // Convert weird bullets to Markdown hyphens; collapse double spaces; fix alignment
  return s
    .replace(/^[ \t]*•[ \t]*/gmi, '- ')
    .replace(/^[ \t]*▪︎[ \t]*/gmi, '- ')
    .replace(/^[ \t]*\*[ \t]*/gmi, '- ')  // Convert asterisk bullets
    .replace(/^[ \t]*-[ \t]{2,}/gmi, '- ') // Normalize multiple spaces after dash
    .replace(/^[ \t]{2,}-[ \t]*/gmi, '- ') // Remove extra indentation before dash
    .replace(/[ \t]{2,}/g, ' ')           // Collapse multiple spaces
    .replace(/^- [ \t]+/gmi, '- ');       // Ensure single space after dash
}

/**
 * Drop stray "Interactive Learning" text completely from content
 * @param {string} s - Input string
 * @returns {string} String with Interactive Learning text removed
 */
function removeDuplicateLabels(s) {
  // Remove all instances of "Interactive Learning" text
  return s.replace(/^\s*Interactive Learning\s*$/gmi, '');
}

/**
 * Remove stray "**" before/after headings and step lines
 * @param {string} s - Input string
 * @returns {string} String with cleaned bold formatting
 */
function tidyBoldAroundStepsAndHeadings(s) {
  // Remove stray "**" before/after headings and step lines
  let out = s.replace(/^\s*\*\*\s*(Step\b)/gmi, '$1');
  out = out.replace(/:\s*\*\*\s*\d+\s*$/gmi, '');        // remove trailing : ** 3
  out = out.replace(/^\s*\*\*\s*(Lesson Content|Concept Introduction|Guided Demonstration|Hands-?On Practice|Reflection\s*&\s*Assessment)\s*\*\*\s*$/gmi, '$1');
  return out;
}

/**
 * Turn broken "** Step …" lines into a clean ordered list (1., 2., 3., …)
 * @param {string} s - Input string
 * @returns {string} String with properly numbered steps
 */
function numberSteps(s) {
  // Turn broken "** Step …" lines into a clean ordered list (1., 2., 3., …)
  const lines = s.split('\n');
  let stepCount = 0;

  const stepRegex =
    /^\s*(?:\*\*\s*)?Step\b(?:\s*\d+)?\s*:?\s*(.+?)\s*(?::\s*\*\*\s*\d+)?\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(stepRegex);
    if (m) {
      stepCount += 1;
      const text = m[1].trim();
      lines[i] = `${stepCount}. ${text}`;
    }
  }
  return lines.join('\n');
}

/**
 * NEW: enforce exactly one blank line after headings and labels
 * @param {string} s - Input string
 * @returns {string} String with normalized heading spacing
 */
function normalizeHeadingSpacing(s) {
  // Ensure a blank line after H1/H2/H3-like headings and section labels
  return s
    // Trim trailing spaces
    .replace(/[ \t]+$/gm, '')
    // One blank line after headings (#, ##, ### …)
    .replace(/^(\s*#{1,6} .+?)\n+(?!\n)/gm, '$1\n\n')
    // Ensure one blank line before headings (but not at file start)
    .replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2')
    // Section labels like "Learning Objectives", "Concept Introduction", etc.
    .replace(/^(\s*(?:Learning Objectives|Lesson Content|Concept Introduction|Guided Demonstration|Hands-?On Practice|Reflection\s*&\s*Assessment))\s*$/gmi, '$1')
    .replace(/^(\s*(?:Learning Objectives|Lesson Content|Concept Introduction|Guided Demonstration|Hands-?On Practice|Reflection\s*&\s*Assessment))\s*\n+/gmi, '$1\n\n');
}

/**
 * NEW: normalize paragraphs so consecutive sentences align cleanly
 * @param {string} s - Input string
 * @returns {string} String with normalized paragraphs
 */
function normalizeParagraphs(s) {
  return s
    // Collapse >2 blank lines to exactly 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove stray spaces at the beginning of text lines
    .replace(/^\s{2,}(?=\S)/gm, '')
    // Ensure list items have a single leading space after marker
    .replace(/^(-|\d+\.)\s{2,}/gm, '$1 ')
    // Ensure paragraphs are not broken by single trailing spaces
    .replace(/[ \t]+\n/g, '\n');
}

/**
 * Collapse excessive blank lines
 * @param {string} s - Input string
 * @returns {string} String with normalized line breaks
 */
function collapseBlankLines(s) {
  return s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * Main function to clean messy LLM course output
 * @param {string} raw - Raw LLM output text
 * @returns {string} Clean, formatted text
 */
export function cleanCourseOutput(raw) {
  if (!raw || typeof raw !== 'string') return '';
  
  let t = raw;
  t = stripDurationPlaceholder(t);
  t = addSpaceAfterCommas(t);
  t = normalizeBullets(t);
  t = removeDuplicateLabels(t);
  t = tidyBoldAroundStepsAndHeadings(t);
  t = numberSteps(t);
  t = normalizeHeadingSpacing(t);   // NEW: Fix heading spacing
  t = normalizeParagraphs(t);       // NEW: Fix paragraph alignment
  t = collapseBlankLines(t);
  return t;
}

export default {
  cleanCourseOutput,
  stripDurationPlaceholder,
  addSpaceAfterCommas,
  normalizeBullets,
  removeDuplicateLabels,
  tidyBoldAroundStepsAndHeadings,
  numberSteps,
  collapseBlankLines
};
