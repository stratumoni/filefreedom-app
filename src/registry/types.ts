import type { ComponentType } from 'react';

export type CategoryId =
  | 'images' | 'video' | 'audio' | 'pdf' | 'documents' | 'data'
  | 'archives' | 'security' | 'design' | 'fonts' | 'ebooks' | 'developer';

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
  /** CSS token suffix, e.g. "image" -> --cat-image-bg / --cat-image-ink */
  tone: 'image' | 'pdf' | 'data' | 'text' | 'security' | 'neutral';
  icon: string;
}

/** planned = on the roadmap only; beta = works but not fully verified; available = implemented and tested. */
export type ToolStatus = 'planned' | 'beta' | 'available' | 'unavailable';

export interface ToolMeta {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: CategoryId;
  keywords: string[];
  inputFormats: string[];
  outputFormats: string[];
  status: ToolStatus;
  /** Always local for Release 1. "verified" flips to true only when the network-audit e2e passes for this tool. */
  processingMode: 'local';
  privacy: { verified: boolean; explanation: string };
  limitations: string[];
  related: string[];
  icon: string;
  /** Lazy loader: the tool UI and its libraries are only fetched on the tool page. */
  loadModule?: () => Promise<{ default: ComponentType }>;
}

export interface PlannedTool {
  id: string;
  name: string;
  category: CategoryId;
}
