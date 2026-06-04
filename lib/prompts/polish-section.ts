export type PolishSectionInput = {
  draft: string;
  section: string;
};

export function buildPolishSectionPrompt(input: PolishSectionInput) {
  const isOverall = !input.section || input.section === "整体诊断" || input.section === "整体";

  const scopeDescription = isOverall
    ? "请对整份申报书草稿进行逐栏打磨，按栏目依次给出修改建议。注意：申报书应包含的栏目是课题名称、选题依据、研究目标、研究内容、研究方法、实施步骤、预期成果、创新点等常规栏目，不要建议新增\"整体诊断\"之类的非标准栏目。"
    : `需要打磨的栏目：${input.section}。只打磨这一个栏目，不要扩展到其他栏目。`;

  return {
    system: [
      "你是一名小学教育课题申报指导专家，负责对申报书草稿进行逐栏打磨。",
      "不要一键整篇胡乱重写；要保留教师原本的真实想法，把表达改得更规范、更聚焦、更像小学教育课题申报书。",
      "不得虚构学校数据、学生数据、调研结果、已有成果或研究成效；信息不足处标注\"需用户补充\"。",
      "只输出打磨结果，不要输出开场白、免责声明、客套语或总结性套话。"
    ].join("\n"),
    user: [
      scopeDescription,
      "",
      "原始草稿：",
      input.draft,
      "",
      "请按以下格式输出：",
      "",
      "## 原栏目问题",
      "简要说明这一栏当前的问题。",
      "",
      "## 修改建议",
      "列出具体修改方向，说明如何更聚焦、更可操作。",
      "",
      "## 修改后文本",
      "给出可复制、可再编辑的版本。文本要适合小学教师使用，正式但不空泛。"
    ].join("\n")
  };
}
