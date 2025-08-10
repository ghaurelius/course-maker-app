/**
 * Utility functions for parsing and repairing AI responses
 * Handles JSON parsing with progressive repair strategies
 */

/**
 * Enhanced parseAIResponse function with control character sanitization and progressive repair
 * @param {string} response - Raw AI response to parse
 * @returns {Object} Parsed JSON object or fallback structure
 */
export const parseAIResponse = (response) => {
  if (!response || typeof response !== 'string') {
    console.warn('Invalid response: expected non-empty string, using fallback');
    return createAnalysisFallback(new Error('Invalid response'), response);
  }

  // Step 1: Basic content extraction and cleanup
  let content = response.trim();
  
  // Remove common markdown artifacts
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Find JSON boundaries more precisely
  const startIndex = content.indexOf('{');
  if (startIndex === -1) {
    console.warn('No JSON object found in response, using fallback');
    return createAnalysisFallback(new Error('No JSON object found'), response);
  }
  
  // Extract potential JSON content
  content = content.substring(startIndex);
  
  // Step 2: Try direct parsing first
  try {
    return JSON.parse(content);
  } catch (initialError) {
    console.warn('Initial JSON parse failed, attempting repairs...', initialError.message);
  }
  
  // Step 3: Try sanitization
  try {
    const sanitized = sanitizeJSONString(content);
    return JSON.parse(sanitized);
  } catch (sanitizeError) {
    console.warn('Sanitized parse failed, trying basic repair...', sanitizeError.message);
  }
  
  // Step 4: Try basic repair
  try {
    const basicRepaired = tryBasicRepair(content);
    if (basicRepaired) {
      return JSON.parse(basicRepaired);
    }
  } catch (basicError) {
    console.warn('Basic repair failed, trying aggressive repair...', basicError.message);
  }
  
  // Step 5: Try aggressive repair
  try {
    const aggressiveRepaired = tryAggressiveRepair(content);
    if (aggressiveRepaired) {
      return JSON.parse(aggressiveRepaired);
    }
  } catch (aggressiveError) {
    console.warn('Aggressive repair failed, trying field extraction...', aggressiveError.message);
  }
  
  // Step 6: Try field-by-field extraction
  try {
    const extracted = tryFieldByFieldExtraction(content);
    if (extracted) {
      return JSON.parse(extracted);
    }
  } catch (extractError) {
    console.warn('Field extraction failed, using fallback...', extractError.message);
  }
  
  // Step 7: Return structured fallback
  console.error('All parsing attempts failed, returning fallback structure');
  return createAnalysisFallback(new Error('JSON parsing failed after all repair attempts'), response);
};

/**
 * Enhanced helper function to sanitize JSON strings and fix control character issues
 * @param {string} jsonString - JSON string to sanitize
 * @returns {string} Sanitized JSON string
 */
export const sanitizeJSONString = (jsonString) => {
  return jsonString
    // Fix double-escaped quotes (\\" -> \")
    .replace(/\\\\"/g, '\\"')
    // Fix over-escaped quotes (\\\\" -> \")
    .replace(/\\\\\\"/g, '\\"')
    // Fix unescaped quotes within strings more carefully
    .replace(/"([^"]*?)"([^,:}\]\s])([^"]*?)"/g, '"$1\\"$2$3"')
    // Fix unescaped newlines in strings
    .replace(/"([^"]*?)\n([^"]*?)"/g, '"$1\\n$2"')
    // Fix unescaped tabs in strings
    .replace(/"([^"]*?)\t([^"]*?)"/g, '"$1\\t$2"')
    // Fix unescaped carriage returns
    .replace(/"([^"]*?)\r([^"]*?)"/g, '"$1\\r$2"')
    // Fix unescaped backslashes (but not already escaped ones)
    .replace(/"([^"]*?)\\(?!["\\nrtbf\/u])([^"]*?)"/g, '"$1\\\\$2"')
    // Remove problematic control characters (except common ones)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove trailing commas
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    // Fix common JSON syntax errors
    .replace(/([^\\])\\([^"\\nrtbf\/u])/g, '$1\\\\$2')
    // Remove any content after the last closing brace
    .replace(/(}[^}]*)$/, '}');
};

/**
 * Basic repair attempt
 * @param {string} content - Content to repair
 * @returns {string|null} Repaired content or null if failed
 */
export const tryBasicRepair = (content) => {
  // Extract JSON more carefully
  let jsonContent = content;
  
  // Remove markdown
  jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Find JSON boundaries more precisely
  const startIndex = jsonContent.indexOf('{');
  if (startIndex === -1) return null;
  
  let braceCount = 0;
  let endIndex = -1;
  
  for (let i = startIndex; i < jsonContent.length; i++) {
    if (jsonContent[i] === '{') braceCount++;
    if (jsonContent[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (endIndex === -1) return null;
  
  const extracted = jsonContent.substring(startIndex, endIndex + 1);
  return sanitizeJSONString(extracted);
};

/**
 * Enhanced aggressive repair attempt
 * @param {string} content - Content to repair
 * @returns {string|null} Repaired content or null if failed
 */
export const tryAggressiveRepair = (content) => {
  try {
    // More aggressive cleaning
    let cleaned = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    // Find the main JSON object
    const startBrace = cleaned.indexOf('{');
    if (startBrace === -1) return null;
    
    // Extract only the JSON part, ignoring everything after the last }
    let braceCount = 0;
    let endBrace = -1;
    let inString = false;
    let escaped = false;
    
    for (let i = startBrace; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endBrace = i;
            break;
          }
        }
      }
    }
    
    if (endBrace === -1) return null;
    
    cleaned = cleaned.substring(startBrace, endBrace + 1);
    
    // Attempt to fix malformed strings by removing problematic characters
    cleaned = cleaned
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \n, \t, \r
      .replace(/\\\\n/g, ' ') // Replace literal \\n with spaces
      .replace(/\\\\t/g, ' ') // Replace literal \\t with spaces
      .replace(/\\n/g, ' ') // Replace literal \n with spaces
      .replace(/\\t/g, ' ') // Replace literal \t with spaces
      .replace(/\n/g, ' ') // Replace actual newlines with spaces
      .replace(/\t/g, ' ') // Replace actual tabs with spaces
      .replace(/\r/g, ' ') // Replace carriage returns with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      // Fix double-escaped quotes
      .replace(/\\\\"/g, '\\"')
      // Fix over-escaped quotes
      .replace(/\\\\\\"/g, '\\"');
    
    return cleaned;
  } catch (error) {
    return null;
  }
};

/**
 * Field-by-field extraction as last resort
 * @param {string} content - Content to extract from
 * @returns {string|null} Extracted JSON string or null if failed
 */
export const tryFieldByFieldExtraction = (content) => {
  try {
    // Extract recognizable JSON fields manually
    const fields = {};
    
    // Extract arrays like keyClaims, keyTerms, etc.
    const arrayMatches = content.match(/"(\w+)":\s*\[(.*?)\]/g);
    if (arrayMatches) {
      arrayMatches.forEach(match => {
        const fieldMatch = match.match(/"(\w+)":\s*\[(.*?)\]/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const arrayContent = fieldMatch[2];
          try {
            // Simple array parsing
            const items = arrayContent.split(',').map(item =>
              item.trim().replace(/^"/, '').replace(/"$/, '')
            ).filter(item => item.length > 0);
            fields[fieldName] = items;
          } catch (e) {
            fields[fieldName] = [];
          }
        }
      });
    }
    
    // Extract simple string fields
    const stringMatches = content.match(/"(\w+)":\s*"([^"]+)"/g);
    if (stringMatches) {
      stringMatches.forEach(match => {
        const fieldMatch = match.match(/"(\w+)":\s*"([^"]+)"/);
        if (fieldMatch) {
          fields[fieldMatch[1]] = fieldMatch[2];
        }
      });
    }
    
    // Build a basic structure
    if (Object.keys(fields).length > 0) {
      return JSON.stringify({
        sourceAnalysis: {
          keyClaims: fields.keyClaims || [],
          keyTerms: fields.keyTerms || [],
          frameworks: fields.frameworks || [],
          examples: fields.examples || [],
          authorVoice: fields.authorVoice || 'Professional'
        },
        courseBlueprint: {
          targetAudience: fields.targetAudience || 'General learners',
          prerequisites: fields.prerequisites || [],
          learningOutcomes: fields.learningOutcomes || [],
          syllabus: fields.syllabus || []
        },
        contentGaps: {
          missingConcepts: fields.missingConcepts || [],
          needsVerification: fields.needsVerification || [],
          suggestedAdditions: fields.suggestedAdditions || []
        },
        scopeOptions: {
          lite: { duration: '2-3 hours', modules: 2, focus: 'Core concepts' },
          core: { duration: '4-6 hours', modules: 3, focus: 'Comprehensive' }
        }
      });
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Create fallback analysis structure
 * @param {Error} error - The error that occurred
 * @param {string} rawResponse - The raw response that failed to parse
 * @returns {Object} Fallback analysis structure
 */
export const createAnalysisFallback = (error, rawResponse) => {
  return {
    sourceAnalysis: {
      keyClaims: ['Content analysis performed with parsing limitations'],
      keyTerms: ['Technical terminology identified'],
      frameworks: ['Methodological approaches detected'],
      examples: ['Practical examples noted'],
      authorVoice: 'Professional and informative'
    },
    courseBlueprint: {
      targetAudience: 'General learners',
      prerequisites: ['Basic understanding of the subject matter'],
      learningOutcomes: [
        'Understand core concepts from the source material',
        'Apply key principles in practical scenarios',
        'Demonstrate competency in the subject area'
      ],
      syllabus: [
        'Foundation concepts and terminology',
        'Practical applications and examples',
        'Advanced techniques and best practices'
      ]
    },
    contentGaps: {
      missingConcepts: ['Additional context may be needed'],
      needsVerification: ['Source verification recommended'],
      suggestedAdditions: ['Industry examples', 'Current best practices']
    },
    scopeOptions: {
      lite: {
        duration: '2-3 hours',
        modules: 2,
        focus: 'Essential concepts only'
      },
      core: {
        duration: '4-6 hours',
        modules: 3,
        focus: 'Comprehensive coverage with examples'
      }
    },
    error: error.message,
    rawResponse: typeof rawResponse === 'string' ? rawResponse.substring(0, 1000) : rawResponse,
    fallback: true,
    timestamp: new Date().toISOString()
  };
};

/**
 * Merge Chunk Results
 * @param {Array} chunkResults - Array of chunk processing results
 * @param {string} operation - The operation type (analysis, etc.)
 * @returns {Object|string} Merged results
 */
export const mergeChunkResults = (chunkResults, operation) => {
  const successfulResults = chunkResults.filter(r => r.processed && r.result);
  
  if (successfulResults.length === 0) {
    throw new Error('No chunks were successfully processed');
  }
  
  console.log(`Merging ${successfulResults.length} successful chunk results...`);
  
  if (operation === 'analysis') {
    // For analysis, combine all insights
    const combinedAnalysis = {
      sourceAnalysis: {
        keyClaims: [],
        keyTerms: [],
        frameworks: [],
        examples: [],
        authorVoice: ''
      },
      courseBlueprint: {
        learningOutcomes: [],
        targetAudience: '',
        prerequisites: []
      },
      // ... other analysis fields
      chunkProcessingInfo: {
        totalChunks: chunkResults.length,
        successfulChunks: successfulResults.length,
        failedChunks: chunkResults.length - successfulResults.length,
        processingTimestamp: new Date().toISOString()
      }
    };
    
    // Merge results from all chunks
    successfulResults.forEach(chunkResult => {
      try {
        const parsed = parseAIResponse(chunkResult.result);
        if (parsed.sourceAnalysis) {
          combinedAnalysis.sourceAnalysis.keyClaims.push(...(parsed.sourceAnalysis.keyClaims || []));
          combinedAnalysis.sourceAnalysis.keyTerms.push(...(parsed.sourceAnalysis.keyTerms || []));
          combinedAnalysis.sourceAnalysis.frameworks.push(...(parsed.sourceAnalysis.frameworks || []));
          combinedAnalysis.sourceAnalysis.examples.push(...(parsed.sourceAnalysis.examples || []));
        }
      } catch (e) {
        console.warn(`Could not parse chunk result for merging:`, e);
      }
    });
    
    // Deduplicate arrays
    Object.keys(combinedAnalysis.sourceAnalysis).forEach(key => {
      if (Array.isArray(combinedAnalysis.sourceAnalysis[key])) {
        combinedAnalysis.sourceAnalysis[key] = [...new Set(combinedAnalysis.sourceAnalysis[key])];
      }
    });
    
    return combinedAnalysis;
  }
  
  // For other operations, concatenate results
  return successfulResults.map(r => r.result).join('\n\n---\n\n');
};
