interface ZampaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ZampaLogo({ className = '', size = 'md' }: ZampaLogoProps) {
  const dimensions =
    size === 'sm'
      ? { box: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-lg' }
      : size === 'lg'
        ? { box: 'w-11 h-11', icon: 'w-6 h-6', text: 'text-2xl' }
        : { box: 'w-9 h-9', icon: 'w-5 h-5', text: 'text-xl' };

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span
        className={`${dimensions.box} rounded-xl bg-[#F97316] text-white inline-flex items-center justify-center shadow-sm shrink-0`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={dimensions.icon}
        >
          {/* Stylized symmetrical boutique paw print */}
          <ellipse cx="6.2" cy="8.8" rx="1.9" ry="2.5" transform="rotate(-14 6.2 8.8)" />
          <ellipse cx="10.2" cy="5.8" rx="1.8" ry="2.5" transform="rotate(-5 10.2 5.8)" />
          <ellipse cx="14.2" cy="5.8" rx="1.8" ry="2.5" transform="rotate(5 14.2 5.8)" />
          <ellipse cx="18.1" cy="8.8" rx="1.9" ry="2.5" transform="rotate(14 18.1 8.8)" />
          <path d="M12.1 10.6c-3.1 0-5.4 2.5-5.4 5.1 0 2.1 1.6 3.5 3.4 3.5.9 0 1.4-.4 2-.4s1.1.4 2 .4c1.8 0 3.4-1.4 3.4-3.5 0-2.6-2.3-5.1-5.4-5.1z" />
        </svg>
      </span>
      <span
        className={`font-display ${dimensions.text} font-bold tracking-tight text-[#1C1917] whitespace-nowrap`}
      >
        Zampa <span className="text-[#F97316]">Club</span>
      </span>
    </span>
  );
}
