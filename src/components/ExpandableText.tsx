'use client';

import { useState, useRef, useEffect } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  incrementalLines?: number; // New prop for step-by-step expansion
  className?: string;
  isHtml?: boolean;
  showReadMore?: boolean;
  scrollOnCollapse?: boolean;
  onCollapse?: () => void;
}

export default function ExpandableText({ 
  text, 
  maxLines = 20, 
  incrementalLines = 0, // 0 means expand all at once
  className = "",
  isHtml = false,
  showReadMore = false,
  scrollOnCollapse = false,
  onCollapse
}: ExpandableTextProps) {
  const [currentMaxLines, setCurrentMaxLines] = useState(maxLines);
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const [shouldScroll, setShouldScroll] = useState(false);

  // Sync state with props when they change (crucial for navigation and dynamic prop updates)
  useEffect(() => {
    setCurrentMaxLines(maxLines);
    setIsFullyExpanded(false);
  }, [maxLines, text]);

  // Handle scroll after collapse
  useEffect(() => {
    if (shouldScroll && containerRef.current && !isFullyExpanded) {
        // We use a small timeout to allow the browser to complete the height transition before finalizing the scroll position
        const timer = setTimeout(() => {
            const element = containerRef.current;
            if (element) {
                const headerOffset = 135; 
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
            setShouldScroll(false);
        }, 350); // Match transition duration (300ms) + small buffer
        return () => clearTimeout(timer);
    }
  }, [shouldScroll, isFullyExpanded]);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkOverflow = () => {
      // Use a small 2px buffer to account for rounding errors in different browsers/zooms
      const isOverflowing = element.scrollHeight > (element.clientHeight + 2);
      // Fallback: If text is long but overflow check fails (common on some mobile engines)
      const isLongText = text.length > (currentMaxLines * 40); 
      setShowButton(isOverflowing || isLongText);
    };

    // Immediate check
    checkOverflow();

    // Secondary check after layout/fonts
    const timeout = setTimeout(checkOverflow, 100);
    const longerTimeout = setTimeout(checkOverflow, 500);

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);
    
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(longerTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text, currentMaxLines, isFullyExpanded]);

  const handleToggle = () => {
    if (isFullyExpanded) {
      // Revert to initial
      setCurrentMaxLines(maxLines);
      setIsFullyExpanded(false);
      onCollapse?.();
      if (scrollOnCollapse) setShouldScroll(true);
    } else {
      if (incrementalLines > 0) {
        // Expand by increment
        setCurrentMaxLines(prev => prev + incrementalLines);
        // We check if it's still overflowing in the useEffect
      } else {
        // Expand all
        setIsFullyExpanded(true);
      }
    }
  };

  // We detect if we should treat it as fully expanded if showButton becomes false after an increment
  useEffect(() => {
    if (incrementalLines > 0 && !showButton && currentMaxLines > maxLines) {
      setIsFullyExpanded(true);
      setShowButton(false);
    }
  }, [showButton, currentMaxLines, maxLines, incrementalLines]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div 
        ref={textRef}
        className="transition-all duration-300"
        style={{ 
          display: !isFullyExpanded ? '-webkit-box' : 'block',
          WebkitLineClamp: !isFullyExpanded ? currentMaxLines : 'unset',
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {isHtml ? (
          <div className="overflow-hidden break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }} />
        ) : (
          <div className="whitespace-pre-wrap break-words">{text}</div>
        )}
      </div>

      {showReadMore && (showButton || isFullyExpanded) && (
        <button
          onClick={handleToggle}
          type="button"
          style={{ 
            opacity: 1, 
            visibility: 'visible', 
            display: 'flex', 
            zIndex: 999, 
            minHeight: '48px',
            backgroundColor: '#4F46E5',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
          className="mt-2 text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all items-center gap-1 relative"
        >
          {isFullyExpanded ? (
            <>
              Show Less
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
            </>
          ) : (
            <>
              Read More
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
