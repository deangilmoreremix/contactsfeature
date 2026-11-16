import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/index.css';
import ImageGenerationModal from './src/components/ImageGenerationModal';
createRoot(document.getElementById('root')!).render(<ImageGenerationModal open={true} onClose={() => {}} />);
