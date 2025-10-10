<br />
<p align="center">

  <h2 align="center" style="font-weight: 600">Hydrogen Music++</h2>

  <p align="center">
    <h2 align="center">感谢原作者的绝佳创意和辛勤付出：<a href="https://github.com/Kaidesuyo/Hydrogen-Music" target="blank"><strong>Hydrogen-Music</strong></a></h2>
     <p align="center">
    ⚠️ 如果原作者觉得不妥可以与我联系，我将删除该仓库
    <br />
    <a href="#%EF%B8%8F-安装" target="blank"><strong>📦️ 下载安装包</strong></a>
    <a ><strong>📦️ 你也可以在Actions找到dev版本</strong></a>
    <h3 align="center">此分支是独立于<a href="https://github.com/Kaidesuyo/Hydrogen-Music" target="blank"><strong>Hydrogen-Music</strong></a>的分支
    <h3 align="center">在此感谢ldx123000大佬的维护</h3>
    <br />
    🎵 我关注到这个项目是在2023年，它的界面ui和动效都很戳我，但可惜的是作者不再维护，在偶然的时候我发现ldx123000大佬在维护这个项目。在一番思索下我决定开发一些新功能
    <br />但是由于本人孱弱的编程,为了不污染正常仓库和莫名其妙的bug出现
    <br />🔄 在这种情况下我决定单开分支
    <br />
    <br />
    <br />
  </p>
</p>

# 注意
- ### 此分支代码部分由AI编写，容易出现BUG过多的情况
- ### 如果出现了bug尽管提issue
<br/>
<br/>

## 🌟 主要特性

- 重做 **登录** 功能
- 修复 **歌曲下载** 功能
- 修复 **音乐视频** 功能，现在支持在线音乐播放视频
- 修复 **云盘** 功能，现在可以正常在云盘进行上传/删除操作，内存管理一切正常
- 新增 **私人漫游** 功能，可以像原版预期那样探索音乐世界。
- 新增 **桌面歌词** 功能，播放器界面可打开独立桌面歌词窗口（可拖动/锁定、可调整大小），支持显示当前/下一句，右键菜单可切换歌词来源（自动/原文/翻译/罗马音）、锁定位置与字体大小调节
- 新增 **评论区** 功能，播放器界面可自由切换显示歌词/评论区
- 新增 **电台** 功能，可以在我的音乐-收藏-电台中找到，目前仅允许收听已收藏的电台节目
- 新增 **深色模式**功能，可在设置中自行调节浅色/深色模式
- 支持了多系统版本的安装包
- 新增 **音频可视化**功能，可以在设置种进行调整，拥有两个样式
- 新增 **自定义背景**功能，可以在设置设置壁纸和其的模糊度、亮度（目前在播放页无效）

## 插件系统

一个正在策划的功能

- [ ] 友好的开发文档
- [ ] 好用的插件核心

希望到时候能提供舒适的使用体验
  
## 📦️ 安装

访问 [Releases](https://github.com/acnekot/Hydrogen-Music/releases)
页面下载安装包。

## 👷‍♂️ 打包客户端

```shell
# 构建前端资源
npm run web:build

# 构建桌面应用
npm run build
```

## :computer: 配置开发环境

运行本项目

```shell
# 安装依赖
npm install

# 启动前端开发服务器
npm run web:dev

# 启动 Tauri 桌面应用
npm run dev
```

## 📜 开源许可

本项目仅供个人学习研究使用，禁止用于商业及非法用途。

基于 [MIT license](https://opensource.org/licenses/MIT) 许可进行开源。

## 重构
未来可能根据实际情况将进行整体框架的优化重构，实现多端使用
## 灵感来源

基于Hydrogen Music修改而来，感谢[Hydrogen-Music](https://github.com/Kaidesuyo/Hydrogen-Music)。


## 🖼️ 界面预览

为保持仓库纯文本化，本分支不再附带截图等二进制资源。请通过运行 `npm run dev` 或查看发布版本来体验实际界面效果。
