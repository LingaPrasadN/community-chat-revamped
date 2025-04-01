import axios from 'axios';

const API_BASE_URL = 'http://localhost:8082';
const WS_BASE_URL = 'ws://localhost:8082';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

// Add request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('Token from localStorage:', token); // Debug log
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Request headers:', config.headers); // Debug log
        } else {
            console.log('No token found in localStorage'); // Debug log
        }
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error); // Debug log
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('Response error:', error.response); // Debug log
        if (error.response?.status === 401) {
            console.log('Unauthorized access, redirecting to login'); // Debug log
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const API_ENDPOINTS = {
    // Auth endpoints
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    UPDATE_PROFILE: '/api/auth/profile',

    // Posts endpoints
    GET_POSTS: '/api/posts',
    CREATE_POST: '/api/posts',
    LIKE_POST: (postId) => `/api/posts/${postId}/like`,
    UNLIKE_POST: (postId) => `/api/posts/${postId}/unlike`,
    ADD_COMMENT: (postId) => `/api/posts/${postId}/comments`,

    // Chat endpoints
    SEND_MESSAGE: '/api/chat/messages',
    GET_MESSAGES: '/api/chat/messages',
    GET_USERS: '/api/users',
};

export const WS_ENDPOINTS = {
    CONNECT: `${WS_BASE_URL}/ws`,
    CHAT_MESSAGES: '/topic/messages',
    USER_PRESENCE: '/topic/presence',
    TYPING_INDICATOR: '/topic/typing',
    MESSAGE_STATUS: '/topic/message.status',
    REACTIONS: '/topic/reactions',
};

export const APP_ENDPOINTS = {
    SEND_MESSAGE: '/app/chat.send',
    UPDATE_PRESENCE: '/app/presence.update',
    UPDATE_TYPING: '/app/typing.update',
    UPDATE_MESSAGE_STATUS: '/app/message.status',
    ADD_REACTION: '/app/reaction.add',
    REMOVE_REACTION: '/app/reaction.remove',
    CHAT_JOIN: '/app/chat.join',
    CHAT_LEAVE: '/app/chat.leave',
    CHAT_TYPING: '/app/chat.typing',
    CHAT_REACTION_ADD: '/app/chat.reaction.add',
    CHAT_REACTION_REMOVE: '/app/chat.reaction.remove'
};

export default api; 