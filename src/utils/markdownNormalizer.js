/**
 * Markdown Normalization Utility
 * Normalizes messy LLM lesson output into clean, structured course Markdown
 * Based on robust normalization patterns for professional course content
 */

/**
 * Extract text between two regex patterns
 * @param {string} text - Source text
 * @param {RegExp} start - Start pattern
 * @param {RegExp|null} end - End pattern (null for rest of text)
 * @returns {string} Extracted text
 */
function between(text, start, end) {
  const s = start.exec(text);
  if (!s) return '';
  const from = s.index + s[0].length;
  const tail = text.slice(from);
  if (!end) return tail.trim();
  const e = end.exec(tail);
  return (e ? tail.slice(0, e.index) : tail).trim();
}

/**
 * Convert various bullet formats to proper Markdown bullets
 * @param {string} s - Text with bullets
 * @returns {string} Normalized bullet list
 */
function bulletify(s) {
  // Convert "•" or odd bullets to proper Markdown
  return s
    .replace(/\r/g, '')
    .split('\n')
    .map(l => {
      const t = l.trim();
      if (!t) return '';
      if (/^•\s*/.test(t)) return `- ${t.replace(/^•\s*/, '')}`;
      if (/^-\s*/.test(t)) return `- ${t.replace(/^-+\s*/, '')}`;
      if (/^\*\s*/.test(t)) return `- ${t.replace(/^\*+\s*/, '')}`;
      if (/^\d+\.\s*/.test(t)) return `- ${t.replace(/^\d+\.\s*/, '')}`;
      return t;
    })
    .join('\n')
    .trim();
}

/**
 * Clean and normalize step-by-step instructions
 * @param {string} content - Raw step content
 * @returns {string} Normalized steps
 */
function normalizeSteps(content) {
  if (!content) return '';
  
  // Find all step patterns and extract them properly
  const stepMatches = [...content.matchAll(/Step\s*(\d+):\s*([^]*?)(?=Step\s*\d+:|$)/gi)];
  
  if (stepMatches.length === 0) {
    // If no step patterns found, return content as-is
    return content.trim();
  }
  
  const normalizedSteps = stepMatches.map((match, index) => {
    const stepNum = match[1];
    const stepContent = match[2].trim();
    
    return `## Step ${stepNum}\n\n${stepContent}`;
  });
  
  return normalizedSteps.join('\n\n');
}

/**
 * Main function to format course markdown from messy LLM output
 * @param {string} raw - Raw LLM output text
 * @returns {string} Clean, structured Markdown
 */
export function formatCourseMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';
  
  // 1) Strip stray emoji lines and normalize whitespace
  let t = raw
    .replace(/^[ \t]*[⏱️📚🎯🧠🛠️📈].*\n?/gm, '') // Remove emoji-only lines
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
    .replace(/\r/g, '') // Remove carriage returns
    .trim();

  // Fix concatenation issues BEFORE processing
  // Handle "questions minutes" and similar concatenations
  t = t.replace(/(\w+)\s+minutes(?!\s+(?:to|of|for|in|with))/gi, '$1');
  t = t.replace(/techniques\s+minutes/gi, 'techniques');
  t = t.replace(/questions\s+minutes/gi, 'questions');

  // 2) Extract duration FIRST before cleaning
  const durationMatch = t.match(/Duration:\s*([^\n]+)/i) || 
                       t.match(/(\d+)\s*minutes?/i) ||
                       t.match(/⏱️\s*(\d+\s*minutes?)/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';

  // 3) Title (first non-empty line or extract from content)
  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  let courseTitle = lines[0] || 'Course Lesson';
  
  // Clean up title if it has formatting artifacts
  courseTitle = courseTitle
    .replace(/^#+\s*/, '') // Remove markdown headers
    .replace(/\*\*/g, '') // Remove bold formatting
    .replace(/[🎓📚🔸]/g, '') // Remove emojis
    .trim();

  // 4) Lesson number & title (fallbacks if missing)
  const lessonLine = lines.find(l => /Lesson\s*\d+/i.test(l)) || '';
  const lessonNumMatch = lessonLine.match(/Lesson\s*(\d+)/i);
  const lessonNum = lessonNumMatch ? lessonNumMatch[1] : '1';

  // Use the long title if present; otherwise derive from course title
  const lessonTitle = /Lesson\s*\d+/i.test(courseTitle)
    ? courseTitle.replace(/-\s*Lesson\s*\d+.*/i, '').trim()
    : (courseTitle || `Lesson ${lessonNum}`);

  // 5) Extract structured sections
  const lo = between(t, /Learning Objectives?\s*[\r\n]+/i, /(Lesson Content|Content|Concept Introduction|Guided Demonstration|Hands-On Practice|Activity|Exercise|Reflection\s*&?\s*Assessment|Knowledge Check|Step\s*\d+|$)/i);
  
  const contentIntro = between(t, /(Concept Introduction|Introduction)\s*[\r\n]+/i, /(Guided Demonstration|Demonstration|Hands-On Practice|Activity|Exercise|Reflection\s*&?\s*Assessment|Knowledge Check|Step\s*\d+|$)/i);
  
  const contentGuide = between(t, /(Guided Demonstration|Demonstration)\s*[\r\n]+/i, /(Hands-On Practice|Activity|Exercise|Reflection\s*&?\s*Assessment|Knowledge Check|Step\s*\d+|$)/i);
  
  const activity = between(t, /(Hands-On Practice|Activity|Exercise)\s*[\r\n]+/i, /(Reflection\s*&?\s*Assessment|Knowledge Check|Assessment|$)/i);
  
  const reflection = between(t, /(Reflection\s*&?\s*Assessment|Knowledge Check|Assessment)\s*[\r\n]+/i, /(Progress|$)/i);
  
  const steps = between(t, /(Step\s*\d+)/i, null);

  // 6) Clean and structure content
  const loList = bulletify(lo);
  
  // Combine content blocks intelligently
  const contentBlocks = [contentIntro, contentGuide].filter(Boolean).map(s => s.trim()).filter(Boolean);
  let content = contentBlocks.join('\n\n').trim();
  
  // If no structured content, use the main body
  if (!content) {
    content = t
      .replace(/Learning Objectives?[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '')
      .replace(/Lesson\s*\d+[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '')
      .replace(/Duration:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '')
      .trim();
  }
  
  // Handle step-by-step content
  if (steps && /Step\s*\d+/i.test(steps)) {
    content = normalizeSteps(steps);
  }
  
  const activityClean = activity.trim();
  const reflectionClean = reflection.trim();

  // 7) Build professional Markdown structure
  const out = [];
  
  // Main lesson title
  out.push(`# ${lessonTitle}`);
  
  // Duration if available
  if (duration) {
    out.push(`*Duration: ${duration}*`);
  }
  
  // Learning objectives
  if (loList) {
    out.push(`## Learning Objectives`);
    out.push(loList);
  }
  
  // Main content
  if (content) {
    out.push(`## Lesson Content`);
    out.push(content);
  }
  
  // Activity section
  if (activityClean) {
    out.push(`## Practice Activity`);
    out.push(activityClean);
  }
  
  // Reflection/Assessment
  if (reflectionClean) {
    out.push(`## Knowledge Check`);
    out.push(reflectionClean);
  }

  // Final tidy: ensure single blank lines and clean structure
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * Quick validation to check if content needs normalization
 * @param {string} content - Content to check
 * @returns {boolean} True if content appears to need normalization
 */
export function needsNormalization(content) {
  if (!content) return false;
  
  const indicators = [
    /\w+\s+minutes(?!\s+(?:to|of|for|in|with))/i, // Concatenated metadata
    /^[ \t]*[⏱️📚🎯🧠🛠️📈]/m, // Stray emoji lines
    /Learning Objectives?\s*[\r\n]+.*?[\r\n]+.*?Lesson Content/is, // Structured sections
    /Step\s*\d+:\s*/i, // Step-by-step content
    /\u00A0/, // Non-breaking spaces
  ];
  
  return indicators.some(pattern => pattern.test(content));
}

export default {
  formatCourseMarkdown,
  needsNormalization,
  between,
  bulletify,
  normalizeSteps
};
