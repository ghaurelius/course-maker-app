import { useCallback } from 'react';
import {
  validateTextContent,
  validateQuestionAnswers,
  validateMultimediaPrefs,
  validateAndSanitizeFormData,
  ValidationError
} from '../utils/validation';
import { showSuccessToast, showErrorToast } from '../components/Toast';

/**
 * Custom hook for handling step-by-step validation in the course creator
 * @param {Function} addToast - Toast notification function
 * @returns {Object} Validation functions and utilities
 */
const useValidation = (addToast) => {
  // Step 1 validation - Form data and content
  const validateStep1 = useCallback((formData, uploadedContent) => {
    try {
      // Validate form data
      validateAndSanitizeFormData(formData);
      
      // Validate content
      validateTextContent(uploadedContent);
      
      showSuccessToast(addToast, 'Step 1 validation passed!');
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        showErrorToast(addToast, error.message);
      } else {
        showErrorToast(addToast, 'Validation failed. Please check your inputs.');
      }
      return false;
    }
  }, [addToast]);

  // Step 2 validation - Question answers
  const validateStep2 = useCallback((questionAnswers) => {
    try {
      validateQuestionAnswers(questionAnswers);
      showSuccessToast(addToast, 'Step 2 validation passed!');
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        showErrorToast(addToast, error.message);
      } else {
        showErrorToast(addToast, 'Please complete all required questions.');
      }
      return false;
    }
  }, [addToast]);

  // Step 3 validation - Multimedia preferences
  const validateStep3 = useCallback((multimediaPrefs) => {
    try {
      validateMultimediaPrefs(multimediaPrefs);
      showSuccessToast(addToast, 'Step 3 validation passed!');
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        showErrorToast(addToast, error.message);
      } else {
        showErrorToast(addToast, 'Please check your multimedia preferences.');
      }
      return false;
    }
  }, [addToast]);

  // Enhanced step navigation with validation
  const validateCurrentStep = useCallback((currentStep, formData, uploadedContent, questionAnswers, multimediaPrefs) => {
    switch (currentStep) {
      case 1:
        return validateStep1(formData, uploadedContent);
      case 2:
        return validateStep2(questionAnswers);
      case 3:
        return validateStep3(multimediaPrefs);
      default:
        return true;
    }
  }, [validateStep1, validateStep2, validateStep3]);

  return {
    validateStep1,
    validateStep2,
    validateStep3,
    validateCurrentStep
  };
};

export default useValidation;
