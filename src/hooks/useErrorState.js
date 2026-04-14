import { useCallback, useState } from 'react';

// Хук для централизованной работы с состоянием ошибки
export default function useErrorState() {
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, setError, clearError };
}
