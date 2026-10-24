import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './ui/App';
import './ui/kit/fonts';
import './ui/kit/tokens.css';

createRoot(document.getElementById('root')!).render(
 <React.StrictMode><App/></React.StrictMode>
);
