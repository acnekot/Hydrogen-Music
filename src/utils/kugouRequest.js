import axios from 'axios';
import { noticeOpen } from './dialog';

const kugouRequest = axios.create({
    withCredentials: true,
    timeout: 12000,
});

const normalizeMessage = message => {
    if (!message || typeof message !== 'string') return message;
    try {
        return decodeURIComponent(escape(message));
    } catch (_) {
        return message;
    }
};

const AUTH_WHITELIST = ['/login', '/login/cellphone', '/captcha/sent', '/login/token'];

kugouRequest.interceptors.request.use(
    config => {
        if (config.skipAuth) return config;
        return config;
    },
    error => Promise.reject(error),
);

kugouRequest.interceptors.response.use(
    response => {
        const { data } = response;
        if (data && typeof data.message === 'string') {
            data.message = normalizeMessage(data.message);
        }
        return response;
    },
    error => {
        const { response } = error;
        if (response && response.data && typeof response.data.message === 'string') {
            response.data.message = normalizeMessage(response.data.message);
        }
        return Promise.reject(error);
    },
);

export default kugouRequest;
