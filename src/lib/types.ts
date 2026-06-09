export const CATEGORIES = [
  "업무",
  "개인",
  "아이디어",
  "지출",
  "일정",
  "정보",
  "할일",
  "일반",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SourceType = "text" | "voice" | "photo";

export interface StructuredMemo {
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  importance: number;
  action_items: string[];
  content: string;
}

export interface Memo extends StructuredMemo {
  id: string;
  created_at: number; // epoch ms
  source_type: SourceType;
  raw_input: string;
  photo_data_url?: string;
}
