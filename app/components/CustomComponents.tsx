import React from 'react';

// Custom Badge component
interface BadgeProps {
  variant?: 'positive' | 'negative' | 'info' | 'neutral' | 'purple' | 'magenta' | 'fuchsia' | 'yellow' | 'indigo' | 'seafoam';
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span className={`custom-badge custom-badge-${variant}`}>
      {children}
    </span>
  );
}

// Custom ProgressCircle component
interface ProgressCircleProps {
  'aria-label': string;
  isIndeterminate?: boolean;
}

export function ProgressCircle({ 'aria-label': ariaLabel, isIndeterminate }: ProgressCircleProps) {
  return (
    <div 
      className="custom-progress" 
      aria-label={ariaLabel}
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : 50}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}

// Custom View component (simple div wrapper)
interface ViewProps {
  children: React.ReactNode;
  width?: string;
  margin?: string;
  padding?: string;
  paddingStart?: string;
  isHidden?: boolean;
}

export function View({ children, width, margin, padding, paddingStart, isHidden, ...props }: ViewProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (margin) style.margin = margin;
  if (padding) style.padding = padding.replace('size-', '') + 'px';
  if (paddingStart) style.paddingLeft = paddingStart;
  if (isHidden) style.display = 'none';

  return (
    <div className="custom-view" style={style} {...props}>
      {children}
    </div>
  );
}

// Custom Flex component
interface FlexProps {
  children: React.ReactNode;
  gap?: string;
  direction?: 'row' | 'column';
  alignItems?: string;
  justifyContent?: string;
  wrap?: boolean;
}

export function Flex({ children, gap, direction = 'row', alignItems, justifyContent, wrap, ...props }: FlexProps) {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
  };
  if (gap) style.gap = gap.replace('size-', '') + 'px';
  if (alignItems) style.alignItems = alignItems;
  if (justifyContent) style.justifyContent = justifyContent;
  if (wrap) style.flexWrap = 'wrap';

  return (
    <div className="custom-flex" style={style} {...props}>
      {children}
    </div>
  );
}

// Custom Grid component
interface GridProps {
  children: React.ReactNode;
  columns?: string[];
  gap?: string;
  justifyItems?: string;
  width?: string;
}

export function Grid({ children, columns, gap, justifyItems, width, ...props }: GridProps) {
  const style: React.CSSProperties = {
    display: 'grid',
  };
  if (columns) style.gridTemplateColumns = columns.join(' ');
  if (gap) style.gap = gap.replace('size-', '') + 'px';
  if (justifyItems) style.justifyItems = justifyItems;
  if (width) style.width = width;

  return (
    <div className="custom-grid" style={style} {...props}>
      {children}
    </div>
  );
}

// Custom Divider component
export function Divider() {
  return <hr className="custom-divider" />;
}

// Custom Well component
interface WellProps {
  children: React.ReactNode;
}

export function Well({ children }: WellProps) {
  return (
    <div className="custom-well">
      {children}
    </div>
  );
}

// Custom FileTrigger component
interface FileTriggerProps {
  children: React.ReactNode;
  onSelect: (files: FileList | null) => void;
  acceptedFileTypes?: string[];
}

export function FileTrigger({ children, onSelect, acceptedFileTypes }: FileTriggerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(e.target.files);
  };

  return (
    <div className="custom-file-trigger">
      <input
        type="file"
        onChange={handleChange}
        accept={acceptedFileTypes?.join(',')}
      />
      {children}
    </div>
  );
}

// Custom Text component
interface TextProps {
  children: React.ReactNode;
  level?: number;
}

export function Text({ children, ...props }: TextProps) {
  return <span {...props}>{children}</span>;
}

// Custom Content component for ContextualHelp
interface ContentProps {
  children: React.ReactNode;
}

export function Content({ children }: ContentProps) {
  return <div>{children}</div>;
}