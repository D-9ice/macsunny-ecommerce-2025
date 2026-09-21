export type ThemeMode = 'light' | 'dark' | 'premium';
export type ThemeContainer = 'narrow' | 'normal' | 'wide';

export interface SiteThemeSettings {
  mode: ThemeMode;
  accent: string;
  fontScale: number;
  container: ThemeContainer;
  rounded: boolean;
}

export const DEFAULT_SITE_THEME: SiteThemeSettings = {
  mode: 'premium',
  accent: '#48c982',
  fontScale: 1,
  container: 'normal',
  rounded: true,
};

const MODES = new Set<ThemeMode>(['light', 'dark', 'premium']);
const CONTAINERS = new Set<ThemeContainer>(['narrow', 'normal', 'wide']);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function sanitizeSiteTheme(
  input: Partial<SiteThemeSettings> | null | undefined,
  fallback: SiteThemeSettings = DEFAULT_SITE_THEME,
): SiteThemeSettings {
  const mode = input?.mode && MODES.has(input.mode) ? input.mode : fallback.mode;
  const accent = typeof input?.accent === 'string' && HEX_COLOR.test(input.accent)
    ? input.accent.toLowerCase()
    : fallback.accent;
  const numericScale = typeof input?.fontScale === 'number' && Number.isFinite(input.fontScale)
    ? input.fontScale
    : fallback.fontScale;
  const fontScale = Math.min(1.3, Math.max(0.8, numericScale));
  const container = input?.container && CONTAINERS.has(input.container)
    ? input.container
    : fallback.container;
  const rounded = typeof input?.rounded === 'boolean' ? input.rounded : fallback.rounded;

  return { mode, accent, fontScale, container, rounded };
}

export function containerWidth(container: ThemeContainer) {
  switch (container) {
    case 'narrow':
      return '1024px';
    case 'wide':
      return '1408px';
    default:
      return '1152px';
  }
}
