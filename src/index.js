import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactTogether } from 'react-together';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ReactTogether
    sessionParams={{
      appId: process.env.REACT_APP_MULTISYNQ_APP_ID,
      apiKey: process.env.REACT_APP_MULTISYNQ_API_KEY,
      name: 'hot-potato-game',
      password: 'potato123'
    }}
  >
    <App />
  </ReactTogether>
);