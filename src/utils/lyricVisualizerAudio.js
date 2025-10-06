const GLOBAL_ENV_KEY = '__hydrogenLyricVisualizerAudioEnv__';

const createDefaultAudioEnv = () => ({
    audioContext: null,
    analyser: null,
    analyserConnected: false,
    audioSourceCache: new WeakMap(),
});

export function getLyricVisualizerAudioEnv() {
    const target = typeof window !== 'undefined' ? window : globalThis;
    if (!target[GLOBAL_ENV_KEY]) {
        target[GLOBAL_ENV_KEY] = createDefaultAudioEnv();
    }
    return target[GLOBAL_ENV_KEY];
}
