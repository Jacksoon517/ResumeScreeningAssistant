# 简历筛选助手 — 项目简介  
*版本：2025-08-04   提交版本 v1.2.1*

## 一、选手信息
- **组长**：黄家欣
- **组员**：邵博文，雷凯麟，李晋，肖玲艳，夏靖康
- **联系电话**（选填）：132-6025-1251  
- **电子邮箱**（选填）：jiaxin.huang@thundercomm.com  

---

## 二、项目背景  

- **招聘环节耗时**：HR 在大量候选人简历中需要快速完成初筛、深度沟通准备，效率低。  
- **简历质量参差**：非结构化文本，关键能力难对齐岗位要求。  
- **AI 机会**：大语言模型（LLM）已可实现文本摘要、语义匹配与生成式问答，为自动化筛选与沟通提供可能。  

## 三、痛点分析

| 痛点         | 现状                       | 影响               |
| ------------ | -------------------------- | ------------------ |
| 初筛效率低   | HR 手动阅读简历、比对 JD   | 极易遗漏候选人亮点 |
| 沟通准备不足 | 缺乏针对性提问             | 面试深度不够       |
| 文件格式多样 | 网页 / PDF / Word / 纯文本 | 解析成本高         |
| 反复制网页   | Boss 直聘等站点禁选禁拷    | 简历无法抓取       |

## 四、解决方案概述  

打造 **「简历筛选助手 Chrome 插件」**，一键完成  

1. **简历抓取**：支持网页选区/容器提取、文件上传（txt/CSV/Docx）。  
2. **本地** **JS** **评分**：关键词 + 年限启发式打分。  
3. **LLM** **摘要 & 评分**：调用豆包/Kimi 等模型，返回 0~1 评分与理由。  
4. **关键沟通问题生成**：基于简历与 JD 输出 5~8 个面试问题。  
5. **侧边栏&浮窗**：任意网站悬浮按钮，一键拉出侧栏，无需切屏。 

## 五、代码功能描述

简历筛选助手是一款 Manifest V3 Chrome 扩展，面向 HR 场景提供“简历抓取 → 本地 JS 评分 → 大模型摘要/评分 → 面试问题生成”一站式能力。

* 插件可在浏览器工具栏、官方 Side Panel 以及可拖动的右侧蓝色 **R** 浮窗三处唤起，适配所有网页。输入端支持粘贴/手输、网页正文抓取和 TXT/DOCX 拖放解析；

* 评分端先用可视化可调的 JS 关键词+年限启发式算法给出 0–1 分及命中说明；

* 同时可调用火山方舟大模型返回 60 字中文摘要、匹配度得分及 5–8 条面试问题。

* 界面提供暗/亮主题、输入自动持久化和 Side Panel ↔ 覆盖面板双模式降级。

  整个流程除 LLM 调用外完全前端执行，保证简历数据隐私，并允许 HR 即时调整关键词、权重和 Prompt，以适应不同岗位。

---

## 六、核心算法说明

### 6.1 启发式关键词评分

```javascript
// popup.js 片段
function computeScoreWithDetails(resume, job='') {
  const cfg = JSON.parse(localStorage.getItem('score_rules')) || {
    keywords: ['iot','python'],
    keyword_weight: 1,
    years_divisor: 10,
    job_match_bonus: 0.5,
    score_cap: 1
  };
  const txt = resume.toLowerCase();
  let score = 0, hit = [];

  // 关键词打分
  cfg.keywords.forEach(function(k) {
    if (txt.includes(k.toLowerCase())) {
      score += cfg.keyword_weight;
      hit.push(k);
    }
  });

  // 年限提取
  const m = resume.match(/(\d+)\s*[+]?年/);
  if (m) {
    score += Math.min(parseInt(m[1]) / cfg.years_divisor, 1);
  }

  // 岗位 JD bonus
  if (job) {
    var top5 = Array.from(new Set(job.split(/[^\w一-龟]+/))).filter(function(w) {
      return w.length > 1;
    }).slice(0,5);
    if (top5.some(function(w){ return txt.includes(w.toLowerCase()); })) {
      score += cfg.job_match_bonus;
    }
  }

  var final = Math.min(score / cfg.score_cap, 1);
  return { score: final.toFixed(3), hit: hit };
}
```

**解析**：
1. *关键词加权*：命中关键字列表即累加 `keyword_weight`，并记录命中词。  
2. *年限加分*：正则提取“X 年”形式的最大数值，除以 `years_divisor` 再取不超过 1。  
3. *岗位匹配 Bonus*：提取 JD 前 5 个高频词，命中则加 `job_match_bonus`。  
4. *归一化*：将总分除以 `score_cap`，裁剪到 [0,1]，保留 3 位小数。

优势：前端运行、配置可视化、逻辑透明；劣势：仅基于词面匹配，需要大模型补充语义能力。

### 6.2 LLM Prompt 工程
- **摘要 Prompt**：要求 30–60 字内总结候选人经历与技能，忽略网页噪声。  
- **评分 Prompt**：输出统一以 `score=0.xxx` 开头的得分与多行理由，便于程序解析。  
- **面试问题 Prompt**：生成 5–8 条面试问题，辅助后续深度面谈。

### 6.3 文件解析与降级
- TXT/CSV 直接读取；DOCX 使用 mammoth.js；解析在 Web Worker 中执行，不阻塞 UI。  
- 针对 Chrome < 116 会自动降级为右侧覆盖面板，保证功能一致。

---

## 七、团队角色与里程碑  

| 成员编号                   | 主要负责模块           | 具体任务清单                                                 | 关键交付物                         |
| -------------------------- | ---------------------- | ------------------------------------------------------------ | ---------------------------------- |
| 1. 产品经理 / PM（黄家欣） | 需求、项目管理         | - 收集 HR 痛点，完成详细 PRD - 制定里程碑与进度跟踪表 - 组织例会、需求验收与评审 - 对接大赛材料、演示脚本 | PRD v1.0、进度甘特图、演示讲稿     |
| 2. 前端开发（邵博文）      | 插件 UI / UX           | - 完成 Popup、SidePanel、Floater 的界面布局与暗亮主题 - 实现拖拽浮窗、Pin 模式交互 - 集成 Tailwind/样式优化，适配不同分辨率 | 前端源码、样式规范文档、交互 Demo  |
| 3. 内容脚本&抓取（雷凯麟） | 简历提取与文件解析     | - 研发网页选区 / 容器 / fallback 抓取逻辑 - 解决 Boss 直聘反复制限制 - 接入 JSZip 解析 docx；追加 PDF 解析预留接口 | extract.js、抓取测试报告           |
| 4. 后端集成（李晋）        | LLM API & 配置         | - 封装可切换的 OpenAI/Volcengine SDK - 实现摘要 / 评分 / 问题生成 3 条接口 - 设计本地缓存与错误重试策略 | apiClient.js、接口文档、Postman 集 |
| 5. 算法 & Prompt（夏靖康） | 评分算法 + Prompt 工程 | - 迭代启发式 [scoring.py](http://scoring.py) 关键词权重 - 设计/优化 3 个 Prompt（摘要、评分、问答） - 小规模实验调优温度、Top-p 参数 | 关键词词表、Prompt v2、调优报告    |
| 6. QA & DevOps（肖玲艳）   | 测试、打包、文档       | - 单元/集成测试脚本；覆盖抓取、API 调用 - GitHub Action 打包 vsix / zip - 编写用户手册、安装指南、项目书排版 | 测试报告、CI/CD 流程、最终项目书   |

## 八、代码版本信息

| 模块 | 版本 | 更新时间 | 更新亮点 |
|------|------|----------|----------|
| Resume Screening Assistant | **v1.2.1** | **2025-08-04** | + 可拖动浮窗与 Base64 图标<br>+ Side Panel 自动降级<br>+ JSON 评分规则热加载 |

---

**GitHub**：`https://github.com/Jacksoon517/ResumeScreeningAssistant`  

**联系方式**：[jiaxin.huang@Thundercomm.com](mailto:jiaxin.huang@Thundercomm.com)
