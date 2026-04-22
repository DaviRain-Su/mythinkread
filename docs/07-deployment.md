# Deployment Guide — MyThinkRead

## 1. 环境要求

- Node.js 20+
- pnpm 9+
- Cloudflare 账号
- Git

## 2. 本地开发

### 2.1 安装依赖

```bash
# 安装 pnpm
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2.2 配置环境变量

创建 `apps/api/.dev.vars`：

```
ENVIRONMENT=development
JWT_SECRET=your-secret-key-here
PINATA_JWT=your-pinata-jwt
BUNDLR_PRIVATE_KEY=your-arweave-private-key
AZURE_TTS_KEY=your-azure-tts-key
```

### 2.3 启动开发服务器

```bash
# 启动前端
cd apps/web
pnpm dev

# 启动后端（另一个终端）
cd apps/api
pnpm dev
```

前端: http://localhost:5173
后端: http://localhost:8787

## 3. Cloudflare 资源配置

### 3.1 D1 数据库

```bash
# 创建数据库
wrangler d1 create mythinkread-db

# 执行迁移
wrangler d1 execute mythinkread-db --file=./apps/api/src/db/schema.sql

# 查看数据库 ID
wrangler d1 list
```

### 3.2 R2 Bucket

```bash
# 创建存储桶
wrangler r2 bucket create mythinkread-covers
wrangler r2 bucket create mythinkread-assets
```

### 3.3 KV Namespace

```bash
# 创建 KV
wrangler kv:namespace create "MTR_KV"
```

### 3.4 Queue

```bash
# 创建队列
wrangler queues create book-processing
```

## 4. 部署

### 4.1 部署后端 (Cloudflare Workers)

```bash
cd apps/api

# 设置密钥
wrangler secret put JWT_SECRET
wrangler secret put PINATA_JWT
wrangler secret put BUNDLR_PRIVATE_KEY

# 部署
pnpm deploy
```

### 4.2 部署前端 (Cloudflare Pages)

```bash
cd apps/web

# 构建
pnpm build

# 部署
wrangler pages deploy dist
```

### 4.3 配置自定义域名

1. 在 Cloudflare Pages 控制台添加自定义域名
2. 在 Cloudflare Workers 路由中添加自定义域名
3. 配置 CORS 允许前端域名访问后端

## 5. 数据库迁移

### 5.1 创建迁移

```bash
cd apps/api

# 创建新的迁移文件
wrangler d1 migrations create mythinkread-db "add_new_table"

# 编辑迁移文件
# 位于 migrations/000X_add_new_table.sql
```

### 5.2 执行迁移

```bash
# 本地执行
wrangler d1 execute mythinkread-db --local --file=./migrations/000X_add_new_table.sql

# 生产环境执行
wrangler d1 execute mythinkread-db --file=./migrations/000X_add_new_table.sql
```

## 6. 监控和日志

### 6.1 查看日志

```bash
# 实时日志
wrangler tail

# 查看特定时间段
wrangler tail --format=json
```

### 6.2 监控指标

- Cloudflare Workers Analytics: 请求量、错误率、CPU时间
- D1 Analytics: 查询性能、连接数
- R2 Analytics: 存储量、请求数

## 7. 备份和恢复

### 7.1 D1 备份

```bash
# 导出数据库
wrangler d1 export mythinkread-db --output=./backup.sql

# 导入数据库
wrangler d1 execute mythinkread-db --file=./backup.sql
```

### 7.2 R2 备份

使用 rclone 或 Cloudflare API 定期备份 R2 内容到另一个存储。

## 8. 故障排除

### 8.1 常见问题

**问题**: 部署后 API 返回 500
**解决**: 检查 Workers 日志，`wrangler tail` 查看具体错误

**问题**: 数据库连接失败
**解决**: 确认 D1 数据库 ID 在 wrangler.toml 中配置正确

**问题**: 前端无法访问后端 API
**解决**: 检查 CORS 配置，确认前端域名在允许列表中

**问题**: IPFS 上传失败
**解决**: 检查 PINATA_JWT 是否正确配置

### 8.2 回滚

```bash
# 回滚 Workers 部署
wrangler rollback

# 回滚 Pages 部署
# 在 Cloudflare Pages 控制台选择之前的部署版本
```

## 9. 性能优化

### 9.1 缓存策略

- 静态资源：Cloudflare CDN 缓存
- API 响应：根据数据更新频率设置 Cache-Control
- 书籍内容：IPFS CID 永久缓存

### 9.2 数据库优化

- 为常用查询添加索引
- 使用连接池（D1 自动管理）
- 分页查询避免大偏移量

## 10. 安全

### 10.1 密钥管理

- 所有密钥使用 wrangler secret 管理
- 本地开发使用 .dev.vars（不提交到 Git）
- 定期轮换 JWT_SECRET

### 10.2 CORS 配置

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',  // 开发环境
    'https://mythinkread.pages.dev',  // 生产环境
    'https://your-custom-domain.com'  // 自定义域名
  ],
  credentials: true
}))
```

### 10.3 速率限制

建议在生产环境添加速率限制：
- 认证端点：5次/分钟
- AI生成端点：10次/小时
- 普通API：100次/分钟
