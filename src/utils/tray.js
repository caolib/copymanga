import { TrayIcon } from '@tauri-apps/api/tray'
import { Menu } from '@tauri-apps/api/menu'
import { defaultWindowIcon } from '@tauri-apps/api/app'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { exit } from '@tauri-apps/plugin-process'
import { restartApp as restartApplication } from './restart-helper'

let trayInstance = null

async function createTrayIcon() {
    try {
        // 如果已存在托盘实例，先销毁它
        if (trayInstance) {
            await destroyTray()
        }        // 创建托盘菜单
        const menu = await Menu.new({
            items: [
                {
                    id: 'restart',
                    text: '重启',
                    action: () => restartApp()
                },
                {
                    id: 'quit',
                    text: '退出',
                    action: () => quitApp()
                }
            ]
        })

        // 创建托盘图标
        const options = {
            icon: await defaultWindowIcon(),
            menu,
            menuOnLeftClick: false,
            tooltip: 'doki - 漫画阅读器',
            action: (event) => {
                // 处理托盘图标点击事件
                if (event.type === 'Click' && event.button === 'Left') {
                    toggleWindow()
                }
            }
        }

        trayInstance = await TrayIcon.new(options)
        console.log('托盘图标创建成功')

        return trayInstance
    } catch (error) {
        console.error('创建托盘图标失败:', error)
        throw error
    }
}

async function showWindow() {
    try {
        const window = getCurrentWebviewWindow()
        await window.show()
        await window.setFocus()

        console.log('窗口已显示')
    } catch (error) {
        console.error('显示窗口失败:', error)
    }
}

async function hideWindow() {
    try {
        const window = getCurrentWebviewWindow()
        await window.hide()
        console.log('窗口已隐藏')
    } catch (error) {
        console.error('隐藏窗口失败:', error)
    }
}

async function toggleWindow() {
    try {
        const window = getCurrentWebviewWindow()
        const isVisible = await window.isVisible()

        if (isVisible) {
            await hideWindow()
        } else {
            await showWindow()
        }
    } catch (error) {
        console.error('切换窗口状态失败:', error)
    }
}

async function restartApp() {
    try {
        console.log('重启应用')
        await restartApplication()
    } catch (error) {
        console.error('重启应用失败:', error)
    }
}

async function quitApp() {
    try {
        console.log('退出应用')
        await exit(0)
    } catch (error) {
        console.error('退出应用失败:', error)
        // 备用退出方法
        window.close()
    }
}

async function destroyTray() {
    if (trayInstance) {
        try {
            // 尝试调用可能的清理方法
            if (typeof trayInstance.close === 'function') {
                await trayInstance.close()
            } else if (typeof trayInstance.destroy === 'function') {
                await trayInstance.destroy()
            } else if (typeof trayInstance.remove === 'function') {
                await trayInstance.remove()
            }

            // 清理引用
            trayInstance = null
            console.log('托盘图标已销毁')
        } catch (error) {
            console.error('销毁托盘图标失败:', error)
            // 即使出错也要清理引用
            trayInstance = null
        }
    }
}

// 全局变量来跟踪托盘状态
let isInitializing = false

// 初始化托盘
async function initTray() {
    try {
        // 防止重复初始化
        if (isInitializing) {
            console.log('托盘正在初始化中，跳过')
            return false
        }

        // 如果已经存在托盘实例，直接返回成功
        if (trayInstance) {
            console.log('托盘图标已存在，跳过初始化')
            return true
        }

        isInitializing = true
        await createTrayIcon()
        isInitializing = false
        return true
    } catch (error) {
        console.error('初始化托盘失败:', error)
        isInitializing = false
        return false
    }
}

export {
    initTray,
    createTrayIcon,
    destroyTray,
    showWindow,
    hideWindow,
    toggleWindow,
    restartApp,
    quitApp
}
