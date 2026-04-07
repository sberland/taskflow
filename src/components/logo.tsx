export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logoBg)" />
      <rect x="8" y="9" width="16" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="8" y="9" width="16" height="18" rx="2" fill="none" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <rect x="13" y="7" width="6" height="4" rx="1.5" fill="white" opacity="0.8" />
      <rect x="11" y="14" width="3.5" height="3.5" rx="1" fill="white" opacity="0.3" />
      <path d="M11.7 15.7 L12.8 16.8 L14.5 14.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="16.5" y="15.2" width="5.5" height="1.5" rx="0.75" fill="white" opacity="0.7" />
      <rect x="11" y="19" width="3.5" height="3.5" rx="1" fill="white" opacity="0.3" />
      <path d="M11.7 20.7 L12.8 21.8 L14.5 19.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="16.5" y="20.2" width="4" height="1.5" rx="0.75" fill="white" opacity="0.5" />
    </svg>
  );
}
