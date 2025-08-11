/**
 * Content Cleanup Utility
 * Removes corrupted HTML/CSS artifacts from existing course content
 */

/**
 * Clean HTML/CSS artifacts from lesson content
 * @param {string} content - Raw lesson content with potential HTML artifacts
 * @returns {string} Clean content without HTML/CSS artifacts
 */
export const cleanLessonContent = (content) => {
  if (!content || typeof content !== 'string') return content;
  
  let cleaned = content;
  
  // Remove onmouseover and onmouseout event handlers
  cleaned = cleaned.replace(/\s*onmouseover="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*onmouseout="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*onmouseover='[^']*'/gi, '');
  cleaned = cleaned.replace(/\s*onmouseout='[^']*'/gi, '');
  
  // Remove other problematic event handlers
  cleaned = cleaned.replace(/\s*onclick="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*onhover="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*onfocus="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*onblur="[^"]*"/gi, '');
  
  // Remove specific button elements that don't work - comprehensive patterns
  // Remove any button containing "Review Notes" text
  cleaned = cleaned.replace(/<button[^>]*>[\s\S]*?Review Notes[\s\S]*?<\/button>/gi, '');
  
  // Remove any button containing "Continue Learning" text  
  cleaned = cleaned.replace(/<button[^>]*>[\s\S]*?Continue Learning[\s\S]*?<\/button>/gi, '');
  
  // Remove button containers with flex display that contain both buttons
  cleaned = cleaned.replace(/<div[^>]*display:\s*flex[^>]*>[\s\S]*?Review Notes[\s\S]*?Continue Learning[\s\S]*?<\/div>/gi, 
    '<div style="text-align: center; margin-top: 32px; padding: 24px 0; border-top: 1px solid #e2e8f0; color: #718096; font-style: italic;">End of Lesson</div>');
  
  // Remove any remaining button containers with gap styling
  cleaned = cleaned.replace(/<div[^>]*gap:\s*16px[^>]*>[\s\S]*?Review Notes[\s\S]*?Continue Learning[\s\S]*?<\/div>/gi, 
    '<div style="text-align: center; margin-top: 32px; padding: 24px 0; border-top: 1px solid #e2e8f0; color: #718096; font-style: italic;">End of Lesson</div>');
  
  // Remove footer sections containing these buttons
  cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?Review Notes[\s\S]*?Continue Learning[\s\S]*?<\/footer>/gi, 
    '<div style="text-align: center; margin-top: 32px; padding: 24px 0; border-top: 1px solid #e2e8f0; color: #718096; font-style: italic;">End of Lesson</div>');
  
  // Broad pattern to catch any div containing both button texts
  cleaned = cleaned.replace(/<div[^>]*>[\s\S]*?📝[\s\S]*?Review Notes[\s\S]*?▶️[\s\S]*?Continue Learning[\s\S]*?<\/div>/gi, 
    '<div style="text-align: center; margin-top: 32px; padding: 24px 0; border-top: 1px solid #e2e8f0; color: #718096; font-style: italic;">End of Lesson</div>');
  
  // Aggressive fallback - remove any element containing "Review Notes" or "Continue Learning"
  cleaned = cleaned.replace(/[^<]*Review Notes[^>]*>/gi, '');
  cleaned = cleaned.replace(/[^<]*Continue Learning[^>]*>/gi, '');
  
  // Remove any remaining button tags entirely
  cleaned = cleaned.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '');
  
  // Remove "Ready for the next challenge?" text that appears with buttons
  cleaned = cleaned.replace(/Ready for the next challenge\?/gi, '');
  
  // Fix content metadata separation issues
  // Remove course metadata that got mixed into lesson content
  cleaned = cleaned.replace(/(\w+)\s+minutes(?!\s+(?:to|of|for|in|with))/gi, '$1. Duration: minutes');
  cleaned = cleaned.replace(/questions\s+minutes/gi, 'questions. Course duration: minutes');
  cleaned = cleaned.replace(/techniques\s+minutes/gi, 'techniques. Estimated time: minutes');
  
  // Clean up any remaining style manipulation code
  cleaned = cleaned.replace(/this\.style\.[^"']*["']/gi, '');
  cleaned = cleaned.replace(/this\.style\.[^"']*["']/gi, '');
  
  // Remove any standalone JavaScript code fragments
  cleaned = cleaned.replace(/\s*this\.style\.[^>]*>/gi, '>');
  
  // Clean up extra spaces and formatting
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/\s*"\s*>/g, '">');
  cleaned = cleaned.replace(/\s*'\s*>/g, "'>");
  
  return cleaned.trim();
};

/**
 * Clean an entire course object
 * @param {Object} course - Course object with modules and lessons
 * @returns {Object} Cleaned course object
 */
export const cleanCourseContent = (course) => {
  if (!course || !course.modules) return course;
  
  const cleanedCourse = { ...course };
  
  cleanedCourse.modules = course.modules.map(module => ({
    ...module,
    lessons: module.lessons ? module.lessons.map(lesson => ({
      ...lesson,
      content: cleanLessonContent(lesson.content),
      description: cleanLessonContent(lesson.description)
    })) : []
  }));
  
  // Also clean course description if it exists
  if (cleanedCourse.description) {
    cleanedCourse.description = cleanLessonContent(cleanedCourse.description);
  }
  
  return cleanedCourse;
};

/**
 * Apply content cleanup to CourseViewer display with normalization and world-class formatting
 * This can be used as a real-time cleanup without database changes
 * @param {string} content - Content to display
 * @returns {string} Clean content for display with professional formatting
 */
export const sanitizeForDisplay = (content) => {
  if (!content) return content;
  
  // STEP 1: Apply basic cleaning logic first
  let sanitized = cleanLessonContent(content);
  
  // STEP 2: Additional display-specific cleaning
  // Remove any remaining HTML artifacts that shouldn't be displayed
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // STEP 3: Apply targeted content cleaning to fix specific formatting issues
  try {
    const { cleanCourseOutput } = require('./cleanCourseOutput');
    
    console.log('🔧 Applying targeted content cleaning to fix formatting issues');
    sanitized = cleanCourseOutput(sanitized);
  } catch (error) {
    console.warn('⚠️ Targeted content cleaning failed, continuing with basic cleanup:', error);
  }
  
  // STEP 4: Apply improved visual formatting with consistent list spacing
  try {
    const { addProfessionalFormatting } = require('./contentFormatter');
    // Use the new minimal formatting for consistent list spacing
    sanitized = addProfessionalFormatting(sanitized, { isAlreadyClean: true });
    console.log('✅ Applied improved formatting with consistent list spacing');
  } catch (error) {
    console.warn('⚠️ Professional formatting failed, using cleaned content:', error);
  }
  
  return sanitized;
};

export default {
  cleanLessonContent,
  cleanCourseContent,
  sanitizeForDisplay
};
