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

  // Structured field errors dictionary: { errors: { fieldName: ["Message 1", "Message 2"] } }
  if (data.errors && typeof data.errors === 'object' && setError) {
    let boundCount = 0;
    Object.entries(data.errors).forEach(([field, messages]) => {
      const msgText = Array.isArray(messages) ? messages.join('. ') : String(messages);
      setError(field, { type: 'server', message: msgText });
      boundCount++;
    });
    if (boundCount > 0) {
      notification.error('Please resolve the highlighted field errors.');
      return;
    }
  }

  // NestJS ValidationPipe format (array of strings)
  if (Array.isArray(data.message) && setError) {
    const unmappedErrors: string[] = [];
    
    data.message.forEach((msg: string) => {
      const parts = msg.split(' ');
      const field = parts[0];
      
      if (field) {
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
