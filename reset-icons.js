// Run this in the browser console to reset icon positions
const saved = JSON.parse(localStorage.getItem('desktopHome'));
if (saved && saved.shortcuts) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  saved.shortcuts.forEach((s, i) => {
    const cols = Math.floor(vw / 100);
    const col = i % cols;
    const row = Math.floor(i / cols);
    s.x = col * 100;
    s.y = row * 120;
    s.width = 48;
    s.height = 48;
  });
  
  localStorage.setItem('desktopHome', JSON.stringify(saved));
  location.reload();
}
