/**
 * Podium mark: three ascending bars in the three brand blues, paired with a
 * monochrome wordmark. The tallest bar sits centre, reading as a first place.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11.5" width="4.7" height="9.5" rx="1.4" fill="var(--blue-500)" />
      <rect x="9.65" y="5.5" width="4.7" height="15.5" rx="1.4" fill="var(--blue-900)" />
      <rect x="16.3" y="14" width="4.7" height="7" rx="1.4" fill="var(--blue-300)" />
    </svg>
  );
}

export function LogoMarkOnInk({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11.5" width="4.7" height="9.5" rx="1.4" fill="var(--blue-400)" />
      <rect x="9.65" y="5.5" width="4.7" height="15.5" rx="1.4" fill="#FFFFFF" />
      <rect x="16.3" y="14" width="4.7" height="7" rx="1.4" fill="var(--blue-700)" />
    </svg>
  );
}
