import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiAdapter } from '../adapters/api-adapter';
import { JsonObject, Merchant } from '../domain/entities';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hexagonal Adapter instance
  const api = useMemo(() => new ApiAdapter(), []);

  const loadMerchants = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getMerchants();
      setMerchants(data);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load merchants'));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const updatePolicy = useCallback(async (merchantId: string, version: string, payload: JsonObject) => {
    try {
      await api.updatePolicy(merchantId, version, payload);
      await loadMerchants(); // Refresh
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to update policy'));
      throw error;
    }
  }, [api, loadMerchants]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  return {
    merchants,
    isLoading,
    error,
    updatePolicy
  };
}
