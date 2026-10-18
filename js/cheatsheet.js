// 公式速查表：按主题分组，notes 用 <em> 高亮关键点
export const CHEATSHEET = [
  {
    title: '一、利率与债券定价',
    items: [
      {
        name: '现值',
        expr: 'PV = CF / (1 + i)^n',
        note: '未来一笔现金流按利率贴现到今天。<em>利率越高，现值越低</em>。',
        chapter: 4,
      },
      {
        name: '息票债券价格',
        expr: 'P = Σ C/(1+i)^t + F/(1+i)^n',
        note: '票息 C 与面值 F 的现值之和；价格与到期收益率<em>反向</em>变动。',
        chapter: 4,
      },
      {
        name: '到期收益率（贴现债券）',
        expr: 'i = (F − P) / P',
        note: '一年期贴现债券：折价幅度就是收益率。',
        chapter: 4,
      },
      {
        name: '费雪方程',
        expr: 'i ≈ r + πᵉ',
        note: '名义利率约等于实际利率加预期通胀；精确式为 (1+i)=(1+r)(1+πᵉ)。',
        chapter: 4,
      },
      {
        name: '持有期回报率',
        expr: 'RET = C/P + (P₁ − P₀)/P₀',
        note: '利息收益 + 资本利得；<em>利率上升时长期债券的资本损失可能吞掉全部利息</em>。',
        chapter: 4,
      },
    ],
  },
  {
    title: '二、股票与有效市场',
    items: [
      {
        name: '戈登增长模型',
        expr: 'P₀ = D₁ / (k − g)',
        note: 'k 为要求回报率、g 为股利增长率；<em>k 上升或 g 下降都会压低股价</em>。',
        chapter: 7,
      },
      {
        name: '托宾 q',
        expr: 'q = 企业市值 / 资本重置成本',
        note: 'q > 1 时发股融资建厂更划算，投资增加——货币政策的资产价格渠道。',
        chapter: 25,
      },
    ],
  },
  {
    title: '三、货币与货币供给',
    items: [
      {
        name: '货币乘数',
        expr: 'M = m × MB ，m = (1 + c)/(rr + e + c)',
        note: 'c 现金比率、rr 法定准备金率、e 超额准备金率；<em>现金漏损与超额准备金都会削弱扩张</em>。',
        chapter: 14,
      },
      {
        name: '简单存款乘数',
        expr: '1 / rr',
        note: '理论上限；rr = 10% 时最多扩张 10 倍。',
        chapter: 14,
      },
      {
        name: '基础货币',
        expr: 'MB = C + R',
        note: '通货 + 准备金，由央行直接控制，故称高能货币。',
        chapter: 14,
      },
      {
        name: '交换方程',
        expr: 'M × V = P × Y',
        note: '数量论：V 稳定时，<em>通胀率 ≈ 货币增长率 − 实际产出增长率</em>。',
        chapter: 19,
      },
    ],
  },
  {
    title: '四、银行与风险',
    items: [
      {
        name: '银行资本',
        expr: '资本 = 资产 − 负债',
        note: '吸收损失的第一道缓冲；资本越厚，抗风险越强、ROE 越低。',
        chapter: 9,
      },
      {
        name: '久期缺口（净值变动）',
        expr: 'ΔNW ≈ −(D_A − D_L × L/A) × A × Δi/(1+i)',
        note: '资产久期大于负债久期时，<em>利率上升 → 净值下降</em>。',
        chapter: 9,
      },
      {
        name: '资本充足率',
        expr: '合格资本 / 风险加权资产（RWA）',
        note: '巴塞尔协议的核心指标；按资产风险赋权，避免一刀切。',
        chapter: 10,
      },
      {
        name: '风险溢价',
        expr: '利差 = 公司债收益率 − 同期限国债收益率',
        note: '反映违约风险、流动性与税收待遇；<em>经济下行时利差扩大</em>。',
        chapter: 6,
      },
    ],
  },
  {
    title: '五、政策规则与宏观',
    items: [
      {
        name: '泰勒规则',
        expr: 'i = r* + π + 0.5(π − π*) + 0.5(y − y*)',
        note: '通胀缺口与产出缺口都为正时加息；是政策基准而非机械公式。',
        chapter: 16,
      },
      {
        name: '利率平价',
        expr: 'i − i* ≈ 预期的本币贬值率',
        note: '资本自由流动时，利差被预期汇率变动抵消。',
        chapter: 17,
      },
      {
        name: '三元悖论',
        expr: '资本自由流动 + 固定汇率 + 独立货币政策：三选二',
        note: '<em>三者不可兼得</em>；香港选前两者，中国选后两者。',
        chapter: 18,
      },
      {
        name: '长期均衡',
        expr: 'LRAS 垂直 ⇒ 需求冲击只改变物价',
        note: '货币长期中性：产出回到自然率，通胀由货币增长决定。',
        chapter: 22,
      },
    ],
  },
]
