module.exports = async (context) => {
  let audioContext;
  let masterGain;

  const settings = await context.getData();
  if (typeof settings.volume === 'undefined') {
    context.setSetting('volume', 0.2);
  }

  const ensureContext = () => {
    if (audioContext) {
      masterGain.gain.value = context.getSetting('volume', 0.2);
      return { audioContext, masterGain };
    }
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = context.getSetting('volume', 0.2);
    masterGain.connect(audioContext.destination);
    return { audioContext, masterGain };
  };

  context.registerSoundEffect({
    onSongChange: async () => {
      if (!context.isCategoryEnabled('sound')) return;
      const { audioContext, masterGain } = ensureContext();
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioContext.currentTime);
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
      osc.connect(gain).connect(masterGain);
      osc.start();
      osc.stop(audioContext.currentTime + 0.4);
    },
    dispose: async () => {
      try {
        await audioContext?.close();
      } catch (_) {
        // ignore
      }
      audioContext = null;
      masterGain = null;
    }
  });

  context.registerSettingsPanel(async () => {
    const module = await context.importModule('sound/sfx-panel');
    return module.default || module;
  });
};
