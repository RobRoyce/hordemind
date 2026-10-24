import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '../fonts';
import '../tokens.css';
import {KitGallery} from './KitGallery';

createRoot(document.getElementById('root')!).render(<StrictMode><KitGallery/></StrictMode>);
