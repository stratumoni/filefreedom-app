import type { CategoryId, PlannedTool } from './types';

/**
 * Roadmap from the Blueprint and the concept notes. These are NOT usable tools.
 * They are shown only as "Planned" and never appear as results that can be opened.
 */
const RAW: Record<CategoryId, string[]> = {
  images: [
    'Image rotator and flipper', 'Image metadata viewer', 'Image metadata remover', 'Image color picker', 'Palette extractor',
    'Image to Base64', 'Base64 to image', 'Image blur tool', 'Image sharpen tool', 'Brightness and contrast adjuster',
    'Image watermark tool', 'Image background color tool', 'Favicon generator', 'Social media image size helper',
    'Image DPI information viewer', 'Transparent background checker', 'Image border and padding tool', 'Batch image renamer', 'Image to text (OCR)',
  ],
  pdf: [
    'PDF page extractor', 'PDF page reorder', 'PDF rotate pages', 'PDF page numbering', 'PDF watermark',
    'PDF metadata viewer', 'PDF metadata remover', 'PDF to images', 'Images to PDF', 'PDF page-size checker', 'PDF form-fill helper',
    'PDF password protection', 'PDF unlock (for files you are authorized to open)', 'PDF text extraction', 'PDF compare helper', 'PDF compression',
  ],
  video: [
    'Video trim', 'Video crop', 'Video resize', 'Video format conversion', 'Video to GIF', 'Video thumbnail extractor', 'Video metadata viewer',
    'Video mute', 'Audio track extraction', 'Video rotate', 'Frame capture', 'Aspect ratio converter', 'Subtitle file inspector',
    'Video file size estimator', 'Video compressor', 'Video playback speed adjuster', 'Video clip joiner',
  ],
  audio: [
    'Audio trim', 'Audio format conversion', 'Audio volume normalizer', 'Audio fade in/out', 'Audio metadata viewer', 'Audio metadata editor',
    'Audio to waveform image', 'Audio channel inspector', 'Audio duration checker', 'Audio silence detector', 'Audio merge', 'Audio split',
    'Audio bitrate estimator', 'Audio speed adjuster', 'Audio sample-rate converter',
  ],
  documents: [
    'TXT to PDF', 'Markdown preview and export', 'HTML to plain text', 'Text diff', 'Word count', 'Character and line counter', 
    'DOCX to TXT', 'DOCX to PDF', 'PDF to DOCX', 'Rich text to plain text',
  ],
  data: [
    'CSV viewer', 'XML formatter', 'XML validator', 'YAML validator', 'YAML formatter', 'JSON to CSV', 'JSON to YAML', 'CSV to TSV',
    'CSV column selector', 'CSV duplicate-row finder', 'CSV delimiter detector', 'Text to CSV', 'SQL formatter',
  ],
  archives: [
    'ZIP contents viewer', 'ZIP creator', 'ZIP extraction', 'File extension inspector', 'MIME type inspector', 'File size unit converter',
    'Duplicate-file finder', 'Batch file renamer plan', 'File name cleaner', 'File list exporter', 'Text-to-file creator',
  ],
  security: [
    'Local file encryption', 'Local file decryption', 'Random password generator', 'Secure random-token generator', 'Checksum verifier',
    'Text hashing tool', 'EXIF metadata viewer', 'Metadata removal for supported formats', 'File privacy checklist',
  ],
  design: [
    'Color converter', 'HEX to RGB', 'RGB to HSL', 'Color palette generator', 'Gradient generator', 'Contrast checker', 'SVG preview', 'SVG dimension inspector',
    'SVG optimizer with sanitization', 'SVG to PNG', 'QR code generator', 'Barcode generator',
  ],
  fonts: ['Font metadata viewer', 'Font format checker', 'Font preview', 'Font comparison tool', 'Font character-map viewer', 'Font file size inspector'],
  ebooks: ['EPUB metadata viewer', 'EPUB file inspector', 'EPUB to text extractor', 'E-book file size checker'],
  developer: [
    'URL encoder and decoder', 'Base64 encoder and decoder', 'HTML entity encoder and decoder', 'UUID generator', 'Timestamp converter',
    'Unix time inspector', 'Regex tester', 'Cron expression explainer', 'JWT decoder', 'HTML minifier', 'CSS minifier', 'JavaScript minifier',
    'HTML formatter', 'CSS formatter', 'JavaScript formatter', 'HTTP header analyzer', 'QR code reader', 'URL inspector', 'Markdown previewer',
  ],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const PLANNED_TOOLS: PlannedTool[] = (Object.entries(RAW) as [CategoryId, string[]][]).flatMap(([category, names]) =>
  names.map((name) => ({ id: `planned-${category}-${slug(name)}`, name, category })),
);
