import {
  AlignLeft, ArrowLeft, ArrowLeftRight, CloudMoon, ArrowUpRight, Archive, BookOpen, Braces, Check, ChevronRight, CircleAlert, CircleCheck, Code, Crop, Download, FileText, FileSearch, Hash,
  House, Image, Info, LayoutGrid, ListChecks, Lock, Menu, Minimize2, Moon, Music, Palette, Scaling, ScanSearch, Search, Settings, ShieldCheck, Star,
  Sun, Table, TriangleAlert, Type, Upload, Video, X, History, RotateCcw, Trash2,
  Copy, Files, Link2, Monitor, Route, Share2,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

const MAP: Record<string, ComponentType<LucideProps>> = {
  image: Image, video: Video, audio: Music, pdf: FileText, doc: AlignLeft, data: Braces, archive: Archive, shield: ShieldCheck, palette: Palette,
  font: Type, book: BookOpen, code: Code, compress: Minimize2, resize: Scaling, convert: ArrowLeftRight, crop: Crop, inspect: ScanSearch,
  checklist: ListChecks, braces: Braces, table: Table, text: AlignLeft, hash: Hash, search: Search, menu: Menu, close: X, sun: Sun, moon: Moon, dim: CloudMoon,
  star: Star, arrowUpRight: ArrowUpRight, download: Download, upload: Upload, info: Info, warn: TriangleAlert, error: CircleAlert, ok: CircleCheck, home: House, grid: LayoutGrid,
  history: History, settings: Settings, lock: Lock, check: Check, next: ChevronRight, filesearch: FileSearch, reset: RotateCcw, trash: Trash2,
  back: ArrowLeft, copy: Copy, files: Files, link: Link2, monitor: Monitor, route: Route, share: Share2,
};

export function Icon({ name, size = 20, ...rest }: { name: string; size?: number } & Omit<LucideProps, 'size'>) {
  const C = MAP[name] ?? FileText;
  return <C size={size} aria-hidden="true" focusable="false" strokeWidth={1.9} {...rest} />;
}
