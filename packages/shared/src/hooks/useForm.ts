import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

type FormErrors<T> = Partial<Record<keyof T, string>>;

export interface UseFormOptions<T> {
  initialValues: T;
  onSubmit?: (values: T, formErrors: FormErrors<T>) => void;
  validate?: (values: T) => FormErrors<T>;
}

export interface FormState<T> {
  values: T;
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  _isValid: boolean;
  isDirty: boolean;
}

export interface UseFormReturn<T> extends FormState<T> {
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFieldValue: (name: keyof T, value: unknown) => void;
  setFieldError: (name: keyof T, error: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  resetForm: () => void;
}

/**
 * 폼 상태 관리와 유효성 검사를 위한 훅
 * @param options.initialValues 초기 폼 값
 * @param options.onSubmit 제출 핸들러
 * @param options.validate 유효성 검증 함수
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, onSubmit, validate } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  // 폼 유효성 검사
  const validateForm = useCallback(
    (formValues: T): FormErrors<T> => {
      if (!validate) return {};
      return validate(formValues);
    },
    [validate]
  );

  // 필드 값 변경 핸들러
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      let fieldValue: unknown = value;

      // 입력 타입에 따른 값 처리
      if (type === 'checkbox') {
        fieldValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'number') {
        fieldValue = value === '' ? '' : Number(value);
      }

      setValues((prev) => ({
        ...prev,
        [name]: fieldValue,
      }));

      // 필드가 이미 터치되었으면 실시간 유효성 검사
      if (touched[name as keyof T]) {
        const validationErrors = validateForm({
          ...values,
          [name]: fieldValue,
        });
        setErrors((prev) => ({
          ...prev,
          [name]: validationErrors[name as keyof T] || '',
        }));
      }
    },
    [touched, validateForm, values]
  );

  // 필드 포커스 아웃 핸들러
  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      const validationErrors = validateForm(values);
      setErrors((prev) => ({
        ...prev,
        [name]: validationErrors[name as keyof T] || '',
      }));
    },
    [validateForm, values]
  );

  // 필드 값 직접 설정
  const setFieldValue = useCallback((name: keyof T, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // 필드 오류 직접 설정
  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  // 폼 초기화
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // 폼 제출 핸들러
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      // 모든 필드를 터치된 상태로 표시
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {} as Partial<Record<keyof T, boolean>>
      );
      setTouched(allTouched);

      // 유효성 검사 실행
      const validationErrors = validateForm(values);
      setErrors(validationErrors);
      
      const _isValid = Object.keys(validationErrors).length === 0;

      // 유효하면 제출 핸들러 호출
      if (onSubmit) {
        onSubmit(values, validationErrors);
      }
    },
    [onSubmit, validateForm, values]
  );

  // 폼 상태 계산
  const _isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    _isValid,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    handleSubmit,
    resetForm,
  };
}