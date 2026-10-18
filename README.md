# 货币金融学 · 知识地图

按米什金《货币金融学》（第十一版，中国人民大学出版社）**6 篇 25 章**组织的中文学习与复习网站。
模仿 `economics-map` 的信息架构与交互方式，但内容、配色与视觉主题重新做过：**零依赖、零构建**的静态站，
双击 `启动.cmd` 就能在浏览器里用，推到 GitHub Pages 也不用编译。

**线上地址：<https://zc040315.github.io/money-banking/>** —— 手机上直接用这个，进度存在该浏览器本地
（已上线 2026-10-18，仓库 `ZC040315/money-banking`，Pages 指向 `main` 分支根目录）。

---

## 1. 它解决什么问题

教材很厚，但复习时真正需要的是三件事：**先回忆、再验证、按遗忘曲线回来**。
所以这个站不是把书搬上网，而是把 25 章压缩成 75 张「回忆卡」与 125 道分层题：

| 层 | 内容 | 入口 |
|---|---|---|
| 章 | 25 章，每章有导语、考点标签、3 张回忆卡、5 道分层题 | `#/chapter/ch4` |
| 卡 | 每张卡 = 一句提示 → 一句话定义 → 例子/机制 → 公式 → 速测题 | `#/knowledge/ch5-c1` |
| 题 | 基础 / 进阶 / 疑难三档；选择、判断、问答、报表、图形五类 | 章节页「分层题库」 |
| 复习 | 利特纳盒子 5 层，间隔 1 → 2 → 4 → 8 → 16 天 | `#/review` |
| 测 | 章节测试（6 题）、综合卷（20 题）、错题重做 | `#/test` |

---

## 2. 技术形态

**纯静态：HTML + CSS + 原生 ES Modules，没有 npm 依赖、没有打包步骤。**

- 路由：自己写的 hash 路由（`js/router.js`），GitHub Pages 不需要 404 重写
- 存储：`localStorage` 单键 `money-banking:v1:state`（进度、经验、成就、历史）
- 渲染：视图函数返回 HTML 字符串 + 事件委托 + 全量重渲染（页面小，状态最简单）
- 图表：内联 SVG（`js/charts.js`），跟随深浅色自动换色，零图片资源

```
money-banking/
├── index.html            入口（挂载点 + 三个 CSS + 一个模块脚本）
├── 启动.cmd              Windows 一键起本地服务器
├── favicon.svg
├── styles/
│   ├── tokens.css        设计令牌（明暗两套颜色、间距、圆角、字体）
│   ├── global.css        重置、容器、双栏外壳
│   └── components.css    全部组件样式
├── js/
│   ├── app.js            装配：路由分发、事件委托、重渲染、地图缩放拖拽
│   ├── router.js         parseHash / navigate / 页面标题
│   ├── data.js           拍平 6 篇 → 章 / 卡 / 题索引，组卷、搜索、归一化
│   ├── store.js          利特纳盒子、掌握度、经验、成就（可在 Node 里直接跑）
│   ├── charts.js         7 张 SVG 示意图
│   ├── cheatsheet.js     公式速查数据
│   ├── format.js         转义、百分比、日期
│   └── views/
│       ├── shell.js      顶栏、移动端导航、成就、toast
│       ├── pages.js      首页 / 地图 / 章节 / 知识点 / 复习 / 速查
│       └── tests.js      测试中心 / 测试会话 / 成绩页
├── data/
│   ├── part1.js … part6.js   六篇正文（卡片 + 题目）
└── scripts/
    ├── check.mjs         数据校验 + 全页面渲染冒烟（Node）
    └── qa.mjs            真实浏览器：移动端视口、点击、截图、溢出与报错检查
```

---

## 3. 本地运行

**Windows：** 双击 `启动.cmd`，会自动打开 <http://127.0.0.1:8123/>。

**任意系统：**

```bash
cd money-banking
python -m http.server 8123
# 浏览器打开 http://127.0.0.1:8123/
```

> 必须用 HTTP 打开。直接双击 `index.html` 会因浏览器的模块跨域限制而白屏
> ——这是 ES Modules 的硬性规则，不是 bug。

---

## 4. 页面结构（Hash 路由）

| 路由 | 页面 | 布局 |
|---|---|---|
| `#/` | 首页：定位、进度、六篇结构、最薄弱章节 | 单栏 |
| `#/map` | 知识地图：6 列 × 25 章 + 75 个知识点，滚轮缩放 / 拖拽平移 | 整页宽 |
| `#/chapter/:id` | 章节页：导语、回忆卡、分层题库 | 左树 + 右详情 |
| `#/knowledge/:id` | 知识点页：一句话定义、核心概念、图形、公式、重点、易错、速测 | 左树 + 右详情 |
| `#/review` | 复习：到期队列 + 薄弱章节 | 左树 + 右详情 |
| `#/test` | 测试中心：章节测试 / 综合卷 / 错题重做 / 错题集 / 薄弱表 | 单栏 |
| `#/test/chapter/:id` · `#/test/weekly` | 答题会话与成绩页 | 单栏 760px |
| `#/cheatsheet` | 公式与结论速查（18 条） | 单栏 |

窄屏（≤860px）自动切成单栏，正文在前、章节目录折叠，底部固定 5 项导航。

---

## 5. 学习机制（改这里就能改玩法）

**利特纳盒子**（`js/store.js`）

```js
BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16]   // 每答对一次升一层，间隔加倍
BOX_MASTERY        = [0, 40, 60, 80, 100] // 各层对应的掌握度权重
```

- 答对：升一层，下次复习时间按该层间隔推后；答错：直接退回第 1 层（1 天后）
- 章节掌握度 = 该章所有卡掌握度的平均值；≥80% 记为「已掌握」
- 到期判定：`dueTs <= now`，复习队列按到期时间升序

**经验与等级**：基础 5 / 进阶 10 / 疑难 15 XP，同一知识点重复答对只给 5 XP；每 100 XP 升 1 级；完成一次复习会话额外 10 XP。

**成就**（8 个）：破冰者、十连斩、复习先锋、连击选手、利率通（第二篇四章全 100%）、政策通（第四篇）、半程达成（全书 50%）、货币大师（全书 90%）。

**错题与薄弱**：最近一次答错的条目进入错题集（就地重做，答对即订正）；答过但掌握度 <80% 的进入薄弱表。

---

## 6. 内容怎么加 / 改

全部内容在 `data/partN.js`，一个对象就是一篇：

```js
export const part4 = {
  id: 'p4', num: 4, title: '中央银行与货币政策', desc: '…',
  chapters: [{
    id: 'ch13', num: 13, title: '中央银行与联邦储备体系',
    intro: '这一章讲什么…', focus: ['央行职能', '美联储结构'],
    cards: [{
      id: 'ch13-c1', title: '中央银行的职能',
      recall: '提示问句', definition: '一句话定义', example: '例子/机制',
      quiz: { q: '题干', options: ['A','B','C','D'], answer: 1, explanation: '解析' },
      formula: '可选', keyPoint: '可选', mistake: '可选',
      related: ['ch13-c2'],            // 相关知识，跳知识点页
      chart: 'yield-curve',             // 可选，见 js/charts.js
      chartCaption: '图注',
    }],
    questions: [
      { id: 'ch13-q1', difficulty: 'basic', type: 'choice', prompt: '…',
        options: ['…'], answer: 0, explanation: '…' },
      { id: 'ch13-q4', difficulty: 'advanced', type: 'truefalse', prompt: '…',
        answer: true, explanation: '…' },
      { id: 'ch13-q5', difficulty: 'challenge', type: 'essay', prompt: '…',
        hint: '…', reference: '参考答案' },
      { id: 'ch13-q6', difficulty: 'advanced', type: 'report', answerMode: 'choice',
        table: { title: '表：…', columns: ['列1','列2'], rows: [['…','…']] },
        options: ['…'], answer: 2, explanation: '…' },
    ],
  }],
}
```

约定（`scripts/check.mjs` 会强制校验）：

- 章的 id 用 `ch` + 数字，卡用 `章id-c序号`，题用 `章id-q序号`
- 每章至少 3 张卡、5 道题；选择题必须 4 个不重复选项，`answer` 是下标
- 判断题 `answer` 是布尔值；问答题必须有 `reference`；报表题必须有 `table`
- `related` 只能指向真实存在的卡 id；`chart` 只能取 `js/charts.js` 里已有的名字

新增一章：在对应 `partN.js` 的 `chapters` 里加一个对象 → 跑 `node scripts/check.mjs` → 完事。
首页、地图、侧栏、搜索、测试中心都是遍历数据自动生成的，不需要额外登记。

---

## 7. 自检

```bash
node scripts/check.mjs   # 数据完整性 + 25 章 + 75 卡 + 125 题逐页渲染冒烟
node scripts/qa.mjs      # 需要 Chrome：桌面/移动视口截图、点击流程、横向溢出与 JS 报错
```

`qa.mjs` 会把截图写到项目外的 `../_research/shots/mb2/`（第 1 个参数改目录，第 2 个参数改被测地址，
例如传 `https://zc040315.github.io/money-banking/` 就能直接检查线上站点），并在控制台报告：
某页横向溢出（`scrollWidth > innerWidth`）或页面抛错。交付前两个脚本都应该是绿的。

---

## 8. 部署（已完成，这里是后续更新步骤）

仓库已建好并已上线：<https://github.com/ZC040315/money-banking> → Pages 指向 `main` 根目录。

以后改完内容，只需：

```bash
cd money-banking
git add -A
git commit -m "更新第 4 章题库"
git push
```

30 秒～2 分钟后 <https://zc040315.github.io/money-banking/> 自动更新。

若要从零重来（换仓库名时）：

```bash
git init -b main && git add -A && git commit -m "init"
git remote add origin https://<用户名>@github.com/<用户名>/<仓库名>.git
git push -u origin main
```

然后在 GitHub 仓库 **Settings → Pages** 把 Source 设为 `Deploy from a branch` / `main` / `/ (root)`。

因为用的是 hash 路由 + 相对路径，**放在子路径下也能正常工作**，不需要改 `base`。

---

## 9. 已知边界

- 进度只在本机浏览器：换设备、换浏览器、清站点数据都会丢（没有后端，这是设计取舍）
- 没有视频：教材配套视频的链接需要你自己补，`cards` 里加字段再接一个 `<iframe>` 即可
- 地图在手机上需要横向拖动：25 章 × 75 个知识点放不进 390px 宽，这是刻意保留的「可平移」
- 内容为应试向的原创整理，公式与结论按第十一版教材口径；如与你的课堂讲义冲突，以讲义为准
