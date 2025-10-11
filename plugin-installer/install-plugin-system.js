#!/usr/bin/env node

const { promises: fsp } = require('fs')
const path = require('path')

const args = process.argv.slice(2)
if (args.length === 0) {
    console.error('\n用法: node plugin-installer/install-plugin-system.js <目标项目根目录> [--force]\n')
    process.exit(1)
}

const force = args.includes('--force')
const targetArg = args.find((arg) => !arg.startsWith('-'))
if (!targetArg) {
    console.error('未指定目标项目根目录。')
    process.exit(1)
}

const repoRoot = path.resolve(__dirname, '..')
const targetRoot = path.resolve(process.cwd(), targetArg)

async function pathExists(p) {
    try {
        await fsp.access(p)
        return true
    } catch (error) {
        return false
    }
}

async function ensureDirectory(dir) {
    await fsp.mkdir(dir, { recursive: true })
}

async function copyFile(src, dest, overwrite) {
    if (!overwrite && (await pathExists(dest))) {
        throw new Error(`目标文件已存在: ${dest}`)
    }
    await ensureDirectory(path.dirname(dest))
    await fsp.copyFile(src, dest)
}

async function copyDirectory(src, dest, overwrite) {
    if (!(await pathExists(src))) {
        throw new Error(`源目录不存在: ${src}`)
    }
    if (!overwrite && (await pathExists(dest))) {
        throw new Error(`目标目录已存在: ${dest}`)
    }
    await ensureDirectory(dest)
    const entries = await fsp.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath, overwrite)
        } else if (entry.isSymbolicLink()) {
            const linkTarget = await fsp.readlink(srcPath)
            try {
                await fsp.symlink(linkTarget, destPath)
            } catch (error) {
                if (error.code === 'EEXIST' && overwrite) {
                    await fsp.rm(destPath, { force: true })
                    await fsp.symlink(linkTarget, destPath)
                } else {
                    throw error
                }
            }
        } else {
            await copyFile(srcPath, destPath, overwrite)
        }
    }
}

async function main() {
    if (!(await pathExists(targetRoot))) {
        console.error(`目标目录不存在: ${targetRoot}`)
        process.exit(1)
    }

    const tasks = [
        {
            type: 'dir',
            label: '插件目录',
            src: path.join(repoRoot, 'plugins'),
            dest: path.join(targetRoot, 'plugins'),
        },
        {
            type: 'dir',
            label: '插件运行时 (src/plugins)',
            src: path.join(repoRoot, 'src', 'plugins'),
            dest: path.join(targetRoot, 'src', 'plugins'),
        },
        {
            type: 'file',
            label: '插件设置页 (src/views/PluginSettings.vue)',
            src: path.join(repoRoot, 'src', 'views', 'PluginSettings.vue'),
            dest: path.join(targetRoot, 'src', 'views', 'PluginSettings.vue'),
        },
        {
            type: 'dir',
            label: '模板 (plugin-installer/templates)',
            src: path.join(repoRoot, 'plugin-installer', 'templates'),
            dest: path.join(targetRoot, 'plugin-installer', 'templates'),
        },
    ]

    console.log(`\n开始复制插件系统文件至: ${targetRoot}\n`)

    for (const task of tasks) {
        const { type, label, src, dest } = task
        try {
            if (type === 'dir') {
                await copyDirectory(src, dest, force)
            } else {
                await copyFile(src, dest, force)
            }
            console.log(`✔ 已复制 ${label}`)
        } catch (error) {
            console.error(`✖ 复制 ${label} 失败: ${error.message}`)
            process.exit(1)
        }
    }

    console.log('\n复制完成！接下来请在目标项目中执行以下步骤：\n')
    console.log('1. 在入口文件中调用 initPluginSystem({ app, router, pinia }) 初始化插件系统。')
    console.log('2. 依据 plugin-installer/templates/playerStore.extension.js 扩展播放器 Store。')
    console.log('3. 参考 plugin-installer/templates/PluginSettingsInjection.vue 将插件管理块合并到 Settings 页面。')
    console.log('4. 将 src/views/PluginSettings.vue 注册到路由表 (可选，用于插件自定义设置页)。')
    console.log('5. 确认 Electron preload 暴露 listPlugins/importPlugin/setPluginEnabled 等 API。\n')
    console.log('详细说明请查看 Hydrogen 仓库内的 plugin-installer/README.md。\n')
}

main().catch((error) => {
    console.error('安装器执行过程中出现未捕获的错误:', error)
    process.exit(1)
})
