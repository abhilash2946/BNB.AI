import React, { useState, useEffect, useRef } from 'react';
import { Camera, ImageIcon } from 'lucide-react';

export const SafeImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  const [error, setError] = useState(false);
  const fallbackUrl = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=60&w=800";

  return (
    <img
      src={error ? fallbackUrl : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export const EditableImage = ({
  src,
  onUpload,
  isEditMode,
  className = "",
  placeholder = <ImageIcon className="text-gray-300" />
}: {
  src?: string,
  onUpload: (file: File) => void,
  isEditMode: boolean,
  className?: string,
  placeholder?: React.ReactNode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative group/editable-img ${className} flex items-center justify-center overflow-hidden`}>
      {src ? (
        <SafeImage src={src} alt="Visual" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full bg-gray-50 flex items-center justify-center">
          {placeholder}
        </div>
      )}

      {isEditMode && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover/editable-img:opacity-100 flex flex-col items-center justify-center text-white transition-opacity pointer-events-auto cursor-pointer"
          >
            <Camera size={18} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Replace</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e: any) => e.target.files?.[0] && onUpload(e.target.files[0])}
            className="hidden"
            accept="image/*"
          />
        </>
      )}
    </div>
  );
};

interface EditableTextProps {
  value: string;
  onChange: (val: string) => void;
  isEditMode: boolean;
  className?: string;
  multiline?: boolean;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
}

export const EditableText = ({ value, onChange, isEditMode, className = "text-gray-900", multiline = false, tag = 'p' }: EditableTextProps) => {
  const Tag = tag as any;
  const [localValue, setLocalValue] = useState(value);
  const isInternalChange = useRef(false);

  // Sync local value when external value changes
  useEffect(() => {
    if (!isEditMode || !isInternalChange.current) {
      setLocalValue(value);
    }
    isInternalChange.current = false;
  }, [value, isEditMode]);

  // Commit changes when component unmounts or before switching slides
  useEffect(() => {
    return () => {
      if (isInternalChange.current && localValue !== value) {
        onChange(localValue);
      }
    };
  }, [localValue, value, onChange]);

  // Remove line-clamping and truncate when editing to allow full visibility
  const displayClassName = isEditMode
    ? className
        .replace(/\bline-clamp-\d+\b/g, '')
        .replace(/\btruncate\b/g, '')
        .replace(/\btext-[a-z0-9-]+(\/\d+)?\b/g, (match) => {
           const base = match.split('/')[0];
           return base;
        })
    : className;

  if (!isEditMode) return <Tag className={`${displayClassName} whitespace-pre-wrap`}>{value}</Tag>;

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    isInternalChange.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation();
      return;
    }

    if (e.key === 'Enter' && !multiline) {
      handleBlur();
      (e.target as any).blur();
    }
  };

  const isSmallText = className.includes('text-[7px]') || className.includes('text-[8px]') || className.includes('text-[9px]');
  const editStyles = isSmallText
    ? "p-0 px-0.5 border-none focus:ring-0 leading-tight"
    : "p-0.5 border border-blue-200 focus:ring-1 focus:ring-blue-400";

  const forceOpaqueStyle = isEditMode ? { color: '#1a1a1a', opacity: 1 } : {};

  if (multiline || className.includes('line-clamp')) {
    return (
      <textarea
        className={`${displayClassName} bg-blue-50/50 rounded outline-none w-full pointer-events-auto min-h-[100px] text-inherit resize-none ${editStyles}`}
        value={localValue}
        style={forceOpaqueStyle}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={4}
      />
    );
  }

  return (
    <input
      className={`${displayClassName} bg-blue-50/50 rounded outline-none w-full pointer-events-auto text-inherit ${editStyles}`}
      value={localValue}
      style={forceOpaqueStyle}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};
