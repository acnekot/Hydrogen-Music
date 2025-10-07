export const computeCustomBackgroundStyle = ({
    active = false,
    image = '',
    mode = 'cover',
    blur = 0,
    brightness = 100,
} = {}) => {
    if (!active) return {};
    if (!image || typeof image !== 'string') return {};

    let normalizedPath = image.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('file://')) {
        if (/^[a-zA-Z]:\//.test(normalizedPath)) {
            normalizedPath = `/${normalizedPath}`;
        }
        normalizedPath = `file://${normalizedPath}`;
    }

    const escapedUrl = normalizedPath.replace(/"/g, '\\"');

    let size = 'cover';
    let repeat = 'no-repeat';
    let position = 'center center';

    switch (mode) {
        case 'stretch':
            size = '100% 100%';
            break;
        case 'contain':
            size = 'contain';
            break;
        case 'center':
            size = 'auto';
            break;
        default:
            size = 'cover';
            break;
    }

    const numericBlur = Number(blur);
    const numericBrightness = Number(brightness);
    const blurValue = Math.max(0, Number.isFinite(numericBlur) ? numericBlur : 0);
    const brightnessValue = Math.max(0, Number.isFinite(numericBrightness) ? numericBrightness : 100);

    return {
        '--custom-background-image': `url("${escapedUrl}")`,
        '--custom-background-size': size,
        '--custom-background-repeat': repeat,
        '--custom-background-position': position,
        '--custom-background-blur': `${blurValue}px`,
        '--custom-background-brightness': `${brightnessValue}%`,
    };
};
