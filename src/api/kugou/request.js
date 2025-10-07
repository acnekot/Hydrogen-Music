import axios from 'axios'

const kugouBaseUrl = typeof window !== 'undefined'
  ? (window.__KUGOU_API_BASE__ || localStorage.getItem('kugou:apiBase') || 'http://127.0.0.1:36540')
  : 'http://127.0.0.1:36540'

const kugouRequest = axios.create({
  baseURL: kugouBaseUrl,
  withCredentials: true,
  timeout: 10000,
})

kugouRequest.interceptors.response.use(
  response => response?.data ?? response,
  error => {
    return Promise.reject(error)
  }
)

export default kugouRequest
