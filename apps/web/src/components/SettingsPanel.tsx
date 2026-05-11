import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  ClipboardCopy,
  Command,
  Database,
  Download,
  Github,
  Heart,
  Info,
  Keyboard,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Trash2,
  Users,
  Volume2,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { type ThemeMode } from '../context/themeContext';
import { type DefaultLandingTab } from '../context/preferencesContext';
import { APP_UPDATE, Memory, UserType } from '../types';

// =============================================================================
// Public API
// =============================================================================

interface SettingsPanelProps {
  isOpen: boolean;
  memories: Memory[];
  onClose: () => void;
  onExport: () => void;
  onCopyBackup: () => void;
  onClearCache: () => void;
  onOpenHeatmap: () => void;
  onOpenUpdate: () => void;
  onLogout: () => void;
}

// =============================================================================
// Sections & palettes
// =============================================================================

type SectionId = 'appearance' | 'experience' | 'data' | 'about';
type Tint = 'rose' | 'violet' | 'sky' | 'amber' | 'emerald';

interface SectionMeta {
  id: SectionId;
  label: string;
  hint: string;
  icon: LucideIcon;
  tint: Tint;
  /** Brief subtitle shown above each section's content */
  subtitle: string;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'appearance',
    label: '外观',
    hint: '主题与视觉',
    icon: Palette,
    tint: 'rose',
    subtitle: '选一个最舒服的主题，Us. 会默默记住你的选择。',
  },
  {
    id: 'experience',
    label: '体验',
    hint: '声音 · 星光 · 动效',
    icon: Sparkles,
    tint: 'violet',
    subtitle: '每一点小小的仪式感，都可以按你的心情来。',
  },
  {
    id: 'data',
    label: '数据',
    hint: '备份与记忆回顾',
    icon: Database,
    tint: 'sky',
    subtitle: '把回忆小心地备份下来，也让它们被看见。',
  },
  {
    id: 'about',
    label: '关于',
    hint: '版本 · 账户',
    icon: Info,
    tint: 'emerald',
    subtitle: 'Us. 的小小版本档案与账户入口。',
  },
];

/** Icon badge color when enabled / selected. */
const TINT_ICON: Record<Tint, string> = {
  rose:    'bg-rose-50 text-rose-500 ring-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700/40',
  violet:  'bg-violet-50 text-violet-500 ring-violet-200/60 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/40',
  sky:     'bg-sky-50 text-sky-500 ring-sky-200/60 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700/40',
  amber:   'bg-amber-50 text-amber-500 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/40',
  emerald: 'bg-emerald-50 text-emerald-500 ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/40',
};

/** Soft ambient glow blob used behind a section. */
const TINT_GLOW: Record<Tint, string> = {
  rose:    'from-rose-200/55 via-rose-100/30 to-transparent dark:from-rose-700/25 dark:via-rose-800/10',
  violet:  'from-violet-200/55 via-fuchsia-100/30 to-transparent dark:from-violet-700/25 dark:via-fuchsia-800/10',
  sky:     'from-sky-200/55 via-cyan-100/30 to-transparent dark:from-sky-700/25 dark:via-cyan-800/10',
  amber:   'from-amber-200/55 via-orange-100/30 to-transparent dark:from-amber-700/25 dark:via-orange-800/10',
  emerald: 'from-emerald-200/55 via-teal-100/30 to-transparent dark:from-emerald-700/25 dark:via-teal-800/10',
};

const TINT_TEXT: Record<Tint, string> = {
  rose:    'text-rose-500 dark:text-rose-300',
  violet:  'text-violet-500 dark:text-violet-300',
  sky:     'text-sky-500 dark:text-sky-300',
  amber:   'text-amber-500 dark:text-amber-300',
  emerald: 'text-emerald-500 dark:text-emerald-300',
};

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  caption: string;
  icon: LucideIcon;
}> = [
  { mode: 'system', label: '跟随系统', caption: '自动随系统切换', icon: Monitor },
  { mode: 'light',  label: '浅色',     caption: '柔和的日间氛围', icon: Sun },
  { mode: 'dark',   label: '深色',     caption: '温柔的夜晚氛围', icon: Moon },
];

// =============================================================================
// Tiny presentational primitives
// =============================================================================

/** Soft frosted close button that rotates slightly on hover. */
const CloseButton: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <button
    type="button"
    onClick={onClose}
    data-sound="action"
    aria-label="关闭设置"
    className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-400 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur-md transition-all duration-300 hover:-rotate-90 hover:border-rose-200 hover:bg-white hover:text-rose-500 dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-rose-800/60 dark:hover:bg-slate-800 dark:hover:text-rose-300"
  >
    <X size={16} strokeWidth={2.25} />
  </button>
);

/** Mobile bottom-sheet grabber handle. */
const Grabber: React.FC = () => (
  <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
    <span className="h-1 w-9 rounded-full bg-slate-200/90 dark:bg-slate-700/90" />
  </div>
);

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tint: Tint;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  title,
  description,
  checked,
  onChange,
  tint,
}) => (
  <div
    className={[
      'group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border px-4 py-3.5 transition-all duration-300',
      checked
        ? 'border-white/80 bg-white/90 shadow-[0_14px_40px_-24px_rgba(168,85,247,0.35)] dark:border-slate-700/60 dark:bg-slate-800/80'
        : 'border-slate-100/80 bg-white/60 hover:bg-white/80 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60',
    ].join(' ')}
  >
    {/* Tinted glow when enabled */}
    {checked && (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-3xl opacity-70 ${TINT_GLOW[tint]}`}
      />
    )}

    <div
      className={[
        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300',
        checked
          ? `${TINT_ICON[tint]} ring-4 ring-offset-0`
          : 'bg-slate-50 text-slate-400 dark:bg-slate-900/60 dark:text-slate-500',
      ].join(' ')}
    >
      {icon}
    </div>

    <div className="relative min-w-0 flex-1">
      <p
        className={`text-sm font-semibold transition-colors ${
          checked
            ? 'text-slate-800 dark:text-slate-50'
            : 'text-slate-600 dark:text-slate-200'
        }`}
      >
        {title}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      onClick={() => onChange(!checked)}
      data-sound="action"
      className={[
        'relative h-7 w-[52px] shrink-0 rounded-full border p-[3px] transition-all duration-300 active:scale-95',
        checked
          ? 'border-transparent bg-gradient-to-r from-rose-400 via-purple-400 to-sky-400 shadow-[0_10px_24px_-10px_rgba(168,85,247,0.65)]'
          : 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.22)] transition-transform duration-300',
          checked ? 'translate-x-6' : 'translate-x-0',
        ].join(' ')}
      >
        {checked && (
          <Heart
            size={10}
            className="fill-rose-400 text-rose-400"
            strokeWidth={0}
          />
        )}
      </span>
    </button>
  </div>
);

interface ActionTileProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  tint?: Tint;
}

const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  tint = 'sky',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-sound={disabled ? undefined : 'action'}
    className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-slate-100/80 bg-white/75 px-4 py-3.5 text-left shadow-[0_12px_40px_-28px_rgba(15,23,42,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-white/75 dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-slate-600/80 dark:hover:bg-slate-800"
  >
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${TINT_GLOW[tint]} blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
    />
    <span
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 ${TINT_ICON[tint]}`}
    >
      {icon}
    </span>
    <span className="relative min-w-0 flex-1">
      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-100">
        {title}
      </span>
      <span className="mt-0.5 block truncate text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </span>
    </span>
    <ArrowUpRight
      size={16}
      className="relative shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300"
    />
  </button>
);

interface SectionHeaderProps {
  meta: SectionMeta;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ meta }) => {
  const Icon = meta.icon;
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${TINT_ICON[meta.tint]}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 sm:text-xl">
          {meta.label}
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-[13px]">
          {meta.subtitle}
        </p>
      </div>
    </div>
  );
};


// =============================================================================
// Section navigation — desktop sidebar & mobile pill bar
// =============================================================================

interface SectionNavProps {
  activeId: SectionId;
  onSelect: (id: SectionId) => void;
  orientation: 'vertical' | 'horizontal';
}

const SectionNav: React.FC<SectionNavProps> = ({
  activeId,
  onSelect,
  orientation,
}) => {
  const isVertical = orientation === 'vertical';
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      aria-label="设置分区"
      className={
        isVertical
          ? 'flex flex-col gap-1.5'
          : 'flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar'
      }
    >
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`settings-panel-${section.id}`}
            id={`settings-tab-${section.id}`}
            data-sound="action"
            onClick={() => onSelect(section.id)}
            className={[
              'group relative flex items-center gap-2.5 rounded-2xl text-left transition-all duration-300 active:scale-[0.98]',
              isVertical
                ? 'w-full px-2.5 py-2.5'
                : 'shrink-0 px-3 py-2',
              isActive
                ? 'bg-white/90 text-slate-800 shadow-[0_10px_28px_-18px_rgba(168,85,247,0.55)] dark:bg-slate-800/85 dark:text-slate-50'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
            ].join(' ')}
          >
            {/* Left accent bar on active */}
            {isVertical && isActive && (
              <span
                aria-hidden="true"
                className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-rose-400 via-purple-400 to-sky-400"
              />
            )}

            <span
              className={[
                'flex shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                isVertical ? 'h-8 w-8' : 'h-7 w-7',
                isActive
                  ? `${TINT_ICON[section.tint]} ring-1`
                  : 'bg-slate-50 text-slate-500 group-hover:bg-white dark:bg-slate-900/60 dark:text-slate-300 dark:group-hover:bg-slate-800',
              ].join(' ')}
            >
              <Icon size={isVertical ? 15 : 14} />
            </span>

            <span className={`min-w-0 flex-1 ${isVertical ? '' : 'pr-0.5'}`}>
              <span className={`block truncate text-sm font-semibold ${isVertical ? '' : 'leading-none'}`}>
                {section.label}
              </span>
              {isVertical && (
                <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                  {section.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// Appearance — theme cards with mini app mockups
// =============================================================================

const ThemePreview: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  if (mode === 'system') {
    return (
      <div className="relative h-24 w-full overflow-hidden">
        {/* Light half */}
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-rose-100 via-purple-100 to-sky-100">
          <span className="absolute left-2 top-2 text-base">🐰</span>
          <span className="absolute right-2 top-2 text-[10px] text-slate-500/80">☀</span>
          <span className="absolute bottom-2 left-2 h-1.5 w-8 rounded-full bg-white/80" />
        </div>
        {/* Dark half */}
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          <span className="absolute right-2 top-2 text-base">🐶</span>
          <span className="absolute left-2 top-2 text-[10px] text-slate-400">☾</span>
          <span className="absolute bottom-2 right-2 h-1.5 w-8 rounded-full bg-slate-600/80" />
        </div>
        {/* Slash separator */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-white/0 via-white/90 to-white/0"
        />
      </div>
    );
  }
  if (mode === 'light') {
    return (
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-rose-100 via-purple-100 to-sky-100">
        <span className="absolute left-3 top-2 text-base">🐰</span>
        <span className="absolute right-3 top-2 text-base">🐶</span>
        <span className="absolute right-3 top-8 text-[9px] text-rose-400">✦</span>
        <span className="absolute left-8 top-5 text-[9px] text-sky-400">✧</span>
        {/* Memory card silhouette */}
        <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/85 p-1.5 shadow-sm">
          <div className="h-1 w-10 rounded-full bg-slate-300/80" />
          <div className="mt-1 h-1 w-14 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <span className="absolute left-3 top-2 text-base opacity-90">🐰</span>
      <span className="absolute right-3 top-2 text-base opacity-90">🐶</span>
      <span className="absolute right-3 top-8 text-[9px] text-rose-400">✦</span>
      <span className="absolute left-8 top-5 text-[9px] text-sky-300">✧</span>
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-slate-800/90 p-1.5 shadow-sm ring-1 ring-slate-700/50">
        <div className="h-1 w-10 rounded-full bg-slate-600" />
        <div className="mt-1 h-1 w-14 rounded-full bg-slate-700" />
      </div>
    </div>
  );
};

interface ThemeCardProps {
  option: (typeof THEME_OPTIONS)[number];
  isActive: boolean;
  onSelect: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ option, isActive, onSelect }) => {
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={onSelect}
      data-sound="action"
      className={[
        'group relative overflow-hidden rounded-2xl p-[1.5px] text-left transition-all duration-300 active:scale-[0.98]',
        isActive
          ? 'bg-gradient-to-br from-rose-300 via-purple-300 to-sky-300 shadow-[0_18px_44px_-18px_rgba(168,85,247,0.55)]'
          : 'bg-slate-200/70 hover:-translate-y-0.5 hover:bg-slate-300/80 hover:shadow-[0_12px_32px_-18px_rgba(15,23,42,0.3)] dark:bg-slate-700/60 dark:hover:bg-slate-600/70',
      ].join(' ')}
    >
      <div className="overflow-hidden rounded-[14px] bg-white dark:bg-slate-900">
        <div className="relative">
          <ThemePreview mode={option.mode} />
          {isActive && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md dark:bg-slate-100">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span
            className={[
              'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
              isActive
                ? 'bg-gradient-to-br from-rose-100 via-purple-100 to-sky-100 text-slate-700 dark:from-rose-900/40 dark:via-purple-900/40 dark:to-sky-900/40 dark:text-slate-100'
                : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
            ].join(' ')}
          >
            <Icon size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              {option.label}
            </div>
            <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
              {option.caption}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

const AppearanceSection: React.FC = () => {
  const { themeMode, setThemeMode } = useAppContext();
  return (
    <div
      role="radiogroup"
      aria-label="主题模式"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {THEME_OPTIONS.map((option) => (
        <ThemeCard
          key={option.mode}
          option={option}
          isActive={themeMode === option.mode}
          onSelect={() => setThemeMode(option.mode)}
        />
      ))}
    </div>
  );
};

// =============================================================================
// Experience — toggle rows
// =============================================================================

const LANDING_TAB_OPTIONS: Array<{
  value: DefaultLandingTab;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { value: 'last', label: '跟随上次', hint: '打开时回到你离开的那一侧', icon: Users },
  { value: 'her',  label: '她的日记', hint: '每次都固定从婷婷的视角开始',   icon: Heart },
  { value: 'him',  label: '他的日记', hint: '每次都固定从宽宽的视角开始',   icon: Heart },
];

const LANDING_TAB_TINT: Record<DefaultLandingTab, Tint> = {
  last: 'violet',
  her:  'rose',
  him:  'sky',
};

const LandingTabPicker: React.FC = () => {
  const { defaultLandingTab, setDefaultLandingTab } = useAppContext();
  const activeOption = LANDING_TAB_OPTIONS.find((o) => o.value === defaultLandingTab)
    ?? LANDING_TAB_OPTIONS[0];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white/75 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.3)] dark:border-slate-700/60 dark:bg-slate-800/60">
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${TINT_ICON[LANDING_TAB_TINT[defaultLandingTab]]}`}>
          <Users size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
            默认视角
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {activeOption.hint}
          </p>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label="默认视角"
        className="grid grid-cols-3 gap-1.5 px-3 pb-3 pt-2.5 sm:px-4 sm:gap-2"
      >
        {LANDING_TAB_OPTIONS.map((option) => {
          const isActive = option.value === defaultLandingTab;
          const tint = LANDING_TAB_TINT[option.value];
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setDefaultLandingTab(option.value)}
              data-sound="action"
              className={[
                'relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-300 active:scale-[0.97] sm:text-sm',
                isActive
                  ? `${TINT_ICON[tint]} ring-1 shadow-[0_10px_24px_-16px_rgba(168,85,247,0.45)]`
                  : 'bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100',
              ].join(' ')}
            >
              <span>{option.label}</span>
              {isActive && <Check size={13} strokeWidth={3} className="-mr-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ExperienceSection: React.FC = () => {
  const {
    soundEnabled,
    setSoundEnabled,
    starEffectsEnabled,
    setStarEffectsEnabled,
    presenceEnabled,
    setPresenceEnabled,
    reducedMotionEnabled,
    setReducedMotionEnabled,
  } = useAppContext();

  return (
    <div className="space-y-2.5">
      <LandingTabPicker />
      <ToggleRow
        icon={<Volume2 size={18} />}
        title="声音反馈"
        description="保留点击、保存和长按刷新时的小提示音。"
        checked={soundEnabled}
        onChange={setSoundEnabled}
        tint="rose"
      />
      <ToggleRow
        icon={<Sparkles size={18} />}
        title="点击星光"
        description="轻点屏幕时绽放一颗温柔的小星星。"
        checked={starEffectsEnabled}
        onChange={setStarEffectsEnabled}
        tint="violet"
      />
      <ToggleRow
        icon={<BellRing size={18} />}
        title="在线陪伴提示"
        description="对方同时在线时，底部会出现甜甜的提醒。"
        checked={presenceEnabled}
        onChange={setPresenceEnabled}
        tint="sky"
      />
      <ToggleRow
        icon={<Zap size={18} />}
        title="减少动效"
        description="降低动画与转场，省电或容易晕动时打开。"
        checked={reducedMotionEnabled}
        onChange={setReducedMotionEnabled}
        tint="amber"
      />
    </div>
  );
};

// =============================================================================
// Data — export + heatmap + quick stats strip
// =============================================================================

const STAT_ACCENT: Record<Tint, string> = TINT_TEXT;

const StatCell: React.FC<{ label: string; value: number; accent: Tint }> = ({
  label,
  value,
  accent,
}) => (
  <div className="flex flex-col items-center gap-0.5 px-1 py-1 text-center">
    <span className={`font-display text-2xl leading-none tabular-nums ${STAT_ACCENT[accent]}`}>
      {value}
    </span>
    <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
  </div>
);

interface DataSectionProps {
  memories: Memory[];
  onExport: () => void;
  onCopyBackup: () => void;
  onClearCache: () => void;
  onOpenHeatmap: () => void;
}

const DataSection: React.FC<DataSectionProps> = ({
  memories,
  onExport,
  onCopyBackup,
  onClearCache,
  onOpenHeatmap,
}) => {
  const stats = useMemo(() => {
    const herCount = memories.filter((m) => m.author === UserType.HER).length;
    const himCount = memories.length - herCount;
    const imageCount = memories.reduce(
      (count, m) => count + (m.imageUrls?.length ?? (m.imageUrl ? 1 : 0)),
      0,
    );
    return { herCount, himCount, imageCount };
  }, [memories]);

  const isEmpty = memories.length === 0;

  return (
    <div className="space-y-3">
      {/* Stat strip */}
      <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-r from-rose-50/80 via-white to-sky-50/80 p-2.5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.2)] dark:border-slate-700/60 dark:from-rose-950/25 dark:via-slate-900/80 dark:to-sky-950/25">
        <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-slate-700/60">
          <StatCell label="她的回忆" value={stats.herCount} accent="rose" />
          <StatCell label="他的回忆" value={stats.himCount} accent="sky" />
          <StatCell label="照片数量" value={stats.imageCount} accent="violet" />
        </div>
      </div>

      {/* Backup actions */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <ActionTile
          icon={<Download size={18} />}
          title="导出 JSON 备份"
          description={
            isEmpty
              ? '写下回忆后就可以导出备份。'
              : `下载包含 ${memories.length} 条回忆 · ${stats.imageCount} 张照片链接。`
          }
          onClick={onExport}
          disabled={isEmpty}
          tint="emerald"
        />
        <ActionTile
          icon={<ClipboardCopy size={18} />}
          title="复制 JSON 到剪贴板"
          description={
            isEmpty
              ? '写下回忆后就能一键复制备份。'
              : '粘贴到笔记或聊天里，随时留存。'
          }
          onClick={onCopyBackup}
          disabled={isEmpty}
          tint="sky"
        />
      </div>

      {/* Heatmap */}
      <ActionTile
        icon={<CalendarDays size={18} />}
        title="打开记忆日历"
        description={
          isEmpty
            ? '记录第一条回忆后，日历会慢慢热闹起来。'
            : `她 ${stats.herCount} 条 · 他 ${stats.himCount} 条。`
        }
        onClick={onOpenHeatmap}
        disabled={isEmpty}
        tint="violet"
      />

      {/* Danger zone: clear local cache */}
      <div className="pt-2">
        <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Danger Zone
        </div>
        <button
          type="button"
          onClick={onClearCache}
          data-sound="action"
          className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-amber-100/80 bg-amber-50/55 px-4 py-3.5 text-left shadow-[0_12px_40px_-28px_rgba(245,158,11,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 active:scale-[0.99] dark:border-amber-800/40 dark:bg-amber-900/10 dark:hover:border-amber-700/60 dark:hover:bg-amber-900/20"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-600 ring-1 ring-amber-200/60 transition-transform duration-300 group-hover:scale-105 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/40">
            <Trash2 size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-amber-700 dark:text-amber-200">
              清除本地缓存
            </span>
            <span className="mt-0.5 block truncate text-xs text-amber-600/90 dark:text-amber-300/80">
              清空本地缓存并刷新，云端数据不会被删除。
            </span>
          </span>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-amber-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-600 dark:text-amber-700 dark:group-hover:text-amber-300"
          />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// About — ticket-stub release card + github + logout
// =============================================================================

interface AboutSectionProps {
  onOpenUpdate: () => void;
  onLogout: () => void;
}

interface Shortcut {
  icon: LucideIcon;
  title: string;
  hint: string;
  keys: string[];
}

const SHORTCUTS: Shortcut[] = [
  {
    icon: X,
    title: '关闭弹窗 / 退出设置',
    hint: '任意弹窗内按下即可关闭',
    keys: ['Esc'],
  },
  {
    icon: Command,
    title: '打开设置',
    hint: '聚焦顶部用户头像按钮时',
    keys: ['Shift', 'Enter'],
  },
  {
    icon: Keyboard,
    title: '长按顶部头像 3 秒',
    hint: '清除本地缓存并强制刷新',
    keys: ['3s'],
  },
];

const KeyCap: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-600 shadow-[inset_0_-2px_0_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]">
    {label}
  </span>
);

const KeyboardShortcutsCard: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-100/80 bg-white/75 p-4 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.3)] dark:border-slate-700/60 dark:bg-slate-800/60 sm:p-5">
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${TINT_ICON.emerald}`}>
        <Keyboard size={16} />
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          快捷键与小手势
        </h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          一些隐藏的操作，让日常更顺手。
        </p>
      </div>
    </div>
    <ul className="mt-3 divide-y divide-slate-100/80 dark:divide-slate-700/60">
      {SHORTCUTS.map((s) => {
        const Icon = s.icon;
        return (
          <li key={s.title} className="flex items-center gap-3 py-2.5 first:pt-1.5 last:pb-0.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-100 sm:text-sm">
                {s.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                {s.hint}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {s.keys.map((k, idx) => (
                <React.Fragment key={`${k}-${idx}`}>
                  <KeyCap label={k} />
                  {idx < s.keys.length - 1 && (
                    <span aria-hidden="true" className="text-[11px] text-slate-400">
                      +
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

const AboutSection: React.FC<AboutSectionProps> = ({ onOpenUpdate, onLogout }) => {
  const previewLine = APP_UPDATE.content[0] ?? '';
  return (
    <div className="space-y-3">
      <KeyboardShortcutsCard />

      {/* Release ticket stub */}
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_18px_60px_-32px_rgba(168,85,247,0.35)] dark:border-slate-700/60 dark:bg-slate-800/70">
        {/* Ambient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-rose-200/60 via-purple-200/45 to-sky-200/60 blur-3xl dark:from-rose-800/25 dark:via-purple-800/20 dark:to-sky-800/25"
        />
        {/* Perforation half-circles on left & right of dashed line */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[-8px] top-[62%] h-4 w-4 -translate-y-1/2 rounded-full bg-slate-100 dark:bg-slate-900"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-8px] top-[62%] h-4 w-4 -translate-y-1/2 rounded-full bg-slate-100 dark:bg-slate-900"
        />

        <div className="relative flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 via-purple-100 to-sky-100 text-slate-700 shadow-inner dark:from-rose-900/40 dark:via-purple-900/40 dark:to-sky-900/40 dark:text-slate-100">
            <WandSparkles size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-rose-100 via-purple-100 to-sky-100 px-2.5 py-0.5 text-[11px] font-bold tracking-[0.14em] text-slate-700 shadow-inner dark:from-rose-900/40 dark:via-purple-900/40 dark:to-sky-900/40 dark:text-slate-100">
                {APP_UPDATE.version}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {APP_UPDATE.date}
              </span>
            </div>
            <h4 className="mt-1 font-serif text-base font-semibold text-slate-800 dark:text-slate-50 sm:text-lg">
              最近更新
            </h4>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {previewLine}
            </p>
          </div>
        </div>

        {/* Dashed perforation */}
        <div className="relative mx-4 mt-3 border-t border-dashed border-slate-200 dark:border-slate-700 sm:mx-5" />

        <button
          type="button"
          onClick={onOpenUpdate}
          data-sound="action"
          className="group relative flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50 sm:px-5"
        >
          <span>查看完整更新日志</span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-rose-200 group-hover:via-purple-200 group-hover:to-sky-200 group-hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:from-rose-900/40 dark:group-hover:via-purple-900/40 dark:group-hover:to-sky-900/40 dark:group-hover:text-slate-50">
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </button>
      </div>

      {/* Secondary tiles */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href="https://github.com/lin-hongkuan/us"
          target="_blank"
          rel="noopener noreferrer"
          data-sound="action"
          className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-slate-100/80 bg-white/75 px-4 py-3.5 text-left shadow-[0_12px_40px_-28px_rgba(15,23,42,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-slate-600/80 dark:hover:bg-slate-800"
        >
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 ${TINT_ICON.sky}`}>
            <Github size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-100">
              项目仓库
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
              github.com/lin-hongkuan/us
            </span>
          </span>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300"
          />
        </a>

        <button
          type="button"
          onClick={onLogout}
          data-sound="action"
          className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-rose-100/80 bg-rose-50/60 px-4 py-3.5 text-left shadow-[0_12px_40px_-28px_rgba(244,63,94,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 active:scale-[0.99] dark:border-rose-800/50 dark:bg-rose-900/10 dark:hover:border-rose-700/60 dark:hover:bg-rose-900/20"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100/80 text-rose-500 ring-1 ring-rose-200/60 transition-transform duration-300 group-hover:scale-105 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700/40">
            <LogOut size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-rose-600 dark:text-rose-300">
              切换用户
            </span>
            <span className="mt-0.5 block truncate text-xs text-rose-500/80 dark:text-rose-300/80">
              回到身份选择页，回忆不会丢失。
            </span>
          </span>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-rose-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-rose-500 dark:text-rose-700 dark:group-hover:text-rose-300"
          />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Main container
// =============================================================================

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  memories,
  onClose,
  onExport,
  onCopyBackup,
  onClearCache,
  onOpenHeatmap,
  onOpenUpdate,
  onLogout,
}) => {
  const openedAtRef = useRef<number>(Date.now());
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');
  const activeMeta = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0],
    [activeSection],
  );

  // Reset active section every time the panel opens; lock body scroll; handle Esc.
  useEffect(() => {
    if (!isOpen) return undefined;
    openedAtRef.current = Date.now();
    setActiveSection('appearance');

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(() => {
    // Guard: avoid accidental close right after opening (e.g. long-press bleed from Header).
    if (Date.now() - openedAtRef.current < 900) return;
    onClose();
  }, [onClose]);

  const handleOpenHeatmap = useCallback(() => {
    onClose();
    onOpenHeatmap();
  }, [onClose, onOpenHeatmap]);

  const handleOpenUpdate = useCallback(() => {
    onClose();
    onOpenUpdate();
  }, [onClose, onOpenUpdate]);

  const handleLogout = useCallback(() => {
    onClose();
    onLogout();
  }, [onClose, onLogout]);

  if (!isOpen) return null;

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSection />;
      case 'experience':
        return <ExperienceSection />;
      case 'data':
        return (
          <DataSection
            memories={memories}
            onExport={onExport}
            onCopyBackup={onCopyBackup}
            onClearCache={onClearCache}
            onOpenHeatmap={handleOpenHeatmap}
          />
        );
      case 'about':
        return (
          <AboutSection
            onOpenUpdate={handleOpenUpdate}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-0 py-0 sm:items-center sm:px-4 sm:py-6">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="关闭设置"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
        onClick={handleBackdropClick}
      />

      {/* Gradient-wrapped panel: 2px gradient border, inner glass */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
        data-testid="settings-panel"
        className="relative w-full max-h-[94dvh] animate-popIn rounded-t-[2rem] bg-gradient-to-br from-rose-200/70 via-purple-200/60 to-sky-200/70 p-[1.5px] shadow-[0_30px_100px_-30px_rgba(168,85,247,0.55)] dark:from-rose-700/50 dark:via-purple-700/40 dark:to-sky-700/50 sm:max-h-[90vh] sm:w-[min(900px,94vw)] sm:max-w-none sm:rounded-[2rem]"
      >
        <div className="relative flex h-full max-h-[inherit] flex-col overflow-hidden rounded-t-[2rem] bg-white/95 backdrop-blur-xl dark:bg-slate-900/95 sm:rounded-[2rem]">
          {/* Section-accent ambient glow (switches with active section) */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${TINT_GLOW[activeMeta.tint]} blur-[80px] transition-all duration-700`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr ${TINT_GLOW[activeMeta.tint]} blur-[80px] transition-all duration-700`}
          />

          {/* Mobile grabber */}
          <Grabber />

          {/* Title bar */}
          <header className="relative flex items-center justify-between gap-3 px-5 pb-3 pt-1 sm:px-6 sm:pt-5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-rose-500/80 dark:text-rose-300/80">
                <Sparkles size={11} />
                Settings · 偏好
              </div>
              <h2
                id="settings-panel-title"
                className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-50 sm:text-[1.65rem]"
              >
                属于我们的小调整
              </h2>
            </div>
            <CloseButton onClose={onClose} />
          </header>

          {/* Body */}
          <div className="relative flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Desktop sidebar */}
            <aside className="hidden shrink-0 flex-col gap-1 border-r border-slate-100/80 bg-gradient-to-b from-rose-50/30 via-white/60 to-sky-50/30 px-3 py-5 dark:border-slate-800/70 dark:from-rose-950/10 dark:via-slate-900/60 dark:to-sky-950/10 sm:flex sm:w-[208px]">
              <SectionNav
                activeId={activeSection}
                onSelect={setActiveSection}
                orientation="vertical"
              />
              <div className="mt-auto pt-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">
                With love · {APP_UPDATE.version}
              </div>
            </aside>

            {/* Main content column */}
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Mobile sticky nav */}
              <div className="sticky top-0 z-10 border-b border-slate-100/80 bg-white/90 px-3 py-2 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/85 sm:hidden">
                <SectionNav
                  activeId={activeSection}
                  onSelect={setActiveSection}
                  orientation="horizontal"
                />
              </div>

              {/* Scrollable section content */}
              <div
                key={activeSection}
                role="tabpanel"
                id={`settings-panel-${activeSection}`}
                aria-labelledby={`settings-tab-${activeSection}`}
                className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 animate-popIn sm:px-7 sm:py-7"
              >
                <SectionHeader meta={activeMeta} />
                {renderActiveSection()}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPanel;
