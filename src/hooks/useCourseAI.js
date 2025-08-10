import { useCallback } from 'react';
import {
  validateApiKey,
  validateTextContent,
  validateQuestionAnswers,
  validateMultimediaPrefs,
  ValidationError
} from '../utils/validation';
import { showInfoToast, showErrorToast } from '../components/Toast';

/**
 * Custom hook for handling AI-powered course generation
 * @param {Object} apiKeyHook - API key management hook
 * @param {Object} courseGenerationHook - Course generation hook
 * @param {Function} addToast - Toast notification function
 * @returns {Object} AI orchestration functions
 */
const useCourseAI = (apiKeyHook, courseGenerationHook, addToast) => {
  const {
    apiProvider,
    getCurrentApiKey,
    selectOptimalProvider,
    storedApiKeys,
    setShowApiKeyModal,
    handleApiFailover,
    getApiKeyForProvider
  } = apiKeyHook;

  const {
    setIsGenerating,
    setGeneratedCourse,
    getTokenLimit,
    chunkLargeContent
  } = courseGenerationHook;

  // Model token limits for validation
  const MODEL_MAX_TOKENS = {
    'gpt-4o': 16384,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 4096
  };

  // Validate token requests against model limits
  const validateTokenRequest = useCallback((maxTokens, operation = 'default') => {
    const modelLimit = MODEL_MAX_TOKENS['gpt-4o'] || 4096;
    const safeLimit = Math.min(maxTokens, modelLimit - 100); // 100 token buffer
    
    if (maxTokens > modelLimit) {
      console.warn(`⚠️ Token request ${maxTokens} exceeds model limit ${modelLimit} for operation '${operation}', using ${safeLimit}`);
    }
    
    return safeLimit;
  }, []);

  // CORRECTED TOKEN LIMITS - Conservative limits within OpenAI's actual model limits
  const TOKEN_LIMITS = {
    openai: {
      analysis: 4000,
      lessonGeneration: 3000,
      moduleDescription: 2000,
      moduleNames: 1000,
      lessonCount: 1000
    },
    gemini: {
      analysis: 4000,
      lessonGeneration: 3000,
      moduleDescription: 2000,
      moduleNames: 1000,
      lessonCount: 1000
    }
  };

  // Enhanced AI Helper Functions with intelligent failover
  const makeAIRequest = useCallback(async (messages, apiKey, maxTokens = 300, temperature = 0.7, providerOverride = null) => {
    let currentProvider = providerOverride || selectOptimalProvider('general', JSON.stringify(messages).length);
    let currentApiKey = apiKey || getApiKeyForProvider(currentProvider);
    let retryCount = 0;
    const maxRetries = 2; // Allow one failover attempt
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`🤖 AI Request attempt ${retryCount + 1} using ${currentProvider.toUpperCase()}`);
        console.log(`🔑 API Key status: ${currentApiKey ? 'Available' : 'Missing'} for ${currentProvider}`);
        
        if (!currentApiKey) {
          const errorMsg = `No valid API key found for ${currentProvider}. Please check your .env file or add keys via the UI.`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(JSON.stringify({
            errorType: 'INVALID_API_KEY',
            message: errorMsg,
            provider: currentProvider,
            suggestion: 'Add your API keys to the .env file or use the API key modal'
          }));
        }
        
        if (currentProvider === 'openai') {
          const validatedMaxTokens = validateTokenRequest(maxTokens, 'openai-request');
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentApiKey}`
            },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: validatedMaxTokens,
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
            if ((errorMessage && errorMessage.includes('quota')) || (errorMessage && errorMessage.includes('billing')) || errorCode === 'insufficient_quota') {
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
        return data?.choices?.[0]?.message?.content?.trim() || '';
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
            if (enhancedMessage && enhancedMessage.includes('model not found')) {
              errorType = 'MODEL_NOT_FOUND';
              enhancedMessage = 'Gemini model not available. Try gemini-1.5-pro instead.';
            } else if (enhancedMessage && enhancedMessage.includes('safety')) {
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
        console.error(`❌ AI Request failed with ${currentProvider}:`, error.message);
        
        // Parse error details if available
        let errorDetails = {};
        try {
          errorDetails = JSON.parse(error.message);
        } catch (e) {
          errorDetails = { 
            errorType: 'NETWORK_ERROR', 
            message: error.message || 'Network or connection error',
            provider: currentProvider 
          };
        }
        
        // Attempt failover if this is a retryable error
        const retryableErrors = ['QUOTA_EXCEEDED', 'RATE_LIMIT', 'INVALID_API_KEY', 'SERVER_ERROR'];
        if (retryableErrors.includes(errorDetails.errorType) && retryCount < maxRetries) {
          console.log(`🔄 Attempting failover due to ${errorDetails.errorType}`);
          
          // Try to failover to the other provider
          const fallbackProvider = handleApiFailover(currentProvider, errorDetails.errorType, errorDetails.message);
          
          if (fallbackProvider && fallbackProvider !== currentProvider) {
            currentProvider = fallbackProvider;
            currentApiKey = getApiKeyForProvider(currentProvider);
            retryCount++;
            continue; // Retry with new provider
          }
        }
        
        // If we've exhausted retries or can't failover, throw the error
        if (retryCount >= maxRetries) {
          console.error(`❌ All retry attempts exhausted for AI request`);
          throw error;
        }
        
        // For non-retryable errors, throw immediately
        throw error;
      }
    }
    
    // This should never be reached, but just in case
    throw new Error(JSON.stringify({
      errorType: 'MAX_RETRIES_EXCEEDED',
      message: 'Maximum retry attempts exceeded',
      provider: currentProvider,
      timestamp: new Date().toISOString()
    }));
  }, [apiProvider, selectOptimalProvider, getApiKeyForProvider, handleApiFailover, validateTokenRequest]);

  // Process Chunks with AI
  const processChunksWithAI = useCallback(async (chunks, operation, apiKey, provider) => {
    const results = [];
    const totalChunks = chunks.length;
    
    console.log(`Processing ${totalChunks} chunks for ${operation}...`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`Processing chunk ${i + 1}/${totalChunks} (${chunk.size} chars)...`);
        
        // Add chunk context to the prompt
        const chunkPrompt = `
CHUNK CONTEXT:
- Chunk ${chunk.chunkNumber} of ${chunk.totalChunks}
- Size: ${chunk.size} characters
- Position: ${chunk.startIndex}-${chunk.endIndex}
- Is Final Chunk: ${chunk.isComplete}

CHUNK CONTENT:
${chunk.content}

${operation === 'analysis' ? 'Analyze this chunk and extract key information:' : 'Process this chunk:'}`;
        
        const result = await makeAIRequest(
          [{ role: 'user', content: chunkPrompt }],
          apiKey,
          getTokenLimit(operation),
          0.3,
          provider
        );
        
        results.push({
          chunkId: chunk.id,
          chunkNumber: chunk.chunkNumber,
          result: result,
          processed: true,
          timestamp: new Date().toISOString()
        });
        
        // Small delay between chunks to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Error processing chunk ${chunk.id}:`, error);
        
        results.push({
          chunkId: chunk.id,
          chunkNumber: chunk.chunkNumber,
          result: null,
          processed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }, [makeAIRequest, getTokenLimit]);

  return {
    makeAIRequest,
    processChunksWithAI,
    validateTokenRequest,
    TOKEN_LIMITS
  };
};

export default useCourseAI;
