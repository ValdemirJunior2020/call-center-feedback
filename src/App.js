// src/App.js
import React from 'react';
import FeedbackFilter from './components/FeedbackFilter';

function App() {
  return (
    <div className="container py-5">
      <h1 className="text-center mb-4">Welcome to the Feedback Viewer</h1>
      <FeedbackFilter />
    </div>
  );
}

export default App;
