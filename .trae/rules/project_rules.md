- 这是一个看漫画的桌面端应用，前端使用vue框架,使用vite构建,使用tauri2构建桌面端
- 我准备了很多mcp工具，你可以按需使用
- 仓库地址：https://github.com/caolib/doki，你可以使用github mcp服务获取更详细的信息
- 开发环境是windows系统，pwsh终端
- 分文件、分结构、注重代码复用，不要重复造轮子，尽量使用最少的代码，避免嵌套
- /data目录下是API响应结果的json文件
- 完成任务后提示我要完成那些功能的校验
- 使用axios发送请求,使用rust服务器转发请求
- 使用pinia存储简单信息并持久化
- 根据项目结构决定文件应该放在哪个文件夹
- 尽量使用fun().then(...).catch(...)的形式而不是try catch,进入then则默认成功，不要再次检查
- 不要使用jsx
- 不要胡乱编造不存在的配置，编写API时注意我有没有提供相关API
- js文件采用 小写-小写 命名
- 在文件底部统一导出，而不是每个函数加export
```js
export {
    getBookHome,getMyBookCollection,...
}
```
- 仓库地址：https://github.com/caolib/doki，你可以使用github mcp服务获取更详细的信息
- 使用pinia存储简单信息并持久化
- 尽量保持代码简洁
- 设计tauri2配置等，你可以使用context7查看tauri2具体实现

## scss
- 提取样式文件到单独的scss文件，注意是scss语法
- 界面使用ant design vue组件设计
- 按钮写法 <a-button type="primary" shape="circle" :icon="h(SearchOutlined)" />
- vue文件不要出现css，在vue文件最后类似<style scoped src="../assets/styles/book-volume-chapters-view.scss" lang="scss"></style>写法引入scss文件
- 在scss文件顶部使用`@use "./variables" as *;`导入变量
- 使用变量时确保变量已经在variables.scss定义
- 注意适配深色主题，保持主题的风格、配色一致，布局紧凑，不要使用太大的间隔
- scss文件命名使用kebab-case，vue文件命名使用PascalCase,scss文件不要加view后缀
- antdv的组件背景颜色默认是白色，自动适配暗色，不要手动设置背景色为白色

## 编写rust或tauri2配置前始终先使用context7查看用法


- 你可以使用mcp服务获取apifox上的接口文档
- 始终使用context7
- 编辑每个文件之前先查看文件所有内容
- 完成任务之前先查看是否有错误