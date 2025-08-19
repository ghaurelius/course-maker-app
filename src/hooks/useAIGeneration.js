import { useCallback, useRef } from 'react';
import { makeSimpleApiCall } from '../utils/simpleApiProxy';

export function useAIGeneration() {
  const abortRef = useRef(null);

  const generate = useCallback(async (prompt, apiKey, provider = 'openai') => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Convert prompt to messages format
    const messages = [
      { role: 'user', content: prompt }
    ];

    try {
      const result = await makeSimpleApiCall(provider, apiKey, messages, 2000, 0.7);
      return result;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw error;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { generate, cancel };
}

// Export useCourseAI as an alias for backward compatibility
export const useCourseAI = useAIGeneration;
