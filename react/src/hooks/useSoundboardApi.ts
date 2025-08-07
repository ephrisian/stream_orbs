import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.68.68:3001/api';

export interface SoundTriggerData {
  id: string;
  label: string;
  keyCombo: string;
  soundUrl?: string;
  soundFile?: File;
  gifUrl?: string;
  gifFile?: File;
  volume: number;
  gifPosition: string;
}

export const useSoundboardApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSoundTriggers = useCallback(async (): Promise<SoundTriggerData[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/soundboard`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sound triggers: ${response.statusText}`);
      }
      
      const triggers = await response.json();
      return triggers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching sound triggers:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSoundTriggers = useCallback(async (triggers: SoundTriggerData[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/soundboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(triggers),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save sound triggers: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error saving sound triggers:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSoundTrigger = useCallback(async (triggerId: string, trigger: SoundTriggerData): Promise<SoundTriggerData | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/soundboard/${triggerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trigger),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update sound trigger: ${response.statusText}`);
      }
      
      const updatedTrigger = await response.json();
      return updatedTrigger;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error updating sound trigger:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSoundTrigger = useCallback(async (triggerId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/soundboard/${triggerId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete sound trigger: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error deleting sound trigger:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAllSoundTriggers = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/soundboard`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear sound triggers: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error clearing sound triggers:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadSoundFile = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('sound', file);
      
      const response = await fetch(`${API_BASE_URL}/upload/sound`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload sound file: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error uploading sound file:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadGifFile = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('gif', file);
      
      const response = await fetch(`${API_BASE_URL}/upload/gif`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload GIF file: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error uploading GIF file:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getSoundTriggers,
    saveSoundTriggers,
    updateSoundTrigger,
    deleteSoundTrigger,
    clearAllSoundTriggers,
    uploadSoundFile,
    uploadGifFile,
  };
};
