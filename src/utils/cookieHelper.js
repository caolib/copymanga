// 在本文件中，我们设置一个脚本，用于在前端页面加载时自动设置Cookie
// 这是一种解决方案，允许在本地开发时使用硬编码的Cookie

// 设置Cookie的函数
function setCookie(name, value, days = 30) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + value + expires + "; path=/";
}

// 设置所有必要的Cookie
export function setupCookies() {
    // 解析Cookie字符串并设置每个Cookie
    const cookieString = 'webp=1; name=%E7%8B%AC%EF%BD%9E; user_id=85ea57c7-fe01-11ed-83ce-0678401a7187; avatar="user/cover/85ea57c7fe0111ed83ce0678401a7187/1704125272.jpg"; create="2023-05-29 09:16:41.364225+00:00"; comic_vip=1; cartoon_vip=1; email=""; token=e328b2200b64dba2335cc9bb2aa555e13a21e5b9; csrftoken=bnqhVqCqujIniwh29ewyYcwrl5NCN11T; sessionid=fzslho8lfai9wcmuerbjmltikdgm17yv';

    // 解析Cookie字符串
    const cookies = cookieString.split(';');

    for (let cookie of cookies) {
        cookie = cookie.trim();
        const [name, value] = cookie.split('=');
        if (name && value) {
            setCookie(name, value);
        }
    }

    // 确保token一定被设置
    setCookie('token', 'e328b2200b64dba2335cc9bb2aa555e13a21e5b9');

    console.log('所有必要的Cookie已设置');
}

// 检查Cookie是否存在
export function checkCookiesExist() {
    return document.cookie.includes('token=');
}
