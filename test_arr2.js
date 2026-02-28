const fillMockData = (raw) => {
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length === 0) return Array.from({ length: 14 }, (_, i) => ({ value: 0 }));
      if (arr.length < 14) {
         return [...Array.from({ length: 14 - arr.length }, (_, i) => ({ value: 0 })), ...arr];
      }
      return arr.slice(-14);
};

const x = fillMockData([]);
console.log(x);

const y = x.map((d) => d.value ?? d.NewAddresses ?? 0);
console.log(y);
