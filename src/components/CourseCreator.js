import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import pdfToText from 'react-pdftotext';

// Import new components
import FileUploadStep from './FileUploadStep';
import QuestionnaireStep from './QuestionnaireStep';
import MultimediaStep from './MultimediaStep';
import GenerationStep from './GenerationStep';
import CoursePreview from './CoursePreview';
import ApiKeyManager from './ApiKeyManager';
import ErrorBoundary from './ErrorBoundary';
import { useToast, showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from './Toast';

// Import custom hooks
import useApiKey from '../hooks/useApiKey';
import useFileUpload from '../hooks/useFileUpload';
import useCourseGeneration from '../hooks/useCourseGeneration';
import useValidation from '../hooks/useValidation';
import useCourseAI from '../hooks/useCourseAI';
import useCourseStepState from '../hooks/useCourseStepState';

// Import validation utilities
import {
  validateApiKey,
  validateTextContent,
  validateQuestionAnswers,
  validateMultimediaPrefs,
  validateAndSanitizeFormData,
  ValidationError
} from '../utils/validation';

// Import AI response parsing utilities
import { parseAIResponse, mergeChunkResults, createAnalysisFallback } from '../utils/aiResponseParser';

// Add OpenAI API key at the top
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Chunk configuration for large content processing
const CHUNK_CONFIG = {
  maxChunkSize: {
    openai: 8000,
    gemini: 8000
  },
  overlapSize: 200
};

// Enhanced System Prompt for IP-preserving instructional design
const createSystemPrompt = (sourceContent, formData, questionAnswers) => {
  return `You are a senior instructional designer and copywriter who builds engaging, outcomes-driven, hands-on courses from provided source material. You integrate the author's voice, preserve their IP, and augment with your own general knowledge and light research (without contradicting the source).

GOALS (in priority order):
1. Faithfully extract the author's key ideas and vocabulary
2. Transform them into a practical course with clear outcomes, practice, and feedback
3. Keep scope realistic for the stated audience, timebox, and format
4. Produce clean, structured content matching requirements exactly
5. Provide polished content that creators can edit directly

CONSTRAINTS & GUARDRAILS:
- Respect IP: cite the provided material explicitly and mark any added knowledge as "LLM-augmented"
- If source conflicts with external knowledge, defer to source and note discrepancy
- No hallucinated citations. If unsure, write: "(uncertain—needs author verification)"
- Accessibility: use plain language, alt text prompts for visuals, inclusive examples
- Assessment integrity: tie each assessment to learning objectives with rubrics
- Keep lesson time blocks realistic (15–40 min each) within total duration limits

METHOD:
1. Parse source → extract key claims, terms, frameworks, examples
2. Build course blueprint (audience, prereqs, outcomes, syllabus)
3. Design lessons: concept → guided demo → hands-on task → reflection/feedback
4. Design assessments (formative + summative) with rubrics and answer keys
5. Propose assets (slides, worksheets, datasets) and minimal viable versions
6. Add pacing, community prompts, and structured schedule
7. Provide scope options when appropriate`;
};

function CourseCreator() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  
  // Use custom hooks
  const apiKeyHook = useApiKey(currentUser);
  const fileUploadHook = useFileUpload();
  const courseGenerationHook = useCourseGeneration();
  const validationHook = useValidation(addToast);
  const stepStateHook = useCourseStepState(addToast);
  const courseAIHook = useCourseAI(apiKeyHook, courseGenerationHook, addToast);
  
  // Extract hook functions and state for easier access
  const {
    showApiKeyModal,
    setShowApiKeyModal,
    apiProvider,
    setApiProvider,
    apiKey,
    setApiKey,
    storedApiKeys,
    saveApiKey,
    getCurrentApiKey,
    clearApiKeys,
    debugApiKeys,
    testApiConnection,
    selectOptimalProvider,
    getApiKeyForProvider
  } = apiKeyHook;
  
  const {
    uploadedContent,
    setUploadedContent,
    uploadedFile,
    setUploadedFile,
    inputMethod,
    setInputMethod,
    manualTextInput,
    setManualTextInput,
    handleFileUpload,
    handleInputMethodChange,
    handleManualTextChange
  } = fileUploadHook;
  
  const {
    isGenerating,
    setIsGenerating,
    generatedCourse,
    setGeneratedCourse,
    editingContent,
    setEditingContent,
    handleContentEdit,
    getTokenLimit,
    chunkLargeContent,
    processChunksWithAI,
    trackApiUsage
  } = courseGenerationHook;
  
  const {
    validateCurrentStep
  } = validationHook;
  
  const {
    step,
    formData,
    questionAnswers,
    multimediaPrefs,
    setStep,
    setFormData,
    setQuestionAnswers,
    setMultimediaPrefs,
    handleInputChange,
    handleQuestionChange,
    handleCustomModuleNameChange,
    handleNextStep,
    handlePreviousStep,
    goToStep
  } = stepStateHook;
  
  const {
    makeAIRequest
  } = courseAIHook;
  
  // Old API key management functions removed - now handled by useApiKey hook
  // Event handlers now handled by useCourseStepState hook
  
  // Hybrid PDF extraction function
  const extractPDFText = async (file) => {
    console.log('Starting hybrid PDF extraction for:', file.name);
    
    // Method 1: Try react-pdftotext first (most reliable client-side)
    try {
      console.log('Attempting react-pdftotext extraction...');
      const text = await pdfToText(file);
      if (text && text.trim().length > 0) {
        console.log('react-pdftotext succeeded:', text.length, 'characters');
        return { 
          success: true, 
          text: text.trim(), 
          method: 'react-pdftotext',
          pages: 'N/A' // react-pdftotext doesn't provide page count
        };
      }
    } catch (error) {
      console.warn('react-pdftotext failed:', error.message);
    }
    
    // Method 2: Fallback to server-side extraction (if available)
    try {
      console.log('Attempting server-side extraction...');
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.text && result.text.trim().length > 0) {
          console.log('Server-side extraction succeeded:', result.text.length, 'characters');
          return { 
            success: true, 
            text: result.text.trim(), 
            method: 'server-side',
            pages: result.pages || 'N/A'
          };
        }
      }
    } catch (error) {
      console.warn('Server-side extraction failed:', error.message);
    }
    
    // Method 3: Last resort - basic file reading (for text-based PDFs)
    try {
      console.log('Attempting basic file reading...');
      const text = await file.text();
      if (text && text.trim().length > 0) {
        console.log('Basic file reading succeeded:', text.length, 'characters');
        return { 
          success: true, 
          text: text.trim(), 
          method: 'basic-text-read',
          pages: 'N/A'
        };
      }
    } catch (error) {
      console.warn('Basic file reading failed:', error.message);
    }
    
    return { 
      success: false, 
      error: 'All PDF extraction methods failed. This PDF may be image-based, corrupted, or password-protected.' 
    };
  };

  // Step validation functions now handled by useValidation hook
  // Step navigation now handled by useCourseStepState hook
  
  // Old file upload and content edit functions removed - now handled by custom hooks
  
  const generateCourseWithMultimedia = async () => {
    try {
      // Validate API key
      const currentApiKey = getCurrentApiKey();
      if (!currentApiKey) {
        setShowApiKeyModal(true);
        showErrorToast(addToast, 'Please configure your AI API key first');
        return;
      }
      
      // Validate API key format
      validateApiKey(currentApiKey, apiProvider);
      
      // Validate all required data before generation
      validateTextContent(uploadedContent);
      validateQuestionAnswers(questionAnswers);
      validateMultimediaPrefs(multimediaPrefs);
      
      console.log('API Provider:', apiProvider);
      console.log('API Key exists:', !!currentApiKey);
      console.log('API Key length:', currentApiKey?.length || 0);
      
      showInfoToast(addToast, 'Starting course generation...');
    } catch (error) {
      if (error instanceof ValidationError) {
        showErrorToast(addToast, `Validation Error: ${error.message}`);
      } else {
        showErrorToast(addToast, 'Error preparing course generation');
      }
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const sourceContent = uploadedContent || 
        `Course Title: ${formData.title}\n` +
        `Description: ${formData.description}\n` +
        `Target Audience: ${formData.targetAudience}\n` +
        `Learning Objectives: ${formData.learningObjectives}\n` +
        `Duration: ${formData.duration}\n` +
        `Difficulty: ${formData.difficulty}\n` +
        `Category: ${formData.category}`;
      
      // ADD THESE DEBUG LINES HERE:
      console.log('Source content length:', sourceContent.length);
      console.log('Source content preview:', sourceContent.substring(0, 500));
      console.log('Using uploaded content:', !!uploadedContent);
      
      console.log('Generating course with enhanced IP-preserving analysis...');
      
      // Step 1: Comprehensive analysis with IP preservation
      const courseStructure = await analyzeContentStructure(sourceContent, getCurrentApiKey());
      console.log('Enhanced course structure analysis:', courseStructure);
      
      // Display clarification questions to user (could be implemented as a modal)
      console.log('Clarification Questions for Creator:', courseStructure.clarificationQuestions);
      
      // Step 2: Generate intelligent module names
      let moduleNames;
      if (questionAnswers.moduleNaming === 'custom' && questionAnswers.customModuleNames.length > 0) {
        moduleNames = questionAnswers.customModuleNames.slice(0, questionAnswers.moduleCount);
      } else {
        moduleNames = await generateIntelligentModuleNames(sourceContent, courseStructure, getCurrentApiKey(), questionAnswers);
      }
      
      // Step 3: Generate comprehensive modules with parallel processing for speed
      console.log(`🚀 Generating ${questionAnswers.moduleCount} modules in parallel for faster processing...`);
      
      const modulePromises = Array.from({ length: questionAnswers.moduleCount }, async (_, i) => {
        const moduleName = moduleNames[i] || `Module ${i + 1}`;
        
        console.log(`📚 Starting module ${i + 1}: ${moduleName}`);
        
        // Run module metadata generation in parallel
        const [optimalLessonCount, moduleDescription] = await Promise.all([
          determineOptimalLessonCount(moduleName, sourceContent, courseStructure, getCurrentApiKey()),
          generateContextualModuleDescription(moduleName, sourceContent, getCurrentApiKey())
        ]);
        
        const module = {
          id: `module-${i + 1}`,
          title: moduleName,
          description: moduleDescription,
          learningOutcomes: (courseStructure?.courseBlueprint?.learningOutcomes || []).slice(i * 2, (i + 1) * 2),
          lessons: [],
          assets: courseStructure?.proposedAssets || []
        };
        
        // Generate lessons in parallel (with concurrency limit of 3 to avoid rate limits)
        console.log(`📝 Generating ${optimalLessonCount} lessons for module ${i + 1} in parallel...`);
        const lessonPromises = Array.from({ length: optimalLessonCount }, (_, j) =>
          generateContextualLesson(
            moduleName, 
            j + 1, 
            optimalLessonCount, 
            sourceContent, 
            questionAnswers, 
            getCurrentApiKey(),
            courseStructure
          )
        );
        
        // Process lessons in batches of 3 to avoid overwhelming the API
        const batchSize = 3;
        for (let batchStart = 0; batchStart < lessonPromises.length; batchStart += batchSize) {
          const batch = lessonPromises.slice(batchStart, batchStart + batchSize);
          const batchResults = await Promise.all(batch);
          module.lessons.push(...batchResults);
          
          // Small delay between batches to be API-friendly
          if (batchStart + batchSize < lessonPromises.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`✅ Module ${i + 1} completed with ${module.lessons.length} lessons`);
        return module;
      });
      
      // Process modules in batches of 2 to balance speed and API limits
      const modules = [];
      const moduleBatchSize = 2;
      for (let batchStart = 0; batchStart < modulePromises.length; batchStart += moduleBatchSize) {
        const batch = modulePromises.slice(batchStart, batchStart + moduleBatchSize);
        const batchResults = await Promise.all(batch);
        modules.push(...batchResults);
        
        console.log(`🎯 Completed ${modules.length}/${questionAnswers.moduleCount} modules`);
        
        // Small delay between module batches
        if (batchStart + moduleBatchSize < modulePromises.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const course = {
        ...formData,
        modules,
        courseStructure, // Include comprehensive analysis
        scopeOptions: courseStructure.scopeOptions, // Provide flexibility
        clarificationQuestions: courseStructure.clarificationQuestions,
        metadata: {
          totalLessons: modules.reduce((acc, mod) => acc + mod.lessons.length, 0),
          estimatedDuration: modules.reduce((acc, mod) => 
            acc + mod.lessons.reduce((lessonAcc, lesson) => lessonAcc + lesson.duration, 0), 0
          ),
          difficulty: courseStructure?.courseBlueprint?.targetAudience || 'intermediate',
          hasMultimedia: multimediaPrefs.includeAudio || multimediaPrefs.includeVideo,
          generatedAt: new Date().toISOString(),
          sourceContentUsed: !!uploadedContent,
          aiProvider: apiProvider,
          aiGenerated: true,
          instructionalDesignFramework: 'comprehensive-ip-preserving',
          ipCompliance: true,
          dualOutput: true
        },
        preferences: {
          ...questionAnswers,
          ...multimediaPrefs
        }
      };
      
      console.log('Generated IP-compliant comprehensive course:', course);
      setGeneratedCourse(course);
      setStep(5);
      
    } catch (error) {
      console.error("Enhanced course generation failed:", error);
      
      // Parse error details if available
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(error.message);
      } catch (e) {
        errorDetails = { errorType: 'UNKNOWN', message: error.message };
      }
      
      // Show user-friendly error message
      const getUserFriendlyMessage = (errorDetails) => {
        switch (errorDetails.errorType) {
          case 'INVALID_API_KEY':
            return 'AI service authentication failed. Please check your API key in the settings.';
          case 'RATE_LIMIT':
            return 'AI service rate limit exceeded. Please try again in a few minutes.';
          case 'SERVER_ERROR':
            return 'AI service is temporarily unavailable. Please try again later.';
          case 'NETWORK_ERROR':
            return 'Network connection issue. Please check your internet connection and try again.';
          case 'UNSUPPORTED_PROVIDER':
            return 'Selected AI provider is not supported. Please choose OpenAI or Gemini.';
          default:
            return `Course generation failed: ${error.message}`;
        }
      };
      
      const userMessage = getUserFriendlyMessage(errorDetails);
      
      // Show different actions based on error type
      if (errorDetails.errorType === 'INVALID_API_KEY') {
        const shouldOpenSettings = window.confirm(`❌ ${userMessage}\n\nWould you like to update your API key now?`);
        if (shouldOpenSettings) {
          setShowApiKeyModal(true);
        }
      } else if (errorDetails.errorType === 'RATE_LIMIT') {
        alert(`⏳ ${userMessage}\n\nTip: Consider using a different AI provider or upgrading your API plan for higher limits.`);
      } else {
        alert(`❌ ${userMessage}\n\nPlease try again or contact support if the issue persists.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Model token limits for validation
  const MODEL_MAX_TOKENS = {
    'gpt-4o': 16384,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 4096
  };

  // Validate token requests against model limits
  const validateTokenRequest = (maxTokens, operation = 'default') => {
    const modelLimit = MODEL_MAX_TOKENS['gpt-4o'] || 4096;
    const safeLimit = Math.min(maxTokens, modelLimit - 100); // 100 token buffer
    
    if (maxTokens > modelLimit) {
      console.warn(`⚠️ Token request ${maxTokens} exceeds model limit ${modelLimit} for operation '${operation}', using ${safeLimit}`);
    }
    
    return safeLimit;
  };

  // CORRECTED TOKEN LIMITS - Conservative limits within OpenAI's actual model limits
  const TOKEN_LIMITS = {
    openai: {
      analysis: 4000,        // Conservative limit for analysis (was 50000)
      lessonGeneration: 3000, // Conservative limit for lesson generation (was 80000)
      moduleDescription: 2000, // Conservative limit for module descriptions (was 15000)
      moduleNames: 1000,     // Conservative limit for module naming (was 10000)
      lessonCount: 1000      // Conservative limit for lesson counting (was 5000)
    },
    gemini: {
      analysis: 4000,        // Conservative limit for analysis (was 50000)
      lessonGeneration: 3000, // Conservative limit for lesson generation (was 80000)
      moduleDescription: 2000, // Conservative limit for module descriptions (was 20000)
      moduleNames: 1000,     // Conservative limit for module naming (was 10000)
      lessonCount: 1000      // Conservative limit for lesson counting (was 5000)
    }
  };

  // For future GPT-5 - Conservative limits even for advanced models
  const GPT5_TOKEN_LIMITS = {
    analysis: 8000,        // Conservative for future models (was 120000)
    lessonGeneration: 6000, // Conservative for future models (was 180000)
    moduleDescription: 4000, // Conservative for future models (was 40000)
    moduleNames: 2000,     // Conservative for future models (was 25000)
    lessonCount: 2000      // Conservative for future models (was 12000)
  };

  // Old getTokenLimit function removed - now handled by useCourseGeneration hook

  // Old chunking configuration and function removed - now handled by useCourseGeneration hook

  // Process Chunks with AI and Merge Chunk Results now handled by useCourseAI hook

  // Old trackApiUsage function removed - now handled by useCourseGeneration hook
  // Enhanced AI Helper Functions now handled by useCourseAI hook
  
  const createSystemPrompt = (sourceContent, formData, questionAnswers) => {
    return `You are an expert instructional designer and course architect. Your task is to analyze source material and create comprehensive, engaging educational content.

CONTEXT:
- You're creating a ${formData.difficulty} level course in ${formData.category}
- Target audience: ${formData.targetAudience}
- Learning style preference: ${questionAnswers.learningStyle}
- Interactivity level: ${questionAnswers.interactivityLevel}
- Assessment approach: ${questionAnswers.assessmentType}

INSTRUCTIONAL PRINCIPLES:
1. Use active learning techniques
2. Provide concrete examples from the source material
3. Create scaffolded learning experiences
4. Include formative assessments
5. Ensure practical application opportunities
6. Maintain learner engagement throughout

OUTPUT REQUIREMENTS:
- All content must be directly derived from or inspired by the source material
- Include specific examples, data points, and concepts from the source
- Create unique, non-generic content
- Ensure progressive skill building
- Incorporate the specified learning preferences`;
  };

  // Enhanced parseAIResponse function now handled by aiResponseParser utility

  // JSON sanitization functions now handled by aiResponseParser utility

  // All parsing helper functions now handled by aiResponseParser utility

  const analyzeContentStructure = async (sourceContent, apiKey) => {
    try {
      // Use smart provider selection for analysis
      const optimalProvider = selectOptimalProvider('analysis', sourceContent.length);
      const optimalApiKey = getApiKeyForProvider(optimalProvider);
      
      console.log(`🔍 Analyzing content: ${sourceContent.length} characters with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      // Check if content needs chunking
      const maxSingleRequestSize = CHUNK_CONFIG.maxChunkSize[optimalProvider];
      
      if (sourceContent.length > maxSingleRequestSize) {
        console.log('Content is large, using chunking strategy...');
        
        // Chunk the content
        const chunks = chunkLargeContent(sourceContent, optimalProvider);
        
        // Process each chunk
        const chunkResults = await processChunksWithAI(chunks, 'analysis', optimalApiKey, optimalProvider, makeAIRequest);
        
        // Merge results
        const mergedAnalysis = mergeChunkResults(chunkResults, 'analysis');
        
        console.log('Chunked analysis completed:', mergedAnalysis);
        return mergedAnalysis;
      }
      
      // Original single-request processing for smaller content
      const systemPrompt = createSystemPrompt(sourceContent, formData, questionAnswers);
      
      const analysisPrompt = `${systemPrompt}

SOURCE_TITLE: ${formData.title}
SOURCE_TYPE: ${uploadedFile ? 'PDF Document' : 'Course Description'}
SOURCE_CONTENT: """${sourceContent}"""

AUDIENCE: ${formData.targetAudience}
PREREQS: ${formData.additionalRequirements || 'None specified'}
LEARNER_CONTEXT: ${formData.category} course, ${formData.difficulty} level
TONE_VOICE: Professional and engaging
DELIVERY_MODE: Self-paced online
TOTAL_DURATION: ${formData.duration}
SESSION_LENGTH: 15-40 minutes per lesson
HANDS_ON_RATIO: ${questionAnswers.interactivityLevel === 'high' ? '70%' : questionAnswers.interactivityLevel === 'medium' ? '50%' : '30%'}
CAPSTONE_REQUIRED: ${questionAnswers.assessmentType === 'project' ? 'true' : 'false'}

PRODUCE a comprehensive JSON analysis with:

{
  "sourceAnalysis": {
    "keyClaims": ["claim1", "claim2"],
    "keyTerms": ["term1", "term2"],
    "frameworks": ["framework1", "framework2"],
    "examples": ["example1", "example2"],
    "authorVoice": "description of author's tone and style"
  },
  "courseBlueprint": {
    "targetAudience": "refined audience description",
    "prerequisites": ["prereq1", "prereq2"],
    "learningOutcomes": ["outcome1", "outcome2", "outcome3"],
    "syllabus": ["module1 focus", "module2 focus", "module3 focus"]
  },
  "contentGaps": {
    "missingConcepts": ["concept1", "concept2"],
    "needsVerification": ["item1", "item2"],
    "suggestedAdditions": ["addition1", "addition2"]
  },
  "scopeOptions": {
    "lite": {
      "duration": "X hours",
      "modules": number,
      "focus": "core concepts only"
    },
    "core": {
      "duration": "Y hours",
      "modules": number,
      "focus": "comprehensive coverage"
    },
    "deepDive": {
      "duration": "Z hours",
      "modules": number,
      "focus": "advanced applications"
    }
  },
  "assessmentStrategy": {
    "formativeAssessments": ["type1", "type2"],
    "summativeAssessments": ["type1", "type2"],
    "rubricAreas": ["area1", "area2"]
  },
  "proposedAssets": {
    "worksheets": ["worksheet1", "worksheet2"],
    "templates": ["template1", "template2"],
    "resources": ["resource1", "resource2"]
  },
  "clarificationQuestions": [
    "question1",
    "question2",
    "question3",
    "question4",
    "question5"
  ]
}`;
      
      const analysisText = await makeAIRequest([{ role: 'user', content: analysisPrompt }], optimalApiKey, getTokenLimit('analysis'), 0.3, optimalProvider);
      return parseAIResponse(analysisText);
    } catch (error) {
      console.error('Error in comprehensive content analysis:', error);
      
      // Log the actual error details
      if (error.message.startsWith('{')) {
        try {
          const errorDetails = JSON.parse(error.message);
          console.error('Structured error details:', errorDetails);
          alert(`AI Error: ${errorDetails.message} (${errorDetails.errorType})`);
        } catch (e) {
          console.error('Error parsing error details:', e);
        }
      }
      
      // Parse error details if available
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(error.message);
      } catch (e) {
        errorDetails = { errorType: 'UNKNOWN', message: error.message };
      }
      
      // Show user-friendly error message
      const getUserFriendlyMessage = (errorDetails) => {
        switch (errorDetails.errorType) {
          case 'INVALID_API_KEY':
            return 'AI service authentication failed. Please check your API key.';
          case 'RATE_LIMIT':
            return 'AI service rate limit exceeded. Please try again in a few minutes.';
          case 'SERVER_ERROR':
            return 'AI service is temporarily unavailable. Please try again later.';
          case 'NETWORK_ERROR':
            return 'Network connection issue. Please check your internet connection.';
          default:
            return 'AI processing temporarily unavailable.';
        }
      };
      
      const userMessage = getUserFriendlyMessage(errorDetails);
      alert(`⚠️ Content Analysis Issue\n\n${userMessage}\n\nUsing fallback analysis based on your course information.`);
      
      return createAnalysisFallback(error, error.message);
    }
  };
  
  const generateIntelligentModuleNames = async (sourceContent, structure, apiKey, questionAnswers) => {
    try {
      // Use smart provider selection for module names
      const optimalProvider = selectOptimalProvider('moduleNames', sourceContent.length);
      const optimalApiKey = getApiKeyForProvider(optimalProvider);
      
      console.log(`🔍 Generating module names with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      // Safely extract main topics from structure
      const mainTopics = (structure && structure.mainTopics && Array.isArray(structure.mainTopics)) 
        ? structure.mainTopics.join(', ') 
        : 'Content analysis in progress';
      
      const prompt = `Based on this course content, create ${questionAnswers.moduleCount} progressive module names that build upon each other:\n\n${sourceContent}\n\nMain topics identified: ${mainTopics}\n\nRequirements:\n- Each module should be distinct and specific\n- Names should reflect actual content, not generic terms\n- Progressive difficulty from basic to advanced\n- Return ONLY the module names, one per line, no numbering or bullets`;
      
      console.log(`📝 Module name prompt length: ${prompt.length} characters`);
      console.log(`🎯 Requesting ${questionAnswers.moduleCount} module names`);
      
      const response = await makeAIRequest([{ role: 'user', content: prompt }], optimalApiKey, getTokenLimit('moduleNames'), 0.7, optimalProvider);
      
      console.log(`✅ Module name response received: ${response?.substring(0, 200)}...`);
      
      const moduleNames = (response || '')
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .slice(0, questionAnswers.moduleCount);
      
      return moduleNames.length >= questionAnswers.moduleCount ? 
        moduleNames : 
        [...moduleNames, ...Array.from({length: questionAnswers.moduleCount - moduleNames.length}, (_, i) => `Module ${moduleNames.length + i + 1}`)];
        
    } catch (error) {
      console.error('❌ Error generating module names:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Parse error details if available
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(error.message);
        console.error('❌ Parsed error details:', errorDetails);
      } catch (e) {
        errorDetails = { errorType: 'UNKNOWN', message: error.message };
        console.error('❌ Could not parse error as JSON, using raw message');
      }
      
      // Show user-friendly error message
      const getUserFriendlyMessage = (errorDetails) => {
        switch (errorDetails.errorType) {
          case 'INVALID_API_KEY':
            return 'AI service authentication failed. Please check your API key.';
          case 'RATE_LIMIT':
            return 'AI service rate limit exceeded. Please try again in a few minutes.';
          case 'SERVER_ERROR':
            return 'AI service is temporarily unavailable. Please try again later.';
          case 'NETWORK_ERROR':
            return 'Network connection issue. Please check your internet connection.';
          default:
            return 'AI processing temporarily unavailable.';
        }
      };
      
      const userMessage = getUserFriendlyMessage(errorDetails);
      alert(`⚠️ Module Name Generation Issue\n\n${userMessage}\n\nUsing default module names.`);
      
      return Array.from({length: questionAnswers.moduleCount}, (_, i) => `Module ${i + 1}`);
    }
  };
  
  const determineOptimalLessonCount = async (moduleName, sourceContent, structure, apiKey) => {
    try {
      // Use smart provider selection for lesson count
      const optimalProvider = selectOptimalProvider('lessonCount', sourceContent.length);
      const optimalApiKey = getApiKeyForProvider(optimalProvider);
      
      console.log(`🔍 Determining lesson count with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      const prompt = `For the module "${moduleName}" based on this content:\n\n${sourceContent}\n\nDetermine the optimal number of lessons (between 2-8) needed to thoroughly cover this module. Consider:\n- Content complexity\n- Learning objectives\n- Student comprehension\n\nReturn ONLY a single number.`;
      
      const response = await makeAIRequest([{ role: 'user', content: prompt }], optimalApiKey, getTokenLimit('lessonCount'), 0.3, optimalProvider);
      const lessonCount = parseInt(response);
      
      // Validate and constrain the result
      return (lessonCount >= 2 && lessonCount <= 8) ? lessonCount : 4;
      
    } catch (error) {
      console.error('Error determining lesson count:', error);
      
      // Parse error details if available
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(error.message);
      } catch (e) {
        errorDetails = { errorType: 'UNKNOWN', message: error.message };
      }
      
      // Show user-friendly error message for critical errors only
      if (['INVALID_API_KEY', 'RATE_LIMIT'].includes(errorDetails.errorType)) {
        const getUserFriendlyMessage = (errorDetails) => {
          switch (errorDetails.errorType) {
            case 'INVALID_API_KEY':
              return 'AI service authentication failed. Please check your API key.';
            case 'RATE_LIMIT':
              return 'AI service rate limit exceeded. Please try again in a few minutes.';
            default:
              return 'AI processing temporarily unavailable.';
          }
        };
        
        const userMessage = getUserFriendlyMessage(errorDetails);
        console.warn(`Lesson count optimization failed: ${userMessage}`);
      }
      
      return 4; // Default fallback
    }
  };
  
  const generateContextualModuleDescription = async (moduleName, sourceContent, apiKey) => {
    try {
      // Use smart provider selection for module description
      const optimalProvider = selectOptimalProvider('moduleDescription', sourceContent.length);
      const optimalApiKey = getApiKeyForProvider(optimalProvider);
      
      console.log(`🔍 Generating module description with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      const prompt = `Create a compelling 2-3 sentence description for the module "${moduleName}" based on this source material:\n\n${sourceContent}\n\nThe description should:\n- Explain what students will learn\n- Highlight key outcomes\n- Be specific to the actual content, not generic`;
      
      return await makeAIRequest([{ role: 'user', content: prompt }], optimalApiKey, getTokenLimit('moduleDescription'), 0.7, optimalProvider);
    } catch (error) {
      console.error('Error generating module description:', error);
      
      // Parse error details if available
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(error.message);
      } catch (e) {
        errorDetails = { errorType: 'UNKNOWN', message: error.message };
      }
      
      // Show user-friendly error message for critical errors only
      if (['INVALID_API_KEY', 'RATE_LIMIT'].includes(errorDetails.errorType)) {
        const getUserFriendlyMessage = (errorDetails) => {
          switch (errorDetails.errorType) {
            case 'INVALID_API_KEY':
              return 'AI service authentication failed. Please check your API key.';
            case 'RATE_LIMIT':
              return 'AI service rate limit exceeded. Please try again in a few minutes.';
            default:
              return 'AI processing temporarily unavailable.';
          }
        };
        
        const userMessage = getUserFriendlyMessage(errorDetails);
        console.warn(`Module description generation failed: ${userMessage}`);
      }
      
      return `This module covers essential concepts and practical applications of ${moduleName}.`;
    }
  };
  
  const generateContextualLesson = async (moduleTitle, lessonNumber, totalLessons, sourceContent, preferences, apiKey, courseStructure) => {
    try {
      // Use smart provider selection for lesson generation
      const optimalProvider = selectOptimalProvider('lessonGeneration', sourceContent.length);
      const optimalApiKey = getApiKeyForProvider(optimalProvider);
      
      console.log(`🔍 Generating lesson with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      const duration = Math.floor(Math.random() * 25) + 15; // 15-40 minutes
      const systemPrompt = createSystemPrompt(sourceContent, formData, questionAnswers);
      
      const lessonPrompt = `${systemPrompt}

CREATE LESSON ${lessonNumber} of ${totalLessons} for module "${moduleTitle}"

SOURCE MATERIAL:
${sourceContent}

COURSE ANALYSIS:
${JSON.stringify(courseStructure.sourceAnalysis, null, 2)}

LESSON REQUIREMENTS:
- Duration: ${duration} minutes
- Hands-on ratio: ${questionAnswers.interactivityLevel === 'high' ? '70%' : '50%'}
- Assessment style: ${questionAnswers.assessmentType}
- Learning style: ${questionAnswers.learningStyle}

DESIGN PATTERN: concept → guided demo → hands-on task → reflection/feedback

PRODUCE BOTH:

1. JSON LESSON SPEC:
{
  "lessonId": "lesson-${lessonNumber}",
  "title": "specific title from source material",
  "duration": ${duration},
  "learningObjectives": [
    "objective1 (tied to source)",
    "objective2 (tied to source)",
    "objective3 (tied to source)"
  ],
  "contentBlocks": [
    {
      "type": "concept",
      "content": "core concept from source",
      "sourceReference": "specific citation",
      "duration": minutes
    },
    {
      "type": "guidedDemo",
      "content": "step-by-step demonstration",
      "assets": ["asset1", "asset2"],
      "duration": minutes
    },
    {
      "type": "handsOn",
      "content": "practical exercise from source",
      "deliverable": "what learner creates",
      "duration": minutes
    },
    {
      "type": "reflection",
      "content": "reflection questions",
      "duration": minutes
    }
  ],
  "assessments": {
    "formative": "quick check tied to source",
    "summative": "comprehensive assessment"
  },
  "assets": {
    "worksheets": ["worksheet1", "worksheet2"],
    "templates": ["template1"],
    "resources": ["resource1"]
  },
  "ipAttribution": {
    "sourceReferences": ["specific citations"],
    "authorCredits": "proper attribution",
    "llmAugmented": ["areas where AI added content"]
  }
}

2. MARKDOWN LESSON DRAFT:
[Detailed lesson content in markdown format using the source material]

IMPORTANT: Base ALL content on the provided source material. Do not use generic content.`;
      
      const aiResponse = await makeAIRequest([{ role: 'user', content: lessonPrompt }], optimalApiKey, getTokenLimit('lessonGeneration'), 0.7, optimalProvider);
      
      // Parse JSON and Markdown sections
      const jsonMatch = aiResponse.match(/1\. JSON LESSON SPEC:([\s\S]*?)(?=2\. MARKDOWN LESSON DRAFT:)/);
      const markdownMatch = aiResponse.match(/2\. MARKDOWN LESSON DRAFT:([\s\S]*?)$/);
      
      let lessonSpec = {};
      try {
        if (jsonMatch) {
          lessonSpec = parseAIResponse(jsonMatch[1].trim());
        }
      } catch (e) {
        console.error('Error parsing lesson JSON:', e);
      }
      
      const markdownContent = markdownMatch ? markdownMatch[1].trim() : 
        `# ${moduleTitle} - Lesson ${lessonNumber}\n\nComprehensive lesson content with hands-on activities.`;
      
      return {
        id: lessonSpec.lessonId || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: lessonSpec.title || `${moduleTitle} - Lesson ${lessonNumber}`,
        duration: lessonSpec.duration || duration,
        learningObjectives: lessonSpec.learningObjectives || ['Master key concepts', 'Apply practical skills'],
        contentBlocks: lessonSpec.contentBlocks || [],
        assessments: lessonSpec.assessments || {},
        assets: lessonSpec.assets || {},
        ipAttribution: lessonSpec.ipAttribution || {},
        markdownContent: markdownContent,
        isEditable: true,
        multimedia: {
          hasAudio: multimediaPrefs.includeAudio,
          hasVideo: multimediaPrefs.includeVideo,
          audioUrl: null,
          videoUrl: null,
          audioDescription: multimediaPrefs.includeAudio ? `${duration}-minute AI-generated narration with ${multimediaPrefs.voiceStyle} voice` : null,
          videoDescription: multimediaPrefs.includeVideo ? `${duration}-minute ${multimediaPrefs.videoFormat} video with contextual content` : null
        }
      };
    } catch (error) {
        console.error('Error generating comprehensive lesson:', error);
        
        // Parse error details if available
        let errorDetails = {};
        try {
          errorDetails = JSON.parse(error.message);
        } catch (e) {
          errorDetails = { errorType: 'UNKNOWN', message: error.message };
        }
        
        // Create user-friendly error message
        const getUserFriendlyMessage = (errorDetails) => {
          switch (errorDetails.errorType) {
            case 'INVALID_API_KEY':
              return 'AI service authentication failed. Please check your API key.';
            case 'RATE_LIMIT':
              return 'AI service rate limit exceeded. Please try again in a few minutes.';
            case 'SERVER_ERROR':
              return 'AI service is temporarily unavailable. Please try again later.';
            case 'NETWORK_ERROR':
              return 'Network connection issue. Please check your internet connection.';
            default:
              return 'AI processing temporarily unavailable.';
          }
        };
        
        const userMessage = getUserFriendlyMessage(errorDetails);
        
        // IMPROVED FALLBACK: Use actual source content with detailed error info
        const fallbackContent = sourceContent ? 
          `# ${moduleTitle} - Lesson ${lessonNumber}

## ⚠️ AI Processing Status
**${userMessage}**

*This lesson was generated from your uploaded content when AI processing was unavailable.*

---

## Content from Source Material

${sourceContent.substring(0, 1500)}${sourceContent.length > 1500 ? '...' : ''}

## Learning Activities

Based on the source material above, complete the following activities:

1. **Concept Review**: Identify and summarize the key concepts presented in the source material
2. **Practical Application**: Think of real-world scenarios where these concepts would apply
3. **Critical Analysis**: What questions does this material raise? What additional information might be needed?
4. **Knowledge Check**: Create 3 questions based on the content to test understanding

## Discussion Points
- How does this content relate to your current knowledge or experience?
- What aspects would you like to explore further?
- How might you apply these concepts in practice?

## Next Steps
${errorDetails.canRetry ? 
  '🔄 **Retry Available**: This lesson can be regenerated when AI service is restored.' : 
  '📝 **Manual Edit**: Please customize this content based on your specific learning objectives.'}

---
*Note: This lesson was generated from your uploaded content when AI processing was unavailable.*` :
          `# ${moduleTitle} - Lesson ${lessonNumber}\n\n## ⚠️ AI Processing Status\n**${userMessage}**\n\n${errorDetails.canRetry ? 
            '🔄 This lesson can be regenerated when AI service is restored.' : 
            '📝 Please customize this content based on your specific learning objectives.'}

## Learning Framework

This lesson follows a structured approach:

1. **Introduction**: Core concepts and objectives
2. **Content Delivery**: Key information and examples  
3. **Practice Activities**: Hands-on exercises
4. **Assessment**: Knowledge checks and reflection
5. **Application**: Real-world connections

Comprehensive lesson with proper IP attribution and hands-on activities.`;
        
        return {
          id: `lesson-fallback-${lessonNumber}`,
          title: `${moduleTitle} - Lesson ${lessonNumber}`,
          duration: 20,
          learningObjectives: ['Understand core concepts from source material', 'Apply practical skills'],
          contentBlocks: [],
          assessments: {},
          assets: {},
          ipAttribution: {},
          markdownContent: fallbackContent,
          isEditable: true,
          aiProcessingStatus: {
            failed: true,
            errorType: errorDetails.errorType,
            errorMessage: userMessage,
            timestamp: errorDetails.timestamp,
            canRetry: ['RATE_LIMIT', 'SERVER_ERROR', 'NETWORK_ERROR'].includes(errorDetails.errorType)
          },
          multimedia: { hasAudio: false, hasVideo: false, audioUrl: null, videoUrl: null, audioDescription: null, videoDescription: null }
        };
      }
  };
  
  // Save course function
  const saveCourse = async () => {
    try {
      // Apply any edited content
      const finalCourse = { ...generatedCourse };
      Object.keys(editingContent).forEach(key => {
        const [moduleIndex, lessonIndex] = key.split('-').map(Number);
        if (finalCourse.modules[moduleIndex] && finalCourse.modules[moduleIndex].lessons[lessonIndex]) {
          finalCourse.modules[moduleIndex].lessons[lessonIndex].content = editingContent[key];
        }
      });
      
      await addDoc(collection(db, "courses"), {
        ...finalCourse,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        isPublic: false
      });
      
      alert("Course saved successfully!");
      // Reset form
      setStep(1);
      setGeneratedCourse(null);
      setEditingContent({});
      setFormData({
        title: "",
        description: "",
        targetAudience: "",
        learningObjectives: "",
        duration: "",
        difficulty: "beginner",
        category: "",
        additionalRequirements: "",
      });
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course. Please try again.");
    }
  };
  
  // Old renderApiKeyModal function removed - now using ApiKeyManager component
  
  // Old render functions removed - now using separate components
  
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{ marginBottom: "30px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "10px" }}>
          <h1 style={{ color: "#2c3e50", margin: "0" }}>🎓 AI-Powered Course Creator</h1>
          <button
            onClick={() => setShowApiKeyModal(true)}
            style={{
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Configure API Keys for ChatGPT and Gemini"
          >
            🔑 API Keys
          </button>
          <button
            onClick={() => {
              console.log('🔧 MANUAL DEBUG TEST');
              debugApiKeys();
              testApiConnection();
            }}
            style={{
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
            title="Debug API Keys (Check Console)"
          >
            🐛 Debug
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
          {[1, 2, 3, 4, 5].map(stepNum => (
            <div
              key={stepNum}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: step >= stepNum ? "#3498db" : "#bdc3c7",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}
            >
              {stepNum}
            </div>
          ))}
        </div>
      </div>
      
      {step === 1 && (
        <ErrorBoundary fallbackMessage="Error in file upload step. Please refresh and try again.">
          <FileUploadStep
            formData={formData}
            handleInputChange={handleInputChange}
            uploadedContent={uploadedContent}
            setUploadedContent={setUploadedContent}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            inputMethod={inputMethod}
            handleInputMethodChange={handleInputMethodChange}
            manualTextInput={manualTextInput}
            handleManualTextChange={handleManualTextChange}
            handleFileUpload={handleFileUpload}
            onNext={() => {
              if (validateCurrentStep(1, formData, uploadedContent, questionAnswers, multimediaPrefs)) {
                setStep(2);
              }
            }}
          />
        </ErrorBoundary>
      )}
      
      {step === 2 && (
        <ErrorBoundary fallbackMessage="Error in questionnaire step. Please refresh and try again.">
          <QuestionnaireStep
            questionAnswers={questionAnswers}
            handleQuestionChange={handleQuestionChange}
            handleCustomModuleNameChange={handleCustomModuleNameChange}
            onNext={() => {
              if (validateCurrentStep(2, formData, uploadedContent, questionAnswers, multimediaPrefs)) {
                setStep(3);
              }
            }}
            onBack={() => setStep(1)}
          />
        </ErrorBoundary>
      )}
      
      {step === 3 && (
        <ErrorBoundary fallbackMessage="Error in multimedia step. Please refresh and try again.">
          <MultimediaStep
            multimediaPrefs={multimediaPrefs}
            setMultimediaPrefs={setMultimediaPrefs}
            onNext={() => {
              if (validateCurrentStep(3, formData, uploadedContent, questionAnswers, multimediaPrefs)) {
                setStep(4);
              }
            }}
            onBack={() => setStep(2)}
          />
        </ErrorBoundary>
      )}
      
      {step === 4 && (
        <ErrorBoundary fallbackMessage="Error in generation step. Please refresh and try again.">
          <GenerationStep
            isGenerating={isGenerating}
            questionAnswers={questionAnswers}
            multimediaPrefs={multimediaPrefs}
            onGenerate={generateCourseWithMultimedia}
            onBack={() => setStep(3)}
          />
        </ErrorBoundary>
      )}
      
      {step === 5 && (
        <ErrorBoundary fallbackMessage="Error in course preview. Please refresh and try again.">
          <CoursePreview
            generatedCourse={generatedCourse}
            editingContent={editingContent}
            handleContentEdit={handleContentEdit}
            onSave={saveCourse}
            onBack={() => setStep(4)}
          />
        </ErrorBoundary>
      )}
      
      <ApiKeyManager
        showApiKeyModal={showApiKeyModal}
        setShowApiKeyModal={setShowApiKeyModal}
        apiProvider={apiProvider}
        setApiProvider={setApiProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        storedApiKeys={storedApiKeys}
        saveApiKey={saveApiKey}
        clearApiKeys={clearApiKeys}
      />
    </div>
  );
}

export default CourseCreator;