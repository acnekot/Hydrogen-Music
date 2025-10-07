import kugouRequest from '../utils/kugouRequest';
import { getKuGouAuth } from '../utils/authority';

export function kugouLoginByPassword({ username, password }) {
    return kugouRequest.post(
        '/login',
        {
            username,
            password,
        },
        { skipAuth: true },
    );
}

export function kugouSendCaptcha({ mobile }) {
    return kugouRequest.post(
        '/captcha/sent',
        {
            mobile,
        },
        { skipAuth: true },
    );
}

export function kugouLoginByMobile({ mobile, code, userid }) {
    return kugouRequest.post(
        '/login/cellphone',
        {
            mobile,
            code,
            userid,
        },
        { skipAuth: true },
    );
}

export function kugouRefreshToken() {
    const auth = getKuGouAuth();
    if (!auth || !auth.token || !auth.userid) return Promise.reject(new Error('未检测到酷狗登录态'));
    return kugouRequest.post(
        '/login/token',
        {
            token: auth.token,
            userid: auth.userid,
        },
        { skipAuth: true },
    );
}

export function kugouFetchUserProfile(params = {}) {
    const auth = getKuGouAuth();
    const payload = {
        ...(params || {}),
    };
    if (auth?.token && auth?.userid) {
        payload.token = auth.token;
        payload.userid = auth.userid;
    }
    return kugouRequest.post('/user/detail', payload);
}
