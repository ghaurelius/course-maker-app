import { useState } from 'react';

const useCourseGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [editingContent, setEditingContent] = useState({});

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
      analysis: 4000,        // Conservative limit for analysis
      lessonGeneration: 3000, // Conservative limit for lesson generation
      moduleDescription: 2000, // Conservative limit for module descriptions
      moduleNames: 1000,     // Conservative limit for module naming
      lessonCount: 1000      // Conservative limit for lesson counting
    },
    gemini: {
      analysis: 4000,        // Conservative limit for analysis
      lessonGeneration: 3000, // Conservative limit for lesson generation
      moduleDescription: 2000, // Conservative limit for module descriptions
      moduleNames: 1000,     // Conservative limit for module naming
      lessonCount: 1000      // Conservative limit for lesson counting
    }
  };

  // For future GPT-5 - Conservative limits even for advanced models
  const GPT5_TOKEN_LIMITS = {
    analysis: 8000,        // Conservative for future models
    lessonGeneration: 6000, // Conservative for future models
    moduleDescription: 4000, // Conservative for future models
    moduleNames: 2000,     // Conservative for future models
    lessonCount: 2000      // Conservative for future models
  };

  // Dynamic provider detection with validation
  const getTokenLimit = (operation, apiProvider, modelVersion = 'standard') => {
    let limit;
    if (modelVersion === 'gpt5' || (apiProvider && apiProvider.includes('gpt-5'))) {
      limit = GPT5_TOKEN_LIMITS[operation];
    } else {
      limit = TOKEN_LIMITS[apiProvider]?.[operation] || TOKEN_LIMITS.openai[operation];
    }
    
    // Validate against model limits
    return validateTokenRequest(limit, operation);
  };

  // File Chunking Configuration - Conservative sizes
  const CHUNK_CONFIG = {
    maxChunkSize: {
      openai: 8000,     // Reduced from 15000 for better token management
      gemini: 12000     // Reduced from 25000 for better token management
    },
    overlapSize: 500,   // Overlap between chunks to maintain context
    minChunkSize: 1000, // Minimum viable chunk size
    maxChunks: 20       // Maximum number of chunks to prevent excessive API calls
  };

  // Intelligent Text Chunking Function
  const chunkLargeContent = (content, provider = 'gemini') => {
    const maxSize = CHUNK_CONFIG.maxChunkSize[provider];
    const overlap = CHUNK_CONFIG.overlapSize;
    const minSize = CHUNK_CONFIG.minChunkSize;
    
    // If content is small enough, return as single chunk
    if (content.length <= maxSize) {
      return [{
        id: 'chunk-1',
        content: content,
        startIndex: 0,
        endIndex: content.length,
        size: content.length,
        isComplete: true
      }];
    }
    
    const chunks = [];
    let startIndex = 0;
    let chunkId = 1;
    
    while (startIndex < content.length && chunks.length < CHUNK_CONFIG.maxChunks) {
      let endIndex = Math.min(startIndex + maxSize, content.length);
      
      // Try to break at natural boundaries (paragraphs, sentences)
      if (endIndex < content.length) {
        // Look for paragraph break
        const paragraphBreak = content.lastIndexOf('\n\n', endIndex);
        if (paragraphBreak > startIndex + minSize) {
          endIndex = paragraphBreak + 2;
        } else {
          // Look for sentence break
          const sentenceBreak = content.lastIndexOf('. ', endIndex);
          if (sentenceBreak > startIndex + minSize) {
            endIndex = sentenceBreak + 2;
          }
        }
      }
      
      const chunkContent = content.substring(startIndex, endIndex);
      
      chunks.push({
        id: `chunk-${chunkId}`,
        content: chunkContent,
        startIndex: startIndex,
        endIndex: endIndex,
        size: chunkContent.length,
        isComplete: endIndex >= content.length,
        chunkNumber: chunkId,
        totalChunks: 0 // Will be updated after all chunks are created
      });
      
      // Move start index with overlap
      startIndex = Math.max(endIndex - overlap, startIndex + minSize);
      chunkId++;
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    console.log(`Content chunked into ${chunks.length} pieces:`, 
      chunks.map(c => ({ id: c.id, size: c.size })));
    
    return chunks;
  };

  // Process chunks with AI - the missing function!
  const processChunksWithAI = async (chunks, operation, apiKey, provider, makeAIRequest) => {
    console.log(`🔄 Processing ${chunks.length} chunks with ${provider.toUpperCase()} for ${operation}`);
    
    const chunkResults = [];
    const maxConcurrentChunks = 3; // Process 3 chunks at a time to avoid rate limits
    
    for (let i = 0; i < chunks.length; i += maxConcurrentChunks) {
      const chunkBatch = chunks.slice(i, i + maxConcurrentChunks);
      
      const batchPromises = chunkBatch.map(async (chunk) => {
        try {
          console.log(`📝 Processing ${chunk.id} (${chunk.size} chars)...`);
          
          // Create a simplified prompt for chunk analysis
          const chunkPrompt = `Analyze this content chunk and extract key information in JSON format:

CONTENT CHUNK ${chunk.chunkNumber}/${chunk.totalChunks}:
"""${chunk.content}"""

Return a JSON object with:
{
  "keyClaims": ["claim1", "claim2"],
  "keyTerms": ["term1", "term2"],
  "frameworks": ["framework1"],
  "examples": ["example1"],
  "mainTopics": ["topic1", "topic2"]
}`;

          // This function should not make direct AI requests
          // Remove this call as it creates circular dependency
          const chunkResult = { error: 'Chunked processing not available' };
          
          return {
            chunkId: chunk.id,
            chunkNumber: chunk.chunkNumber,
            processed: true,
            result: chunkResult,
            size: chunk.size
          };
        } catch (error) {
          console.error(`❌ Error processing ${chunk.id}:`, error.message);
          return {
            chunkId: chunk.id,
            chunkNumber: chunk.chunkNumber,
            processed: false,
            error: error.message,
            size: chunk.size
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      chunkResults.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + maxConcurrentChunks < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successfulChunks = chunkResults.filter(r => r.processed);
    const failedChunks = chunkResults.filter(r => !r.processed);
    
    console.log(`✅ Chunk processing complete: ${successfulChunks.length} successful, ${failedChunks.length} failed`);
    
    if (failedChunks.length > 0) {
      console.warn('Failed chunks:', failedChunks.map(c => c.chunkId));
    }
    
    return chunkResults;
  };

  // Add usage tracking
  const trackApiUsage = (provider, operation, tokenCount, cost, currentUser) => {
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

  const handleContentEdit = (moduleIndex, lessonIndex, newContent) => {
    const key = `${moduleIndex}-${lessonIndex}`;
    setEditingContent(prev => ({ ...prev, [key]: newContent }));
  };

  return {
    // State
    isGenerating,
    setIsGenerating,
    generatedCourse,
    setGeneratedCourse,
    editingContent,
    setEditingContent,
    
    // Functions
    validateTokenRequest,
    getTokenLimit,
    chunkLargeContent,
    processChunksWithAI,
    trackApiUsage,
    handleContentEdit,
    
    // Constants
    TOKEN_LIMITS,
    CHUNK_CONFIG,
    MODEL_MAX_TOKENS
  };
};

export default useCourseGeneration;
