import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import pdfToText from 'react-pdftotext';

// Remove the problematic PDF.js imports and worker configuration
// import * as pdfjsLib from 'pdfjs-dist';
// pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// Add OpenAI API key at the top
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

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
  
  // Step management
  const [step, setStep] = useState(1);
  const [uploadedContent, setUploadedContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [editingContent, setEditingContent] = useState({});
  
  // Add new state for manual text input
  const [manualTextInput, setManualTextInput] = useState("");
  const [inputMethod, setInputMethod] = useState("file"); // "file" or "text"
  
  // API Key Management - Initialize with stored values immediately
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiProvider, setApiProvider] = useState('gemini'); // 'openai' or 'gemini' - temporarily default to Gemini
  const [apiKey, setApiKey] = useState('');
  const [storedApiKeys, setStoredApiKeys] = useState(() => ({
    openai: localStorage.getItem('openai_api_key') || '',
    gemini: localStorage.getItem('gemini_api_key') || ''
  }));
  
  // Smart API provider selection
  const selectOptimalProvider = (operation, contentLength) => {
    // Use Gemini for large content (cheaper)
    if (contentLength > 20000) {
      return 'gemini';
    }
    
    // Use OpenAI for smaller, quality-critical operations
    if (operation === 'moduleNames' || operation === 'lessonCount') {
      return 'openai';
    }
    
    // Default to current user preference
    return apiProvider;
  };
  
  // Update the content when switching input methods
  const handleInputMethodChange = (method) => {
    setInputMethod(method);
    if (method === "text") {
      setUploadedContent(manualTextInput);
    } else {
      setManualTextInput(uploadedContent);
    }
  };
  
  const handleManualTextChange = (text) => {
    setManualTextInput(text);
    setUploadedContent(text);
  };
  
  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAudience: "",
    learningObjectives: "",
    duration: "",
    difficulty: "beginner",
    category: "",
    additionalRequirements: "",
  });
  
  // Question answers with new fields
  const [questionAnswers, setQuestionAnswers] = useState({
    courseLength: 'medium',
    interactivityLevel: 'medium',
    assessmentType: 'mixed',
    learningStyle: 'mixed',
    moduleCount: 3,
    moduleNaming: 'ai-generated',
    customModuleNames: []
  });
  
  // Multimedia preferences
  const [multimediaPrefs, setMultimediaPrefs] = useState({
    includeAudio: false,
    includeVideo: false,
    voiceStyle: 'professional',
    videoFormat: 'presentation'
  });
  
  // Update stored API keys when user changes
  useEffect(() => {
    if (currentUser) {
      const openaiKey = localStorage.getItem('openai_api_key') || '';
      const geminiKey = localStorage.getItem('gemini_api_key') || '';
      setStoredApiKeys({
        openai: openaiKey,
        gemini: geminiKey
      });
      
      // Only show modal if no API keys are stored
      const hasAnyApiKey = openaiKey || geminiKey;
      if (!hasAnyApiKey) {
        setShowApiKeyModal(true);
      }
    }
  }, [currentUser]);
  
  // API Key Management Functions
  const saveApiKey = () => {
    if (!apiKey.trim()) {
      alert('Please enter a valid API key');
      return;
    }
    
    localStorage.setItem(`${apiProvider}_api_key`, apiKey);
    setStoredApiKeys(prev => ({ ...prev, [apiProvider]: apiKey }));
    setApiKey('');
    setShowApiKeyModal(false);
    alert(`${apiProvider.toUpperCase()} API key saved successfully!`);
  };
  
  const getCurrentApiKey = () => {
    const key = storedApiKeys[apiProvider];
    if (!key || key.trim() === '') {
      console.error(`No API key found for provider: ${apiProvider}`);
      return null;
    }
    return key;
  };
  
  const clearApiKeys = () => {
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('gemini_api_key');
    setStoredApiKeys({ openai: '', gemini: '' });
    alert('All API keys cleared');
  };
  
  // Event handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleQuestionChange = (field, value) => {
    setQuestionAnswers(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCustomModuleNameChange = (index, value) => {
    const newNames = [...questionAnswers.customModuleNames];
    newNames[index] = value;
    setQuestionAnswers(prev => ({ ...prev, customModuleNames: newNames }));
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      
      if (file.type === 'application/pdf') {
        console.log('PDF file details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified)
        });
        
        // Show loading state
        const originalContent = uploadedContent;
        setUploadedContent('Extracting PDF text... Please wait.');
        
        try {
          const result = await extractPDFText(file);
          
          if (result.success) {
            setUploadedContent(result.text);
            alert(`✅ PDF extraction successful!\n\nMethod: ${result.method}\nCharacters: ${result.text.length}\nPages: ${result.pages}\n\nYou can now proceed to the next step.`);
          } else {
            setUploadedContent(originalContent); // Restore previous content
            alert(`❌ PDF extraction failed\n\n${result.error}\n\nPlease try:\n• A different PDF file\n• Converting to text format\n• Using the manual text input option`);
          }
        } catch (error) {
          setUploadedContent(originalContent); // Restore previous content
          console.error('Unexpected error during PDF extraction:', error);
          alert(`❌ Unexpected error during PDF extraction\n\nError: ${error.message}\n\nPlease try a different file or use manual text input.`);
        }
      } else {
        // Handle text files as before
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedContent(e.target.result);
          alert(`✅ Text file loaded successfully!\n\nCharacters: ${e.target.result.length}`);
        };
        reader.readAsText(file);
      }
    }
  };
  
  const handleContentEdit = (moduleIndex, lessonIndex, newContent) => {
    const key = `${moduleIndex}-${lessonIndex}`;
    setEditingContent(prev => ({ ...prev, [key]: newContent }));
  };
  
  const generateCourseWithMultimedia = async () => {
    const currentApiKey = getCurrentApiKey();
    console.log('API Provider:', apiProvider);
    console.log('API Key exists:', !!currentApiKey);
    console.log('API Key length:', currentApiKey?.length || 0);
    
    if (!currentApiKey) {
      setShowApiKeyModal(true);
      alert('Please configure your AI API key first');
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
      const courseStructure = await analyzeContentStructure(sourceContent, currentApiKey);
      console.log('Enhanced course structure analysis:', courseStructure);
      
      // Display clarification questions to user (could be implemented as a modal)
      console.log('Clarification Questions for Creator:', courseStructure.clarificationQuestions);
      
      // Step 2: Generate intelligent module names
      let moduleNames;
      if (questionAnswers.moduleNaming === 'custom' && questionAnswers.customModuleNames.length > 0) {
        moduleNames = questionAnswers.customModuleNames.slice(0, questionAnswers.moduleCount);
      } else {
        moduleNames = await generateIntelligentModuleNames(sourceContent, courseStructure, currentApiKey);
      }
      
      // Step 3: Generate comprehensive modules with dual output
      const modules = [];
      for (let i = 0; i < questionAnswers.moduleCount; i++) {
        const moduleName = moduleNames[i] || `Module ${i + 1}`;
        
        const optimalLessonCount = await determineOptimalLessonCount(moduleName, sourceContent, courseStructure, currentApiKey);
        
        const module = {
          id: `module-${i + 1}`,
          title: moduleName,
          description: await generateContextualModuleDescription(moduleName, sourceContent, currentApiKey),
          learningOutcomes: courseStructure.courseBlueprint.learningOutcomes.slice(i * 2, (i + 1) * 2),
          lessons: [],
          assets: courseStructure.proposedAssets
        };
        
        // Generate comprehensive lessons with IP attribution
        for (let j = 0; j < optimalLessonCount; j++) {
          const lesson = await generateContextualLesson(
            moduleName, 
            j + 1, 
            optimalLessonCount, 
            sourceContent, 
            questionAnswers, 
            currentApiKey,
            courseStructure
          );
          module.lessons.push(lesson);
        }
        
        modules.push(module);
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
          difficulty: courseStructure.courseBlueprint.targetAudience,
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
  
  // Ultra-high token limits leveraging full LLM capabilities
  const TOKEN_LIMITS = {
    openai: {
      analysis: 50000,        // Was 1200 - now 40x larger for comprehensive analysis
      lessonGeneration: 80000, // Was 2500 - now 32x larger for detailed lessons
      moduleDescription: 15000, // Was 150 - now 100x larger for rich descriptions
      moduleNames: 10000,     // Was 250 - now 40x larger for creative naming
      lessonCount: 5000       // Was 10 - now 500x larger for thorough planning
    },
    gemini: {
      analysis: 50000,        // Reduced from 150000
      lessonGeneration: 80000, // Reduced from 200000
      moduleDescription: 20000, // Reduced from 50000
      moduleNames: 10000,     // Reduced from 30000
      lessonCount: 5000       // Reduced from 15000
    }
  };

  // For GPT-5 when available (400K context)
  const GPT5_TOKEN_LIMITS = {
    analysis: 120000,
    lessonGeneration: 180000,
    moduleDescription: 40000,
    moduleNames: 25000,
    lessonCount: 12000
  };

  // Dynamic provider detection
  const getTokenLimit = (operation, modelVersion = 'standard') => {
    if (modelVersion === 'gpt5' || apiProvider.includes('gpt-5')) {
      return GPT5_TOKEN_LIMITS[operation];
    }
    return TOKEN_LIMITS[apiProvider]?.[operation] || TOKEN_LIMITS.openai[operation];
  };

  // Add usage tracking
  const trackApiUsage = (provider, operation, tokenCount, cost) => {
    const usage = {
      timestamp: new Date().toISOString(),
      provider,
      operation,
      tokenCount,
      estimatedCost: cost,
      userId: currentUser?.uid
    };
    
    // Log to console for now, later save to Firebase
    console.log('API Usage:', usage);
    
    // Optional: Save to localStorage for tracking
    const existingUsage = JSON.parse(localStorage.getItem('apiUsage') || '[]');
    existingUsage.push(usage);
    localStorage.setItem('apiUsage', JSON.stringify(existingUsage.slice(-100))); // Keep last 100 entries
  };

  // Enhanced AI Helper Functions with better error capture
  const makeAIRequest = async (messages, apiKey, maxTokens = 300, temperature = 0.7, providerOverride = null) => {
    const currentProvider = providerOverride || apiProvider;
    try {
      if (currentProvider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode = errorData.error?.code;
          const errorMessage = errorData.error?.message || response.statusText;
          
          let errorType = 'UNKNOWN';
          let enhancedMessage = errorMessage;
          
          // Enhanced quota/billing error handling
          if (response.status === 429) {
            if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorCode === 'insufficient_quota') {
              errorType = 'QUOTA_EXCEEDED';
              enhancedMessage = `${errorMessage}\n\nSolutions:\n1. Add credits to your OpenAI account\n2. Increase your spending limit\n3. Switch to Gemini API temporarily`;
            } else {
              errorType = 'RATE_LIMIT';
            }
          } else if (response.status === 401) {
            errorType = 'INVALID_API_KEY';
          } else if (response.status === 500) {
            errorType = 'SERVER_ERROR';
          }
          
          const errorDetails = {
            status: response.status,
            statusText: response.statusText,
            provider: 'OpenAI',
            errorType: errorType,
            message: enhancedMessage,
            timestamp: new Date().toISOString()
          };
          throw new Error(JSON.stringify(errorDetails));
        }
        
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } else if (currentProvider === 'gemini') {
        // Convert OpenAI message format to Gemini format
        const geminiText = messages.map(msg => {
          if (msg.role === 'system') {
            return `System: ${msg.content}`;
          } else if (msg.role === 'user') {
            return `User: ${msg.content}`;
          }
          return msg.content;
        }).join('\n\n');
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: geminiText }]
            }],
            generationConfig: {
              temperature: temperature,
              maxOutputTokens: maxTokens,
            }
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          let errorType = 'UNKNOWN';
          let enhancedMessage = errorData.error?.message || `Gemini API error: ${response.status}`;
          
          // Enhanced Gemini-specific error handling
          if (response.status === 400) {
            if (enhancedMessage.includes('model not found')) {
              errorType = 'MODEL_NOT_FOUND';
              enhancedMessage = 'Gemini model not available. Try gemini-1.5-pro instead.';
            } else if (enhancedMessage.includes('safety')) {
              errorType = 'CONTENT_FILTERED';
              enhancedMessage = 'Content blocked by safety filters. Try rephrasing your content.';
            } else {
              errorType = 'INVALID_REQUEST';
            }
          } else if (response.status === 401) {
            errorType = 'INVALID_API_KEY';
          } else if (response.status === 429) {
            errorType = 'RATE_LIMIT';
          } else if (response.status === 500) {
            errorType = 'SERVER_ERROR';
          }
          
          const errorDetails = {
            status: response.status,
            statusText: response.statusText,
            provider: 'Gemini',
            errorType: errorType,
            message: enhancedMessage,
            timestamp: new Date().toISOString()
          };
          throw new Error(JSON.stringify(errorDetails));
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
      }
      
      throw new Error(JSON.stringify({
        errorType: 'UNSUPPORTED_PROVIDER',
        message: 'Unsupported AI provider',
        provider: currentProvider,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      // If it's already a structured error, re-throw it
      if (error.message.startsWith('{')) {
        throw error;
      }
      
      // Handle network and other errors
      const errorDetails = {
        errorType: 'NETWORK_ERROR',
        message: error.message || 'Network or connection error',
        provider: currentProvider,
        timestamp: new Date().toISOString()
      };
      throw new Error(JSON.stringify(errorDetails));
    }
  };
  
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

  const analyzeContentStructure = async (sourceContent, apiKey) => {
    try {
      // Use smart provider selection for analysis
      const optimalProvider = selectOptimalProvider('analysis', sourceContent.length);
      const optimalApiKey = storedApiKeys[optimalProvider] || apiKey;
      
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
      return JSON.parse(analysisText);
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
    
    return {
      sourceAnalysis: {
        keyClaims: ['Core principles identified', 'Practical applications noted'],
        keyTerms: ['Key terminology extracted'],
        frameworks: ['Methodological approaches identified'],
        examples: ['Real-world examples noted'],
        authorVoice: 'Professional and informative'
      },
      courseBlueprint: {
        targetAudience: formData.targetAudience,
        prerequisites: ['Basic understanding of the subject'],
        learningOutcomes: ['Understand core concepts', 'Apply practical skills', 'Demonstrate competency'],
        syllabus: ['Foundation concepts', 'Practical applications', 'Advanced techniques']
      },
      contentGaps: {
        missingConcepts: ['Additional context needed'],
        needsVerification: ['Source verification required'],
        suggestedAdditions: ['Industry examples', 'Current trends']
      },
      scopeOptions: {
        lite: { duration: '2-3 hours', modules: 2, focus: 'Essential concepts only' },
        core: { duration: '4-6 hours', modules: questionAnswers.moduleCount, focus: 'Comprehensive coverage' },
        deepDive: { duration: '8-12 hours', modules: questionAnswers.moduleCount + 2, focus: 'Advanced applications' }
      },
      assessmentStrategy: {
        formativeAssessments: ['Knowledge checks', 'Quick exercises'],
        summativeAssessments: ['Project work', 'Practical demonstrations'],
        rubricAreas: ['Understanding', 'Application', 'Quality']
      },
      proposedAssets: {
        worksheets: ['Practice exercises', 'Planning templates'],
        templates: ['Project templates', 'Checklists'],
        resources: ['Additional readings', 'Tool recommendations']
      },
      clarificationQuestions: [
        'What specific outcomes are most important for your learners?',
        'Are there industry-specific examples you\'d like included?',
        'What tools or platforms should learners be familiar with?',
        'How technical should the content be for your audience?',
        'Are there any topics that should be emphasized or avoided?'
      ],
      aiProcessingStatus: {
        failed: true,
        errorType: errorDetails.errorType,
        errorMessage: userMessage,
        timestamp: errorDetails.timestamp,
        canRetry: ['RATE_LIMIT', 'SERVER_ERROR', 'NETWORK_ERROR'].includes(errorDetails.errorType)
      }
    };
  }
  };
  
  const generateIntelligentModuleNames = async (sourceContent, structure, apiKey) => {
    try {
      // Use smart provider selection for module names
      const optimalProvider = selectOptimalProvider('moduleNames', sourceContent.length);
      const optimalApiKey = storedApiKeys[optimalProvider] || apiKey;
      
      const prompt = `Based on this course content, create ${questionAnswers.moduleCount} progressive module names that build upon each other:\n\n${sourceContent}\n\nMain topics identified: ${structure.mainTopics?.join(', ') || 'Content analysis in progress'}\n\nRequirements:\n- Each module should be distinct and specific\n- Names should reflect actual content, not generic terms\n- Progressive difficulty from basic to advanced\n- Return ONLY the module names, one per line, no numbering or bullets`;
      
      const response = await makeAIRequest([{ role: 'user', content: prompt }], optimalApiKey, getTokenLimit('moduleNames'), 0.7, optimalProvider);
      
      const moduleNames = response.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .slice(0, questionAnswers.moduleCount);
      
      return moduleNames.length >= questionAnswers.moduleCount ? 
        moduleNames : 
        [...moduleNames, ...Array.from({length: questionAnswers.moduleCount - moduleNames.length}, (_, i) => `Module ${moduleNames.length + i + 1}`)];
        
    } catch (error) {
      console.error('Error generating module names:', error);
      
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
      alert(`⚠️ Module Name Generation Issue\n\n${userMessage}\n\nUsing default module names.`);
      
      return Array.from({length: questionAnswers.moduleCount}, (_, i) => `Module ${i + 1}`);
    }
  };
  
  const determineOptimalLessonCount = async (moduleName, sourceContent, structure, apiKey) => {
    try {
      // Use smart provider selection for lesson count
      const optimalProvider = selectOptimalProvider('lessonCount', sourceContent.length);
      const optimalApiKey = storedApiKeys[optimalProvider] || apiKey;
      
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
      const optimalApiKey = storedApiKeys[optimalProvider] || apiKey;
      
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
      const optimalApiKey = storedApiKeys[optimalProvider] || apiKey;
      
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
          lessonSpec = JSON.parse(jsonMatch[1].trim());
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
  
  // API Key Modal Component
  const renderApiKeyModal = () => {
    if (!showApiKeyModal) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>🤖 AI Configuration</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            To generate AI-powered courses, please configure your API key for either OpenAI or Google Gemini.
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Choose AI Provider:</label>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="openai"
                    checked={apiProvider === 'openai'}
                    onChange={(e) => setApiProvider(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  OpenAI
                </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="gemini"
                  checked={apiProvider === 'gemini'}
                  onChange={(e) => setApiProvider(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                Google Gemini
              </label>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              {apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API Key:
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key`}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {apiProvider === 'openai' ? 
                'Get your API key from: https://platform.openai.com/api-keys' :
                'Get your API key from: https://makersuite.google.com/app/apikey'
              }
            </p>
          </div>
          
          {(storedApiKeys.openai || storedApiKeys.gemini) && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                <strong>Current API Keys:</strong><br/>
                OpenAI: {storedApiKeys.openai ? '✅ Configured' : '❌ Not set'}<br/>
                Gemini: {storedApiKeys.gemini ? '✅ Configured' : '❌ Not set'}
              </p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {(storedApiKeys.openai || storedApiKeys.gemini) && (
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={clearApiKeys}
              style={{
                padding: '10px 20px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear All Keys
            </button>
            <button
              onClick={saveApiKey}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save API Key
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render functions for each step
  const renderStep1 = () => (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>📚 Step 1: Course Information & Content Upload</h2>
      
      <div style={{ display: "grid", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Course Title:</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
            placeholder="Enter your course title"
            autocomplete="off"
            autoComplete="off"
          />
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Course Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd", minHeight: "100px" }}
            placeholder="Describe what your course covers"
          />
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Course Material:</label>
          
          {/* Input method selector */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
              <input
                type="radio"
                name="inputMethod"
                value="file"
                checked={inputMethod === "file"}
                onChange={(e) => handleInputMethodChange(e.target.value)}
                style={{ marginRight: "8px" }}
              />
              📁 Upload File (PDF, TXT, DOCX)
            </label>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="radio"
                name="inputMethod"
                value="text"
                checked={inputMethod === "text"}
                onChange={(e) => handleInputMethodChange(e.target.value)}
                style={{ marginRight: "8px" }}
              />
              ✏️ Paste or Type Text
            </label>
          </div>
          
          {/* File upload section */}
          {inputMethod === "file" && (
            <div>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx"
                style={{ marginBottom: "10px" }}
              />
              <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                ✅ Hybrid PDF extraction with multiple fallback methods for maximum compatibility
              </p>
            </div>
          )}
          
          {/* Manual text input section */}
          {inputMethod === "text" && (
            <div>
              <textarea
                value={manualTextInput}
                onChange={(e) => handleManualTextChange(e.target.value)}
                placeholder="Paste your course content here or type it directly...\n\nYou can include:\n• Course outlines\n• Lecture notes\n• Book chapters\n• Articles\n• Any text-based material"
                style={{
                  width: "100%",
                  minHeight: "200px",
                  padding: "15px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  fontFamily: "Arial, sans-serif",
                  resize: "vertical"
                }}
              />
              <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                💡 Tip: You can copy and paste content from PDFs, websites, or documents
              </p>
            </div>
          )}
          
          {/* Content preview */}
          {uploadedContent && (
            <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
              <p><strong>Content preview ({uploadedContent.length} characters):</strong></p>
              <p style={{ fontSize: "12px", color: "#666", maxHeight: "100px", overflow: "auto" }}>
                {uploadedContent.substring(0, 300)}...
              </p>
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={() => setStep(2)}
        disabled={!formData.title || !formData.description}
        style={{
          marginTop: "20px",
          padding: "12px 24px",
          backgroundColor: formData.title && formData.description ? "#3498db" : "#bdc3c7",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: formData.title && formData.description ? "pointer" : "not-allowed"
        }}
      >
        Next: AI Questionnaire →
      </button>
    </div>
  );
  
  const renderStep2 = () => (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🤖 Step 2: AI Questionnaire</h2>
      
      <div style={{ display: "grid", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>📚 Number of Course Modules:</label>
          <select
            value={questionAnswers.moduleCount}
            onChange={(e) => handleQuestionChange('moduleCount', parseInt(e.target.value))}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value={2}>2 Modules - Quick & Focused</option>
            <option value={3}>3 Modules - Balanced Structure</option>
            <option value={4}>4 Modules - Comprehensive</option>
            <option value={5}>5 Modules - In-depth Coverage</option>
            <option value={6}>6+ Modules - Extensive Course</option>
          </select>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            More modules allow better pacing and digestible learning chunks
          </p>
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>🏷️ Module Naming Preference:</label>
          <select
            value={questionAnswers.moduleNaming}
            onChange={(e) => handleQuestionChange('moduleNaming', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="ai-generated">Let AI suggest module names</option>
            <option value="custom">I'll provide custom module names</option>
            <option value="collaborative">AI suggests, I can modify</option>
          </select>
          
          {questionAnswers.moduleNaming === 'custom' && (
            <div style={{ marginTop: "15px" }}>
              <p style={{ marginBottom: "10px", fontWeight: "bold" }}>Enter your module names:</p>
              {Array.from({ length: questionAnswers.moduleCount }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Module ${i + 1} name`}
                  value={questionAnswers.customModuleNames[i] || ''}
                  onChange={(e) => handleCustomModuleNameChange(i, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    margin: "5px 0",
                    borderRadius: "4px",
                    border: "1px solid #ddd"
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Preferred Course Length:</label>
          <select
            value={questionAnswers.courseLength}
            onChange={(e) => handleQuestionChange('courseLength', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="short">Short (1-2 hours)</option>
            <option value="medium">Medium (3-5 hours)</option>
            <option value="long">Long (6+ hours)</option>
          </select>
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Learning Style Focus:</label>
          <select
            value={questionAnswers.learningStyle}
            onChange={(e) => handleQuestionChange('learningStyle', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="visual">Visual (diagrams, charts)</option>
            <option value="auditory">Auditory (explanations, discussions)</option>
            <option value="kinesthetic">Kinesthetic (hands-on, practical)</option>
            <option value="mixed">Mixed approach</option>
          </select>
        </div>
      </div>
      
      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setStep(1)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Next: Multimedia Options →
        </button>
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🎬 Step 3: Multimedia Content Preferences</h2>
      
      <div style={{ display: "grid", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
            <input
              type="checkbox"
              checked={multimediaPrefs.includeAudio}
              onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeAudio: e.target.checked }))}
              style={{ marginRight: "10px" }}
            />
            <span style={{ fontWeight: "bold" }}>🎵 Include Audio Content</span>
          </label>
          
          {multimediaPrefs.includeAudio && (
            <div style={{ marginLeft: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Voice Style:</label>
              <select
                value={multimediaPrefs.voiceStyle}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, voiceStyle: e.target.value }))}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="energetic">Energetic</option>
              </select>
            </div>
          )}
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
            <input
              type="checkbox"
              checked={multimediaPrefs.includeVideo}
              onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeVideo: e.target.checked }))}
              style={{ marginRight: "10px" }}
            />
            <span style={{ fontWeight: "bold" }}>🎥 Include Video Content</span>
          </label>
          
          {multimediaPrefs.includeVideo && (
            <div style={{ marginLeft: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Video Format:</label>
              <select
                value={multimediaPrefs.videoFormat}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, videoFormat: e.target.value }))}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="presentation">Presentation Style</option>
                <option value="screencast">Screen Recording</option>
                <option value="talking-head">Talking Head</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setStep(2)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(4)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Next: Generate Course →
        </button>
      </div>
    </div>
  );
  
  const renderStep4 = () => (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px", textAlign: "center" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>⚡ Step 4: AI Course Generation</h2>
      
      {!isGenerating ? (
        <div>
          <p style={{ marginBottom: "20px", fontSize: "16px" }}>
            Ready to generate your course with AI! This will create:
          </p>
          <ul style={{ textAlign: "left", maxWidth: "400px", margin: "0 auto 20px" }}>
            <li>{questionAnswers.moduleCount} modules with custom structure</li>
            <li>Comprehensive lesson content</li>
            <li>Interactive elements and assessments</li>
            {multimediaPrefs.includeAudio && <li>Audio narration</li>}
            {multimediaPrefs.includeVideo && <li>Video content</li>}
          </ul>
          
          <button
            onClick={generateCourseWithMultimedia}
            style={{
              padding: "15px 30px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            🚀 Generate My Course
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              width: "50px",
              height: "50px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #3498db",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}></div>
          </div>
          <h3>🤖 AI is generating your course...</h3>
          <p>This may take a few moments. Please wait.</p>
        </div>
      )}
      
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => setStep(3)}
          disabled={isGenerating}
          style={{
            padding: "12px 24px",
            backgroundColor: isGenerating ? "#bdc3c7" : "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isGenerating ? "not-allowed" : "pointer"
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
  
  const renderStep5 = () => (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>📋 Step 5: Review & Edit Generated Course</h2>
      
      {generatedCourse && (
        <div>
          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
            <h3>{generatedCourse.title}</h3>
            <p><strong>Description:</strong> {generatedCourse.description}</p>
            <p><strong>Modules:</strong> {generatedCourse.modules.length}</p>
            
            {/* Show module breakdown with individual durations */}
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "10px" }}>Module Breakdown:</h4>
              {generatedCourse.modules.map((module, index) => {
                const moduleDuration = module.lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);
                return (
                  <div key={module.id} style={{ marginBottom: "8px", fontSize: "14px" }}>
                    <strong>{module.title}:</strong> {module.lessons.length} lessons, {moduleDuration} minutes
                  </div>
                );
              })}
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #eee", fontWeight: "bold" }}>
                <strong>Total Duration:</strong> {generatedCourse.metadata.estimatedDuration} minutes ({Math.round(generatedCourse.metadata.estimatedDuration / 60)} hours)
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <h4>Course Content:</h4>
            {generatedCourse.modules.map((module, moduleIndex) => (
              <div key={module.id} style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
                <h5 style={{ color: "#2c3e50" }}>{module.title}</h5>
                <p style={{ fontSize: "14px", color: "#666" }}>{module.description}</p>
                
                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.id} style={{ marginLeft: "20px", marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                    <h6>{lesson.title}</h6>
                    <textarea
                      value={editingContent[`${moduleIndex}-${lessonIndex}`] || lesson.markdownContent || lesson.content || ''}
                      onChange={(e) => handleContentEdit(moduleIndex, lessonIndex, e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "100px",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "14px"
                      }}
                    />
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      Duration: {lesson.duration} minutes
                      {lesson.multimedia?.hasAudio && " | 🎵 Audio"}
                      {lesson.multimedia?.hasVideo && " | 🎥 Video"}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setStep(4)}
              style={{
                padding: "12px 24px",
                backgroundColor: "#95a5a6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              ← Back to Generation
            </button>
            <button
              onClick={saveCourse}
              style={{
                padding: "12px 24px",
                backgroundColor: "#27ae60",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              💾 Save Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
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
        <h1 style={{ color: "#2c3e50" }}>🎓 AI-Powered Course Creator</h1>
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
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      
      {/* Add this line to render the API key modal */}
      {renderApiKeyModal()}
    </div>
  );
}

export default CourseCreator;