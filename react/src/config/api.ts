// API Configuration for both development and production
const isDevelopment = import.meta.env.DEV;
const isElectron = window.navigator.userAgent.includes('Electron');

// Base API URL configuration
export const API_BASE_URL = (() => {
  if (isDevelopment) {
    return 'http://localhost:3001';
  } else if (isElectron) {
    // In Electron production, the server runs locally
    return 'http://localhost:3001';
  } else {
    // For web deployment, you might need a different URL
    return 'http://localhost:3001';
  }
})();

// API endpoints
export const API_ENDPOINTS = {
  orbs: `${API_BASE_URL}/api/orbs`,
  soundboard: `${API_BASE_URL}/api/soundboard`,
  uploadSound: `${API_BASE_URL}/api/upload/sound`,
  uploadGif: `${API_BASE_URL}/api/upload/gif`,
  uploads: `${API_BASE_URL}/uploads`,
  listUploads: `${API_BASE_URL}/api/uploads`,
  deleteUpload: `${API_BASE_URL}/api/uploads`,
  health: `${API_BASE_URL}/health`,
};

// Helper function to get full upload URL
export const getUploadUrl = (relativePath: string): string => {
  if (relativePath.startsWith('/')) {
    return `${API_BASE_URL}${relativePath}`;
  }
  return `${API_BASE_URL}/${relativePath}`;
};

// Helper function to check if server is available
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(API_ENDPOINTS.health, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Server health check failed:', error);
    return false;
  }
};

// API functions for upload management
export const listUploads = async (): Promise<UploadedFile[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.listUploads);
    if (!response.ok) {
      throw new Error(`Failed to list uploads: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error listing uploads:', error);
    return [];
  }
};

export interface UploadedFile {
  filename: string;
  url: string;
  originalName: string;
  size: number;
  uploadDate: string;
  type: string;
}

export const deleteUpload = async (filename: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.deleteUpload}/${filename}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete upload: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error('Error deleting upload:', error);
    return false;
  }
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  getUploadUrl,
  checkServerHealth,
  listUploads,
  deleteUpload,
};
