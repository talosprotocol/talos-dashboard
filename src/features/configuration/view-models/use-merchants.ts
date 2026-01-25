import { useState, useEffect, useMemo } from 'react';
import { ApiAdapter } from '../adapters/api-adapter';
import { Merchant } from '../domain/entities';

export function useMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hexagonal Adapter instance
  const api = useMemo(() => new ApiAdapter(), []);

  const loadMerchants = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMerchants();
      setMerchants(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load merchants');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePolicy = async (merchantId: string, version: string, payload: any) => {
    try {
      await api.updatePolicy(merchantId, version, payload);
      await loadMerchants(); // Refresh
    } catch (e: any) {
      setError(e.message || 'Failed to update policy');
      throw e;
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  return {
    merchants,
    isLoading,
    error,
    updatePolicy
  };
}
