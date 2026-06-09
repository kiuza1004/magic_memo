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

export interface Memo {
  id: string;
  created_at: string;
  updated_at: string;
  source_type: SourceType;
  raw_input: string;
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  importance: number;
  action_items: string[];
  standardized_content: string;
  photo_path: string | null;
  audio_path: string | null;
}

export interface StructuredMemo {
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  importance: number;
  action_items: string[];
  standardized_content: string;
}
