import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navigation from './components/Navigation';
import { AdminPage } from './pages/AdminPage';
import { ObsPage } from './pages/ObsPage';
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#212121',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: '#757575',
          },
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            color: '#212121',
          },
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* OBS route - completely separate, no theme or navigation */}
        <Route path="/obs" element={<ObsPage />} />
        
        {/* All other routes with theme and navigation */}
        <Route path="/*" element={
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Navigation />
            <Routes>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </ThemeProvider>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
