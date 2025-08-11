import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { createEnhancedFallback, generateIntelligentFallback, extractContentInsights } from '../utils/intelligentFallback';
import { createProfessionalLesson, generateMultimediaContent, calculateOptimalLessons } from '../utils/contentFormatter';

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
  const navigate = useNavigate();
  
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
  
  // State management for module name editing
  const [generatedModuleNames, setGeneratedModuleNames] = useState([]);
  const [editableModuleNames, setEditableModuleNames] = useState([]);

  // Function to generate module names first (before full course generation)
  const generateModuleNamesForEditing = async () => {
    try {
      const sourceContent = uploadedContent || 
        `Course Title: ${formData.title}\n` +
        `Description: ${formData.description}\n` +
        `Target Audience: ${formData.targetAudience}\n` +
        `Learning Objectives: ${formData.learningObjectives}\n` +
        `Duration: ${formData.duration}\n` +
        `Difficulty: ${formData.difficulty}\n` +
        `Category: ${formData.category}`;

      console.log('🔍 Generating module names for editing...');
      
      // Step 1: Analyze content structure
      const courseStructure = await analyzeContentStructure(sourceContent, getCurrentApiKey());
      
      // Step 2: Generate intelligent module names
      const moduleNames = await generateIntelligentModuleNames(sourceContent, courseStructure, getCurrentApiKey(), questionAnswers);
      
      console.log('✅ Generated module names:', moduleNames);
      
      // Set the generated names for editing
      setGeneratedModuleNames(moduleNames);
      setEditableModuleNames([...moduleNames]);
      
      return moduleNames;
    } catch (error) {
      console.error('❌ Error generating module names:', error);
      showErrorToast(addToast, 'Failed to generate module names. Please try again.');
      
      // Fallback to generic names
      const fallbackNames = Array.from({ length: questionAnswers.moduleCount }, (_, i) => `Module ${i + 1}`);
      setGeneratedModuleNames(fallbackNames);
      setEditableModuleNames([...fallbackNames]);
      return fallbackNames;
    }
  };

  // Function to handle module name changes from the editor
  const handleModuleNamesChange = (updatedNames) => {
    setEditableModuleNames(updatedNames);
  };
  
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
    // Immediately update UI state for responsive feedback
    setIsGenerating(true);
    showInfoToast(addToast, 'Preparing course generation...');
    
    // Use setTimeout to allow UI to update before heavy operations
    setTimeout(async () => {
      try {
        // Construct source content at function scope
        const sourceContent = uploadedContent || 
          `Course Title: ${formData.title}\n` +
          `Description: ${formData.description}\n` +
          `Target Audience: ${formData.targetAudience}\n` +
          `Learning Objectives: ${formData.learningObjectives}\n` +
          `Duration: ${formData.duration}\n` +
          `Difficulty: ${formData.difficulty}\n` +
          `Category: ${formData.category}`;

        // Validate API key
        const currentApiKey = getCurrentApiKey();
        if (!currentApiKey) {
          setIsGenerating(false);
          setShowApiKeyModal(true);
          showErrorToast(addToast, 'Please configure your AI API key first');
          return;
        }
        
        // Validate API key format
        validateApiKey(currentApiKey, apiProvider);
        
        // Validate all required data before generation
        validateTextContent(sourceContent);
        validateQuestionAnswers(questionAnswers);
        validateMultimediaPrefs(multimediaPrefs);
        
        console.log('API Provider:', apiProvider);
        console.log('API Key exists:', !!currentApiKey);
        console.log('API Key length:', currentApiKey?.length || 0);
        
        showInfoToast(addToast, 'Starting course generation...');
        
        // Continue with the actual generation process
        await performCourseGeneration(sourceContent, currentApiKey);
        
      } catch (error) {
        setIsGenerating(false);
        if (error instanceof ValidationError) {
          showErrorToast(addToast, `Validation Error: ${error.message}`);
        } else {
          showErrorToast(addToast, 'Error preparing course generation');
        }
        return;
      }
    }, 10); // Small delay to allow UI update
  };
  
  const performCourseGeneration = async (sourceContent, currentApiKey) => {
    try {
      // Source content already constructed above during validation
      console.log('Source content length:', sourceContent.length);
      console.log('Source content preview:', sourceContent.substring(0, 500));
    console.log('Using uploaded content:', !!uploadedContent);
    
    console.log('Generating course with enhanced IP-preserving analysis...');
    
    // Step 1: Comprehensive analysis with IP preservation
      const courseStructure = await analyzeContentStructure(sourceContent, getCurrentApiKey());
      console.log('Enhanced course structure analysis:', courseStructure);
      
      // Display clarification questions to user (could be implemented as a modal)
      console.log('Clarification Questions for Creator:', courseStructure.clarificationQuestions);
      
      // Step 2: Use edited module names if available, otherwise generate them
      let moduleNames;
      if (editableModuleNames.length > 0) {
        // Use the edited module names from the editor
        moduleNames = editableModuleNames.slice(0, questionAnswers.moduleCount);
        console.log('✅ Using edited module names:', moduleNames);
      } else if (questionAnswers.moduleNaming === 'custom' && questionAnswers.customModuleNames.length > 0) {
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
      
      // Auto-save the course after successful generation
      console.log('🔄 Auto-saving course after generation...');
      showInfoToast(addToast, "Course generated successfully! Auto-saving...");
      
      try {
        // Validate user authentication
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        // Clean up the course data to ensure Firestore compatibility
        const cleanCourseData = sanitizeForFirestore(course);
        
        console.log('📝 Auto-saving course to Firestore...', {
          title: cleanCourseData.title,
          moduleCount: cleanCourseData.modules?.length || 0,
          userId: currentUser.uid
        });
        
        const docRef = await addDoc(collection(db, "courses"), {
          ...cleanCourseData,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          isPublic: false,
          version: '1.0',
          lastModified: serverTimestamp(),
          autoSaved: true
        });
        
        console.log('✅ Course auto-saved successfully with ID:', docRef.id);
        showSuccessToast(addToast, "Course auto-saved successfully! Redirecting to dashboard...");
        
        // Redirect to dashboard after successful autosave
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000); // 2 second delay to show success message
        
      } catch (autoSaveError) {
        console.error("❌ Auto-save failed:", autoSaveError);
        
        // Handle autosave errors gracefully
        let errorMessage = "Auto-save failed. ";
        
        if (autoSaveError.code === 'permission-denied') {
          errorMessage += "Permission denied. Please check your account permissions.";
        } else if (autoSaveError.code === 'unavailable') {
          errorMessage += "Database temporarily unavailable. Please try saving manually.";
        } else if (autoSaveError.message.includes('not authenticated')) {
          errorMessage += "Authentication expired. Please log in again.";
        } else {
          errorMessage += "Please save manually from the preview page.";
        }
        
        showErrorToast(addToast, errorMessage);
        
        // Still proceed to preview page so user can manually save
        setStep(5);
      }
      
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
          case 'CONNECTION_REFUSED':
            return 'Unable to connect to AI service. Please check your internet connection and try again.';
          case 'NETWORK_ERROR':
            return 'Network connection issue. Please check your internet connection.';
          case 'TIMEOUT_ERROR':
            return 'AI service request timed out. Please try again.';
          case 'CORS_ERROR':
            return 'Browser security restriction detected. Please refresh and try again.';
          default:
            return 'AI processing temporarily unavailable.';
        }
      };
      
      const userMessage = getUserFriendlyMessage(errorDetails);
      
      // Use enhanced fallback instead of basic fallback
      console.log('🔄 Using enhanced fallback content generation...');
      showInfoToast(addToast, 'AI unavailable - generating course from your content directly');
      
      return createEnhancedFallback(sourceContent, formData, questionAnswers, errorDetails);
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
      
      console.log(`🔍 Determining lesson count for "${moduleName}" with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      const prompt = `For the module "${moduleName}" based on this content:\n\n${sourceContent.substring(0, 1500)}\n\nDetermine the optimal number of lessons (between 2-8) needed to thoroughly cover this module. Consider:\n- Content complexity\n- Learning objectives\n- Student comprehension\n\nReturn ONLY a single number.`;
      
      const response = await makeAIRequest([{ role: 'user', content: prompt }], optimalApiKey, getTokenLimit('lessonCount'), 0.3, optimalProvider);
      const lessonCount = parseInt(response.trim());
      
      console.log(`🎯 AI suggested lesson count for "${moduleName}": ${lessonCount}`);
      
      // Validate and constrain the result
      if (lessonCount >= 2 && lessonCount <= 8) {
        console.log(`✅ Using AI-determined lesson count: ${lessonCount}`);
        return lessonCount;
      } else {
        console.warn(`⚠️ AI returned invalid lesson count (${lessonCount}), using content-based fallback`);
        return 4;
      }
      
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
      
      // Use content-based calculation as fallback instead of hardcoded default
      // Calculate based on module-specific content size
      const moduleContentSize = sourceContent.length;
      const wordCount = sourceContent.split(/\s+/).length;
      
      let contentBasedLessonCount;
      if (wordCount < 300) {
        contentBasedLessonCount = 2; // Small module content
      } else if (wordCount < 800) {
        contentBasedLessonCount = 3; // Medium module content
      } else if (wordCount < 1500) {
        contentBasedLessonCount = 4; // Large module content
      } else {
        contentBasedLessonCount = Math.min(6, Math.ceil(wordCount / 400)); // Very large content
      }
      
      console.log(`📊 Content-based lesson count for "${moduleName}": ${contentBasedLessonCount} lessons (${wordCount} words)`);
      return contentBasedLessonCount;
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
      
      // STEP 1: Generate lesson content structure
      // Create unique content segments for each lesson to avoid repetition
      const sourceLength = sourceContent.length;
      const segmentSize = Math.max(1500, Math.floor(sourceLength / totalLessons));
      const startIndex = (lessonNumber - 1) * segmentSize;
      const endIndex = Math.min(startIndex + segmentSize + 500, sourceLength); // Overlap for context
      const lessonSpecificContent = sourceContent.substring(startIndex, endIndex);
      
      const contentPrompt = `Create comprehensive lesson content for "${moduleTitle}" - Lesson ${lessonNumber} of ${totalLessons}.

IMPORTANT: This lesson should focus on UNIQUE aspects of the module. Each lesson must be distinct and progressive.

SOURCE MATERIAL FOR THIS LESSON:
${lessonSpecificContent}

FULL MODULE CONTEXT (for reference):
Module: ${moduleTitle}
Lesson Position: ${lessonNumber} of ${totalLessons}
Previous lessons should have covered earlier concepts, this lesson should build upon them.

LESSON REQUIREMENTS:
- Duration: ${duration} minutes
- Hands-on ratio: ${questionAnswers.interactivityLevel === 'high' ? '70%' : '50%'}
- Assessment style: ${questionAnswers.assessmentType}
- Learning style: ${questionAnswers.learningStyle}
- MUST be unique from other lessons in this module
- Should progressively build on concepts from previous lessons

Return ONLY a valid JSON object with this exact structure:

{
  "lessonId": "lesson-${lessonNumber}",
  "title": "Specific lesson title based on source material",
  "duration": ${duration},
  "learningObjectives": [
    "Specific objective 1 from source material",
    "Specific objective 2 from source material", 
    "Specific objective 3 from source material"
  ],
  "contentBlocks": [
    {
      "type": "concept",
      "content": "Detailed explanation of core concept from source material (200+ words)",
      "sourceReference": "Specific citation from source",
      "duration": 8
    },
    {
      "type": "guidedDemo", 
      "content": "Step-by-step demonstration with detailed instructions (300+ words)",
      "assets": ["Demo worksheet", "Example template"],
      "duration": 12
    },
    {
      "type": "handsOn",
      "content": "Practical hands-on exercise with clear instructions (250+ words)",
      "deliverable": "Specific deliverable learner will create",
      "duration": 15
    },
    {
      "type": "reflection",
      "content": "Reflection questions and discussion points (150+ words)",
      "duration": 5
    }
  ],
  "assessments": {
    "formative": "Quick knowledge check questions",
    "summative": "Comprehensive assessment task"
  },
  "assets": {
    "worksheets": ["Lesson ${lessonNumber} Worksheet", "Practice Template"],
    "templates": ["${moduleTitle} Template"],
    "resources": ["Reference Guide", "Additional Reading"]
  }
}

IMPORTANT: 
- Base ALL content on the provided source material
- Make content blocks detailed and substantial (not just summaries)
- Ensure JSON is valid and properly formatted
- Do NOT include markdownContent in this response`;
      
      const aiResponse = await makeAIRequest([{ role: 'user', content: contentPrompt }], optimalApiKey, getTokenLimit('lessonGeneration'), 0.7, optimalProvider);
      
      // Parse the JSON response directly (no more complex parsing needed)
      console.log(`📝 Raw AI response length: ${aiResponse.length} characters`);
      console.log(`📝 Response preview: ${aiResponse.substring(0, 200)}...`);
      
      let lessonSpec = {};
      try {
        // Try to parse the entire response as JSON first
        lessonSpec = parseAIResponse(aiResponse.trim());
        console.log(`✅ Successfully parsed lesson JSON for ${moduleTitle} - Lesson ${lessonNumber}`);
      } catch (e) {
        console.error('❌ Error parsing lesson JSON:', e);
        console.error('❌ Raw response that failed:', aiResponse.substring(0, 500));
        
        // Fallback: try to extract JSON from response
        try {
          const jsonStart = aiResponse.indexOf('{');
          const jsonEnd = aiResponse.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonStr = aiResponse.substring(jsonStart, jsonEnd);
            lessonSpec = parseAIResponse(jsonStr);
            console.log(`✅ Successfully extracted and parsed JSON from response`);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback JSON extraction also failed:', fallbackError);
        }
      }
      
      // STEP 2: Generate properly formatted Markdown content using enhanced formatting prompt with self-check
      const formattingPrompt = `You are a world-class instructional designer. 
Generate a complete lesson in STRICT Markdown for immediate web rendering.

LESSON CONTENT TO FORMAT:
Title: ${lessonSpec.title || `${moduleTitle} - Lesson ${lessonNumber}`}
Learning Objectives: ${JSON.stringify(lessonSpec.learningObjectives || ['Master key concepts', 'Apply practical skills'])}
Content Blocks: ${JSON.stringify(lessonSpec.contentBlocks || [])}

MARKDOWN FORMAT RULES:
1. # = Lesson Title
2. ## = Section Title
3. Headings are followed by EXACTLY one blank line, then content text.
4. No more than one blank line between any two blocks of text.
5. Use **bold** for key terms, numbered lists for steps, and '-' for bullet points.
6. Each lesson must have these sections in this order, each with its own heading exactly as shown:
   - **Learning Objectives** (bulleted list)
   - **Content** (paragraphs ≤4 sentences each)
   - **Activity** (1 interactive task)
   - **Reflection** (1–3 reflection questions or prompts)
7. No empty headings.
8. No placeholder text (e.g., "Duration: minutes").
9. Text must be left-aligned with no extra indentation.
10. Do not center text or add decorative symbols.
11. Keep paragraphs ≤4 sentences for readability.

LIST FORMAT RULES (CRITICAL):
- ALL bullet points must start with a dash followed by a space: "- ".
- Do NOT use "•", "*", or any other bullet symbols.
- All items in a list must use the same marker.
- No extra indentation before list markers.
- Each bullet point starts at the beginning of the line.
- Consistent spacing: one space after the dash, then content.

FEW-SHOT EXAMPLE:

# Texting Fundamentals: Crafting Engaging Opening Lines

## Learning Objectives

- Understand the concept of **response bait** in texting
- Learn how to use curiosity, humor, or surprise to prompt replies
- Identify when and how to tailor a message to the recipient

## Content

**Response bait** is the practice of crafting a message that feels too intriguing to ignore.
It can include humor, cultural references, or thought-provoking questions.
The goal is to make the recipient curious enough to reply immediately.

For example, instead of asking, "How was your weekend?" you might text:
*"If your weekend was a movie, what genre would it be?"*
This opens the door for creativity and a more memorable exchange.

## Activity

Write 3 opening texts using response bait:
1 for a friend, 1 for a potential romantic interest, and 1 for a colleague.
Aim for curiosity and personalization.

## Reflection

- Which of your opening lines is most likely to get a reply?
- How could you adjust it for a different audience?

SELF-CHECK BEFORE OUTPUT:
Review your generated lesson and confirm that:
- All headings have exactly one blank line after them.
- There are no more than one blank line between any blocks.
- Each lesson has all four required sections with correct headings.
- Paragraphs are ≤4 sentences.
- No placeholder text or empty headings are present.
- Text is left-aligned with no decorative symbols or centered content.
- ALL bullet points use "- " (dash + space) format - NO "•", "*", or other symbols.
- All list items have consistent formatting with no extra indentation.

If any rule is broken, fix it before returning the output.

OUTPUT INSTRUCTIONS:
Return only the final, fully formatted Markdown.
Do not include explanations or commentary.`;

      console.log('🎨 Generating formatted Markdown with dedicated formatting prompt...');
      const formattingResponse = await makeAIRequest([{ role: 'user', content: formattingPrompt }], optimalApiKey, getTokenLimit('lessonGeneration'), 0.3, optimalProvider);
      
      // Use the formatted response as our markdown content
      const rawMarkdownContent = formattingResponse.trim();
      console.log('📝 Formatted Markdown content:', rawMarkdownContent.substring(0, 200) + '...');
      
      // Since we now have clean, formatted Markdown from the source, apply minimal processing
      // Only apply HTML formatting for display, without altering the Markdown structure
      const formattedContent = createProfessionalLesson(
        rawMarkdownContent, // Use raw formatted content directly
        lessonSpec.title || `${moduleTitle} - Lesson ${lessonNumber}`,
        lessonSpec.learningObjectives || ['Master key concepts', 'Apply practical skills'],
        multimediaPrefs,
        true // Add flag to indicate content is already clean
      );
      
      // Generate multimedia metadata (not content placeholders)
      const multimediaMetadata = generateMultimediaContent(multimediaPrefs, duration);
      const finalContent = formattedContent;
      
      return {
        id: lessonSpec.lessonId || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: lessonSpec.title || `${moduleTitle} - Lesson ${lessonNumber}`,
        duration: lessonSpec.duration || duration,
        learningObjectives: lessonSpec.learningObjectives || ['Master key concepts', 'Apply practical skills'],
        contentBlocks: lessonSpec.contentBlocks || [],
        assessments: lessonSpec.assessments || {},
        assets: lessonSpec.assets || {},
        ipAttribution: lessonSpec.ipAttribution || {},
        markdownContent: finalContent,
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
        
        // ENHANCED INTELLIGENT FALLBACK: Generate meaningful content from source material
        const insights = extractContentInsights(sourceContent);
        let fallbackContent;
        
        if (sourceContent) {
          // Generate intelligent fallback with professional formatting
          fallbackContent = generateIntelligentFallback(sourceContent, insights, moduleTitle, lessonNumber);
          
          // Store multimedia metadata for UI layer (not content injection)
          if (multimediaPrefs && (multimediaPrefs.includeAudio || multimediaPrefs.includeVideo)) {
            const multimediaMetadata = generateMultimediaContent(multimediaPrefs, `${moduleTitle} - Lesson ${lessonNumber}`);
            // Multimedia will be handled by UI components, not injected into content
          }
        } else {
          // Basic fallback when no source content
          const basicContent = `
            ## ⚠️ AI Processing Status
            **${userMessage}**

            ${errorDetails.canRetry ? 
              '🔄 This lesson can be regenerated when AI service is restored.' : 
              '📝 Please customize this content based on your specific learning objectives.'}

            ## Learning Framework

            This lesson follows a structured approach:

            1. **Introduction**: Core concepts and objectives
            2. **Content Delivery**: Key information and examples  
            3. **Practice Activities**: Hands-on exercises
            4. **Assessment**: Knowledge checks and reflection
            5. **Application**: Real-world connections

            **Note:** Please add your specific content and learning objectives to complete this lesson.
          `;
          
          fallbackContent = createProfessionalLesson(
            basicContent, 
            `${moduleTitle} - Lesson ${lessonNumber}`,
            20
          );
        }
        
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
          multimedia: { 
            hasAudio: multimediaPrefs?.includeAudio || false, 
            hasVideo: multimediaPrefs?.includeVideo || false, 
            audioUrl: null, 
            videoUrl: null, 
            audioDescription: multimediaPrefs?.includeAudio ? `Audio narration for ${moduleTitle} - Lesson ${lessonNumber}` : null, 
            videoDescription: multimediaPrefs?.includeVideo ? `Video content for ${moduleTitle} - Lesson ${lessonNumber}` : null 
          }
        };
      }
  };
  
  // Enhanced save course function with better error handling
  const saveCourse = async () => {
    try {
      // Validation checks
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      if (!generatedCourse) {
        throw new Error('No course data to save');
      }
      
      console.log('🔄 Preparing course data for save...');
      
      // Apply any edited content
      const finalCourse = { ...generatedCourse };
      Object.keys(editingContent).forEach(key => {
        const [moduleIndex, lessonIndex] = key.split('-').map(Number);
        if (finalCourse.modules[moduleIndex] && finalCourse.modules[moduleIndex].lessons[lessonIndex]) {
          finalCourse.modules[moduleIndex].lessons[lessonIndex].content = editingContent[key];
        }
      });
      
      // Clean up the course data to ensure Firestore compatibility
      const cleanCourseData = sanitizeForFirestore(finalCourse);
      
      console.log('📝 Saving course to Firestore...', {
        title: cleanCourseData.title,
        moduleCount: cleanCourseData.modules?.length || 0,
        userId: currentUser.uid
      });
      
      const docRef = await addDoc(collection(db, "courses"), {
        ...cleanCourseData,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        isPublic: false,
        version: '1.0',
        lastModified: serverTimestamp()
      });
      
      console.log('✅ Course saved successfully with ID:', docRef.id);
      showSuccessToast(addToast, "Course saved successfully!");
      
      // Redirect to dashboard after successful save
      navigate('/dashboard');
    } catch (error) {
      console.error("❌ Error saving course:", error);
      
      // Enhanced error reporting
      let errorMessage = "Failed to save course. ";
      
      if (error.code === 'permission-denied') {
        errorMessage += "Permission denied. Please check your authentication.";
      } else if (error.code === 'unavailable') {
        errorMessage += "Database temporarily unavailable. Please try again.";
      } else if (error.message.includes('User not authenticated')) {
        errorMessage += "Please log in and try again.";
      } else if (error.message.includes('No course data')) {
        errorMessage += "No course data found. Please generate a course first.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      showErrorToast(addToast, errorMessage);
      console.error("Full error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }
  };
  
  // Helper function to sanitize data for Firestore
  const sanitizeForFirestore = (data) => {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (typeof data === 'function') {
      return null; // Remove functions
    }
    
    if (data instanceof Date) {
      return data; // Firestore handles dates
    }
    
    if (Array.isArray(data)) {
      return data.map(item => sanitizeForFirestore(item)).filter(item => item !== null);
    }
    
    if (typeof data === 'object') {
      const sanitized = {};
      Object.keys(data).forEach(key => {
        // Skip undefined values and functions
        if (data[key] !== undefined && typeof data[key] !== 'function') {
          const cleanKey = key.replace(/[.#$[\]]/g, '_'); // Replace invalid Firestore field characters
          sanitized[cleanKey] = sanitizeForFirestore(data[key]);
        }
      });
      return sanitized;
    }
    
    return data; // Primitive values
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
            onGenerate={generatedModuleNames.length === 0 ? generateModuleNamesForEditing : generateCourseWithMultimedia}
            onBack={() => setStep(3)}
            generatedModuleNames={generatedModuleNames}
            onModuleNamesChange={handleModuleNamesChange}
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