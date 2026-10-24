export type Band = "bg" | "deco" | "content" | "data" | "ui" | "note" | "edit-source";

export interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
  unit?: "in" | "cm" | "pt";
  rotation?: number;
}

export interface Fill {
  type?: "solid" | "gradient" | "picture" | "pattern" | "none";
  color?: string;
  stops?: [string, number][];
  angle?: number;
  alpha?: number;
  assetId?: string;
}

export interface LineStyle {
  color?: string;
  width?: number;
  dash?: string;
  alpha?: number;
  beginArrow?: string;
  endArrow?: string;
}

export interface TextStyle {
  value?: string;
  paragraphs?: any[];
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right" | "justify";
  valign?: "top" | "middle" | "bottom";
  lineSpacing?: number;
  letterSpacing?: number;
  autofit?: "none" | "shrink" | "resize";
  margin?: number;
  wrap?: boolean;
}

export interface ObjectSpec {
  id: string;
  type: string;
  shape?: string;
  role?: string;
  band?: Band;
  geometry: Geometry;
  fill?: Fill | null;
  line?: LineStyle | null;
  effects?: Record<string, any>;
  text?: TextStyle | null;
  image?: Record<string, any> | null;
  chart?: Record<string, any> | null;
  table?: Record<string, any> | null;
  media?: Record<string, any> | null;
  children?: string[];
  constraints?: any[];
  style?: Record<string, any>;
  z?: number;
  decorative?: boolean;
  altText?: string;
  sourceRef?: string | null;
  locked?: boolean;
  intentionalOverlap?: boolean;
  cf?: Record<string, any>;
  [key: string]: any;
}

export interface BackgroundSpec {
  type?: "solid" | "gradient" | "image" | "pattern" | "none";
  color?: string;
  stops?: [string, number][];
  angle?: number;
  assetId?: string;
  path?: string;
  overlay?: number;
}

export interface SlideSpec {
  id: string;
  type: string;
  tier?: string;
  name?: string;
  hidden?: boolean;
  section?: string | null;
  background?: BackgroundSpec;
  grid?: { cols?: number; rows?: number; margin?: number; gutter?: number };
  objects: ObjectSpec[];
  motion?: Record<string, any>;
  notes?: string;
  transition?: Record<string, any>;
  [key: string]: any;
}

export interface Brief {
  goal?: string;
  audience?: string;
  durationMin?: number;
  slideCount?: number;
  slideCountSource?: "user" | "estimated" | "default";
  language?: string;
  mustHave?: string[];
  tone?: string;
  style?: string;
  brand?: any;
  output?: string[];
  editability?: string;
  motion?: string;
  assumptions?: string[];
  outline?: any[];
  approved?: boolean;
  [key: string]: any;
}

export interface DeckSpec {
  version: "1.0";
  meta: {
    title: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    language?: string;
    size?: { w: number; h: number; unit?: string };
    theme?: string;
    style?: string;
    [key: string]: any;
  };
  brief?: Brief;
  tokens?: Record<string, any>;
  slides: SlideSpec[];
  assets?: any[];
  sections?: any[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface DeckSession {
  id: string;
  spec: DeckSpec;
  filePath?: string;
  undo: string[];
  redo: string[];
  dirty: boolean;
  createdAt: string;
  updatedAt: string;
  warnings: string[];
}

export interface ToolResult {
  ok: boolean;
  data?: any;
  warnings?: string[];
  next_action?: string | null;
  error?: { code: string; message: string; next_action?: string; details?: any };
}

export interface ToolContext {
  sessions: import("./session.js").SessionStore;
}

export interface ToolDef {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: any, ctx: ToolContext) => Promise<ToolResult> | ToolResult;
}
