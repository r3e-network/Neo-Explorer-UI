const raw = [{NewAddresses: 1}];
const fillMockData = (raw) => {
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length === 0) return Array.from({ length: 14 }, () => ({ value: 0 }));
  if (arr.length < 14) {
      return [...Array.from({ length: 14 - arr.length }, () => ({ value: 0 })), ...arr];
  }
  return arr.slice(-14);
};

console.log(fillMockData(raw));
