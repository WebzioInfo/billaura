import { UseFormSetError } from 'react-hook-form';
import notification from '@/core/services/NotificationService';

/**
 * Handles API errors by binding validation errors to react-hook-form fields
 * and displaying fallback toast messages for generic errors.
 * 
 * @param err The error object thrown by axios/apiClient
 * @param setError The setError function from react-hook-form
 */
export const handleApiFormError = (err: any, setError?: UseFormSetError<any>) => {
  const data = err?.response?.data;
  
  if (!data) {
    notification.error('The request could not be completed. Please try again.');
    return;
  }

  // NestJS ValidationPipe format (array of strings)
  if (Array.isArray(data.message) && setError) {
    let unmappedErrors: string[] = [];
    
    data.message.forEach((msg: string) => {
      // Typically, NestJS returns "fieldName must be a string"
      const parts = msg.split(' ');
      const field = parts[0];
      
      if (field) {
        // Try to bind to the field
        setError(field, { type: 'server', message: msg });
      } else {
        unmappedErrors.push(msg);
      }
    });

    if (unmappedErrors.length > 0) {
      notification.error(unmappedErrors.join(', '));
    } else {
      notification.error('Please fix the validation errors in the form');
    }
    return;
  }

  // Generic string message
  if (typeof data.message === 'string') {
    notification.error(data.message);
    return;
  }

  // Fallback
  notification.error('Failed to process request');
};
