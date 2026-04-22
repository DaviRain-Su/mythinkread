# Design System — MyThinkRead (Kami)

## 1. 设计哲学

Kami (紙) — 以"纸"为核心的设计系统。温暖、人文、可信赖的编辑美学。

**核心特征：**
- 暖米纸底色 + 油墨色文字
- Serif 权威字体（标题）+ Sans 功能字体（UI）
- 低饱和度、高对比度
- 2px 圆角（克制、编辑感）
- 充足的留白和呼吸感

## 2. 色彩系统

### 2.1 基础色板

```css
:root {
  /* 暖纸色系 */
  --paper: oklch(0.972 0.012 75);      /* 主背景 */
  --paper-2: oklch(0.945 0.014 72);    /* 次级背景 */
  --paper-3: oklch(0.915 0.016 70);    /* 第三级背景 */
  
  /* 油墨色系 */
  --ink: oklch(0.20 0.015 60);         /* 主文字 */
  --ink-2: oklch(0.36 0.015 60);       /* 次级文字 */
  --ink-3: oklch(0.55 0.012 60);       /* 辅助文字 */
  --ink-4: oklch(0.72 0.008 60);       /* 禁用/占位文字 */
  
  /* 线条色系 */
  --rule: oklch(0.82 0.012 65);        /* 边框/分割线 */
  --rule-2: oklch(0.88 0.012 65);      /* 浅色边框 */
  
  /* 强调色 */
  --accent: var(--terracotta);          /* 主强调色 */
  --accent-ink: oklch(0.98 0.01 35);   /* 强调色上的文字 */
  
  /* 主题色 */
  --terracotta: oklch(0.58 0.14 35);   /* 赤陶色 - 主品牌色 */
  --terracotta-2: oklch(0.72 0.10 35); /* 浅赤陶 */
  --moss: oklch(0.48 0.07 148);        /* 苔藓绿 */
  --indigo: oklch(0.45 0.09 265);      /* 靛蓝 */
  --gold: oklch(0.72 0.10 85);         /* 金色 */
  --crimson: oklch(0.48 0.14 25);      /* 深红 */
  
  /* AI 比例标记色 */
  --ai-pure: oklch(0.55 0.10 270);     /* 纯 AI */
  --ai-light: oklch(0.58 0.09 200);    /* 轻度人机 */
  --ai-heavy: oklch(0.52 0.10 145);    /* 重度人机 */
}
```

### 2.2 暗色模式

```css
[data-theme="dark"] {
  --paper: oklch(0.17 0.012 70);
  --paper-2: oklch(0.21 0.014 68);
  --paper-3: oklch(0.25 0.015 65);
  --ink: oklch(0.93 0.008 75);
  --ink-2: oklch(0.80 0.010 70);
  --ink-3: oklch(0.62 0.012 65);
  --ink-4: oklch(0.45 0.012 60);
  --rule: oklch(0.32 0.012 65);
  --rule-2: oklch(0.28 0.012 65);
}
```

### 2.3 预设主题

```css
/* 报纸体 */
[data-preset="newsprint"] { ... }

/* 水墨宣纸 */
[data-preset="oriental"] { ... }

/* 终端/后数字 */
[data-preset="terminal"] { ... }
```

## 3. 字体系统

### 3.1 字体栈

```css
:root {
  --font-display: 'Fraunces', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif;
  --font-body: 'Newsreader', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif;
  --font-sans: 'Söhne', 'PingFang SC', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --font-cjk: 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif;
}
```

### 3.2 字体使用规范

| 元素 | 字体 | 大小 | 字重 |
|------|------|------|------|
| 页面标题 | display | 1.5rem | 500 |
| 章节标题 | display | 1.25rem | 500 |
| 正文 | body | 14-16px | 400 |
| UI 标签 | sans | 13px | 400 |
| 元数据 | mono | 10-11px | 500 |
| 代码 | mono | 13px | 400 |

## 4. 间距系统

### 4.1 基础间距

- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px

### 4.2 布局规范

- 页面最大宽度: 1280px
- 页面内边距: 28px (桌面), 16px (移动)
- 卡片内边距: 1.5rem
- 元素间距: 8-16px

## 5. 组件规范

### 5.1 按钮 (.btn)

```css
.btn {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 2px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform .12s ease, background .15s, border-color .15s, color .15s;
}

.btn:hover { background: var(--ink-2); }
.btn:active { transform: translateY(0.5px); }

/* 变体 */
.btn.ghost { background: transparent; color: var(--ink); }
.btn.accent { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

### 5.2 输入框 (.mtr-input)

```css
.mtr-input {
  font-family: var(--font-body);
  font-size: 14px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 8px 10px;
  color: var(--ink);
  outline: none;
  transition: border-color .15s;
  width: 100%;
}

.mtr-input:focus { border-color: var(--ink); }
.mtr-input::placeholder { color: var(--ink-4); }
```

### 5.3 标签 (.chip)

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ink-2);
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}

.chip:hover { background: var(--paper-2); }
.chip.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
```

### 5.4 卡片

```css
/* 标准卡片 */
.card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 1.5rem;
}

/* 书籍封面 */
.cover {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px 12px 12px;
  border-radius: 1px;
  font-family: var(--font-display);
  color: var(--cover-ink, #f4ead5);
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 6px 16px rgba(40,24,10,.12);
  background: var(--cover-bg, linear-gradient(160deg, #6b4a3a, #2a1a10));
}
```

### 5.5 AI 比例条 (.ai-bar)

```css
.ai-bar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  text-transform: uppercase;
}

.ai-bar .track {
  width: 44px;
  height: 6px;
  display: flex;
  background: var(--paper-3);
  border-radius: 1px;
  overflow: hidden;
}

.ai-bar .ai { background: var(--ai-pure); }
.ai-bar .hu { background: var(--moss); }
```

## 6. Kumo UI 集成

### 6.1 当前使用组件

| 组件 | 用途 | 文件 |
|------|------|------|
| CommandPalette | 全局搜索 | `Navbar.tsx` |
| Toast | 通知提示 | `KumoToastProvider.tsx` |
| Skeleton | 加载骨架 | 多处 |
| Dialog | 弹窗 | 多处 |
| Tooltip | 提示 | 多处 |
| DatePicker | 日期选择 | `WikiPage.tsx` |
| Button | 按钮 | 多个页面（懒加载） |
| Input | 输入框 | `LoginPage.tsx`, `RegisterPage.tsx` |
| Label | 标签 | `LoginPage.tsx`, `RegisterPage.tsx` |

### 6.2 使用方式

```tsx
// 懒加载 Kumo 组件
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<any>,
  }))
)

// 使用 Suspense 包裹
<Suspense fallback={<button className="btn">Fallback</button>}>
  <KumoButton variant="ghost">Click me</KumoButton>
</Suspense>
```

### 6.3 样式覆盖

Kumo 组件使用 Tailwind CSS 类名，但项目主题使用 CSS 变量。需要为 Kumo Input 添加显式样式：

```tsx
<KumoInput
  style={{
    width: '100%',
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 2,
    padding: '8px 10px'
  }}
/>
```

## 7. 响应式断点

| 断点 | 宽度 | 说明 |
|------|------|------|
| sm | 640px | 小屏手机 |
| md | 768px | 平板 |
| lg | 1024px | 小桌面 |
| xl | 1280px | 标准桌面 |

## 8. 动画规范

### 8.1 过渡时间

- 快速反馈: 120-150ms (按钮、链接)
- 标准过渡: 200-250ms (卡片、面板)
- 慢速动画: 300-400ms (页面切换、模态框)

### 8.2 缓动函数

- 默认: `ease`
- 弹性: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- 平滑: `cubic-bezier(0.4, 0, 0.2, 1)`

## 9. 图标系统

使用自定义 `Icon` 组件：

```tsx
import { Icon } from '../components/mtr/primitives'

<Icon name="search" size={13} />
<Icon name="book" size={12} />
<Icon name="star" size={10} />
```

可用图标: search, book, star, download, globe, plus, pen, calendar, left, right, sparkle, etc.

## 10. 3D 组件

### 10.1 书架 3D (BookShelf3D)

- 使用 Three.js + React Three Fiber
- 展示书籍封面阵列
- 支持悬停交互

### 10.2 翻书 3D (BookFlip3D)

- 书籍封面 3D 翻转动画
- 用于书籍详情页展示

### 10.3 Wiki 图谱 3D (WikiGraph3D)

- 知识图谱 3D 可视化
- 节点和关系展示

## 11. 文件组织

```
components/
├── mtr/
│   ├── primitives.tsx      # Icon, 基础组件
│   ├── BookShelf3D.tsx     # 3D 书架
│   ├── BookFlip3D.tsx      # 3D 翻书
│   └── WikiGraph3D.tsx     # 3D 知识图谱
├── Navbar.tsx              # 导航栏
├── NotificationBell.tsx    # 通知铃铛
├── KumoToastProvider.tsx   # Toast 通知
└── ...

pages/
├── HomePage.tsx
├── BookDetailPage.tsx
├── BookReaderPage.tsx
├── ...

styles/
└── index.css               # 全局样式 + CSS 变量
```
