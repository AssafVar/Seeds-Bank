import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthProvider from './components/AuthProvider';
import ThemeModeProvider from './components/ThemeModeProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <React.StrictMode>
    <ThemeModeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeModeProvider>
    </React.StrictMode>
  </BrowserRouter>
);
