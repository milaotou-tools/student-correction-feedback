import { TitleClinicApp } from "@/components/title-clinic/TitleClinicApp";

export const metadata = {
  title: "论文标题优化门诊",
  description: "上传论文 Word，提取大标题和小标题，按专家规则生成改前改后的标题层级对比。"
};

export default function TitleClinicPage() {
  return <TitleClinicApp />;
}
