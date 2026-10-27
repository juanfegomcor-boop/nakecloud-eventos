const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Arrow = ({ size = 18 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Back = ({ size = 18 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
);
export const Check = ({ size = 24, color = 'currentColor', draw = false }) => (
  <svg {...base} stroke={color} width={size} height={size} viewBox="0 0 24 24" strokeWidth="3"><path className={draw ? 'draw' : undefined} d="M5 12l5 5 9-10" /></svg>
);
export const Cross = ({ size = 20, color = 'currentColor' }) => (
  <svg {...base} stroke={color} width={size} height={size} viewBox="0 0 24 24" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Bang = ({ size = 20, color = 'currentColor' }) => (
  <svg {...base} stroke={color} width={size} height={size} viewBox="0 0 24 24" strokeWidth="3"><path d="M12 6v8M12 18.5v.01" /></svg>
);
export const Lock = ({ size = 14 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const Sun = ({ size = 16 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const Spinner = ({ size = 20 }) => (
  <svg className="spin" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
