import { defineStore } from "pinia";

export const usePlayerStore = defineStore('playerStore', {
    state: () => {
        return {
            widgetState: true,//是否开启widget
            currentMusic: null,//播放列表的索引
            playing: false,//是否正在播放
            progress: 0,//进度条
            volume: 0.3,//音量
            // volumeBeforeMuted: 0,//静音前音量
            playMode: 0,//0为顺序播放，1为列表循环，2为单曲循环，3为随机播放
            listInfo: null,
            songList: null,//播放列表
            shuffledList: null,//随机播放列表
            shuffleIndex: 0,//随机播放列表的索引
            songId: null,
            currentIndex: 0,
            time: 0, //歌曲总时长
            quality: null,
            playlistWidgetShow: false,
            playerChangeSong: false, //player页面切换歌曲更换歌名动画,
            lyric: null,
            lyricsObjArr: null,
            currentLyricIndex: -1, // 当前歌词索引，用于桌面歌词同步
            lyricSize: null,
            tlyricSize: null,
            rlyricSize: null,
            lyricType: ['original'],
            lyricInterludeTime: null, //歌词间奏等待时间
            lyricShow: false, //歌词是否显示
            lyricEle: null,//歌词DOM
            isLyricDelay: true, //调整进度的时候禁止赋予delay属性
            localBase64Img: null, //如果是本地歌曲，获取封面
            forbidLastRouter: false, //在主动跳转router时禁用回到上次离开的路由的地址功能
            musicVideo: false,
            addMusicVideo: false,
            currentMusicVideo: null,
            musicVideoDOM: null,
            videoIsPlaying: false,
            playerShow: true,
            lyricBlur: false,
            lyricVisualizer: false, // 歌词区域音频可视化开关
            lyricVisualizerHeight: 220, // 可视化高度（像素）
            lyricVisualizerFrequencyMin: 20, // 频谱最低采样频率（Hz）
            lyricVisualizerFrequencyMax: 8000, // 频谱最高采样频率（Hz）
            lyricVisualizerTransitionDelay: 0.75, // 过渡延迟（平滑系数）
            lyricVisualizerBarCount: 48, // 柱体数量
            lyricVisualizerBarWidth: 55, // 柱体宽度比例（%）
            lyricVisualizerColor: 'black', // 可视化主颜色
            lyricVisualizerOpacity: 100, // 可视化透明度（百分比）
            lyricVisualizerStyle: 'bars', // 可视化样式
            lyricVisualizerRadialSize: 100, // 辐射样式尺寸（百分比）
            lyricVisualizerRadialOffsetX: 0, // 辐射样式X轴偏移（百分比）
            lyricVisualizerRadialOffsetY: 0, // 辐射样式Y轴偏移（百分比）
            lyricVisualizerRadialCoreSize: 62, // 辐射样式中心圆比例（百分比）
            customBackgroundEnabled: false, // 是否启用自定义全局背景
            customBackgroundImage: '', // 自定义背景图片路径
            customBackgroundMode: 'cover', // 自定义背景展示模式
            customBackgroundBlur: 0, // 自定义背景模糊强度
            customBackgroundBrightness: 100, // 自定义背景亮度（百分比）
            customBackgroundApplyToChrome: true, // 是否在全局界面应用自定义背景
            customBackgroundApplyToPlayer: true, // 是否在播放页应用自定义背景
        }
    },
    actions: {
    },
    persist: {
        storage: localStorage,
        paths: [
            'progress',
            'volume',
            'playMode',
            'shuffleIndex',
            'listInfo',
            'songId',
            'currentIndex',
            'time',
            'quality',
            'lyricType',
            'musicVideo',
            'lyricBlur',
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
            'customBackgroundEnabled',
            'customBackgroundImage',
            'customBackgroundMode',
            'customBackgroundBlur',
            'customBackgroundBrightness',
            'customBackgroundApplyToChrome',
            'customBackgroundApplyToPlayer',
        ]
    },
})
