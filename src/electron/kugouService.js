const DEFAULT_PORT = process.env.KUGOU_API_PORT || process.env.kugou_port || process.env.PORT || '3000';
const DEFAULT_PLATFORM = process.env.KUGOU_API_PLATFORM || process.env.platform || 'lite';

async function startKuGouApi() {
    try {
        process.env.PORT = DEFAULT_PORT;
        process.env.platform = DEFAULT_PLATFORM;
        const { startService } = require('kugou-music-api/server');
        await startService();
        console.log(`[KuGouAPI] running at http://localhost:${DEFAULT_PORT}`);
    } catch (error) {
        console.warn('[KuGouAPI] failed to start:', error?.message || error);
    }
}

function stopKuGouApi() {
    instance = null;
}

module.exports = {
    startKuGouApi,
    stopKuGouApi,
};
