import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// 全局路由历史状态
const routeHistory = ref([])
const currentIndex = ref(-1)

export function useRouteHistory() {
    const router = useRouter()

    // 添加路由到历史记录
    const addToHistory = (route) => {
        const routeInfo = {
            path: route.path,
            name: route.name,
            title: getRouteTitle(route),
            params: route.params,
            query: route.query,
            timestamp: Date.now()
        }

        // 如果当前不在历史记录的末尾，删除当前位置之后的所有记录
        if (currentIndex.value < routeHistory.value.length - 1) {
            routeHistory.value = routeHistory.value.slice(0, currentIndex.value + 1)
        }

        // 避免连续相同的路由
        const lastRoute = routeHistory.value[routeHistory.value.length - 1]
        if (!lastRoute || lastRoute.path !== route.path) {
            routeHistory.value.push(routeInfo)
            currentIndex.value = routeHistory.value.length - 1
        }

        // 限制历史记录数量，避免内存溢出
        if (routeHistory.value.length > 50) {
            routeHistory.value = routeHistory.value.slice(-50)
            currentIndex.value = routeHistory.value.length - 1
        }
    }

    // 获取路由标题
    const getRouteTitle = (route) => {
        // 根据路由名称或路径返回友好的标题
        const titleMap = {
            '/': '漫画首页',
            '/books': '轻小说',
            '/cartoons': '动画',
            '/posts': '写真',
            '/bookshelf': '书架',
            '/downloads': '下载',
            '/settings': '设置',
            '/login': '登录',
            '/profile': '个人中心',
            '/search': '搜索'
        }

        if (titleMap[route.path]) {
            return titleMap[route.path]
        }

        // 根据路由名称匹配
        const nameMap = {
            'Home': '漫画首页',
            'BookHome': '轻小说',
            'CartoonHome': '动画',
            'PostHome': '写真',
            'Bookshelf': '书架',
            'Downloads': '下载',
            'Settings': '设置',
            'Login': '登录',
            'UserProfile': '个人中心',
            'Search': '搜索',
            'MangaDetail': '漫画详情',
            'BookDetail': '轻小说详情',
            'CartoonDetail': '动画详情',
            'PostDetail': '写真详情',
            'ChapterReader': '漫画阅读',
            'CartoonPlayer': '动画播放',
            'BookTextReader': '轻小说阅读',
            'PostReader': '写真阅读',
            'BookVolumeChapters': '章节列表',
            'AuthorMangaList': '作者作品',
            'TopicDetail': '专题详情',
            'LocalMangaDetail': '本地漫画',
            'LocalCartoonDetail': '本地动画'
        }

        if (route.name && nameMap[route.name]) {
            return nameMap[route.name]
        }

        // 处理动态路由
        if (route.path.includes('/manga/')) {
            if (route.path.includes('/chapter/')) {
                return '漫画阅读'
            }
            return '漫画详情'
        }
        if (route.path.includes('/book/')) {
            if (route.path.includes('/reader')) {
                return '轻小说阅读'
            }
            if (route.path.includes('/volume/')) {
                return '章节列表'
            }
            return '轻小说详情'
        }
        if (route.path.includes('/cartoon/')) {
            if (route.path.includes('/player/')) {
                return '动画播放'
            }
            return '动画详情'
        }
        if (route.path.includes('/post/')) {
            if (route.path.includes('/reader/')) {
                return '写真阅读'
            }
            return '写真详情'
        }
        if (route.path.includes('/author/')) {
            return '作者作品'
        }
        if (route.path.includes('/topic/')) {
            return '专题详情'
        }
        if (route.path.includes('/localmanga/')) {
            return '本地漫画'
        }
        if (route.path.includes('/localcartoon/')) {
            return '本地动画'
        }

        return route.name || route.path
    }

    // 计算属性：是否可以后退
    const canGoBack = computed(() => currentIndex.value > 0)

    // 计算属性：是否可以前进
    const canGoForward = computed(() => currentIndex.value < routeHistory.value.length - 1)

    // 计算属性：后退历史列表（最多显示10个）
    const backHistory = computed(() => {
        if (currentIndex.value <= 0) return []
        const startIndex = Math.max(0, currentIndex.value - 10)
        return routeHistory.value
            .slice(startIndex, currentIndex.value)
            .reverse()
            .map((route, index) => ({
                ...route,
                index: currentIndex.value - index - 1
            }))
    })

    // 后退功能
    const goBack = (steps = 1) => {
        if (canGoBack.value) {
            currentIndex.value = Math.max(0, currentIndex.value - steps)
            const targetRoute = routeHistory.value[currentIndex.value]
            if (targetRoute) {
                router.push({
                    path: targetRoute.path,
                    params: targetRoute.params,
                    query: targetRoute.query
                })
            }
        } else {
            // 如果没有历史记录，使用浏览器原生后退
            router.back()
        }
    }

    // 前进功能 - 简化为使用浏览器原生前进
    const goForward = () => {
        router.forward()
    }

    // 跳转到指定历史记录
    const goToHistoryIndex = (index) => {
        if (index >= 0 && index < routeHistory.value.length) {
            currentIndex.value = index
            const targetRoute = routeHistory.value[index]
            if (targetRoute) {
                router.push({
                    path: targetRoute.path,
                    params: targetRoute.params,
                    query: targetRoute.query
                })
            }
        }
    }

    return {
        routeHistory: computed(() => routeHistory.value),
        currentIndex: computed(() => currentIndex.value),
        canGoBack,
        canGoForward,
        backHistory,
        addToHistory,
        goBack,
        goForward,
        goToHistoryIndex
    }
}
