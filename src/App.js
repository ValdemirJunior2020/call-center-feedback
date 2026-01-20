import React from 'react';
import FeedbackFilter from './components/FeedbackFilter';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div className="container py-5">
      <h1 className="text-center mb-4">Feedback Filter</h1>
      <FeedbackFilter />
    </div>
  );
}

export default App;
