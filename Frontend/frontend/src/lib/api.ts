import axios from 'axios';

// Automatically choose URL based on environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Critical for Cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;