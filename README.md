# 货币金融学 · 知识地图

按米什金《货币金融学》（第十一版，中国人民大学出版社）**6 篇 25 章**组织的中文学习与复习网站。
模仿 `economics-map` 的信息架构与交互方式，但内容、配色与视觉主题重新做过：**零依赖、零构建**的静态站，
双击 `启动.cmd` 就能在浏览器里用，推到 GitHub Pages 也不用编译。

**线上地址：<https://zc040315.github.io/money-banking/>** —— 手机上直接用这个，进度存在该浏览器本地
（已上线 2026-10-18，仓库 `ZC040315/money-banking`，Pages 指向 `main` 分支根目录）。

---

## 1. 它解决什么问题

教材很厚，但复习时真正需要的是三件事：**先回忆、再验证、按遗忘曲线回来**。
所以这个站不是把书搬上网，而是把 25 章压缩成 **175 张知识点卡（每章 7 张）** 与 **682 道分层题（每章 27–28 道）**：

| 层 | 内容 | 入口 |
|---|---|---|
| 章 | 25 章，每章有导语、考点标签、7 张知识点卡、27–28 道题 | `#/chapter/ch4` |
| 卡 | 每张卡 = 一句提示 → 一句话定义 → 例子/机制 → 公式 → 速测题 | `#/knowledge/ch5-c1` |
| 题 | 基础 / 进阶 / 疑难；选择、判断、问答、报表、**图形**五类 | 章节页「分层题库」 |
| 图 | **8 道图形题**：13 张内联 SVG，含 6 张「移动 + 新旧均衡」变体 | 章节页 + `#/test` 图形题专项 |
| 复习 | 利特纳盒子 5 层，间隔 1 → 2 → 4 → 8 → 16 天；**卡片与题目共用同一队列** | `#/review` |
| 测 | 章节测试（10 题）、综合卷（20 题）、图形题专项、错题重做 | `#/test` |
| 数据 | 学习数据摘要、进度导出/导入（JSON）、主题切换、离线说明 | `#/settings` |

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
│   ├── review.js         复习队列：卡片 + 题目统一按到期时间排队
│   ├── backup.js         进度备份：导出 JSON、导入前逐条校验
│   ├── store.js          利特纳盒子、掌握度、经验、成就（可在 Node 里直接跑）
│   ├── charts.js         13 张 SVG 示意图（含移动与新旧均衡变体）
│   ├── cheatsheet.js     公式速查数据
│   ├── format.js         转义、百分比、日期
│   └── views/
│       ├── shell.js      顶栏、移动端导航、成就、toast
│       ├── pages.js      首页 / 地图 / 章节 / 知识点 / 复习 / 速查
│       ├── settings.js   设置与数据（导出/导入、主题、离线说明）
│       └── tests.js      测试中心 / 测试会话 / 成绩页
├── data/
│   ├── part1.js … part6.js   六篇正文（导语、原始卡片、原创题）
│   ├── extra/
│   │   ├── ch01.js … ch25.js 每章 22 道扩充题
│   │   └── _index.js         自动生成，汇总 25 章扩充题
│   └── cards-extra/
│       ├── ch01.js … ch25.js 每章 4 张扩充知识点卡
│       └── _index.js         自动生成，汇总 25 章扩充卡
├── manifest.webmanifest  PWA 清单
├── icons/                192 / 512 应用图标
├── sw.js                 自动生成：离线缓存与版本
└── scripts/
    ├── check.mjs              数据校验 + 全页面渲染冒烟（Node）
    ├── check-extra.mjs        单章题库校验（题量、选项、答案分布、重复题干）
    ├── check-cards.mjs        单章知识点校验（字段、标题重复、quiz 结构）
    ├── build-extra-index.mjs  扫描 data/extra 重建 _index.js
    ├── build-cards-index.mjs  扫描 data/cards-extra 重建 _index.js
    ├── build-sw.mjs           扫描静态资源生成 sw.js（缓存清单 + 指纹）
    ├── extract_office.py      从 pptx/docx 抽取讲义文本
    └── qa.mjs                 真实浏览器：移动端视口、点击、截图、离线、溢出与报错检查
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
| `#/test` | 测试中心：章节测试 / 综合卷 / 图形题专项 / 错题重做 / 错题集 / 薄弱表 | 单栏 |
| `#/test/chapter/:id` · `#/test/weekly` | 答题会话与成绩页 | 单栏 760px |
| `#/cheatsheet` | 公式与结论速查（18 条） | 单栏 |
| `#/settings` | 设置与数据：导出/导入进度、主题、离线说明、清空 | 单栏 |

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

**复习队列同时包含卡片与题目**（`js/review.js`）：在章节页、测试里答过的每道题也写入同一份 `progress`，
到时间后会像卡片一样回到 `#/review`。三种条目各有各的复习方式：

| 条目 | 复习方式 |
|---|---|
| 知识点卡片 | 先回忆 → 翻面看定义与例子 → 记住了 / 没记住 |
| 选择题、判断题、报表题 | 直接重做，选完即判分并给解析 |
| 问答题 | 先想 → 看参考答案 → 自评答对 / 没答对 |

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
- 每章至少 3 张卡、27 道题（`data/partN.js` 里的 5–6 道 + `data/extra/chNN.js` 的 22 道）；
  选择题必须 4 个不重复选项，`answer` 是下标
- 判断题 `answer` 是布尔值；问答题必须有 `reference`；报表题必须有 `table`
- `related` 只能指向真实存在的卡 id；`chart` 只能取 `js/charts.js` 里已有的名字

新增一章：在对应 `partN.js` 的 `chapters` 里加一个对象 → 跑 `node scripts/check.mjs` → 完事。
首页、地图、侧栏、搜索、测试中心都是遍历数据自动生成的，不需要额外登记。

**如果手上有老师课件**：放进仓库外的 `../讲义/`，然后

```bash
python scripts/extract_office.py ../讲义 -o ../讲义/_extracted
```

会把 pptx/docx 按页抽成纯文本（标题、正文、表格都保留），方便逐章对照着改卡片与「考试重点」。
PDF 直接发页面截图即可，图片我能读。

### 扩充题库（data/extra/）

每章另有 22 道扩充题，放在 `data/extra/chNN.js`，字段与 `part*.js` 的 questions 完全一致：

```js
export const extra = [
  { id: 'ch8-e01', difficulty: 'basic', type: 'choice', prompt: '…',
    options: ['…', '…', '…', '…'], answer: 0, explanation: '…' },
  { id: 'ch8-e09', difficulty: 'advanced', type: 'truefalse', prompt: '判断题：…',
    answer: true, explanation: '…' },
  { id: 'ch8-e21', difficulty: 'challenge', type: 'essay', prompt: '简答题：…',
    hint: '…', reference: '…' },
  { id: 'ch8-e22', difficulty: 'advanced', type: 'report', answerMode: 'choice',
    table: { title: '表：…', columns: ['…'], rows: [['…']] },
    options: ['…', '…', '…', '…'], answer: 2, explanation: '…' },
]
```

改完跑三步：

```bash
node scripts/check-extra.mjs data/extra/ch08.js   # 单章：题量、选项、答案分布、重复题干
node scripts/build-extra-index.mjs                 # 重建 data/extra/_index.js
node scripts/check.mjs                             # 全站
```

配比约定（校验器会强制）：选择题 8 基础 / 6 进阶 / 2 疑难，判断题 3，问答题 2，报表题 1；
正确答案在 0–3 间分布，不能 60% 以上集中在同一项；解析 ≥25 字且讲「为什么」。

---

## 7. 自检

```bash
node scripts/check.mjs            # 全量：数据完整性 + 25 章逐页渲染冒烟（每章 ≥20 题、≥6 张卡）
node scripts/check.mjs --partial  # 扩容过程中用：未达标的章节只提示、不报错
node scripts/check-extra.mjs      # 单章题库校验（可传多个文件）
node scripts/check-cards.mjs      # 单章知识点校验（可传多个文件）
node scripts/qa.mjs               # 需要 Chrome：桌面/移动视口、点击流程、离线、溢出与 JS 报错
```

改完 data 目录的内容后，还要重建两个索引和 Service Worker：

```bash
node scripts/build-extra-index.mjs
node scripts/build-cards-index.mjs
node scripts/build-sw.mjs
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

- 进度只在本机浏览器：换设备、换浏览器、清站点数据都会丢（没有后端，这是设计取舍）。
  可以在 `#/settings` 导出 JSON，在新设备导入，手动迁移
- 离线可用：首次打开后会注册 Service Worker，把页面与题库缓存到本地；`file://` 打开时不会注册
- 题库里的 550 道扩充题是**按教材口径生成的应试向整理**，不是老师出题的原文；
  建议对照讲义过一遍，发现错题直接改 `data/extra/chNN.js` 里对应那条即可
- 没有视频：教材配套视频的链接需要你自己补，`cards` 里加字段再接一个 `<iframe>` 即可
- 地图在手机上需要横向拖动：25 章 × 75 个知识点放不进 390px 宽，这是刻意保留的「可平移」
- 内容为应试向的原创整理，公式与结论按第十一版教材口径；如与你的课堂讲义冲突，以讲义为准
