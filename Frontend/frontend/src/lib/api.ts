import axios from 'axios';

// 🚀 CHANGED: Use relative path. 
// This tells the browser "Connect to the same domain I am currently on"
const api = axios.create({
  baseURL: '/api', 
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api; 