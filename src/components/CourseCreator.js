import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { confirmDialog } from "./ui/confirmDialog";
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
// Fixed import - check if this file exists, if not, create it or use alternative
import { useCourseAI } from '../hooks/useAIGeneration'; // Changed from useCourseAI
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

// Fixed imports - added missing utilities
import { 
  createEnhancedFallback, 
  generateIntelligentFallback, 
  extractContentInsights 
} from '../utils/intelligentFallback';

import { 
  createProfessionalLesson, 
  generateMultimediaContent, 
  calculateOptimalLessons,
  addMinimalFormatting
} from '../utils/contentFormatter';

// Standardized API key retrieval function
const getApiKeyForGeneration = (provider, apiKeyHook) => {
  const targetProvider = provider || apiKeyHook.apiProvider;
  return apiKeyHook.getApiKeyForProvider(targetProvider) || apiKeyHook.getCurrentApiKey();
};

// Enhanced API call with retry logic
const makeRobustApiCall = async (prompt, apiKey, provider, runAI, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 API attempt ${attempt}/${retries} with ${provider}`);
      
      // Add request timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const apiPromise = runAI(prompt, apiKey, provider);
      const result = await Promise.race([apiPromise, timeoutPromise]);
      
      if (result && result.trim().length > 50) {
        console.log(`✅ API call successful on attempt ${attempt}`);
        return result;
      } else {
        throw new Error('Response too short or empty');
      }
      
    } catch (error) {
      console.warn(`❌ API attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        // Final attempt failed - provide intelligent fallback
        console.log('🔄 All API attempts failed, generating intelligent fallback...');
        return generateIntelligentContentFallback(prompt, provider);
      }
      
      // Wait before retry with exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Intelligent content fallback generator
const generateIntelligentContentFallback = (prompt, provider) => {
  // Extract key information from the prompt
  const lessonMatch = prompt.match(/Lesson: (\d+) of (\d+)/);
  const moduleMatch = prompt.match(/Module: (.+)/);
  const focusMatch = prompt.match(/Focus: (.+)/);
  
  const lessonNumber = lessonMatch ? lessonMatch[1] : '1';
  const totalLessons = lessonMatch ? lessonMatch[2] : '4';
  const moduleTitle = moduleMatch ? moduleMatch[1] : 'Course Module';
  const focus = focusMatch ? focusMatch[1] : 'Core concepts';
  
  return JSON.stringify({
    lessonId: `lesson-${lessonNumber}-fallback-${Date.now()}`,
    title: `${moduleTitle} - Lesson ${lessonNumber}: ${focus}`,
    uniqueFocus: focus,
    duration: 25,
    learningObjectives: [
      `Understand the fundamental concepts of ${focus.toLowerCase()}`,
      `Apply key principles in practical scenarios`,
      `Analyze real-world applications and examples`
    ],
    contentSections: {
      introduction: `This lesson focuses on ${focus.toLowerCase()}. You'll learn the essential principles and how to apply them effectively in your work.`,
      coreContent: `The main concepts covered in this lesson include the theoretical foundation and practical applications. These principles form the basis for understanding how to implement effective strategies.`,
      examples: `Example 1: Consider how these principles apply in everyday situations. Example 2: Look at case studies that demonstrate successful implementation.`,
      application: `Practice Exercise: Apply the concepts learned by working through a hands-on scenario that demonstrates the key principles in action.`,
      reflection: `Reflect on how these concepts connect to your existing knowledge. Consider how you might apply these principles in your own context.`
    },
    assessment: {
      formative: `Quick check: Can you explain the main concept? How does this apply to real situations?`,
      summative: `Complete assessment: Demonstrate your understanding by creating an example that shows practical application of the lesson's key principles.`
    },
    sourceReferences: "Content generated from provided source material",
    fallbackGenerated: true,
    aiProvider: provider,
    generatedAt: new Date().toISOString()
  }, null, 2);
};

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

// Content filtering and cleaning functions
const cleanGeneratedContent = (content) => {
  if (!content || typeof content !== 'string') return content;
  
  // Remove meta-references and clean up the content
  let cleanedContent = content
    // Remove source references
    .replace(/\(Source:[^)]+\)/gi, '')
    .replace(/_Source:[^_]+_/gi, '')
    .replace(/Source: [^\n]+/gi, '')
    .replace(/\-Source:[^-]+-/gi, '')
    
    // Remove asset references
    .replace(/\(Assets?:[^)]+\)/gi, '')
    .replace(/Assets?:\s*[^\n]+/gi, '')
    
    // Remove deliverable references
    .replace(/\(Deliverable:[^)]+\)/gi, '')
    .replace(/Deliverable:\s*[^\n]+/gi, '')
    
    // Remove worksheet/template references
    .replace(/\(Worksheets?:[^)]+\)/gi, '')
    .replace(/Worksheets?:\s*[^\n]+/gi, '')
    .replace(/\(Templates?:[^)]+\)/gi, '')
    .replace(/Templates?:\s*[^\n]+/gi, '')
    
    // Remove other meta-references
    .replace(/\(Reference:[^)]+\)/gi, '')
    .replace(/\(See:[^)]+\)/gi, '')
    .replace(/\(Note:[^)]+\)/gi, '')
    
    // Clean up extra whitespace and formatting
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove triple line breaks
    .replace(/\s+$/gm, '') // Remove trailing spaces
    .replace(/^\s+/gm, '') // Remove leading spaces
    .trim();
  
  return cleanedContent;
};

// Enhanced lesson content cleaning
const cleanLessonContentBlocks = (contentBlocks) => {
  if (!Array.isArray(contentBlocks)) return contentBlocks;
  
  return contentBlocks.map(block => ({
    ...block,
    content: cleanGeneratedContent(block.content)
  }));
};

// Clean learning objectives
const cleanLearningObjectives = (objectives) => {
  if (!Array.isArray(objectives)) return objectives;
  
  return objectives.map(obj => 
    cleanGeneratedContent(obj)
      .replace(/^[•\-\*]\s*/, '') // Remove bullet points
      .replace(/^\d+\.\s*/, '') // Remove numbers
  );
};

// Sequential content distribution system
const distributeContentAmongModules = (sourceContent, totalModules) => {
  console.log(`\n🔍 SEQUENTIAL CONTENT DISTRIBUTION:`);
  console.log(`📄 Total source content: ${sourceContent.length} characters`);
  console.log(`📚 Distributing across ${totalModules} modules sequentially`);
  
  // Clean and prepare content
  const cleanContent = sourceContent.trim();
  const totalWords = cleanContent.split(/\s+/).length;
  const totalChars = cleanContent.length;
  
  console.log(`📊 Source analysis: ${totalWords} words, ${totalChars} characters`);
  
  // Strategy 1: Split by natural boundaries (paragraphs, sections)
  const naturalSections = cleanContent.split(/\n\s*\n/).filter(section => section.trim().length > 100);
  
  if (naturalSections.length >= totalModules) {
    console.log(`✅ Using natural section boundaries (${naturalSections.length} sections found)`);
    return distributeByNaturalSections(naturalSections, totalModules);
  }
  
  // Strategy 2: Split by percentage for even distribution
  console.log(`⚠️ Limited natural sections (${naturalSections.length}), using percentage-based distribution`);
  return distributeByPercentage(cleanContent, totalModules);
};

// Method 1: Distribute by natural sections (preferred)
const distributeByNaturalSections = (sections, totalModules) => {
  console.log(`📐 Distributing ${sections.length} natural sections across ${totalModules} modules`);
  
  const sectionsPerModule = Math.ceil(sections.length / totalModules);
  const moduleContents = [];
  
  for (let moduleIndex = 0; moduleIndex < totalModules; moduleIndex++) {
    const startSection = moduleIndex * sectionsPerModule;
    const endSection = Math.min(startSection + sectionsPerModule, sections.length);
    
    // Get sequential sections for this module
    const moduleSections = sections.slice(startSection, endSection);
    const moduleContent = moduleSections.join('\n\n');
    const moduleWords = moduleContent.split(/\s+/).length;
    
    console.log(`📝 Module ${moduleIndex + 1}:`);
    console.log(`   - Sections: ${startSection} to ${endSection - 1} (${moduleSections.length} sections)`);
    console.log(`   - Words: ${moduleWords}`);
    console.log(`   - Characters: ${moduleContent.length}`);
    console.log(`   - Content starts with: "${moduleContent.substring(0, 80)}..."`);
    
    moduleContents.push(moduleContent);
  }
  
  // Ensure last module gets any remaining content
  if (sections.length % totalModules !== 0) {
    const remainingSections = sections.slice(totalModules * sectionsPerModule);
    if (remainingSections.length > 0) {
      const lastModuleIndex = moduleContents.length - 1;
      moduleContents[lastModuleIndex] += '\n\n' + remainingSections.join('\n\n');
      console.log(`📎 Added ${remainingSections.length} remaining sections to last module`);
    }
  }
  
  return moduleContents;
};

// Method 2: Distribute by percentage (fallback)
const distributeByPercentage = (content, totalModules) => {
  console.log(`📐 Using percentage-based distribution for ${totalModules} modules`);
  
  const contentLength = content.length;
  const moduleContents = [];
  
  for (let moduleIndex = 0; moduleIndex < totalModules; moduleIndex++) {
    // Calculate sequential character ranges
    const startPercent = (moduleIndex / totalModules);
    const endPercent = ((moduleIndex + 1) / totalModules);
    
    const startChar = Math.floor(startPercent * contentLength);
    let endChar = Math.floor(endPercent * contentLength);
    
    // For last module, ensure we get all remaining content
    if (moduleIndex === totalModules - 1) {
      endChar = contentLength;
    }
    
    // Extract the sequential content chunk
    let moduleContent = content.substring(startChar, endChar);
    
    // Ensure we don't cut words in half - find natural word boundaries
    if (moduleIndex < totalModules - 1) { // Don't adjust last module
      const lastSpaceIndex = moduleContent.lastIndexOf(' ');
      if (lastSpaceIndex > moduleContent.length * 0.8) { // Only adjust if close to end
        moduleContent = moduleContent.substring(0, lastSpaceIndex);
      }
    }
    
    const moduleWords = moduleContent.split(/\s+/).length;
    
    console.log(`📝 Module ${moduleIndex + 1}:`);
    console.log(`   - Position: ${startPercent.toFixed(2)} to ${endPercent.toFixed(2)} (${(endPercent - startPercent).toFixed(2)} of total)`);
    console.log(`   - Characters: ${startChar} to ${endChar} (${moduleContent.length} chars)`);
    console.log(`   - Words: ${moduleWords}`);
    console.log(`   - Content starts with: "${moduleContent.substring(0, 80)}..."`);
    console.log(`   - Content ends with: "...${moduleContent.substring(moduleContent.length - 80)}"`);
    
    moduleContents.push(moduleContent);
  }
  
  return moduleContents;
};

// Content validation function
const validateSequentialDistribution = (moduleContents, originalContent) => {
  console.log(`\n🔍 VALIDATING SEQUENTIAL DISTRIBUTION:`);
  
  // Check if content is truly sequential
  let totalDistributedChars = 0;
  let hasGaps = false;
  
  for (let i = 0; i < moduleContents.length; i++) {
    const moduleContent = moduleContents[i];
    totalDistributedChars += moduleContent.length;
    
    // Check if this module's content appears in the original in the right order
    const moduleStart = moduleContent.substring(0, 50);
    const indexInOriginal = originalContent.indexOf(moduleStart);
    
    console.log(`📍 Module ${i + 1} starts at position ${indexInOriginal} in original content`);
    
    if (i > 0) {
      const prevModuleContent = moduleContents[i - 1];
      const prevModuleEnd = prevModuleContent.substring(prevModuleContent.length - 50);
      const prevIndexInOriginal = originalContent.indexOf(prevModuleEnd);
      
      if (indexInOriginal < prevIndexInOriginal) {
        console.warn(`⚠️ WARNING: Module ${i + 1} content appears BEFORE Module ${i} in source!`);
        hasGaps = true;
      }
    }
  }
  
  const coveragePercent = (totalDistributedChars / originalContent.length) * 100;
  console.log(`📊 Coverage: ${coveragePercent.toFixed(1)}% of original content distributed`);
  
  if (hasGaps) {
    console.warn(`❌ Sequential distribution FAILED - content is not in order!`);
  } else {
    console.log(`✅ Sequential distribution SUCCESSFUL - content flows naturally`);
  }
  
  return !hasGaps;
};

function CourseCreator() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // Use custom hooks - AI hook first to avoid TDZ
  const { generate: runAI, cancel: cancelAI } = useCourseAI();
  
  const apiKeyHook = useApiKey(currentUser);
  const fileUploadHook = useFileUpload();
  const courseGenerationHook = useCourseGeneration();
  const validationHook = useValidation(addToast);
  const stepStateHook = useCourseStepState(addToast);
  
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
  
  // Debug function to test API keys and connection
  const debugApiKeys = React.useCallback(() => {
    console.log('🔍 API Key Debug Information:');
    console.log('Current provider:', apiProvider);
    console.log('Stored keys:', storedApiKeys);
    
    // Check localStorage directly
    console.log('📦 Direct localStorage check:');
    console.log('  - openai_api_key:', localStorage.getItem('openai_api_key') ? '✅ Found' : '❌ Not found');
    console.log('  - gemini_api_key:', localStorage.getItem('gemini_api_key') ? '✅ Found' : '❌ Not found');
    
    // Test key retrieval
    const openaiKey = getApiKeyForProvider('openai');
    const geminiKey = getApiKeyForProvider('gemini');
    console.log('🔑 Key retrieval results:');
    console.log('  - OpenAI key available:', !!openaiKey);
    console.log('  - Gemini key available:', !!geminiKey);
    
    // Test current API key function
    const currentKey = getCurrentApiKey();
    console.log('🎯 Current API key for', apiProvider, ':', !!currentKey);
  }, [apiProvider, storedApiKeys, getApiKeyForProvider, getCurrentApiKey]);

  // Expose debug functions to window for console testing
  React.useEffect(() => {
    window.debugCourseCreator = {
      debugApiKeys,
      getApiKeyForProvider: getCurrentApiKey,
      testApiConnection: async () => {
        try {
          const apiKey = getCurrentApiKey();
          if (!apiKey) {
            console.log('❌ No API key available for testing');
            return;
          }
          
          console.log('🔄 Testing API connection...');
          const testMessages = [
            { role: 'user', content: 'Say "Hello, API test successful!" if you can read this.' }
          ];
          
          const result = await runAI('Say "Hello, API test successful!" if you can read this.', getCurrentApiKey(), apiProvider);
          console.log('✅ API test result:', result);
        } catch (error) {
          console.error('❌ API test failed:', error);
        }
      },
      testSimpleApi: async () => {
        try {
          const { makeSimpleApiCall } = await import('../utils/simpleApiProxy');
          const apiKey = getCurrentApiKey();
          if (!apiKey) {
            console.log('❌ No API key available for testing');
            return;
          }
          
          console.log('🔄 Testing simple API connection...');
          const testMessages = [
            { role: 'user', content: 'Respond with "Simple API test successful!" if you can read this.' }
          ];
          
          const result = await makeSimpleApiCall(apiProvider, apiKey, testMessages, 50, 0.1);
          console.log('✅ Simple API test result:', result);
        } catch (error) {
          console.error('❌ Simple API test failed:', error);
        }
      }
    };
  }, [getCurrentApiKey, runAI, apiProvider]);

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
  
  
  // Old API key management functions removed - now handled by useApiKey hook
  // Event handlers now handled by useCourseStepState hook
  
  // State management for module name editing
  const [generatedModuleNames, setGeneratedModuleNames] = useState([]);
  const [editableModuleNames, setEditableModuleNames] = useState([]);
  
  // State for generation progress tracking
  const [generationProgress, setGenerationProgress] = useState(0);

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
      const currentApiKey = getApiKeyForGeneration(apiProvider, apiKeyHook);
      const courseStructure = await analyzeContentStructure(sourceContent, currentApiKey);
      
      // Step 2: Generate intelligent module names
      const moduleNames = await generateIntelligentModuleNames(sourceContent, courseStructure, currentApiKey, questionAnswers);
      
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
    setGenerationProgress(0);
    showInfoToast(addToast, 'Starting course generation...');
    
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

        // Validate API key using standardized method
        const currentApiKey = getApiKeyForGeneration(apiProvider, apiKeyHook);
        if (!currentApiKey) {
          setIsGenerating(false);
          setShowApiKeyModal(true);
          showErrorToast(addToast, 'Please configure your AI API key first');
          return;
        }

        console.log('🔑 Using API key for generation:', currentApiKey ? 'Available' : 'Missing');
        console.log('📡 API Provider:', apiProvider);
        
        // Validate API key format
        validateApiKey(currentApiKey, apiProvider);
        
        // Validate all required data before generation
        validateTextContent(sourceContent);
        validateQuestionAnswers(questionAnswers);
        validateMultimediaPrefs(multimediaPrefs);
        
        console.log('API Provider:', apiProvider);
        console.log('API Key exists:', !!currentApiKey);
        console.log('API Key length:', currentApiKey?.length || 0);
        
        // Debug function to test API keys and connection
        const debugApiKeys = () => {
          console.log('🔍 API Key Debug Information:');
          console.log('Current provider:', apiKeyHook.apiProvider);
          console.log('Stored keys:', apiKeyHook.storedApiKeys);
          console.log('OpenAI key available:', !!apiKeyHook.getApiKeyForProvider('openai'));
          console.log('Gemini key available:', !!apiKeyHook.getApiKeyForProvider('gemini'));
          
          // Test API connection
          apiKeyHook.testApiConnection();
        };
        
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
    setGenerationProgress(10);
    showInfoToast(addToast, 'Analyzing content structure...');
    const courseStructure = await analyzeContentStructure(sourceContent, currentApiKey);
    console.log('Enhanced course structure analysis:', courseStructure);
    
    // Display clarification questions to user (could be implemented as a modal)
    console.log('Clarification Questions for Creator:', courseStructure.clarificationQuestions);
      
      // Step 2: Use edited module names if available, otherwise generate them
      setGenerationProgress(20);
      showInfoToast(addToast, 'Preparing module structure...');
      let moduleNames;
      if (editableModuleNames.length > 0) {
        // Use the edited module names from the editor
        moduleNames = editableModuleNames.slice(0, questionAnswers.moduleCount);
        console.log('✅ Using edited module names:', moduleNames);
      } else if (questionAnswers.moduleNaming === 'custom' && questionAnswers.customModuleNames.length > 0) {
        moduleNames = questionAnswers.customModuleNames.slice(0, questionAnswers.moduleCount);
      } else {
        showInfoToast(addToast, 'Generating intelligent module names...');
        moduleNames = await generateIntelligentModuleNames(sourceContent, courseStructure, currentApiKey, questionAnswers);
      }
      
        // Step 3: Generate comprehensive modules with SEQUENTIAL content distribution
        setGenerationProgress(30);
        showInfoToast(addToast, `Generating ${questionAnswers.moduleCount} modules...`);
        console.log(`🚀 Generating ${questionAnswers.moduleCount} modules with SEQUENTIAL content distribution`);
        
        const generatedModules = [];
        const totalModules = questionAnswers.moduleCount;

        // SEQUENTIAL CONTENT DISTRIBUTION
        console.log(`\n📋 STEP 1: Sequential Content Analysis and Distribution`);
        const moduleContents = distributeContentAmongModules(sourceContent, totalModules);
        
        // Validate the sequential distribution
        const isSequential = validateSequentialDistribution(moduleContents, sourceContent);
        if (!isSequential) {
          console.warn(`⚠️ Content distribution may not be perfectly sequential, but proceeding...`);
        }

        console.log(`\n📋 STEP 2: Module Generation with Distributed Content`);
        
        // Process modules sequentially with their assigned content
        for (let i = 0; i < totalModules; i++) {
          const moduleName = moduleNames[i] || `Module ${i + 1}`;
          const moduleProgress = 30 + ((i / totalModules) * 60); // Progress from 30% to 90%
          
          setGenerationProgress(Math.round(moduleProgress));
          showInfoToast(addToast, `Generating module ${i + 1}: ${moduleName}...`);
          
          // Get the SEQUENTIAL content for this specific module
          const moduleSpecificContent = moduleContents[i];
          const contentPosition = `${((i / totalModules) * 100).toFixed(1)}-${(((i + 1) / totalModules) * 100).toFixed(1)}%`;
          
          console.log(`\n📚 Processing Module ${i + 1}: "${moduleName}"`);
          console.log(`📍 Content position in source: ${contentPosition}`);
          console.log(`📄 Module content: ${moduleSpecificContent.length} chars, ${moduleSpecificContent.split(/\s+/).length} words`);
          console.log(`🔍 Content preview: "${moduleSpecificContent.substring(0, 100)}..."`);

          // Generate metadata using the module's SPECIFIC content
          const [optimalLessonCount, moduleDescription] = await Promise.all([
            determineOptimalLessonCount(moduleName, moduleSpecificContent, courseStructure, currentApiKey),
            generateContextualModuleDescription(moduleName, moduleSpecificContent, currentApiKey)
          ]);

          console.log(`🎯 Module "${moduleName}" will have ${optimalLessonCount} lessons`);

          const module = {
            id: `module-${i + 1}`,
            title: moduleName,
            description: moduleDescription,
            learningOutcomes: (courseStructure?.courseBlueprint?.learningOutcomes || []).slice(i * 2, (i + 1) * 2),
            lessons: [],
            assets: courseStructure?.proposedAssets || [],
            contentPosition: contentPosition, // Track where this content came from
            contentWordCount: moduleSpecificContent.split(/\s+/).length
          };

          // Generate lessons using the module's SPECIFIC sequential content
          console.log(`📝 Generating ${optimalLessonCount} lessons for Module ${i + 1}...`);
          const lessonPromises = Array.from({ length: optimalLessonCount }, (_, j) =>
            generateContextualLesson(
              moduleName,
              j + 1,
              optimalLessonCount,
              moduleSpecificContent, // ← CRITICAL: Each module gets its sequential content
              questionAnswers,
              currentApiKey,
              courseStructure
            )
          );

          // Process lessons in batches
          const batchSize = 2;
          for (let batchStart = 0; batchStart < lessonPromises.length; batchStart += batchSize) {
            const batch = lessonPromises.slice(batchStart, batchStart + batchSize);
            const batchResults = await Promise.all(batch);
            module.lessons.push(...batchResults);

            if (batchStart + batchSize < lessonPromises.length) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }

          console.log(`✅ Module ${i + 1} "${moduleName}" completed:`);
          console.log(`   - Expected lessons: ${optimalLessonCount}`);
          console.log(`   - Actual lessons: ${module.lessons.length}`);
          console.log(`   - Content position: ${contentPosition}`);
          console.log(`   - Word count: ${module.contentWordCount} words`);
          
          generatedModules.push(module);

          // Small delay between modules
          if (i < totalModules - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        // Final validation and debugging
        console.log(`\n📋 STEP 3: Final Course Structure Validation`);
        debugSequentialCourse(generatedModules, sourceContent);

      // Debug lesson counts before finalizing
      console.log('🔍 FINAL LESSON COUNT DEBUG:');
      generatedModules.forEach((module, index) => {
        console.log(`   Module ${index + 1}: "${module.title}" - ${module.lessons?.length || 0} lessons`);
      });
      
      const totalLessons = generatedModules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
      console.log(`   📊 Total lessons across all modules: ${totalLessons}`);
      
      // Check if all modules have the same lesson count
      const lessonCounts = generatedModules.map(m => m.lessons?.length || 0);
      const uniqueCounts = [...new Set(lessonCounts)];
      
      if (uniqueCounts.length === 1) {
        console.warn(`⚠️ WARNING: All modules have exactly ${uniqueCounts[0]} lessons - this suggests a bug!`);
      } else {
        console.log(`✅ Good: Modules have varying lesson counts: ${uniqueCounts.join(', ')}`);
      }
      
      // Final progress update
      setGenerationProgress(95);
      showInfoToast(addToast, 'Finalizing course structure...');
      
      // Debug lesson counts before finalizing
      debugLessonCounts(generatedModules);
      
      const course = {
        ...formData,
        modules: generatedModules,
        courseStructure, // Include comprehensive analysis
        scopeOptions: courseStructure.scopeOptions, // Provide flexibility
        clarificationQuestions: courseStructure.clarificationQuestions,
        metadata: {
          totalLessons: generatedModules.reduce((acc, mod) => acc + mod.lessons.length, 0),
          estimatedDuration: generatedModules.reduce((acc, mod) => 
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
      
      // Final progress completion
      setGenerationProgress(100);
      showSuccessToast(addToast, "Course generated successfully!");
      
      // Auto-save the course after successful generation
      console.log('🔄 Auto-saving course after generation...');
      showInfoToast(addToast, "Auto-saving course...");
      
      try {
        // Validate user authentication with detailed logging
        console.log('🔍 Checking user authentication for autosave...');
        console.log('Current user:', currentUser ? { uid: currentUser.uid, email: currentUser.email } : 'null');
        
        if (!currentUser) {
          throw new Error('User not authenticated - please log in to save courses');
        }
        
        if (!currentUser.uid) {
          throw new Error('User ID missing - authentication may be incomplete');
        }
        
        // Validate course data before saving
        if (!course || !course.title) {
          throw new Error('Course data is invalid - missing title');
        }
        
        if (!course.modules || course.modules.length === 0) {
          throw new Error('Course data is invalid - no modules found');
        }
        
        // Clean up the course data to ensure Firestore compatibility
        const cleanCourseData = sanitizeForFirestore(course);
        
        console.log('📝 Auto-saving course to Firestore...', {
          title: cleanCourseData.title,
          moduleCount: cleanCourseData.modules?.length || 0,
          userId: currentUser.uid,
          hasModules: cleanCourseData.modules && cleanCourseData.modules.length > 0
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
        } else if (autoSaveError.message.includes('not authenticated') || autoSaveError.message.includes('User not authenticated')) {
          errorMessage += "Authentication expired. Please log in again.";
        } else if (autoSaveError.message.includes('missing title')) {
          errorMessage += "Course title is missing. Please ensure course generation completed successfully.";
        } else if (autoSaveError.message.includes('no modules')) {
          errorMessage += "Course modules are missing. Please regenerate the course.";
        } else if (autoSaveError.message.includes('User ID missing')) {
          errorMessage += "Authentication incomplete. Please refresh and log in again.";
        } else {
          errorMessage += `Please save manually from the preview page. Error: ${autoSaveError.message}`;
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
        const shouldOpenSettings = await confirmDialog(`❌ ${userMessage}\n\nWould you like to update your API key now?`);
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
      const optimalApiKey = getApiKeyForGeneration(optimalProvider, apiKeyHook);
      
      console.log(`🔍 Analyzing content: ${sourceContent.length} characters with ${optimalProvider}`);
      console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
      
      // Check if content needs chunking
      const maxSingleRequestSize = CHUNK_CONFIG.maxChunkSize[optimalProvider];
      
      if (sourceContent.length > maxSingleRequestSize) {
        console.log('Content is large, using chunking strategy...');
        
        // Chunk the content
        const chunks = chunkLargeContent(sourceContent, optimalProvider);
        
        // Process each chunk
        const chunkResults = await processChunksWithAI(chunks, 'analysis', optimalApiKey, optimalProvider);
        
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
      
      // Use robust API call with retry logic
      const analysisText = await makeRobustApiCall(
        analysisPrompt, 
        optimalApiKey, 
        optimalProvider, 
        runAI
      );
      
      return parseAIResponse(analysisText);
    } catch (error) {
      console.error('Error in comprehensive content analysis:', error);
      
      // Enhanced fallback for analysis
      console.log('🔄 Using enhanced fallback content analysis...');
      showInfoToast(addToast, 'AI unavailable - analyzing content using fallback methods');
      
      return createEnhancedFallback(sourceContent, formData, questionAnswers, {
        errorType: 'ANALYSIS_FAILED',
        message: error.message
      });
    }
  };

const generateIntelligentModuleNames = async (sourceContent, structure, apiKey, questionAnswers) => {
  try {
    // Use standardized API key retrieval
    const optimalProvider = selectOptimalProvider('moduleNames', sourceContent.length);
    const optimalApiKey = getApiKeyForGeneration(optimalProvider, apiKeyHook);
    
    console.log(`🔍 Generating module names with ${optimalProvider}`);
    console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
    
    // If no API key available, immediately fall back to intelligent defaults
    if (!optimalApiKey) {
      console.log('⚠️ No API key available, using intelligent fallback module names');
      return generateFallbackModuleNames(sourceContent, questionAnswers.moduleCount);
    }
    
    // Safely extract main topics from structure
    const mainTopics = (structure && structure.mainTopics && Array.isArray(structure.mainTopics))
      ? structure.mainTopics.join(', ')
      : 'Content analysis in progress';
    
    const prompt = `Based on this course content, create ${questionAnswers.moduleCount} progressive module names that build upon each other:

SOURCE CONTENT:
${sourceContent.substring(0, 2000)}...

MAIN TOPICS IDENTIFIED: ${mainTopics}

REQUIREMENTS:
- Each module should be distinct and specific
- Names should reflect actual content, not generic terms
- Progressive difficulty from basic to advanced
- Each module must focus on different aspects of the content
- Return ONLY the module names, one per line, no numbering or bullets

EXAMPLE FORMAT:
Introduction to Core Concepts
Advanced Methodology and Principles
Practical Implementation Strategies
Mastery and Real-World Applications

Generate ${questionAnswers.moduleCount} unique module names now:`;
    
    console.log(`📝 Module name prompt length: ${prompt.length} characters`);
    console.log(`🎯 Requesting ${questionAnswers.moduleCount} module names`);
    
    // Use robust API call
    const response = await makeRobustApiCall(
      prompt, 
      optimalApiKey, 
      optimalProvider, 
      runAI
    );
    
    console.log(`✅ Module name response received: ${response?.substring(0, 200)}...`);
    
    const moduleNames = (response || '')
      .split('\n')
      .map(name => cleanGeneratedContent(name.trim()))
      .filter(name => name.length > 0 && !name.match(/^\d+[\.\)]/)) // Remove numbered items
      .slice(0, questionAnswers.moduleCount);
    
    // Validate we have enough names
    if (moduleNames.length >= questionAnswers.moduleCount) {
      return moduleNames;
    } else {
      // Fill in missing names with intelligent fallback
      const fallbackNames = generateFallbackModuleNames(sourceContent, questionAnswers.moduleCount);
      while (moduleNames.length < questionAnswers.moduleCount) {
        const missingIndex = moduleNames.length;
        moduleNames.push(fallbackNames[missingIndex] || `Module ${missingIndex + 1}`);
      }
      return moduleNames;
    }
    
  } catch (error) {
    console.error('❌ Error generating module names:', error);
    
    // Use intelligent fallback instead of generic module names
    console.log('⚠️ Module Name Generation Issue, using intelligent fallback');
    return generateFallbackModuleNames(sourceContent, questionAnswers.moduleCount);
    }
  };
  
  // REPLACE your determineOptimalLessonCount function with this enhanced version:
  const determineOptimalLessonCount = async (moduleName, sourceContent, structure, apiKey) => {
    try {
      console.log(`🔍 Determining optimal lesson count for module: "${moduleName}"`);
      
      // Use standardized API key retrieval
      const optimalProvider = selectOptimalProvider('lessonCount', sourceContent.length);
      const optimalApiKey = getApiKeyForGeneration(optimalProvider, apiKeyHook);
      
      if (!optimalApiKey) {
        console.log('⚠️ No API key available, using content-based calculation');
        return calculateContentBasedLessonCount(sourceContent, moduleName);
      }
      
      const prompt = `Analyze this module content and determine the optimal number of lessons for natural learning flow.

MODULE: "${moduleName}"
CONTENT TO ANALYZE:
${sourceContent.substring(0, 2000)}...

CONTENT STATS:
- Word count: ~${sourceContent.split(/\s+/).length} words
- Character count: ${sourceContent.length}

LESSON PLANNING CRITERIA:
- Each lesson should contain 800-1500 words for natural flow
- Lessons should follow natural topic boundaries in the content
- Content should be chunked logically based on concepts, not arbitrarily
- Avoid creating too many short lessons that break up natural flow
- Allow for longer lessons when the content naturally flows together

ANALYSIS REQUIRED:
1. Identify natural conceptual divisions in the content
2. Consider how concepts build upon each other
3. Ensure each lesson covers substantial material
4. Respect the natural structure of the source material

Based on this analysis, what is the optimal number of lessons for this module?

IMPORTANT: Respond with ONLY a number between 1 and 15. Consider that:
- 1-2 lessons: Simple topics (under 1500 words)
- 3-5 lessons: Standard topics (1500-6000 words)  
- 6-10 lessons: Complex topics (6000-12000 words)
- 11-15 lessons: Very comprehensive topics (12000+ words)

Number of lessons:`;
      
      console.log(`📝 Sending lesson count analysis prompt (${prompt.length} chars)`);
      
      const response = await makeRobustApiCall(
        prompt, 
        optimalApiKey, 
        optimalProvider, 
        runAI
      );
      
      console.log(`🤖 AI response for lesson count: "${response}"`);
      
      // Parse the response more carefully
      const cleanResponse = response.trim().replace(/[^\d]/g, ''); // Remove all non-digits
      const lessonCount = parseInt(cleanResponse);
      
      console.log(`🎯 Parsed lesson count: ${lessonCount}`);
      
      // Validate the AI response with expanded range
      if (lessonCount >= 1 && lessonCount <= 15) {
        console.log(`✅ Using AI-determined lesson count: ${lessonCount}`);
        return lessonCount;
      } else {
        console.warn(`⚠️ AI returned invalid lesson count (${lessonCount}), using content-based fallback`);
        return calculateContentBasedLessonCount(sourceContent, moduleName);
      }
      
    } catch (error) {
      console.error('❌ Error determining lesson count:', error);
      console.log('🔄 Falling back to content-based calculation');
      return calculateContentBasedLessonCount(sourceContent, moduleName);
    }
  };
  
  
const generateContextualModuleDescription = async (moduleName, sourceContent, apiKey) => {
  try {
    // Use standardized API key retrieval
    const optimalProvider = selectOptimalProvider('moduleDescription', sourceContent.length);
    const optimalApiKey = getApiKeyForGeneration(optimalProvider, apiKeyHook);
    
    console.log(`🔍 Generating module description with ${optimalProvider}`);
    
    const prompt = `Create a compelling 2-3 sentence description for the module "${moduleName}" based on this source material:

${sourceContent.substring(0, 1000)}

The description should:
- Explain what students will learn
- Highlight key outcomes
- Be specific to the actual content, not generic
- Focus on practical benefits

Write a professional, engaging description:`;
    
    const response = await makeRobustApiCall(
      prompt, 
      optimalApiKey, 
      optimalProvider, 
      runAI
    );
    
    // Clean the generated description
    return cleanGeneratedContent(response);
    
  } catch (error) {
    console.error('Error generating module description:', error);
    return `This module covers essential concepts and practical applications of ${moduleName}. Students will learn key principles and develop hands-on skills for real-world implementation.`;
  }
};
  
  // REPLACE your calculateContentBasedLessonCount function with this:
const calculateContentBasedLessonCount = (sourceContent, moduleName = '') => {
  console.log(`\n🔍 DETAILED ANALYSIS for "${moduleName}":`);
  console.log(`📄 Raw content length: ${sourceContent.length} characters`);
  
  // Split content into paragraphs and analyze structure
  const paragraphs = sourceContent.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  const wordCount = sourceContent.split(/\s+/).length;
  const characterCount = sourceContent.length;
  
  console.log(`📊 Content breakdown:`);
  console.log(`   - Words: ${wordCount}`);
  console.log(`   - Characters: ${characterCount}`);
  console.log(`   - Paragraphs: ${paragraphs.length}`);
  console.log(`   - Content preview: "${sourceContent.substring(0, 100)}..."`);
  
  let contentBasedLessonCount;
  
  // IMPROVED SCALING: Higher word thresholds for more natural content flow
  if (wordCount < 500) {
    contentBasedLessonCount = 1;
    console.log(`🎯 Decision: ${wordCount} words < 500 → 1 lesson`);
  } else if (wordCount < 1200) {
    contentBasedLessonCount = 2;
    console.log(`🎯 Decision: ${wordCount} words < 1200 → 2 lessons`);
  } else if (wordCount < 2000) {
    contentBasedLessonCount = 3;
    console.log(`🎯 Decision: ${wordCount} words < 2000 → 3 lessons`);
  } else if (wordCount < 3000) {
    contentBasedLessonCount = 4;
    console.log(`🎯 Decision: ${wordCount} words < 3000 → 4 lessons`);
  } else if (wordCount < 4500) {
    contentBasedLessonCount = 5;
    console.log(`🎯 Decision: ${wordCount} words < 4500 → 5 lessons`);
  } else if (wordCount < 6000) {
    contentBasedLessonCount = 6;
    console.log(`🎯 Decision: ${wordCount} words < 6000 → 6 lessons`);
  } else if (wordCount < 8000) {
    contentBasedLessonCount = 7;
    console.log(`🎯 Decision: ${wordCount} words < 8000 → 7 lessons`);
  } else if (wordCount < 10000) {
    contentBasedLessonCount = 8;
    console.log(`🎯 Decision: ${wordCount} words < 10000 → 8 lessons`);
  } else if (wordCount < 12000) {
    contentBasedLessonCount = 9;
    console.log(`🎯 Decision: ${wordCount} words < 12000 → 9 lessons`);
  } else if (wordCount < 15000) {
    contentBasedLessonCount = 10;
    console.log(`🎯 Decision: ${wordCount} words < 15000 → 10 lessons`);
  } else {
    // REMOVED THE HARD CAP - now scales with content size
    contentBasedLessonCount = Math.min(15, Math.ceil(wordCount / 1500));
    console.log(`🎯 Decision: ${wordCount} words → ${contentBasedLessonCount} lessons (scaled: ~1500 words per lesson)`);
  }
  
  // Ensure minimum of 1 lesson always
  contentBasedLessonCount = Math.max(1, contentBasedLessonCount);
  
  console.log(`✅ FINAL RESULT: ${contentBasedLessonCount} lessons for "${moduleName}"`);
  console.log(`   📊 Average words per lesson: ~${Math.round(wordCount / contentBasedLessonCount)}`);
  console.log(`────────────────────────────────────────────────────────────────`);
  
  return contentBasedLessonCount;
};
  
  // Enhanced content segmentation functions
  const generateUniqueContentSegments = (sourceContent, totalLessons, lessonNumber) => {
    // Split content by natural boundaries (paragraphs, sections)
    const paragraphs = sourceContent.split(/\n\s*\n|\.\s+(?=[A-Z])/);
    const totalParagraphs = paragraphs.length;
    
    if (totalParagraphs < totalLessons) {
      // If fewer paragraphs than lessons, distribute evenly
      const paragraphsPerLesson = Math.ceil(totalParagraphs / totalLessons);
      const startIndex = (lessonNumber - 1) * paragraphsPerLesson;
      const endIndex = Math.min(startIndex + paragraphsPerLesson, totalParagraphs);
      const content = paragraphs.slice(startIndex, endIndex).join('\n\n');
      
      return {
        content: content || sourceContent.substring(0, 1000), // Fallback if no content
        focus: generateLessonFocus(lessonNumber, totalLessons),
        uniqueId: `lesson-${lessonNumber}-${Date.now()}`
      };
    }
    
    // Use intelligent topic extraction
    const segmentSize = Math.floor(totalParagraphs / totalLessons);
    const startIndex = (lessonNumber - 1) * segmentSize;
    const endIndex = lessonNumber === totalLessons 
      ? totalParagraphs // Last lesson gets remaining content
      : startIndex + segmentSize;
    
    const lessonContent = paragraphs.slice(startIndex, endIndex).join('\n\n');
    
    return {
      content: lessonContent || sourceContent.substring(0, 1000), // Fallback
      focus: generateLessonFocus(lessonNumber, totalLessons),
      uniqueId: `lesson-${lessonNumber}-${Date.now()}`
    };
  };

  const generateLessonFocus = (lessonNumber, totalLessons) => {
    const progressPercentage = lessonNumber / totalLessons;
    
    if (progressPercentage <= 0.25) {
      return "Introduction and foundational concepts";
    } else if (progressPercentage <= 0.5) {
      return "Core principles and methodology";
    } else if (progressPercentage <= 0.75) {
      return "Practical application and examples";
    } else {
      return "Advanced techniques and synthesis";
    }
  };

  // Enhanced content prompt function
const createEnhancedContentPrompt = (moduleTitle, lessonNumber, totalLessons, segmentData, preferences, duration) => {
  return `You are an expert instructional designer creating comprehensive, engaging lesson content.

**CRITICAL REQUIREMENTS:**
1. Create PURE EDUCATIONAL CONTENT - no meta-references to sources, assets, or deliverables
2. Focus ONLY on: ${segmentData.focus}
3. Base content on the provided material and make it flow naturally
4. This lesson MUST be completely different from other lessons in this module

**SOURCE MATERIAL FOR THIS LESSON:**
${segmentData.content}

**LESSON CONTEXT:**
- Module: ${moduleTitle}
- Lesson: ${lessonNumber} of ${totalLessons}
- Focus Area: ${segmentData.focus}
- Duration: ${duration} minutes
- Learning Style: ${preferences.learningStyle}
- Interactivity Level: ${preferences.interactivityLevel}

**CONTENT REQUIREMENTS:**
1. Create 1200-2000 words of PURE, NATURAL educational content
2. Include 3-5 specific learning objectives
3. Provide concrete examples and explanations from the material
4. Create engaging, hands-on exercises
5. Add meaningful reflection questions
6. NO references to "source material", "assets", "deliverables", or "worksheets"

**STRUCTURE (Return as valid JSON):**
{
  "lessonId": "lesson-${lessonNumber}-${segmentData.uniqueId}",
  "title": "[Natural, engaging title based on the content]",
  "uniqueFocus": "${segmentData.focus}",
  "duration": ${duration},
  "learningObjectives": [
    "[Clear, actionable objective 1]",
    "[Clear, actionable objective 2]",
    "[Clear, actionable objective 3]"
  ],
  "contentBlocks": [
    {
      "type": "concept",
      "content": "[Detailed, natural explanation of core concepts (400-600 words). Write as if teaching directly to students. No meta-references.]",
      "duration": 10
    },
    {
      "type": "application",
      "content": "[Practical application and examples (400-600 words). Focus on how to apply these concepts in real situations.]",
      "duration": 15
    },
    {
      "type": "practice",
      "content": "[Engaging practice exercise (300-400 words). Describe what students should do to practice these skills.]",
      "duration": 12
    },
    {
      "type": "reflection",
      "content": "[Meaningful reflection questions and discussion points (200-300 words). Help students connect concepts to their experience.]",
      "duration": 8
    }
  ],
  "assessments": {
    "formative": "[Quick understanding check - specific questions about this lesson's content]",
    "summative": "[Comprehensive assessment - practical application of the concepts learned]"
  }
}

**WRITING STYLE GUIDELINES:**
- Write naturally and engagingly, as if speaking directly to students
- Use concrete examples and real-world applications
- Avoid academic jargon unless necessary
- Make content flow smoothly from one concept to the next
- Focus on practical understanding and application
- No references to external materials, worksheets, or resources

**FORBIDDEN WORDS/PHRASES:**
- "Source material" or "source content"
- "Assets" or "deliverables" 
- "Worksheet" or "template"
- "According to the source"
- "(Source: ...)"
- Any meta-references to course structure

**QUALITY CHECKS:**
- All content flows naturally and educationally
- No meta-references or structural mentions
- Content is substantial and comprehensive
- Examples are concrete and relatable
- Assessment aligns with learning objectives

Return ONLY the JSON structure with natural, flowing educational content.`;
};

// Sequential course structure validation
const debugSequentialCourse = (generatedModules, originalContent) => {
  console.log(`\n🔍 FINAL SEQUENTIAL COURSE VALIDATION:`);
  
  let totalLessons = 0;
  let totalWords = 0;
  
  generatedModules.forEach((module, index) => {
    const lessonCount = module.lessons?.length || 0;
    const wordCount = module.contentWordCount || 0;
    totalLessons += lessonCount;
    totalWords += wordCount;
    
    console.log(`📚 Module ${index + 1}: "${module.title}"`);
    console.log(`   - Position in source: ${module.contentPosition}`);
    console.log(`   - Lessons: ${lessonCount}`);
    console.log(`   - Words: ${wordCount}`);
    console.log(`   - Description: ${module.description?.substring(0, 100)}...`);
  });
  
  console.log(`\n📊 COURSE SUMMARY:`);
  console.log(`   - Total modules: ${generatedModules.length}`);
  console.log(`   - Total lessons: ${totalLessons}`);
  console.log(`   - Total words processed: ${totalWords}`);
  console.log(`   - Original content words: ${originalContent.split(/\s+/).length}`);
  console.log(`   - Content coverage: ${((totalWords / originalContent.split(/\s+/).length) * 100).toFixed(1)}%`);
  
  // Check lesson count variation
  const lessonCounts = generatedModules.map(m => m.lessons?.length || 0);
  const uniqueCounts = [...new Set(lessonCounts)];
  
  if (uniqueCounts.length === 1) {
    console.warn(`⚠️ WARNING: All modules have exactly ${uniqueCounts[0]} lessons - possible bug!`);
  } else {
    console.log(`✅ Good: Lesson count variation: ${lessonCounts.join(', ')} lessons per module`);
  }
  
  // Verify sequential flow
  const positions = generatedModules.map(m => m.contentPosition);
  console.log(`📍 Content positions: ${positions.join(' → ')}`);
  
  return {
    totalModules: generatedModules.length,
    totalLessons,
    lessonVariation: uniqueCounts.length > 1,
    contentCoverage: ((totalWords / originalContent.split(/\s+/).length) * 100).toFixed(1)
  };
};

// Additional debugging function for lesson count issues
const debugLessonCounts = (modules) => {
  console.log('\n🔍 LESSON COUNT DEBUG:');
  modules.forEach((module, index) => {
    console.log(`   Module ${index + 1}: "${module.title}" - ${module.lessons?.length || 0} lessons`);
  });
  
  const totalLessons = modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
  console.log(`   📊 Total lessons across all modules: ${totalLessons}`);
  
  // Check if all modules have the same lesson count
  const lessonCounts = modules.map(m => m.lessons?.length || 0);
  const uniqueCounts = [...new Set(lessonCounts)];
  
  if (uniqueCounts.length === 1) {
    console.warn(`⚠️ WARNING: All modules have exactly ${uniqueCounts[0]} lessons - this suggests a bug!`);
  } else {
    console.log(`✅ Good: Modules have varying lesson counts: ${uniqueCounts.join(', ')}`);
  }
};

// Content distribution validation
const validateContentDistribution = (moduleContents, originalContent) => {
  console.log(`\n🔍 VALIDATING CONTENT DISTRIBUTION:`);
  
  let totalDistributedChars = 0;
  let hasOverlap = false;
  
  for (let i = 0; i < moduleContents.length; i++) {
    const moduleContent = moduleContents[i];
    totalDistributedChars += moduleContent.length;
    
    // Check for content overlap between modules
    for (let j = i + 1; j < moduleContents.length; j++) {
      const otherModuleContent = moduleContents[j];
      const overlap = findContentOverlap(moduleContent, otherModuleContent);
      
      if (overlap > 100) { // More than 100 characters overlap
        console.warn(`⚠️ WARNING: Module ${i + 1} and Module ${j + 1} have ${overlap} characters of overlapping content!`);
        hasOverlap = true;
      }
    }
    
    console.log(`📍 Module ${i + 1}:`);
    console.log(`   - Content length: ${moduleContent.length} characters`);
    console.log(`   - Starts with: "${moduleContent.substring(0, 50)}..."`);
    console.log(`   - Ends with: "...${moduleContent.substring(moduleContent.length - 50)}"`);
  }
  
  const coveragePercent = (totalDistributedChars / originalContent.length) * 100;
  console.log(`📊 Coverage: ${coveragePercent.toFixed(1)}% of original content distributed`);
  
  if (hasOverlap) {
    console.warn(`❌ Content distribution has overlaps between modules!`);
  } else {
    console.log(`✅ Content distribution is clean - no overlaps detected`);
  }
  
  return !hasOverlap && coveragePercent > 80;
};

// Helper function to find content overlap
const findContentOverlap = (content1, content2) => {
  const words1 = content1.split(/\s+/);
  const words2 = content2.split(/\s+/);
  
  let maxOverlap = 0;
  
  // Check for sequences of 10+ words that appear in both contents
  for (let i = 0; i <= words1.length - 10; i++) {
    const sequence = words1.slice(i, i + 10).join(' ');
    if (content2.includes(sequence)) {
      maxOverlap = Math.max(maxOverlap, sequence.length);
    }
  }
  
  return maxOverlap;
};

// Fallback module name generation for when AI is unavailable
const generateFallbackModuleNames = (sourceContent, moduleCount) => {
  const content = sourceContent.toLowerCase();
  const moduleNames = [];
  
  // Common course patterns and their suggested module names
  const patterns = [
    { keywords: ['introduction', 'basics', 'fundamentals', 'getting started'], name: 'Introduction and Fundamentals' },
    { keywords: ['core', 'concepts', 'principles', 'theory'], name: 'Core Concepts and Principles' },
    { keywords: ['practical', 'hands-on', 'implementation', 'practice'], name: 'Practical Implementation' },
    { keywords: ['advanced', 'complex', 'deep dive', 'mastery'], name: 'Advanced Techniques' },
    { keywords: ['application', 'real-world', 'case study', 'project'], name: 'Real-World Applications' },
    { keywords: ['optimization', 'best practices', 'performance'], name: 'Optimization and Best Practices' },
    { keywords: ['troubleshooting', 'debugging', 'problem solving'], name: 'Problem Solving and Troubleshooting' },
    { keywords: ['conclusion', 'summary', 'next steps', 'future'], name: 'Summary and Next Steps' }
  ];
  
  // Try to match content to patterns
  for (let i = 0; i < moduleCount && moduleNames.length < moduleCount; i++) {
    let foundMatch = false;
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => content.includes(keyword)) &&
          !moduleNames.includes(pattern.name)) {
        moduleNames.push(pattern.name);
        foundMatch = true;
        break;
      }
    }
    
    // If no pattern match, use progressive generic names
    if (!foundMatch) {
      const genericNames = [
        'Foundation Concepts',
        'Core Methodology',
        'Practical Applications',
        'Advanced Strategies',
        'Implementation Techniques',
        'Mastery and Integration'
      ];
      const genericName = genericNames[moduleNames.length] || `Module ${moduleNames.length + 1}`;
      if (!moduleNames.includes(genericName)) {
        moduleNames.push(genericName);
      }
    }
  }
  
  // Ensure we have the right number of modules
  while (moduleNames.length < moduleCount) {
    moduleNames.push(`Module ${moduleNames.length + 1}`);
  }
  
  return moduleNames.slice(0, moduleCount);
};

const generateContextualLesson = async (moduleTitle, lessonNumber, totalLessons, sourceContent, preferences, apiKey, courseStructure) => {
  try {
    // Use standardized API key retrieval
    const optimalProvider = selectOptimalProvider('lessonGeneration', sourceContent.length);
    const optimalApiKey = getApiKeyForGeneration(optimalProvider, apiKeyHook);
    
    console.log(`🔍 Generating lesson with ${optimalProvider}`);
    console.log(`🔑 API Key status for ${optimalProvider}: ${optimalApiKey ? 'Available' : 'Missing'}`);
    
    const duration = Math.floor(Math.random() * 25) + 15; // 15-40 minutes
    const systemPrompt = createSystemPrompt(sourceContent, formData, questionAnswers);
    
    // STEP 1: Generate unique content segments (NO MORE OVERLAP!)
    const segmentData = generateUniqueContentSegments(sourceContent, totalLessons, lessonNumber);
    
    // STEP 2: Create enhanced content prompt
    const contentPrompt = createEnhancedContentPrompt(
      moduleTitle, 
      lessonNumber, 
      totalLessons, 
      segmentData, 
      preferences, 
      duration
    );
    
    // STEP 3: Make robust API call with retry logic
    console.log(`📝 Content prompt length: ${contentPrompt.length} characters`);
    console.log(`🎯 Generating lesson ${lessonNumber} with unique focus: ${segmentData.focus}`);
    
    const aiResponse = await makeRobustApiCall(
      contentPrompt, 
      optimalApiKey, 
      optimalProvider, 
      runAI
    );
    
    // Parse the JSON response
    console.log(`📝 Raw AI response length: ${aiResponse.length} characters`);
    console.log(`📝 Response preview: ${aiResponse.substring(0, 200)}...`);
    
    let lessonSpec = {};
    try {
      lessonSpec = parseAIResponse(aiResponse.trim());
      console.log(`✅ Successfully parsed lesson JSON for ${moduleTitle} - Lesson ${lessonNumber}`);
    } catch (e) {
      console.error('❌ Error parsing lesson JSON:', e);
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
        // Use intelligent fallback
        lessonSpec = JSON.parse(generateIntelligentContentFallback(contentPrompt, optimalProvider));
      }
    }
    
    // STEP 4: Generate properly formatted Markdown content
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
- **Learning Objectives** (numbered list)
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

Return only the final, fully formatted Markdown.`;
    
    console.log('🎨 Generating formatted Markdown with enhanced formatting prompt...');
    const formattingResponse = await makeRobustApiCall(
      formattingPrompt, 
      optimalApiKey, 
      optimalProvider, 
      runAI
    );
    
    // Use the formatted response as our markdown content
    const rawMarkdownContent = formattingResponse.trim();
    
    // CLEAN THE CONTENT - remove meta-references
    const cleanedMarkdownContent = cleanGeneratedContent(rawMarkdownContent);
    
    console.log('📝 Cleaned Markdown content:', cleanedMarkdownContent.substring(0, 200) + '...');
    
    // Apply minimal HTML conversion to the cleaned content
    const formattedContent = addMinimalFormatting(cleanedMarkdownContent);
    
    // Clean the lesson spec content blocks
    const cleanedContentBlocks = cleanLessonContentBlocks(lessonSpec.contentBlocks || []);
    const cleanedObjectives = cleanLearningObjectives(lessonSpec.learningObjectives || []);
    
    // Generate multimedia metadata (not content placeholders)
    const multimediaMetadata = generateMultimediaContent(multimediaPrefs, duration);
    
    return {
      id: lessonSpec.lessonId || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: cleanGeneratedContent(lessonSpec.title || `${moduleTitle} - Lesson ${lessonNumber}`),
      duration: lessonSpec.duration || duration,
      learningObjectives: cleanedObjectives,
      contentBlocks: cleanedContentBlocks,
      assessments: {
        formative: cleanGeneratedContent(lessonSpec.assessments?.formative || ''),
        summative: cleanGeneratedContent(lessonSpec.assessments?.summative || '')
      },
      assets: lessonSpec.assets || {},
      uniqueFocus: segmentData.focus,
      segmentId: segmentData.uniqueId,
      // Store both clean Markdown (for editing) and formatted HTML (for display)
      content: cleanedMarkdownContent, // Clean Markdown for CourseEditor
      markdownContent: formattedContent, // Formatted HTML for CourseViewer
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
    
    // Enhanced intelligent fallback for errors
    const insights = extractContentInsights(sourceContent);
    const segmentData = generateUniqueContentSegments(sourceContent, totalLessons, lessonNumber);
    
    let fallbackContent;
    if (sourceContent) {
      fallbackContent = generateIntelligentFallback(sourceContent, insights, moduleTitle, lessonNumber);
    } else {
      fallbackContent = `# ${moduleTitle} - Lesson ${lessonNumber}

## Learning Objectives
1. Understand core concepts from source material
2. Apply practical skills in real-world scenarios
3. Develop critical thinking abilities

## Content
This lesson focuses on ${segmentData.focus}. The content covers essential principles and practical applications that will help you develop a strong foundation in this area.

## Activity
Practice applying the concepts learned in this lesson through hands-on exercises and real-world examples.

## Reflection
- How do these concepts relate to your existing knowledge?
- What practical applications can you identify?
- How might you use these skills in your work or studies?

*Note: Content generated offline. Please customize based on your specific learning objectives.*`;
    }
    
    return {
      id: `lesson-fallback-${lessonNumber}`,
      title: `${moduleTitle} - Lesson ${lessonNumber}`,
      duration: 20,
      learningObjectives: ['Understand core concepts from source material', 'Apply practical skills'],
      contentBlocks: [],
      assessments: {},
      assets: {},
      uniqueFocus: segmentData.focus,
      segmentId: segmentData.uniqueId,
      content: fallbackContent,
      markdownContent: fallbackContent,
      isEditable: true,
      aiProcessingStatus: {
        failed: true,
        errorMessage: error.message,
        canRetry: true
      },
      multimedia: {
        hasAudio: multimediaPrefs?.includeAudio || false,
        hasVideo: multimediaPrefs?.includeVideo || false,
        audioUrl: null,
        videoUrl: null
      }
    };
  }
};
  
  // Enhanced save course function with better error handling
  const saveCourse = async (courseWithVideos = null) => {
    try {
      // Validation checks
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const courseToSave = courseWithVideos || generatedCourse;
      if (!courseToSave) {
        throw new Error('No course data to save');
      }
      
      console.log('🔄 Preparing course data for save...');
      
      // Apply any edited content
      const finalCourse = { ...courseToSave };
      Object.keys(editingContent).forEach(key => {
        const [moduleIndex, lessonIndex] = key.split('-').map(Number);
        if (finalCourse.modules?.[moduleIndex]?.lessons?.[lessonIndex]) {
          finalCourse.modules[moduleIndex].lessons[lessonIndex].content = editingContent[key];
        }
      });

      // Prepare course data with metadata
      const courseData = {
        ...finalCourse,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        isPublic: false,
        version: '1.0',
        lastModified: serverTimestamp(),
        autoSaved: false // This is a manual save
      };

      // Create course document first to get ID
      const courseRef = await addDoc(collection(db, 'courses'), {
        title: courseData.title,
        description: courseData.description,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        isPublic: false,
        version: '1.0'
      });
      
      console.log('📝 Course document created with ID:', courseRef.id);

      // Now use the offload system to save the full course data
      const { saveCourseWithOffload } = await import('../hooks/useCourseSave');
      await saveCourseWithOffload(courseRef.id, courseData);
      
      console.log('✅ Course saved with offload system');
      showSuccessToast(addToast, `Course "${courseToSave.title}" saved successfully!`);
      
      // Navigate to dashboard
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
      } else if (error.message.includes('too large')) {
        errorMessage += "Course content is too large. Please consider splitting into smaller lessons.";
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
  
  // Function to save large courses by splitting into multiple documents
  const saveCourseSplit = async (courseData, userId) => {
    try {
      // Create main course document with metadata only
      const mainCourseData = {
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        difficulty: courseData.difficulty,
        estimatedDuration: courseData.estimatedDuration,
        targetAudience: courseData.targetAudience,
        moduleCount: courseData.modules?.length || 0,
        createdBy: userId,
        createdAt: serverTimestamp(),
        isPublic: false,
        version: '1.0',
        lastModified: serverTimestamp(),
        autoSaved: true,
        isSplit: true // Flag to indicate this course uses split storage
      };
      
      // Save main course document
      const mainDocRef = await addDoc(collection(db, "courses"), mainCourseData);
      const courseId = mainDocRef.id;
      
      console.log('✅ Main course document saved:', courseId);
      
      // Save modules in separate documents
      const modulePromises = courseData.modules.map(async (module, index) => {
        const moduleData = {
          courseId,
          moduleIndex: index,
          ...module,
          createdAt: serverTimestamp()
        };
        
        const moduleDocRef = await addDoc(collection(db, "course_modules"), moduleData);
        console.log(`✅ Module ${index + 1} saved:`, moduleDocRef.id);
        return moduleDocRef.id;
      });
      
      await Promise.all(modulePromises);
      
      console.log('✅ Course split and saved successfully with ID:', courseId);
      showSuccessToast(addToast, "Large course auto-saved successfully! Redirecting to dashboard...");
      
      // Redirect to dashboard after successful autosave
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error saving split course:', error);
      throw error; // Re-throw to be handled by the calling function
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