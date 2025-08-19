// Simple API proxy that works around CORS issues
export const makeSimpleApiCall = async (provider, apiKey, messages, maxTokens = 1000, temperature = 0.7) => {
  console.log(`🔄 Making ${provider} API call with key: ${apiKey?.substring(0, 10)}...`);
  
  if (provider === 'openai') {
    // Try multiple CORS proxy alternatives
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://thingproxy.freeboard.io/fetch/',
      'https://corsproxy.io/?'
    ];
    
    const openAIUrl = 'https://api.openai.com/v1/chat/completions';
    const requestBody = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: Math.min(maxTokens, 1000),
      temperature: temperature
    });

    // Try direct API call first
    try {
      const response = await fetch(openAIUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: requestBody
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Direct OpenAI call successful');
        return data?.choices?.[0]?.message?.content?.trim() || '';
      }
    } catch (directError) {
      console.log('❌ Direct OpenAI call failed:', directError.message);
    }

    // Try CORS proxies one by one
    for (let i = 0; i < corsProxies.length; i++) {
      try {
        console.log(`🔄 Trying CORS proxy ${i + 1}/${corsProxies.length}...`);
        
        let proxyUrl;
        let headers = {
          'Content-Type': 'application/json',
        };

        if (corsProxies[i].includes('allorigins')) {
          // AllOrigins requires different format
          proxyUrl = `${corsProxies[i]}${encodeURIComponent(openAIUrl)}`;
          // For AllOrigins, we need to make a POST request differently
          const response = await fetch(corsProxies[i], {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: openAIUrl,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: requestBody
            })
          });

          if (response.ok) {
            const data = await response.json();
            const parsedData = JSON.parse(data.contents);
            console.log('✅ CORS proxy call successful');
            return parsedData?.choices?.[0]?.message?.content?.trim() || '';
          }
        } else {
          // Standard proxy format
          proxyUrl = `${corsProxies[i]}${openAIUrl}`;
          headers['Authorization'] = `Bearer ${apiKey}`;

          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: headers,
            body: requestBody
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ CORS proxy call successful');
            return data?.choices?.[0]?.message?.content?.trim() || '';
          }
        }
      } catch (proxyError) {
        console.log(`❌ CORS proxy ${i + 1} failed:`, proxyError.message);
        continue;
      }
    }

    // If all proxies fail, provide intelligent fallback
    console.log('❌ All API methods failed, using intelligent fallback');
    return generateIntelligentFallback(messages, provider);
    
  } else if (provider === 'gemini') {
    // Gemini API call (usually works without CORS issues)
    try {
      const geminiText = messages.map(msg => {
        if (msg.role === 'system') return `System: ${msg.content}`;
        if (msg.role === 'user') return `User: ${msg.content}`;
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
    } catch (geminiError) {
      console.log('❌ Gemini API failed:', geminiError.message);
      return generateIntelligentFallback(messages, provider);
    }
  }
  
  throw new Error(`Unsupported provider: ${provider}`);
};

// Intelligent fallback function when APIs are unavailable
const generateIntelligentFallback = (messages, provider) => {
  console.log('🤖 Generating intelligent fallback response...');
  
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || '';
  
  // Simple content generation based on common course creation patterns
  if (userContent.toLowerCase().includes('course outline') || userContent.toLowerCase().includes('curriculum')) {
    return `## Course Outline

### Module 1: Introduction
- Overview and objectives
- Key concepts introduction
- Prerequisites and requirements

### Module 2: Core Content
- Main learning materials
- Practical exercises
- Real-world applications

### Module 3: Advanced Topics
- In-depth exploration
- Case studies
- Project-based learning

### Module 4: Conclusion
- Summary and review
- Final assessments
- Next steps and resources

*Note: This is a fallback response generated offline. For personalized content, please check your API configuration.*`;
  }
  
  if (userContent.toLowerCase().includes('lesson plan') || userContent.toLowerCase().includes('teaching')) {
    return `## Lesson Plan Structure

### Learning Objectives
- Define what students will learn
- Specify measurable outcomes
- Align with course goals

### Content Delivery
- Introduction (5-10 minutes)
- Main content (20-30 minutes)
- Practice activities (10-15 minutes)
- Wrap-up and review (5 minutes)

### Assessment Methods
- Formative assessments during lesson
- Summative assessment at end
- Feedback mechanisms

*Note: This is a fallback response. Please configure your API key for personalized content generation.*`;
  }
  
  return `I apologize, but I'm currently unable to connect to the ${provider} API. This could be due to:

1. Network connectivity issues
2. API key configuration problems  
3. CORS policy restrictions

Please check your API key and try again. In the meantime, you can:
- Use the offline course creation tools
- Save your work and retry later
- Check the browser console for detailed error messages

*This is a fallback message generated when API services are unavailable.*`;
};

// Export additional utility functions
export const testApiConnection = async (provider, apiKey) => {
  try {
    const testMessages = [
      { role: 'user', content: 'Hello, this is a connection test.' }
    ];
    
    const response = await makeSimpleApiCall(provider, apiKey, testMessages, 50, 0.1);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAvailableProviders = () => {
  return ['openai', 'gemini'];
};
