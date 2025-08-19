/**
 * Professional Content Formatter Utility
 * Creates visually appealing, content-rich course materials
 * Following modern online course platform standards
 */

/**
 * Professional color palette for consistent theming
 */
const THEME = {
  primary: '#4A90E2',
  secondary: '#7ED321', 
  accent: '#F5A623',
  text: {
    primary: '#2C3E50',
    secondary: '#5A6C7D',
    light: '#8492A6'
  },
  background: {
    light: '#F8F9FA',
    card: '#FFFFFF',
    highlight: '#E8F4FD',
    example: '#FFF8E1',
    activity: '#F3E5F5'
  },
  border: {
    light: '#E1E8ED',
    medium: '#CBD5E0',
    accent: '#4A90E2'
  }
};

/**
 * Remove hash tags and convert to professional section headers
 * @param {string} content - Raw content with hash tags
 * @returns {string} Content with professional headers
 */
export const removeHashTags = (content) => {
  if (!content || typeof content !== 'string') return content;
  
  return content
    // Convert ### to professional h3 sections
    .replace(/^### (.+)$/gm, `
<div class="section-header-h3">
  <h3 style="
    color: ${THEME.text.primary}; 
    font-size: 20px; 
    font-weight: 600;
    margin: 30px 0 16px 0;
    padding: 12px 0;
    border-bottom: 2px solid ${THEME.border.light};
    position: relative;
  ">$1</h3>
</div>`)
    // Convert ## to major section headers
    .replace(/^## (.+)$/gm, `
<div class="section-header-h2">
  <h2 style="
    color: ${THEME.text.primary};
    font-size: 24px;
    font-weight: 700;
    margin: 40px 0 20px 0;
    padding: 16px 20px;
    background: linear-gradient(135deg, ${THEME.background.highlight} 0%, ${THEME.background.card} 100%);
    border-left: 4px solid ${THEME.primary};
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  ">$1</h2>
</div>`)
    // Convert # to module/lesson titles
    .replace(/^# (.+)$/gm, `
<div class="lesson-title">
  <h1 style="
    color: ${THEME.text.primary};
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 24px 0;
    padding: 24px;
    background: linear-gradient(135deg, ${THEME.primary} 0%, #357ABD 100%);
    color: white;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
  ">$1</h1>
</div>`)
    // Remove any remaining hash tags
    .replace(/#{1,6}\s*/g, '');
};

/**
 * Create professional paragraph formatting with visual hierarchy
 * @param {string} content - Content to format
 * @returns {string} Professionally formatted content
 */
export const improveFormatting = (content) => {
  if (!content || typeof content !== 'string') return content;
  
  // Split content into logical sections
  let formattedContent = content
    // Clean up whitespace first
    .replace(/\s{2,}/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Process paragraphs with professional styling
  formattedContent = formattedContent
    .split('\n\n')
    .map(paragraph => {
      if (!paragraph.trim() || paragraph.includes('<div') || paragraph.includes('<h')) {
        return paragraph;
      }
      
      // Create professional paragraph with proper spacing and typography
      return `<div class="content-paragraph" style="
        margin: 20px 0;
        padding: 16px 0;
        line-height: 1.7;
        font-size: 16px;
        color: ${THEME.text.primary};
        text-align: left;
      ">
        <p style="margin: 0; font-weight: 400;">${paragraph.trim()}</p>
      </div>`;
    })
    .join('\n');

  return formattedContent;
};

/**
 * Minimal formatting for already clean content from formatting prompt
 * @param {string} content - Clean Markdown content
 * @returns {string} HTML formatted content with consistent styling
 */
export const addMinimalFormatting = (content) => {
  if (!content || typeof content !== 'string') return content;
  
  let formatted = content;
  
  // Convert Markdown headings to HTML with consistent styling
  formatted = formatted.replace(/^### (.+)$/gm, 
    `<h3 style="font-size: 1.4em; font-weight: 600; color: #2d3748; margin: 24px 0 16px 0; text-align: left;">$1</h3>`);
  
  formatted = formatted.replace(/^## (.+)$/gm, 
    `<h2 style="font-size: 1.6em; font-weight: 700; color: #1a202c; margin: 32px 0 20px 0; text-align: left; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">$1</h2>`);
  
  formatted = formatted.replace(/^# (.+)$/gm, 
    `<h1 style="font-size: 2em; font-weight: 800; color: #1a202c; margin: 40px 0 24px 0; text-align: left;">$1</h1>`);
  
  // Convert Markdown bold text to HTML with proper highlighting
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, 
    `<strong style="font-weight: 700; color: #2d3748; background: linear-gradient(120deg, #fef5e7 0%, #fed7aa 100%); padding: 2px 6px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">$1</strong>`);
  
  // Convert Markdown italic text to HTML
  formatted = formatted.replace(/\*([^*]+)\*/g, 
    `<em style="font-style: italic; color: #4a5568;">$1</em>`);
  
  // Enhanced Markdown list conversion with proper alignment and spacing
  formatted = formatted.replace(/^- (.+)$/gm, 
    `<li style="margin: 12px 0; padding: 6px 0; color: #2d3748; line-height: 1.8; text-align: left; font-size: 16px; display: list-item; list-style-position: outside;">$1</li>`);
  
  // Wrap consecutive list items in <ul> tags with improved styling
  formatted = formatted.replace(/(<li[^>]*>.*<\/li>\s*)+/gs, (match) => 
    `<ul style="margin: 24px 0; padding-left: 24px; list-style-type: disc; font-size: 16px; text-align: left; line-height: 1.8;">${match}</ul>`);
  
  // Convert paragraphs with proper spacing and alignment
  formatted = formatted.replace(/^([^<\n-].+)$/gm, (match) => {
    if (match.trim() && !match.includes('<')) {
      return `<p style="margin: 18px 0; line-height: 1.8; color: #2d3748; text-align: left; font-size: 16px; word-wrap: break-word; max-width: 100%;">${match.trim()}</p>`;
    }
    return match;
  });
  
  return formatted;
};

/**
 * Apply world-class online learning formatting standards
 * @param {string} content - Raw lesson content
 * @param {Object} options - Formatting options
 * @returns {string} Professionally formatted content following industry standards
 */
export const addProfessionalFormatting = (content, options = {}) => {
  if (!content || typeof content !== 'string') return content;
  
  // If content is already clean from formatting prompt, use minimal processing
  if (options.isAlreadyClean) {
    return addMinimalFormatting(content);
  }
  
  let formatted = content;
  
  // 1. HEADING HIERARCHY (H1, H2, H3) - Fixed spacing and alignment
  formatted = formatted.replace(/^#{3}\s*(.+)$/gm, 
    `<h3 style="font-size: 1.4em; font-weight: 600; color: #2d3748; margin: 32px 0 24px 0; padding: 16px 0 12px 0; text-align: center; border-bottom: 2px solid #e2e8f0;">🔸 $1</h3>`);
  
  formatted = formatted.replace(/^#{2}\s*(.+)$/gm, 
    `<h2 style="font-size: 1.6em; font-weight: 700; color: #1a202c; margin: 40px 0 32px 0; padding: 20px 0 16px 0; text-align: center; border-bottom: 3px solid #4a90e2; background: linear-gradient(90deg, #f7fafc 0%, transparent 100%);">📚 $1</h2>`);
  
  formatted = formatted.replace(/^#{1}\s*(.+)$/gm, 
    `<h1 style="font-size: 2em; font-weight: 800; color: white; margin: 48px 0 32px 0; padding: 24px; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);">🎓 $1</h1>`);
  
  // 2. LEARNING OUTCOMES - Now works with normalized ## Learning Objectives sections
  formatted = formatted.replace(/^##\s*Learning Objectives?\s*\n([\s\S]*?)(?=\n##|\n#|$)/gmi, (match, objectives) => {
    const objectivesList = objectives.split('\n').filter(line => line.trim() && line.includes('-')).map(obj => 
      `<li style="margin: 8px 0; padding: 8px 12px; background: #f0fff4; border-left: 4px solid #38a169; border-radius: 4px;"><span style="font-weight: 500; color: #2d3748;">✓ ${obj.replace(/^[-•*]\s*/, '').trim()}</span></li>`
    ).join('');
    
    return `<h3 style="font-size: 1.4em; font-weight: 700; color: #2d3748; margin: 32px 0 16px 0; padding: 12px 0; border-bottom: 3px solid #38a169;">📚 Learning Objectives</h3>
<div style="margin: 16px 0;">
${objectivesList ? `<ul style="list-style: none; padding: 0; margin: 0;">
${objectivesList}
</ul>` : ''}
</div>`;
  });
  
  // 3. STEP-BY-STEP INSTRUCTIONS - Now works with normalized ## Step sections
  formatted = formatted.replace(/^##\s*Step\s+(\d+)\s*\n([\s\S]*?)(?=\n##|\n#|$)/gmi, (match, number, content) => {
    return `<div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%); border-left: 6px solid #e53e3e; border-radius: 12px; box-shadow: 0 4px 8px rgba(229, 62, 62, 0.1); position: relative;"><div style="position: absolute; top: -12px; left: 20px; background: #e53e3e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 0.9em; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">STEP ${number}</div><div style="margin-top: 16px; color: #2d3748; line-height: 1.8; font-size: 1.05em;">${content.trim()}</div></div>`;
  });
  
  // 4. INTERACTIVE ELEMENTS - Now works with normalized sections
  // Knowledge Check sections
  formatted = formatted.replace(/^##\s*Knowledge Check\s*\n([\s\S]*?)(?=\n##|\n#|$)/gmi, (match, content) => {
    return `<div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #fffaf0 0%, #fbd38d 100%); border-radius: 12px; border: 2px solid #ed8936;"><h4 style="font-size: 1.1em; font-weight: 600; color: #c05621; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">🧠 Knowledge Check</h4><div style="color: #2d3748; line-height: 1.6;">${content.trim()}</div></div>`;
  });
  
  // Practice Activity sections
  formatted = formatted.replace(/^##\s*Practice Activity\s*\n([\s\S]*?)(?=\n##|\n#|$)/gmi, (match, content) => {
    return `<div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f0f4ff 0%, #c3dafe 100%); border-radius: 12px; border: 2px solid #4299e1;"><h4 style="font-size: 1.1em; font-weight: 600; color: #2b6cb0; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">🛠️ Hands-On Activity</h4><div style="color: #2d3748; line-height: 1.6;">${content.trim()}</div></div>`;
  });
  
  // Lesson Content sections - Fixed alignment and spacing
  formatted = formatted.replace(/^##\s*Lesson Content\s*\n([\s\S]*?)(?=\n##|\n#|$)/gmi, (match, content) => {
    return `<div style="margin: 32px 0; padding: 24px; background: #ffffff; border-radius: 8px; border-left: 4px solid #4a90e2;"><div style="color: #2d3748; line-height: 1.8; font-size: 1.05em; text-align: justify; text-justify: inter-word;">${content.trim()}</div></div>`;
  });
  
  // 5. ENHANCED LISTS - Fixed alignment
  formatted = formatted.replace(/^(\d+)\.\s*(.+)$/gm, (match, number, text) => {
    return `<div style="margin: 20px 0; padding: 18px 24px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-left: 4px solid #4a90e2; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: flex-start; gap: 16px;"><div style="background: #4a90e2; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95em; flex-shrink: 0;">${number}</div><div style="color: #2d3748; line-height: 1.7; font-weight: 500; text-align: justify; flex: 1;">${text}</div></div>`;
  });
  
  formatted = formatted.replace(/^[-•*]\s*(.+)$/gm, (match, text) => {
    return `<div style="margin: 16px 0; padding: 16px 20px; background: #f7fafc; border-radius: 8px; border-left: 3px solid #63b3ed; display: flex; align-items: flex-start; gap: 12px;"><span style="color: #4a90e2; font-weight: 700; font-size: 1.2em; flex-shrink: 0;">•</span><span style="color: #2d3748; line-height: 1.7; text-align: justify; flex: 1;">${text}</span></div>`;
  });
  
  // 6. TEXT ENHANCEMENT
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #2d3748; font-weight: 600; background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%); padding: 2px 6px; border-radius: 4px;">$1</strong>');
  
  // 7. PARAGRAPH FORMATTING - Fixed alignment and spacing
  formatted = formatted.replace(/\n\n+/g, '</p><p style="margin: 24px 0; line-height: 1.8; color: #4a5568; text-align: justify; text-justify: inter-word; font-size: 1.05em;">');
  formatted = `<p style="margin: 24px 0; line-height: 1.8; color: #4a5568; text-align: justify; text-justify: inter-word; font-size: 1.05em;">${formatted}</p>`;
  
  return formatted;
};

/**
 * Create professional lesson structure matching modern online course standards
 * @param {string} content - Raw lesson content
 * @param {string} title - Lesson title
 * @param {number} duration - Estimated duration
 * @returns {string} Professionally structured lesson with visual hierarchy
 */
export const createProfessionalLesson = (content, title, learningObjectives = [], multimediaPrefs = {}, isAlreadyClean = false) => {
  if (!content) return '<p>No content available</p>';
  
  // Clean and format the content with professional styling
  let formattedContent = content;
  
  // If content is already clean from our new formatting prompt, apply minimal processing
  if (isAlreadyClean) {
    console.log('📝 Using clean content from formatting prompt - minimal processing applied');
    // Only apply basic HTML conversion without aggressive text manipulation
    formattedContent = addProfessionalFormatting(formattedContent, { isAlreadyClean: true });
  } else {
    // Apply full cleaning pipeline for legacy content
    formattedContent = removeHashTags(formattedContent);
    formattedContent = improveFormatting(formattedContent);
    formattedContent = addProfessionalFormatting(formattedContent);
  }
  
  // Create professional lesson structure with modern design
  return `
    <div class="professional-lesson-container" style="
      max-width: 900px; 
      margin: 0 auto; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: ${THEME.background.card};
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 16px;
      overflow: hidden;
    ">
      <!-- Professional Lesson Header -->
      <header class="lesson-header" style="
        background: linear-gradient(135deg, ${THEME.primary} 0%, #357ABD 100%);
        color: white;
        padding: 32px 40px;
        position: relative;
        overflow: hidden;
      ">
        <div style="position: relative; z-index: 2;">
          <h1 style="
            margin: 0 0 12px 0; 
            font-size: 32px; 
            font-weight: 700;
            line-height: 1.2;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${title}</h1>
          <div style="
            display: flex;
            align-items: center;
            gap: 24px;
            margin-top: 16px;
            opacity: 0.95;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⏱️</span>
              <span style="font-size: 16px; font-weight: 500;">20-30 minutes</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">📚</span>
              <span style="font-size: 16px; font-weight: 500;">Interactive Learning</span>
            </div>
          </div>
        </div>
        <!-- Decorative background elements -->
        <div style="
          position: absolute;
          top: -50px;
          right: -50px;
          width: 150px;
          height: 150px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          z-index: 1;
        "></div>
      </header>
      
      <!-- Professional Content Area -->
      <main class="lesson-content" style="
        padding: 40px;
        background: ${THEME.background.card};
        position: relative;
      ">
        <!-- Content with professional styling -->
        <div style="
          line-height: 1.7; 
          color: ${THEME.text.primary};
          font-size: 16px;
        ">
          ${formattedContent}
        </div>
        
        <!-- Professional Progress Indicator -->
        <div class="lesson-progress" style="
          margin-top: 40px;
          padding: 24px;
          background: ${THEME.background.light};
          border-radius: 12px;
          border: 1px solid ${THEME.border.light};
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          ">
            <span style="
              font-weight: 600;
              color: ${THEME.text.primary};
              font-size: 16px;
            ">📈 Lesson Progress</span>
            <span style="
              background: ${THEME.primary};
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 500;
            ">In Progress</span>
          </div>
          <div style="
            height: 6px;
            background: ${THEME.border.light};
            border-radius: 3px;
            overflow: hidden;
          ">
            <div style="
              height: 100%;
              background: linear-gradient(90deg, ${THEME.primary} 0%, ${THEME.secondary} 100%);
              width: 75%;
              border-radius: 3px;
            "></div>
          </div>
        </div>
      </main>
      
      <!-- Professional Footer with Navigation -->
      <footer class="lesson-footer" style="
        padding: 32px 40px;
        background: ${THEME.background.light};
        border-top: 1px solid ${THEME.border.light};
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          color: ${THEME.text.secondary};
        ">
          <span style="font-size: 20px;">🎯</span>
          <span style="font-weight: 500;">Ready for the next challenge?</span>
        </div>
        <div style="
          text-align: center;
          margin-top: 32px;
          padding: 24px 0;
          border-top: 1px solid ${THEME.border.light};
          color: ${THEME.text.secondary};
          font-style: italic;
        ">
          End of Lesson
        </div>
      </footer>
    </div>
  `;
};

/**
 * Determine optimal lesson count based on content size
 * @param {string} content - Source content
 * @param {number} targetModules - Target number of modules
 * @returns {Object} Optimal lesson structure
 */
export const calculateOptimalLessons = (content, targetModules = 3) => {
  if (!content) return { modulesCount: 2, lessonsPerModule: 2 };
  
  const wordCount = content.split(/\s+/).length;
  const complexity = content.split(/[.!?]+/).length; // Sentence count as complexity indicator
  
  let lessonsPerModule;
  let modulesCount;
  
  if (wordCount < 500) {
    // Small content: 1-2 lessons per module
    modulesCount = Math.max(2, Math.min(targetModules, 2));
    lessonsPerModule = 1;
  } else if (wordCount < 1500) {
    // Medium content: 2-3 lessons per module
    modulesCount = Math.max(2, Math.min(targetModules, 3));
    lessonsPerModule = 2;
  } else if (wordCount < 3000) {
    // Large content: 3-4 lessons per module
    modulesCount = targetModules;
    lessonsPerModule = 3;
  } else {
    // Very large content: 4-5 lessons per module
    modulesCount = targetModules;
    lessonsPerModule = Math.min(5, Math.ceil(wordCount / 1000));
  }
  
  return {
    modulesCount,
    lessonsPerModule,
    wordCount,
    complexity,
    recommendation: wordCount < 500 ? 'compact' : wordCount < 1500 ? 'standard' : 'comprehensive'
  };
};

/**
 * Generate multimedia metadata for lessons (NOT content placeholders)
 * @param {Object} multimediaPrefs - User multimedia preferences
 * @param {string} lessonTitle - Lesson title for context
 * @returns {Object} Multimedia metadata object
 */
export const generateMultimediaContent = (multimediaPrefs, lessonTitle) => {
  if (!multimediaPrefs) return { hasAudio: false, hasVideo: false };
  
  // Return metadata only - no HTML placeholders that pollute the content
  return {
    hasAudio: !!multimediaPrefs.includeAudio,
    hasVideo: !!multimediaPrefs.includeVideo,
    audioEnabled: !!multimediaPrefs.includeAudio,
    videoEnabled: !!multimediaPrefs.includeVideo
  };
};
