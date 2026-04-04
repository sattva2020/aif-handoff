import { useState, useCallback, useMemo } from "react";

export interface UseFormStateResult<T extends Record<string, unknown>> {
  values: T;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (partial: Partial<T>) => void;
  isDirty: boolean;
  reset: () => void;
  getValues: () => T;
}

export function useFormState<T extends Record<string, unknown>>(
  initialValues: T,
): UseFormStateResult<T> {
  const [values, setValuesState] = useState<T>(initialValues);

  const isDirty = useMemo(() => {
    const keys = Object.keys(initialValues) as (keyof T)[];
    return keys.some((key) => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setValues = useCallback((partial: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValues);
  }, [initialValues]);

  const getValues = useCallback(() => values, [values]);

  return { values, setValue, setValues, isDirty, reset, getValues };
}
