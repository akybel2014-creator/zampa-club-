interface ZampaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ZampaLogo({ className = '', size = 'md' }: ZampaLogoProps) {
  const heightClass =
    size === 'sm'
      ? 'h-9 sm:h-10'
      : size === 'lg'
        ? 'h-14'
        : 'h-11 sm:h-12';

  return (
    <img
      src="/assets/aistudio/Logo_ZampaClub_con_Zampa_e_Cuorearpaa_67fcb191.png"
      alt="Zampa Club"
      decoding="async"
      className={`${heightClass} w-auto object-contain select-none shrink-0 ${className}`}
    />
  );
}
