import { useState, useCallback } from 'react';
import type { SavedOrb } from '../types/orb';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.68.68:3001/api';

export interface ApiOrbData extends SavedOrb {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const useOrbApi = () => {
  const [orbs, setOrbs] = useState<ApiOrbData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all orbs from server
  const fetchOrbs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/orbs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch orbs: ${response.statusText}`);
      }
      
      const data = await response.json();
      setOrbs(data);
      console.log(`API: Fetched ${data.length} orbs from server`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orbs';
      setError(errorMessage);
      console.error('API Error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save all orbs to server
  const saveOrbs = useCallback(async (orbsToSave: SavedOrb[]) => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert SavedOrb to ApiOrbData format
      const apiOrbs = orbsToSave.map((orb, index) => ({
        ...orb,
        id: `orb_${Date.now()}_${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      const response = await fetch(`${API_BASE_URL}/orbs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiOrbs),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save orbs: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`API: Saved ${result.count} orbs to server`);
      
      // Refresh local data
      await fetchOrbs();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save orbs';
      setError(errorMessage);
      console.error('API Error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOrbs]);

  // Update a specific orb
  const updateOrb = useCallback(async (orbId: string, updates: Partial<SavedOrb>) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const response = await fetch(`${API_BASE_URL}/orbs/${orbId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update orb: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`API: Updated orb ${orbId}`);
      
      // Refresh local data
      await fetchOrbs();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update orb';
      setError(errorMessage);
      console.error('API Error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOrbs]);

  // Delete a specific orb
  const deleteOrb = useCallback(async (orbId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/orbs/${orbId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete orb: ${response.statusText}`);
      }
      
      console.log(`API: Deleted orb ${orbId}`);
      
      // Refresh local data
      await fetchOrbs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete orb';
      setError(errorMessage);
      console.error('API Error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOrbs]);

  // Clear all orbs
  const clearAllOrbs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/orbs`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear orbs: ${response.statusText}`);
      }
      
      console.log('API: Cleared all orbs');
      setOrbs([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear orbs';
      setError(errorMessage);
      console.error('API Error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch disabled - orbs are loaded manually when needed
  // useEffect(() => {
  //   fetchOrbs().catch(console.error);
  // }, [fetchOrbs]);

  return {
    orbs,
    loading,
    error,
    fetchOrbs,
    saveOrbs,
    updateOrb,
    deleteOrb,
    clearAllOrbs,
  };
};
