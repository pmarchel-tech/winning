export interface Win {
  id: string;
  text: string;
  tags: string[];
  createdAt: number;
  starred?: boolean;
  pinned?: boolean;
  isHabitMode?: boolean;
  imageUrl?: string;
  reflections?: string;
  embedding?: number[];
  isBeDoHave?: boolean;
  beText?: string;
  doText?: string;
  haveText?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type View = 'home' | 'chat' | 'record' | 'stats' | 'friends' | 'profile';
