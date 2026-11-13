export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    bat: <><path d="m5 19 6-6m-7 5 2 2m4-8 6-8a2.1 2.1 0 0 1 3 3l-8 6Z"/><path d="m17 15 3 1m-6 1 1 3"/></>,
    bomb: <><circle cx="11" cy="14" r="7"/><path d="m15 8 2-3 3 1m0-4v2m-3-2 1 2m3 3h2"/></>,
    laser: <><path d="M11 12h11M4 12H1m6-5L4 4m4 13-3 3m6-15V1m0 22v-4m5-12 3-3"/><circle cx="11" cy="12" r="3"/></>,
    meteor: <><path d="m5 3 8 8m-3-9 7 7M2 9l6 6"/><path d="m17 10 4 3 1 5-4 4-5-1-4-4 2-5Z"/><path d="m14 15 2-1 3 3-2 2-3-1Z"/></>,
    missile: <><path d="M14 4c3-2 6-2 6-2s0 3-2 6l-7 7-4-4Z"/><path d="m9 9-4 1-2 3 4 1m6-1-1 4-3 2-1-4M6 18l-3 3m5-1-2 2m-1-6-2 2"/><circle cx="15" cy="8" r="1.3"/></>,
    sonic: <><path d="M4 10v4m4-8v12m4-16v20m4-16v12m4-8v4"/></>,
    home: <><path d="m3 11 9-7 9 7v9H3Z"/><path d="M10 20v-5h4v5"/></>,
    zoomIn: <><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6m4 7 3 3"/></>,
    zoomOut: <><circle cx="11" cy="11" r="7"/><path d="M8 11h6m4 7 3 3"/></>,
    rotateLeft: <><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></>,
    rotateRight: <><path d="M20 12a8 8 0 1 1-3-6.2M20 4v4h-4"/></>,
    fit: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8Z"/></>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>,
    restore: <><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/><path d="M16 3h5v5"/></>,
    sound: <><path d="m11 4-5 4H2v8h4l5 4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
    mute: <><path d="m11 4-5 4H2v8h4l5 4Zm5 5 6 6m0-6-6 6"/></>,
    wall: <><path d="M3 3h18v18H3Zm0 6h18M3 15h18M9 3v6m6 0v6m-6 0v6"/></>,
    ceiling: <><path d="m2 10 10-7 10 7-10 7Zm3 5 7 5 7-5"/></>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v14H3Z"/><circle cx="12" cy="13" r="4"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1"/></>,
    close: <path d="m5 5 14 14M5 19 19 5"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.help}</svg>;
}
