import { noticeOpen } from '../utils/dialog';

const actionHandlers = {
    async reload(manifest, field, pluginStore) {
        try {
            await pluginStore.reloadPlayer();
            noticeOpen('播放器已重载', 2);
        } catch (error) {
            console.error('插件动作执行失败:', error);
            noticeOpen('执行插件操作失败', 2);
        }
    },
};

export function runPluginAction(manifest, field, pluginStore) {
    if (!field || !field.action) return;
    const handler = actionHandlers[field.action];
    if (typeof handler === 'function') {
        handler(manifest, field, pluginStore);
    } else {
        console.warn(`未找到插件动作处理器: ${field.action}`);
        noticeOpen('暂不支持的插件操作', 2);
    }
}
