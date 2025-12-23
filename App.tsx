import React, { Suspense } from 'react';
import Experience from './components/Experience';
import UIOverlay from './components/UIOverlay';
import HandManager from './components/HandManager';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-gradient-to-b from-[#011810] to-[#000000] overflow-hidden">
      <Suspense fallback={<div className="text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2">正在加载奢华体验...</div>}>
        <Experience />
      </Suspense>
      <UIOverlay />
      <HandManager />
    </div>
  );
};

export default App;