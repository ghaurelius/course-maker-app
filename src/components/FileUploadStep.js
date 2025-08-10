import React from 'react';
import pdfToText from 'react-pdftotext';

const FileUploadStep = ({ 
  formData, 
  handleInputChange, 
  uploadedContent, 
  setUploadedContent,
  uploadedFile,
  setUploadedFile,
  inputMethod,
  setInputMethod,
  manualTextInput,
  setManualTextInput,
  onNext 
}) => {
  
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
          pages: 'N/A'
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
            setUploadedContent(originalContent);
            alert(`❌ PDF extraction failed\n\n${result.error}\n\nPlease try:\n• A different PDF file\n• Converting to text format\n• Using the manual text input option`);
          }
        } catch (error) {
          setUploadedContent(originalContent);
          console.error('Unexpected error during PDF extraction:', error);
          alert(`❌ Unexpected error during PDF extraction\n\nError: ${error.message}\n\nPlease try a different file or use manual text input.`);
        }
      } else {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedContent(e.target.result);
          alert(`✅ Text file loaded successfully!\n\nCharacters: ${e.target.result.length}`);
        };
        reader.readAsText(file);
      }
    }
  };

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

  return (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>📚 Step 1: Course Information & Content</h2>
      
      <div style={{ display: "grid", gap: "20px" }}>
        {/* Basic Course Information */}
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "15px" }}>Basic Information</h3>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Course Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter your course title"
              style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Course Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what your course will teach"
              style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd", minHeight: "80px" }}
            />
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Target Audience</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                placeholder="e.g., Beginners, Professionals"
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Difficulty Level</label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Upload Section */}
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "15px" }}>📄 Course Content (Optional)</h3>
          <p style={{ marginBottom: "15px", color: "#666" }}>
            Upload or paste your source material to help AI generate better course content
          </p>
          
          {/* Input method selection */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", marginRight: "20px", marginBottom: "10px" }}>
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
        onClick={onNext}
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
};

export default FileUploadStep;
