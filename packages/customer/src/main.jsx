import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@shared/AuthProvider';
import { initSessionTracking } from '@shared/analytics';
import App from './App';
import '@shared/theme.css';
import './styles/app.css';

// Start analytics session tracking (session_start, session_end, duration)
initSessionTracking();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
