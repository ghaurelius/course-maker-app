import { useState } from 'react';
import pdfToText from 'react-pdftotext';

const useFileUpload = () => {
  const [uploadedContent, setUploadedContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [inputMethod, setInputMethod] = useState("file");
  const [manualTextInput, setManualTextInput] = useState("");

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

  return {
    // State
    uploadedContent,
    setUploadedContent,
    uploadedFile,
    setUploadedFile,
    inputMethod,
    setInputMethod,
    manualTextInput,
    setManualTextInput,
    
    // Functions
    handleFileUpload,
    handleInputMethodChange,
    handleManualTextChange,
    extractPDFText
  };
};

export default useFileUpload;
