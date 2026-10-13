// Command Center's Overview desktop icons, carried over when CC
// (~/bodhium/.claude/bin/command-center-server.py, :7420) was retired.
// Applied once per id by seed-merge.js: an icon you delete stays deleted.
//
// Ids are stable: never rename one, or the icon comes back as a duplicate.
// Public sites keep icon: null and use the favicon service. Localhost services
// get a small SVG, because the favicon service cannot see localhost.
(function (root) {
  'use strict';

  const FOLDER_BODHIUM = 'cc:folder:bodhium';
  const FOLDER_LOCAL = 'cc:folder:caliper-local';

  // CC's DESK_STATIC (workspace links).
  const WORKSPACE = [
    { id: 'cc:linear', name: 'Linear', url: 'https://linear.app/bodhiumlabs' },
    { id: 'cc:gmail', name: 'Gmail', url: 'https://mail.google.com' },
    { id: 'cc:gdrive', name: 'Google Drive', url: 'https://drive.google.com' },
    { id: 'cc:youtube', name: 'YouTube', url: 'https://www.youtube.com' },
    { id: 'cc:chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' },
    { id: 'cc:claude', name: 'Claude', url: 'https://claude.ai' },
    { id: 'cc:x', name: 'X', url: 'https://x.com' },
    { id: 'cc:prod', name: 'Caliper (prod)', url: 'https://apps.findbliss.ai/' },
  ];

  // CC's SERVICE_GROUPS entries that have a url, named by deskRender's rule
  // ('API + Swagger' becomes 'Caliper API' / 'ai-traffic API'), glyphs from
  // DESK_GLYPH. Plus the two apps that replace parts of CC.
  //
  // Sibling micro-apps bind 127.0.0.1 only (never 0.0.0.0), so the link must
  // use that literal host -- `localhost` resolves to ::1 first on this Mac.
  // oc also rejects any other Host header.
  const SERVICES = [
    { port: 3001, name: 'Dashboard UI', url: 'http://localhost:3001', glyph: '🖥️', bg: '#1d4ed8' },
    { port: 8000, name: 'Caliper API', url: 'http://localhost:8000/docs', glyph: '⚡', bg: '#0f766e' },
    { port: 5555, name: 'Flower (Celery)', url: 'http://localhost:5555', glyph: '🌸', bg: '#15803d' },
    { port: 8025, name: 'Mailpit', url: 'http://localhost:8025', glyph: '📬', bg: '#0e7490' },
    { port: 9001, name: 'MinIO console', url: 'http://localhost:9001', glyph: '🪣', bg: '#b91c1c' },
    { port: 8001, name: 'ai-traffic API', url: 'http://localhost:8001/docs', glyph: '🚦', bg: '#7c3aed' },
    { port: 7422, name: 'Model lab', url: 'http://127.0.0.1:7422/', glyph: '🧪', bg: '#9333ea' },
    { port: 7430, name: 'MCP persona sim', url: 'http://127.0.0.1:7430/', glyph: '🎭', bg: '#be185d' },
    { port: 8795, name: 'Polly2', url: 'http://localhost:8795', glyph: '🦜', bg: '#047857' },
    { port: 7440, name: 'oc', url: 'http://127.0.0.1:7440/', glyph: '💬', bg: '#334155' },
    { port: 7424, name: 'prod-sql', url: 'http://127.0.0.1:7424/', glyph: '🗄️', bg: '#a16207' },
    { port: 4000, name: 'Tool launcher', url: 'http://localhost:4000', glyph: '🧰', bg: '#c2410c' },
  ];

  // A rounded tile with the CC glyph on it, as a base64 data URL (the app's
  // dataUrlToBlob only decodes base64).
  function glyphIcon(glyph, bg) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="14" fill="' + bg + '"/>' +
      '<text x="32" y="34" font-size="36" text-anchor="middle" dominant-baseline="central">' +
      glyph + '</text></svg>';
    const bytes = new TextEncoder().encode(svg);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:image/svg+xml;base64,' + btoa(binary);
  }

  function item(id, name, url, parentId, iconDataUrl) {
    return { id, name, url, parentId, isFolder: false, iconDataUrl: iconDataUrl || null };
  }

  const shortcuts = [
    { id: FOLDER_BODHIUM, name: 'Bodhium', url: '#', parentId: null, isFolder: true, iconDataUrl: null },
    { id: FOLDER_LOCAL, name: 'Caliper local', url: '#', parentId: null, isFolder: true, iconDataUrl: null },
  ]
    .concat(WORKSPACE.map(w => item(w.id, w.name, w.url, FOLDER_BODHIUM)))
    .concat(SERVICES.map(s => item('cc:svc:' + s.port, s.name, s.url, FOLDER_LOCAL, glyphIcon(s.glyph, s.bg))));

  const seed = { name: 'command-center', shortcuts };

  root.COMMAND_CENTER_SEED = seed;
  if (typeof module !== 'undefined' && module.exports) module.exports = seed;
})(typeof window !== 'undefined' ? window : globalThis);
