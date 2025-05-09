import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Resume from './resume/Resume';
import Interview from './Interview/Interview';
import Results from './Results/Results';
import HRInterview from './HRInterview/HRInterview';
import HRResults from './HRResults/HRResults';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Resume />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/results" element={<Results />} />
        <Route path="/hr-interview" element={<HRInterview />} />
        <Route path="/hr-results" element={<HRResults />} />
      </Routes>
    </Router>
  );
}

export default App;
