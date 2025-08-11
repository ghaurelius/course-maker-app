import { useState, useCallback } from 'react';
import { showWarningToast, showErrorToast } from '../components/Toast';

/**
 * Custom hook for managing course creator step navigation and form state
 * @param {Function} addToast - Toast notification function
 * @returns {Object} Step state management functions and data
 */
const useCourseStepState = (addToast) => {
  // Step management
  const [step, setStep] = useState(1);
  
  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAudience: "",
    learningObjectives: "",
    duration: "",
    difficulty: "beginner",
    category: "",
    additionalRequirements: "",
  });
  
  // Question answers with new fields
  const [questionAnswers, setQuestionAnswers] = useState({
    courseLength: 'medium',
    interactivityLevel: 'medium',
    assessmentType: 'mixed',
    learningStyle: 'mixed',
    moduleCount: 3,
    moduleNaming: 'ai-generated',
    customModuleNames: []
  });
  
  // Multimedia preferences
  const [multimediaPrefs, setMultimediaPrefs] = useState({
    includeAudio: false,
    includeVideo: false,
    voiceStyle: 'professional',
    videoFormat: 'presentation'
  });

  // Enhanced event handlers with validation
  const handleInputChange = useCallback((field, value) => {
    try {
      // Don't trim spaces from the middle of text - only trim leading/trailing whitespace for validation
      const sanitizedValue = typeof value === 'string' ? value : value;
      
      setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
      
      // Real-time validation for specific fields (check trimmed length but store original)
      const trimmedLength = typeof sanitizedValue === 'string' ? sanitizedValue.trim().length : 0;
      if (field === 'courseTitle' && trimmedLength > 100) {
        showWarningToast(addToast, 'Course title should be less than 100 characters');
      } else if (field === 'courseDescription' && trimmedLength > 500) {
        showWarningToast(addToast, 'Course description should be less than 500 characters');
      }
    } catch (error) {
      console.error('Error handling input change:', error);
      showErrorToast(addToast, 'Error updating form field');
    }
  }, [addToast]);
  
  const handleQuestionChange = useCallback((field, value) => {
    try {
      const sanitizedValue = typeof value === 'string' ? value.trim() : value;
      setQuestionAnswers(prev => ({ ...prev, [field]: sanitizedValue }));
      
      // Real-time validation feedback (removed restrictive 10-character minimum)
      // Users can now enter shorter, more concise course descriptions
    } catch (error) {
      console.error('Error handling question change:', error);
      showErrorToast(addToast, 'Error updating question answer');
    }
  }, [addToast]);
  
  const handleCustomModuleNameChange = useCallback((index, value) => {
    try {
      const sanitizedValue = typeof value === 'string' ? value.trim() : value;
      setQuestionAnswers(prev => ({
        ...prev,
        customModuleNames: {
          ...prev.customModuleNames,
          [index]: sanitizedValue
        }
      }));
    } catch (error) {
      console.error('Error handling custom module name change:', error);
      showErrorToast(addToast, 'Error updating module name');
    }
  }, [addToast]);

  // Enhanced step navigation with validation
  const handleNextStep = useCallback((currentStep, validateCurrentStep) => {
    const isValid = validateCurrentStep(currentStep, formData, null, questionAnswers, multimediaPrefs);
    
    if (isValid) {
      setStep(currentStep + 1);
    }
  }, [formData, questionAnswers, multimediaPrefs]);

  const handlePreviousStep = useCallback(() => {
    setStep(prev => Math.max(1, prev - 1));
  }, []);

  const goToStep = useCallback((targetStep) => {
    setStep(targetStep);
  }, []);

  return {
    // State
    step,
    formData,
    questionAnswers,
    multimediaPrefs,
    
    // State setters
    setStep,
    setFormData,
    setQuestionAnswers,
    setMultimediaPrefs,
    
    // Event handlers
    handleInputChange,
    handleQuestionChange,
    handleCustomModuleNameChange,
    
    // Navigation
    handleNextStep,
    handlePreviousStep,
    goToStep
  };
};

export default useCourseStepState;
