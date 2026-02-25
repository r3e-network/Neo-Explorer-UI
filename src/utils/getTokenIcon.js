const localImages = import.meta.glob('@/assets/gui/*.png', { eager: true, import: 'default' });

export function getTokenIcon(hash, type = 'NEP17') {
  if (!hash) return localImages[`/src/assets/gui/default${type === 'NEP11' ? 'Nep11' : 'Nep17'}.png`] || "";
  const normalizedHash = String(hash).trim().toLowerCase();
  const path = `/src/assets/gui/${normalizedHash.startsWith('0x') ? normalizedHash : '0x' + normalizedHash}.png`;
  const fallbackPath = type === 'NEP11' ? "/src/assets/gui/defaultNep11.png" : "/src/assets/gui/defaultNep17.png";
  
  if (localImages[path]) {
    return localImages[path];
  }
  return localImages[fallbackPath] || "";
}

export function hasTokenIcon(hash) {
  if (!hash) return false;
  const normalizedHash = String(hash).trim().toLowerCase();
  const path = `/src/assets/gui/${normalizedHash.startsWith('0x') ? normalizedHash : '0x' + normalizedHash}.png`;
  return !!localImages[path];
}
