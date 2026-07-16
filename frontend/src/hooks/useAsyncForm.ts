import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { useEffect, useRef } from 'react';

/**
 * A reusable hook to solve the async hydration problem in React Hook Form.
 * When data is loaded asynchronously (e.g. from an API via TanStack Query),
 * passing it as `defaultValues` often fails if the component renders before
 * the data is fully available. This hook ensures that when the `asyncData`
 * becomes truthy, the form is reset with the correctly mapped data.
 *
 * @param props React Hook Form configuration props
 * @param asyncData The asynchronously fetched data (can be undefined/null initially)
 * @param resetMapper A mapping function to convert the API data to form values
 * @param resetOptions Optional reset options to pass to form.reset()
 * @returns Standard UseFormReturn object
 */
export function useAsyncForm<TFieldValues extends FieldValues = FieldValues, TContext = any, TData = any>(
  props: UseFormProps<TFieldValues, TContext>,
  asyncData: TData | undefined | null,
  resetMapper: (data: TData) => Partial<TFieldValues> | TFieldValues,
  resetOptions?: Parameters<UseFormReturn<TFieldValues, TContext>['reset']>[1]
): UseFormReturn<TFieldValues, TContext> & { handleFormSubmit: (onSubmit: (data: TFieldValues) => any) => ReturnType<UseFormReturn<TFieldValues, TContext>['handleSubmit']> } {
  const form = useForm<TFieldValues, TContext>(props);
  const mapperRef = useRef(resetMapper);
  const lastHydratedRef = useRef<string | null>(null);

  useEffect(() => {
    mapperRef.current = resetMapper;
  }, [resetMapper]);

  useEffect(() => {
    if (!asyncData) return;

    const incomingStr = JSON.stringify(asyncData);
    if (incomingStr === lastHydratedRef.current) {
      return; // Already hydrated this exact data
    }

    lastHydratedRef.current = incomingStr;
    const mappedValues = mapperRef.current(asyncData);
    form.reset(mappedValues as any, resetOptions);
  }, [asyncData, form, resetOptions]);

  const handleFormSubmit = (onSubmit: (data: TFieldValues) => any) => {
    return form.handleSubmit(
      async (data) => {
        try {
          await onSubmit(data);
        } catch (error) {
          throw error;
        }
      },
      (errors) => {
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey) {
          const element = document.getElementsByName(firstErrorKey)[0];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.focus();
          }
        }
      }
    );
  };

  return { ...form, handleFormSubmit } as UseFormReturn<TFieldValues, TContext> & { handleFormSubmit: (onSubmit: (data: TFieldValues) => any) => ReturnType<UseFormReturn<TFieldValues, TContext>['handleSubmit']> };
}
