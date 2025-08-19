// API Proxy utility to handle CORS and API calls
export const makeApiCall = async (provider, apiKey, messages, maxTokens = 1000, temperature = 0.7) => {
  try {
    if (provider === 'openai') {
      // Try multiple CORS proxy options in order of reliability
      const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors.bridged.cc/',
        '' // Direct call as last resort
      ];
      
      let lastError = null;
      
      for (const proxyUrl of corsProxies) {
        try {
          const apiUrl = proxyUrl ? `${proxyUrl}https://api.openai.com/v1/chat/completions` : 'https://api.openai.com/v1/chat/completions';
          console.log(`🔄 Trying ${proxyUrl ? 'proxy' : 'direct'} API call:`, apiUrl.substring(0, 50) + '...');
      
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini', // Use mini model for better availability and lower cost
              messages: messages,
              max_tokens: maxTokens,
              temperature: temperature
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
          }

          const data = await response.json();
          console.log(`✅ API call successful with ${proxyUrl ? 'proxy' : 'direct'} method`);
          return data?.choices?.[0]?.message?.content?.trim() || '';
          
        } catch (error) {
          console.log(`❌ Failed with ${proxyUrl ? 'proxy' : 'direct'} method:`, error.message);
          lastError = error;
          continue; // Try next proxy
        }
      }
      
      // If all proxies failed, throw the last error
      throw lastError || new Error('All CORS proxy attempts failed');
      
    } else if (provider === 'gemini') {
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
        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
    
  } catch (error) {
    console.error('API Call Error:', error);
    
    // Check for specific error types
    if (error.message.includes('CORS') || error.message.includes('blocked')) {
      throw new Error('CORS_ERROR: Direct API calls blocked by browser. Consider using a backend proxy.');
    }
    
    if (error.message.includes('401')) {
      throw new Error('INVALID_API_KEY: Please check your API key configuration.');
    }
    
    if (error.message.includes('429')) {
      throw new Error('RATE_LIMIT: API rate limit exceeded. Please try again later.');
    }
    
    if (error.message.includes('quota') || error.message.includes('billing')) {
      throw new Error('QUOTA_EXCEEDED: API quota exceeded. Please check your billing settings.');
    }
    
    throw error;
  }
};
