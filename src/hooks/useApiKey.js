import { useState, useEffect } from 'react';

const useApiKey = (currentUser) => {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiProvider, setApiProvider] = useState('openai'); // Default to OpenAI (ChatGPT)
  const [apiKey, setApiKey] = useState('');
  const [storedApiKeys, setStoredApiKeys] = useState(() => ({
    openai: localStorage.getItem('openai_api_key') || process.env.REACT_APP_OPENAI_API_KEY || '',
    gemini: localStorage.getItem('gemini_api_key') || process.env.REACT_APP_GEMINI_API_KEY || ''
  }));
  const [failoverHistory, setFailoverHistory] = useState([]);

  // Update stored API keys when user changes
  useEffect(() => {
    if (currentUser) {
      const openaiKey = localStorage.getItem('openai_api_key') || '';
      const geminiKey = localStorage.getItem('gemini_api_key') || '';
      
      console.log('🔍 Loading API keys from localStorage:');
      console.log(`  - OpenAI key: ${openaiKey ? '✅ Found' : '❌ Not found'}`);
      console.log(`  - Gemini key: ${geminiKey ? '✅ Found' : '❌ Not found'}`);
      
      setStoredApiKeys({
        openai: openaiKey,
        gemini: geminiKey
      });
      
      // Only show modal if no API keys are stored
      const hasAnyApiKey = openaiKey || geminiKey;
      if (!hasAnyApiKey) {
        console.log('⚠️ No API keys found, showing modal');
        setShowApiKeyModal(true);
      } else {
        console.log('✅ API keys loaded successfully');
      }
    }
  }, [currentUser]);

  // API Key Management Functions
  const saveApiKey = () => {
    if (!apiKey.trim()) {
      alert('Please enter a valid API key');
      return;
    }
    
    // Fix: Use correct localStorage key format
    const storageKey = `${apiProvider}_api_key`;
    localStorage.setItem(storageKey, apiKey);
    setStoredApiKeys(prev => ({ ...prev, [apiProvider]: apiKey }));
    setApiKey('');
    setShowApiKeyModal(false);
    
    console.log(`✅ ${apiProvider.toUpperCase()} API key saved to localStorage with key: ${storageKey}`);
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
    alert('All API keys cleared!');
  };

  const debugApiKeys = () => {
    console.log('🔍 Loading API keys from localStorage:');
    console.log('  - OpenAI:', getApiKeyForProvider('openai'));
    console.log('  - Gemini:', getApiKeyForProvider('gemini'));
  };

  // Simple API test function
  const testApiConnection = async () => {
    console.log('🧪 Testing API connection...');
    const openaiKey = getApiKeyForProvider('openai');
    
    if (!openaiKey) {
      console.error('❌ No OpenAI API key found for testing');
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use cheaper model for testing
          messages: [{ role: 'user', content: 'Say "API test successful"' }],
          max_tokens: 10,
          temperature: 0
        })
      });

      console.log(`📡 API Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        console.error('💡 Common solutions:');
        if (response.status === 401) {
          console.error('  - Check if your API key is valid and not expired');
        } else if (response.status === 429) {
          console.error('  - Add credits to your OpenAI account or check rate limits');
        } else if (response.status === 404) {
          console.error('  - Your account might not have access to gpt-4o model');
        }
        return;
      }

      const data = await response.json();
      console.log('✅ API Test Successful!');
      console.log('📝 Response:', data.choices[0].message.content);
    } catch (error) {
      console.error('❌ Network Error:', error.message);
    }
  };

  // Smart API provider selection with failover support
  const selectOptimalProvider = (operation, contentLength) => {
    // Always start with OpenAI (ChatGPT) as primary
    const primary = 'openai';
    const fallback = 'gemini';
    
    // Check if primary provider has a valid key
    if (storedApiKeys[primary] && storedApiKeys[primary].trim() !== '') {
      return primary;
    }
    
    // Fallback to Gemini if OpenAI key is missing
    if (storedApiKeys[fallback] && storedApiKeys[fallback].trim() !== '') {
      console.log(`🔄 Falling back to ${fallback} - ${primary} key not available`);
      return fallback;
    }
    
    // Default to current user preference if both keys available
    return apiProvider;
  };

  // Automatic failover function for API errors
  const handleApiFailover = (currentProvider, errorType, errorMessage) => {
    const timestamp = new Date().toISOString();
    const failoverRecord = {
      from: currentProvider,
      errorType,
      errorMessage,
      timestamp
    };
    
    setFailoverHistory(prev => [...prev.slice(-4), failoverRecord]); // Keep last 5 records
    
    // Determine if we should failover based on error type
    const shouldFailover = [
      'QUOTA_EXCEEDED',
      'RATE_LIMIT', 
      'INVALID_API_KEY',
      'SERVER_ERROR'
    ].includes(errorType);
    
    if (shouldFailover) {
      const fallbackProvider = currentProvider === 'openai' ? 'gemini' : 'openai';
      
      // Check if fallback provider has a valid key
      if (storedApiKeys[fallbackProvider] && storedApiKeys[fallbackProvider].trim() !== '') {
        console.log(`🔄 Auto-failover: ${currentProvider} → ${fallbackProvider} (${errorType})`);
        setApiProvider(fallbackProvider);
        return fallbackProvider;
      } else {
        console.error(`❌ Failover failed: No valid ${fallbackProvider} API key available`);
        return null;
      }
    }
    
    return currentProvider;
  };

  // Get API key for specific provider with validation
  const getApiKeyForProvider = (provider) => {
    console.log(`🔍 Getting API key for provider: ${provider.toUpperCase()}`);
    
    // First check environment variables
    let envKey = null;
    if (provider === 'openai') {
      envKey = process.env.REACT_APP_OPENAI_API_KEY;
    } else if (provider === 'gemini') {
      envKey = process.env.REACT_APP_GEMINI_API_KEY;
    }
    
    console.log(`  - Environment key: ${envKey ? (envKey.includes('your-') || envKey.includes('_here') ? '❌ Placeholder' : '✅ Found') : '❌ Not set'}`);
    
    // Use environment key if it exists and is not a placeholder
    if (envKey && envKey.trim() !== '' && !envKey.includes('your-') && !envKey.includes('_here')) {
      console.log(`🔑 Using environment API key for ${provider.toUpperCase()}`);
      return envKey;
    }
    
    // Fall back to stored keys (localStorage)
    const storedKey = storedApiKeys[provider];
    console.log(`  - Stored key: ${storedKey ? '✅ Found' : '❌ Not found'}`);
    console.log(`  - StoredApiKeys object:`, storedApiKeys);
    
    if (storedKey && storedKey.trim() !== '' && !storedKey.includes('your-') && !storedKey.includes('_here')) {
      console.log(`🔑 Using stored API key for ${provider.toUpperCase()}`);
      return storedKey;
    }
    
    console.warn(`❌ No valid API key found for ${provider.toUpperCase()}`);
    console.warn(`  - Environment: ${envKey || 'Not set'}`);
    console.warn(`  - Stored: ${storedKey || 'Not set'}`);
    return null;
  };

  return {
    // State
    showApiKeyModal,
    setShowApiKeyModal,
    apiProvider,
    setApiProvider,
    apiKey,
    setApiKey,
    storedApiKeys,
    failoverHistory,
    
    // Functions
    saveApiKey,
    getCurrentApiKey,
    clearApiKeys,
    selectOptimalProvider,
    handleApiFailover,
    getApiKeyForProvider,
    debugApiKeys,
    testApiConnection
  };
};

export default useApiKey;
