/**
 * 将以下字段与持久化配置合并到目标项目的播放器 Store 中，
 * 以便音频可视化插件能够读取/写入用户偏好与运行状态。
 */

export const lyricVisualizerState = {
    lyricVisualizer: false, // 歌词区域音频可视化开关
    lyricVisualizerPluginActive: false, // 歌词可视化插件是否已就绪
    lyricVisualizerToggleAvailable: false, // 播放器中是否展示可视化开关
    lyricVisualizerHasAutoEnabled: false, // 是否已自动开启过歌词可视化
    lyricVisualizerHeight: 220, // 可视化高度（像素）
    lyricVisualizerFrequencyMin: 20, // 频谱最低采样频率（Hz）
    lyricVisualizerFrequencyMax: 8000, // 频谱最高采样频率（Hz）
    lyricVisualizerTransitionDelay: 0.75, // 过渡延迟（平滑系数）
    lyricVisualizerBarCount: 48, // 柱体数量
    lyricVisualizerBarWidth: 55, // 柱体宽度比例（%）
    lyricVisualizerColor: 'auto', // 可视化主颜色：auto / dark / light
    lyricVisualizerOpacity: 100, // 可视化透明度（百分比）
    lyricVisualizerStyle: 'bars', // 可视化样式：bars / radial
    lyricVisualizerRadialSize: 100, // 辐射样式尺寸（百分比）
    lyricVisualizerRadialOffsetX: 0, // 辐射样式 X 轴偏移（百分比）
    lyricVisualizerRadialOffsetY: 0, // 辐射样式 Y 轴偏移（百分比）
    lyricVisualizerRadialCoreSize: 62, // 辐射样式中心圆比例（百分比）
    lyricVisualizerSlowRelease: false, // 停止播放后缓慢下落
    lyricVisualizerSlowReleaseDuration: 900, // 缓慢下落动画时长（毫秒）
}

export const lyricVisualizerPersistKeys = [
    'lyricVisualizer',
    'lyricVisualizerHeight',
    'lyricVisualizerFrequencyMin',
    'lyricVisualizerFrequencyMax',
    'lyricVisualizerTransitionDelay',
    'lyricVisualizerBarCount',
    'lyricVisualizerBarWidth',
    'lyricVisualizerColor',
    'lyricVisualizerOpacity',
    'lyricVisualizerStyle',
    'lyricVisualizerRadialSize',
    'lyricVisualizerRadialOffsetX',
    'lyricVisualizerRadialOffsetY',
    'lyricVisualizerRadialCoreSize',
    'lyricVisualizerSlowRelease',
    'lyricVisualizerSlowReleaseDuration',
    'lyricVisualizerHasAutoEnabled',
]

/**
 * 示例：在 defineStore 中合并上述字段
 *
 * export const usePlayerStore = defineStore('player', {
 *   state: () => ({
 *     ...lyricVisualizerState,
 *     // 其它字段
 *   }),
 *   persist: {
 *     storage: localStorage,
 *     paths: [
 *       ...lyricVisualizerPersistKeys,
 *       // 其它需要持久化的字段
 *     ],
 *   },
 * })
 */
