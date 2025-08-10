import React from 'react';

const ApiKeyManager = ({ 
  showApiKeyModal, 
  setShowApiKeyModal, 
  apiProvider, 
  setApiProvider, 
  apiKey, 
  setApiKey, 
  storedApiKeys, 
  saveApiKey, 
  clearApiKeys 
}) => {
  if (!showApiKeyModal) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "12px",
        maxWidth: "500px",
        width: "90%",
        maxHeight: "80vh",
        overflow: "auto"
      }}>
        <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🔑 API Key Configuration</h2>
        
        <p style={{ marginBottom: "20px", color: "#666" }}>
          Configure your AI providers for course generation. You can add both OpenAI and Gemini keys for automatic failover.
        </p>

        {/* Provider Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
            Choose AI Provider:
          </label>
          <div style={{ display: "flex", gap: "15px" }}>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={apiProvider === 'openai'}
                onChange={(e) => setApiProvider(e.target.value)}
                style={{ marginRight: "8px" }}
              />
              OpenAI (GPT-4)
            </label>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="radio"
                name="provider"
                value="gemini"
                checked={apiProvider === 'gemini'}
                onChange={(e) => setApiProvider(e.target.value)}
                style={{ marginRight: "8px" }}
              />
              Google Gemini
            </label>
          </div>
        </div>

        {/* API Key Input */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
            {apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API Key:
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key`}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "14px"
            }}
          />
          
          {/* Show current stored key status */}
          {storedApiKeys[apiProvider] && (
            <p style={{ fontSize: "12px", color: "#27ae60", marginTop: "5px" }}>
              ✅ {apiProvider.toUpperCase()} API key is already stored
            </p>
          )}
        </div>

        {/* Instructions */}
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "15px", 
          borderRadius: "8px", 
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          <h4 style={{ marginBottom: "10px" }}>How to get your API key:</h4>
          {apiProvider === 'openai' ? (
            <div>
              <p>1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a></p>
              <p>2. Sign in to your OpenAI account</p>
              <p>3. Click "Create new secret key"</p>
              <p>4. Copy the key and paste it above</p>
              <p style={{ color: "#e74c3c", marginTop: "10px" }}>
                <strong>Note:</strong> You need credits in your OpenAI account to use the API.
              </p>
            </div>
          ) : (
            <div>
              <p>1. Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></p>
              <p>2. Sign in with your Google account</p>
              <p>3. Click "Create API Key"</p>
              <p>4. Copy the key and paste it above</p>
              <p style={{ color: "#27ae60", marginTop: "10px" }}>
                <strong>Note:</strong> Gemini API has a generous free tier.
              </p>
            </div>
          )}
        </div>

        {/* Stored Keys Status */}
        <div style={{ 
          backgroundColor: "#e8f5e8", 
          padding: "15px", 
          borderRadius: "8px", 
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          <h4 style={{ marginBottom: "10px" }}>Current API Keys:</h4>
          <p>OpenAI: {storedApiKeys.openai ? '✅ Configured' : '❌ Not set'}</p>
          <p>Gemini: {storedApiKeys.gemini ? '✅ Configured' : '❌ Not set'}</p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowApiKeyModal(false)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#95a5a6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={clearApiKeys}
            style={{
              padding: "10px 20px",
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Clear All Keys
          </button>
          
          <button
            onClick={saveApiKey}
            disabled={!apiKey.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor: apiKey.trim() ? "#27ae60" : "#bdc3c7",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: apiKey.trim() ? "pointer" : "not-allowed"
            }}
          >
            Save Key
          </button>
        </div>

        {/* Security Notice */}
        <div style={{ 
          marginTop: "20px", 
          padding: "10px", 
          backgroundColor: "#fff3cd", 
          borderRadius: "6px",
          fontSize: "12px",
          color: "#856404"
        }}>
          <strong>🔒 Security:</strong> API keys are stored locally in your browser and never sent to our servers.
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;
