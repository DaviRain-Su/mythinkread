# Phase 4: Task Breakdown — MyThinkRead 云阅读器

## 任务拆分原则

- 每个任务 <= 4 小时
- 任务之间有明确依赖关系
- 每个任务有明确的验收标准
- 按里程碑分组

---

## Milestone 1: 基础设施搭建 (Week 1)

### Task 1.1: 项目初始化
**预估**: 2h
**依赖**: 无

- [ ] 初始化前端项目: React 19 + Vite + TypeScript + Tailwind CSS
- [ ] 初始化后端项目: Cloudflare Workers + Hono + TypeScript
- [ ] 配置 ESLint + Prettier
- [ ] 配置 Git 仓库结构 (monorepo)

**验收标准**:
- [ ] `npm run dev` 前端正常启动
- [ ] `wrangler dev` 后端正常启动
- [ ] 代码提交到 Git

### Task 1.2: Cloudflare 资源配置
**预估**: 3h
**依赖**: Task 1.1

- [ ] 创建 Cloudflare Workers 项目
- [ ] 创建 D1 数据库实例
- [ ] 创建 R2 Bucket (book-covers, book-assets)
- [ ] 创建 KV Namespace
- [ ] 创建 Queue (book-processing)
- [ ] 配置 wrangler.toml

**验收标准**:
- [ ] `wrangler d1 execute` 可连接数据库
- [ ] `wrangler kv:key put` 可写入 KV
- [ ] R2 Bucket 可通过 SDK 访问

### Task 1.3: Arweave 存储集成
**预估**: 3h
**依赖**: Task 1.1

- [ ] 注册 Bundlr/Irys 节点
- [ ] 配置 Arweave 钱包（平台补贴账户）
- [ ] 封装 Arweave 上传 SDK
- [ ] 实现批量上传工具
- [ ] 测试上传/下载流程

**验收标准**:
- [ ] 可通过 SDK 上传文件到 Arweave
- [ ] 可获取 Arweave transaction id
- [ ] 可通过 `https://arweave.net/{tx}` 访问内容
- [ ] 批量上传 10 个文件成功

### Task 1.4: 数据库 Schema 迁移
**预估**: 2h
**依赖**: Task 1.2

- [ ] 编写所有表的 CREATE TABLE 语句（含 V2 扩展表）
- [ ] 创建初始迁移文件
- [ ] 执行迁移到 D1
- [ ] 验证表结构

**验收标准**:
- [ ] 所有 18 张表成功创建（含公版书、博客、协作、TTS 表）
- [ ] 外键约束生效
- [ ] 可通过 D1 控制台查看表结构

---

## Milestone 2: 认证系统 (Week 1-2)

### Task 2.1: 用户注册/登录 API
**预估**: 3h
**依赖**: Task 1.3

- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] POST /api/auth/logout
- [ ] GET /api/auth/me
- [ ] JWT 生成与验证
- [ ] 密码 bcrypt 哈希

**验收标准**:
- [ ] 可成功注册用户
- [ ] 可成功登录并获取 JWT
- [ ] JWT 可正确验证
- [ ] 密码不以明文存储

### Task 2.2: 前端认证界面
**预估**: 3h
**依赖**: Task 2.1

- [ ] 登录页面 UI
- [ ] 注册页面 UI
- [ ] 认证状态管理 (Zustand)
- [ ] 路由守卫 (未登录跳转)

**验收标准**:
- [ ] 用户可完成注册流程
- [ ] 用户可完成登录流程
- [ ] 登录状态持久化 (localStorage)
- [ ] 未登录用户访问受保护路由自动跳转登录页

---

## Milestone 3: AI 创作核心 (Week 2-3)

### Task 3.1: Cloudflare AI 集成
**预估**: 3h
**依赖**: Task 1.2

- [ ] 配置 Workers AI binding
- [ ] 封装 AI 生成函数 (text generation)
- [ ] 封装 AI 图像生成函数 (cover generation)
- [ ] 错误处理和重试逻辑

**验收标准**:
- [ ] 可调用 AI 生成文本
- [ ] 可调用 AI 生成图像
- [ ] 网络失败时自动重试

### Task 3.2: AI 创作 API
**预估**: 3h
**依赖**: Task 3.1, Task 2.1

- [ ] POST /api/ai/generate (章节生成)
- [ ] POST /api/ai/continue (续写)
- [ ] POST /api/ai/rewrite (改写)
- [ ] POST /api/ai/cover (封面生成)
- [ ] Rate limiting 实现

**验收标准**:
- [ ] 可生成章节内容
- [ ] 可续写已有内容
- [ ] 可生成封面图
- [ ] 超出速率限制返回 429

### Task 3.3: 创作者工作台前端
**预估**: 4h
**依赖**: Task 3.2

- [ ] 创作工作台页面布局
- [ ] Prompt 输入组件
- [ ] AI 生成内容展示
- [ ] 富文本编辑器 (TipTap)
- [ ] 章节管理 (增删改排序)

**验收标准**:
- [ ] 用户可输入 Prompt 生成内容
- [ ] 生成的内容可在编辑器中编辑
- [ ] 可添加/删除/重排章节
- [ ] 内容自动保存到 localStorage

### Task 3.4: 书籍发布流程
**预估**: 4h
**依赖**: Task 3.3, Task 1.2, Task 1.3

- [ ] 书籍元数据表单（含 AI 比例选择）
- [ ] 人机协作检测：对比 AI 初稿与最终稿的编辑比例
- [ ] 发布按钮触发异步处理
- [ ] Queue Worker 实现
- [ ] IPFS Pin 上传逻辑（热存储）
- [ ] Arweave 永久存储上传（通过 Bundlr/Irys）
- [ ] 发布状态轮询

**验收标准**:
- [ ] 可填写书籍信息并发布
- [ ] 非纯 AI 书籍编辑比例 < 20% 时拒绝发布
- [ ] 发布后进入 processing 状态
- [ ] Worker 完成 IPFS + Arweave 双上传
- [ ] D1 同时记录 CID 和 arweave_tx
- [ ] 状态变为 published 后可阅读

---

## Milestone 4: 阅读核心 (Week 3-4)

### Task 4.1: 书籍内容获取与缓存
**预估**: 3h
**依赖**: Task 1.2, Task 1.3

- [ ] IPFS Gateway 内容获取封装
- [ ] Arweave Gateway (`arweave.net/{tx}`) 内容获取封装
- [ ] KV 缓存读写逻辑
- [ ] 缓存失效策略
- [ ] 多级 Fallback: KV → IPFS → Arweave
- [ ] Arweave → IPFS 回写机制（丢失时恢复）

**验收标准**:
- [ ] 可通过 CID 从 IPFS 获取内容
- [ ] 可通过 tx id 从 Arweave 获取内容
- [ ] 首次获取后写入 KV 缓存
- [ ] 缓存命中时直接返回
- [ ] IPFS 不可用时自动 fallback 到 Arweave
- [ ] 从 Arweave 恢复后自动回写 IPFS

### Task 4.2: 阅读 API
**预估**: 2h
**依赖**: Task 4.1, Task 2.1

- [ ] GET /api/books (列表+搜索+分页)
- [ ] GET /api/books/:id (详情)
- [ ] GET /api/books/:id/read/:chapter_id (章节内容)
- [ ] 阅读进度保存/获取

**验收标准**:
- [ ] 可获取书籍列表
- [ ] 可获取单本书详情
- [ ] 可获取章节内容
- [ ] 阅读进度正确保存

### Task 4.3: 阅读器前端
**预估**: 4h
**依赖**: Task 4.2

- [ ] 书籍详情页面
- [ ] 章节列表侧边栏
- [ ] 阅读器主界面
- [ ] 字体/主题/字号设置
- [ ] 阅读进度显示

**验收标准**:
- [ ] 可打开书籍进入阅读
- [ ] 可切换章节
- [ ] 可调整阅读设置
- [ ] 进度条正确显示

### Task 4.4: 批注功能
**预估**: 3h
**依赖**: Task 4.3

- [ ] 文本选中高亮
- [ ] 批注面板 UI
- [ ] 批注 CRUD API
- [ ] 批注在阅读器中展示

**验收标准**:
- [ ] 可选中文本添加批注
- [ ] 批注可保存到服务器
- [ ] 批注可在阅读器中显示
- [ ] 可删除自己的批注

---

## Milestone 5: 社交功能 (Week 4-5)

### Task 5.1: 评论系统
**预估**: 3h
**依赖**: Task 2.1, Task 4.2

- [ ] 评论 CRUD API
- [ ] AI 内容审核集成
- [ ] 评论列表展示
- [ ] 回复功能

**验收标准**:
- [ ] 可发表评论
- [ ] 违规内容被 AI 拦截
- [ ] 可回复评论
- [ ] 评论列表正确展示

### Task 5.2: 书单功能
**预估**: 2h
**依赖**: Task 5.1

- [ ] 书单 CRUD API
- [ ] 书单前端页面
- [ ] 添加书籍到书单

**验收标准**:
- [ ] 可创建书单
- [ ] 可添加书籍到书单
- [ ] 书单可公开查看

### Task 5.3: 关注与动态
**预估**: 3h
**依赖**: Task 5.2

- [ ] 关注/取消关注 API
- [ ] 动态生成逻辑
- [ ] Feed 流 API
- [ ] 前端动态展示

**验收标准**:
- [ ] 可关注其他用户
- [ ] 关注后动态出现在 Feed
- [ ] Feed 按时间倒序排列

### Task 5.4: Kami 书摘卡片
**预估**: 3h
**依赖**: Task 4.4

- [ ] Kami Design System 基础组件（暖米纸底、油墨蓝、serif 字体）
- [ ] 书摘卡片生成 (html2canvas + Kami 风格)
- [ ] 分享功能（Twitter/X、小红书）
- [ ] 卡片模板设计（One-Pager 导读风格）

**验收标准**:
- [ ] 可将批注生成 Kami 风格卡片
- [ ] 卡片可下载为图片
- [ ] 卡片使用暖米纸底 + 油墨蓝 + serif 字体
- [ ] 分享链接可正常打开

---

## Milestone 6: 榜单与发现 (Week 5)

### Task 6.1: 榜单系统
**预估**: 2h
**依赖**: Task 4.2

- [ ] 榜单计算算法实现
- [ ] 定时任务 (Cron Trigger)
- [ ] 榜单 API
- [ ] 榜单前端展示

**验收标准**:
- [ ] 榜单按算法正确排序
- [ ] 每小时更新一次
- [ ] 支持多种榜单类型

### Task 6.2: 搜索功能
**预估**: 2h
**依赖**: Task 4.2

- [ ] 全文搜索实现 (D1 LIKE + 权重)
- [ ] 搜索建议
- [ ] 搜索结果页

**验收标准**:
- [ ] 可搜索书籍标题/描述
- [ ] 搜索结果按相关性排序
- [ ] 搜索响应 < 500ms

---

## Milestone 7: V2 扩展功能 (Week 6-8)

### Task 7.1: Kami 呈现层完整实现
**预估**: 4h
**依赖**: Task 5.4

- [ ] Kami One-Pager 导读生成 API
- [ ] Kami Portfolio 作品集生成
- [ ] Kami PDF 导出功能
- [ ] 动态 Kami 主题（根据书籍类型切换配色）
- [ ] 前端 Kami 组件库封装

**验收标准**:
- [ ] 可一键生成 Kami 风格 One-Pager
- [ ] Portfolio 排版美观，适合分享
- [ ] PDF 导出保留 Kami 视觉风格
- [ ] 科幻/言情等类型自动切换主题

### Task 7.2: 协作编辑系统
**预估**: 4h
**依赖**: Task 3.3

- [ ] OT (Operational Transformation) 协议实现
- [ ] 协作文档 CRUD API
- [ ] 实时同步（轮询/WebSocket）
- [ ] 操作历史与版本回退
- [ ] 协作者权限管理

**验收标准**:
- [ ] 多人可同时编辑同一文档
- [ ] 操作无冲突，内容一致
- [ ] 可查看操作历史
- [ ] 可回退到任意版本

### Task 7.3: 个人博客（读书 GitHub）
**预估**: 3h
**依赖**: Task 5.3

- [ ] 博客配置 API（subdomain、主题、自动发布规则）
- [ ] 博客文章自动生成（评论/批注/AI 总结 → 博客）
- [ ] 公开博客页面（subdomain.mythinkread.blog）
- [ ] 博客主题定制（Kami 风格）

**验收标准**:
- [ ] 可配置个人博客
- [ ] 评论/批注可自动发布到博客
- [ ] 公开博客可访问
- [ ] 博客使用 Kami 视觉风格

### Task 7.4: 公版书库
**预估**: 3h
**依赖**: Task 4.2

- [ ] 公版书导入 API（Gutenberg、Archive.org）
- [ ] 公版书列表/搜索
- [ ] 公版书阅读器
- [ ] 公版书批注/评论（与原创书互通）

**验收标准**:
- [ ] 可导入公版书
- [ ] 公版书可正常阅读
- [ ] 公版书批注与原创书共用同一系统

### Task 7.5: 数据导出增强
**预估**: 2h
**依赖**: Task 4.4, Task 5.1

- [ ] 导出 API (JSON/CSV/Markdown)
- [ ] Kami 风格导出（Markdown + YAML frontmatter）
- [ ] 前端导出按钮
- [ ] 数据格式化

**验收标准**:
- [ ] 可导出阅读数据为 JSON/CSV
- [ ] 可导出 Kami 风格 Markdown
- [ ] 导出文件格式正确
- [ ] Markdown 可直接导入 Obsidian

---

## Milestone 8: 部署与优化 (Week 8-9)

### Task 8.1: 前端部署
**预估**: 1h
**依赖**: 所有前端任务

- [ ] Cloudflare Pages 配置
- [ ] 构建脚本
- [ ] 环境变量配置

**验收标准**:
- [ ] 前端成功部署到 Pages
- [ ] 生产环境可访问

### Task 8.2: 后端部署
**预估**: 1h
**依赖**: 所有后端任务

- [ ] Workers 生产部署
- [ ] 自定义域名配置
- [ ] SSL 证书

**验收标准**:
- [ ] API 生产环境可访问
- [ ] HTTPS 正常工作

### Task 8.3: 性能优化
**预估**: 3h
**依赖**: Task 8.1, Task 8.2

- [ ] 前端代码分割
- [ ] 图片懒加载
- [ ] API 响应优化
- [ ] 缓存策略调优
- [ ] Kami 渲染性能优化（CSS 硬件加速）

**验收标准**:
- [ ] 首屏加载 < 2s
- [ ] 书籍打开 < 3s
- [ ] Lighthouse 评分 > 80
- [ ] Kami 卡片生成 < 2s

### Task 8.4: 存储成本监控
**预估**: 2h
**依赖**: Task 1.3

- [ ] Arweave 上传成本统计（含 Wiki + 音频）
- [ ] 创作者补贴额度管理（前 3 本书免费）
- [ ] 成本告警（单本书 > 100MB 预警）
- [ ] 月度存储成本报表

**验收标准**:
- [ ] 可查看平台总存储成本（含 Wiki + 音频）
- [ ] 单创作者补贴额度可配置（前 3 本免费）
- [ ] 超大文件自动预警
- [ ] 成本数据准确

---

## 总体时间线

| 周次 | 里程碑 | 核心交付 |
|------|--------|---------|
| Week 1 | 基础设施 + 认证 | 可注册/登录，Arweave 集成就绪 |
| Week 2-3 | AI 创作 | 可 AI 生成并发布书籍（IPFS + Arweave 双存储） |
| Week 3-4 | 阅读核心 | 可在线阅读（多级存储 fallback） |
| Week 4-5 | 社交功能 | 可评论/关注/分享 |
| Week 5 | 榜单与发现 | 可发现书籍 |
| Week 5-6 | 数据开放 | 可导出数据 |
| Week 6-8 | V2 扩展 | Kami 呈现、协作编辑、个人博客、公版书 |
| Week 8-9 | 部署与优化 | 生产环境上线 |

**总计**: 9 周 (约 45 个工作日)

## 关键依赖路径

```
Task 1.1 (项目初始化)
    ├── Task 1.2 (CF 资源)
    │       └── Task 1.4 (Schema 迁移)
    │               └── Task 2.1 (Auth API)
    │                       └── Task 2.2 (Auth UI)
    ├── Task 1.3 (Arweave 集成)
    │       └── Task 3.4 (发布流程) ──┐
    └── Task 3.1 (AI 集成)            │
            └── Task 3.2 (AI API)     │
                    └── Task 3.3 (工作台)
                            └── Task 3.4 (发布流程) ──┐
                                                        │
Task 4.1 (内容获取) ◄──────────────────────────────────┘
    └── Task 4.2 (阅读 API)
            └── Task 4.3 (阅读器)
                    └── Task 4.4 (批注)
                            └── Task 5.1 (评论)
                                    └── Task 5.2 (书单)
                                            └── Task 5.3 (关注)
                                                    └── Task 5.4 (卡片)
```
