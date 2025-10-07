<template>
  <div class="hello-plugin">
    <h1>欢迎来到插件示例页</h1>
    <p>
      这是一个由插件提供的页面。你可以在这里自由地编写组件、调用已有的 Pinia store，
      或者通过 <code>windowApi</code> 与桌面端交互。
    </p>
    <p class="tip">在 <code>docs/plugin-development.md</code> 中了解如何创建自己的插件。</p>
  </div>
</template>

<script setup>
</script>

<style scoped>
.hello-plugin {
  padding: 32px;
  color: #1f1f1f;
}

.hello-plugin h1 {
  font-size: 26px;
  margin-bottom: 12px;
}

.hello-plugin p {
  margin: 12px 0;
  line-height: 1.6;
  font-size: 15px;
}

.hello-plugin .tip {
  padding: 12px 16px;
  border-left: 4px solid #00acc1;
  background: rgba(0, 172, 193, 0.08);
  border-radius: 4px;
}

code {
  font-family: ui-monospace, SFMono-Regular, SFMono, Consolas, 'Liberation Mono', Menlo, monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
