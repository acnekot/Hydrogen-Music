<template>
    <div class="skyline-theme-panel">
        <h2>天际线主题</h2>
        <p>
            该示例展示了如何通过插件注入附加样式表。插件会在 document.head 中写入 CSS，以打造霓虹与雾化效果。
        </p>
        <ol>
            <li>使用 <code>context.registerThemeStyle</code> 将 CSS 注入页面。</li>
            <li>提供一个简单的说明面板，提示用户如何自定义主题。</li>
            <li>卸载插件时样式会自动被清理。</li>
        </ol>
        <p class="tip">要制作自己的主题，可复制该插件并替换 <code>theme.css</code>。</p>
    </div>
</template>

<script setup>
</script>

<style scoped lang="scss">
.skyline-theme-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    line-height: 1.8;
    h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
    }
    p {
        margin: 0;
        color: rgba(0, 0, 0, 0.62);
    }
    ol {
        margin: 0;
        padding-left: 20px;
        color: rgba(0, 0, 0, 0.7);
        li {
            margin-bottom: 6px;
        }
    }
    .tip {
        font-size: 13px;
        color: #5c6cff;
    }
}
</style>
