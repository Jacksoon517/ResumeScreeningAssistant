"""
scoring.py
~~~~~~~~~~~

这是一个示例的简历评分脚本，用于 Chrome 插件中的本地评分逻辑。真实项目中您可以替换此文件的内容
来实现自己的评分算法。

函数 `score_resume` 接收简历文本（必选）和岗位描述（可选），返回 0~1 之间的匹配分，保留三位小数。

示例算法规则：
1. 定义一些关键技能词，比如 IOT、边缘计算、AI、Python 等，只要简历中出现这些词就加 1 分。
2. 通过正则表达式从简历中提取“X年”或“X years”，按照年数/10 加分，最高加 1 分。
3. 总分根据出现的关键词数量加上年限分，最后归一化到 0~1 之间。

您可以根据自己的需求修改关键词列表、评分逻辑，或者导入其他模型。
"""

import re
from typing import Optional


KEYWORDS = [
    "iot", "边缘计算", "edge computing", "人工智能", "ai", "python",
    "产品经理", "product manager", "算法", "硬件", "市场", "营销", "分析",
]


def _extract_years(text: str) -> int:
    """从文本中提取工作年限，支持“X年”或“X years”格式。"""
    match_cn = re.search(r"(\d+)\s*年", text)
    match_en = re.search(r"(\d+)\s*years?", text, re.IGNORECASE)
    if match_cn:
        return int(match_cn.group(1))
    if match_en:
        return int(match_en.group(1))
    return 0


def score_resume(resume_text: str, job_description: Optional[str] = None) -> float:
    """简单评分函数，返回 0~1 之间的小数，保留三位小数。"""
    if not resume_text:
        return 0.0
    score = 0.0
    lower = resume_text.lower()
    for kw in KEYWORDS:
        if kw.lower() in lower:
            score += 1.0
    years = _extract_years(resume_text)
    year_score = min(years, 10) / 10.0
    score += year_score
    max_possible = float(len(KEYWORDS) + 1)
    normalized = min(score / max_possible, 1.0)
    return round(normalized, 3)


def main():
    # 简单的交互式测试入口，方便在命令行快速验证函数
    print("请输入简历文本，结束输入请按 Ctrl+D：")
    try:
        text = input()
    except EOFError:
        text = ''
    result = score_resume(text)
    print(f"得分：{result}")


if __name__ == "__main__":
    main()