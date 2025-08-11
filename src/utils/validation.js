// Validation utility functions for CourseCreator app

export const ValidationError = class extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
};

// File validation
export const validateFile = (file) => {
  const errors = [];
  
  if (!file) {
    throw new ValidationError('No file selected', 'file');
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not supported. Please use PDF, TXT, MD, DOC, or DOCX files.');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join('. '), 'file');
  }
  
  return true;
};

// Text content validation
export const validateTextContent = (content) => {
  if (!content || typeof content !== 'string') {
    throw new ValidationError('Content is required', 'content');
  }
  
  const trimmedContent = content.trim();
  
  if (trimmedContent.length === 0) {
    throw new ValidationError('Content cannot be empty', 'content');
  }
  
  if (trimmedContent.length < 50) {
    throw new ValidationError('Content must be at least 50 characters long', 'content');
  }
  
  if (trimmedContent.length > 500000) { // 500KB limit
    throw new ValidationError('Content is too long. Please reduce to under 500,000 characters.', 'content');
  }
  
  return true;
};

// API Key validation
export const validateApiKey = (apiKey, provider) => {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError(`${provider} API key is required`, 'apiKey');
  }
  
  const trimmedKey = apiKey.trim();
  
  if (trimmedKey.length === 0) {
    throw new ValidationError(`${provider} API key cannot be empty`, 'apiKey');
  }
  
  // Provider-specific validation
  if (provider === 'openai') {
    if (!trimmedKey.startsWith('sk-')) {
      throw new ValidationError('OpenAI API key must start with "sk-"', 'apiKey');
    }
    if (trimmedKey.length < 20) {
      throw new ValidationError('OpenAI API key appears to be too short', 'apiKey');
    }
  } else if (provider === 'gemini') {
    if (trimmedKey.length < 10) {
      throw new ValidationError('Gemini API key appears to be too short', 'apiKey');
    }
  }
  
  return true;
};

// Form data validation
export const validateFormData = (formData) => {
  const errors = {};
  
  // Validate course title
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = 'Course title is required';
  } else if (formData.title.trim().length < 3) {
    errors.title = 'Course title must be at least 3 characters long';
  } else if (formData.title.trim().length > 100) {
    errors.title = 'Course title must be less than 100 characters';
  }
  
  // Validate course description
  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = 'Course description is required';
  } else if (formData.description.trim().length > 500) {
    errors.description = 'Course description must be less than 500 characters';
  }
  
  // Set default target audience to "Beginner" if not provided
  if (!formData.targetAudience || formData.targetAudience.trim().length === 0) {
    formData.targetAudience = 'Beginner';
  }
  
  // Validate difficulty level
  const validDifficultyLevels = ['beginner', 'intermediate', 'advanced'];
  if (!formData.difficulty || !validDifficultyLevels.includes(formData.difficulty)) {
    errors.difficulty = 'Please select a valid difficulty level';
  }
  
  if (Object.keys(errors).length > 0) {
    const errorMessage = Object.values(errors).join('. ');
    const error = new ValidationError(errorMessage, 'formData');
    error.fieldErrors = errors;
    throw error;
  }
  
  return true;
};

// Question answers validation
export const validateQuestionAnswers = (questionAnswers) => {
  const errors = {};
  
  // Check if answers object exists
  if (!questionAnswers || typeof questionAnswers !== 'object') {
    throw new ValidationError('Question answers are required', 'questionAnswers');
  }
  
  // Validate specific required questions (based on actual form structure)
  const requiredQuestions = [
    'courseLength',
    'interactivityLevel',
    'assessmentType',
    'learningStyle',
    'moduleCount',
    'moduleNaming'
  ];
  
  requiredQuestions.forEach(question => {
    if (!questionAnswers[question] || questionAnswers[question] === '') {
      errors[question] = `${question.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
    }
  });
  
  // Validate moduleCount is a valid number
  if (questionAnswers.moduleCount && (isNaN(questionAnswers.moduleCount) || questionAnswers.moduleCount < 1 || questionAnswers.moduleCount > 10)) {
    errors.moduleCount = 'Module count must be between 1 and 10';
  }
  
  // Validate custom module names if moduleNaming is 'custom'
  if (questionAnswers.moduleNaming === 'custom' && (!questionAnswers.customModuleNames || questionAnswers.customModuleNames.length === 0)) {
    errors.customModuleNames = 'Custom module names are required when using custom naming';
  }
  
  if (Object.keys(errors).length > 0) {
    const errorMessage = Object.values(errors).join('. ');
    const error = new ValidationError(errorMessage, 'questionAnswers');
    error.fieldErrors = errors;
    throw error;
  }
  
  return true;
};

// Multimedia preferences validation
export const validateMultimediaPrefs = (multimediaPrefs) => {
  if (!multimediaPrefs || typeof multimediaPrefs !== 'object') {
    throw new ValidationError('Multimedia preferences are required', 'multimediaPrefs');
  }
  
  // Validate voice style when audio is enabled
  const validVoiceStyles = ['professional', 'conversational', 'friendly', 'authoritative'];
  if (multimediaPrefs.includeAudio && !validVoiceStyles.includes(multimediaPrefs.voiceStyle)) {
    throw new ValidationError('Please select a valid voice style', 'voiceStyle');
  }
  
  // Validate video format when video is enabled
  const validVideoFormats = ['presentation', 'screencast', 'talking-head'];
  if (multimediaPrefs.includeVideo && !validVideoFormats.includes(multimediaPrefs.videoFormat)) {
    throw new ValidationError('Please select a valid video format', 'videoFormat');
  }
  
  return true;
};

// Course content validation
export const validateCourseContent = (courseContent) => {
  if (!courseContent) {
    throw new ValidationError('Course content is required', 'courseContent');
  }
  
  // Validate course structure
  if (!courseContent.modules || !Array.isArray(courseContent.modules)) {
    throw new ValidationError('Course must have modules', 'modules');
  }
  
  if (courseContent.modules.length === 0) {
    throw new ValidationError('Course must have at least one module', 'modules');
  }
  
  // Validate each module
  courseContent.modules.forEach((module, moduleIndex) => {
    if (!module.title || module.title.trim().length === 0) {
      throw new ValidationError(`Module ${moduleIndex + 1} must have a title`, 'moduleTitle');
    }
    
    if (!module.lessons || !Array.isArray(module.lessons)) {
      throw new ValidationError(`Module ${moduleIndex + 1} must have lessons`, 'moduleLessons');
    }
    
    if (module.lessons.length === 0) {
      throw new ValidationError(`Module ${moduleIndex + 1} must have at least one lesson`, 'moduleLessons');
    }
    
    // Validate each lesson
    module.lessons.forEach((lesson, lessonIndex) => {
      if (!lesson.title || lesson.title.trim().length === 0) {
        throw new ValidationError(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} must have a title`, 
          'lessonTitle'
        );
      }
      
      if (!lesson.content || lesson.content.trim().length === 0) {
        throw new ValidationError(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} must have content`, 
          'lessonContent'
        );
      }
    });
  });
  
  return true;
};

// Utility function to sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Utility function to validate and sanitize form inputs
export const validateAndSanitizeFormData = (formData) => {
  const sanitizedData = {};
  
  Object.keys(formData).forEach(key => {
    if (typeof formData[key] === 'string') {
      sanitizedData[key] = sanitizeInput(formData[key]);
    } else {
      sanitizedData[key] = formData[key];
    }
  });
  
  validateFormData(sanitizedData);
  return sanitizedData;
};

export default {
  ValidationError,
  validateFile,
  validateTextContent,
  validateApiKey,
  validateFormData,
  validateQuestionAnswers,
  validateMultimediaPrefs,
  validateCourseContent,
  sanitizeInput,
  validateAndSanitizeFormData
};
