import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const login = (username, password) =>
    API.post('/auth/login/', { username, password });

export const getProfile = () =>
    API.get('/auth/profile/');

// Scoring
export const scoreIndividual = (formData) =>
    API.post('/score/individual/', formData);

export const scoreBatch = (formData) =>
    API.post('/score/batch/', formData);

// Records
export const getScores = (params) =>
    API.get('/scores/', { params });

export const getScoreDetail = (id) =>
    API.get(`/scores/${id}/`);

export const getApplicantHistory = (ref) =>
    API.get(`/applicants/${ref}/`);

// Dashboard
export const getDashboardStats = () =>
    API.get('/dashboard/stats/');

// Admin
export const getRules = () =>
    API.get('/rules/');

export const updateRule = (id, data) =>
    API.put(`/rules/${id}/`, data);

export const getBatches = () =>
    API.get('/batches/');

export const getInstitutions = () =>
    API.get('/institutions/');

export default API;