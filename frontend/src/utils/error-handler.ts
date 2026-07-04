import { UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';

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
    toast.error(err.message || 'An unexpected error occurred');
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
      toast.error(unmappedErrors.join(', '));
    } else {
      toast.error('Please fix the validation errors in the form');
    }
    return;
  }

  // Generic string message
  if (typeof data.message === 'string') {
    toast.error(data.message);
    return;
  }

  // Fallback
  toast.error('Failed to process request');
};
