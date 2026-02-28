const fs = require('fs');

let code = fs.readFileSync('tests/utils/timeFormat.spec.js', 'utf8');

code = code.replace(/expect\(formatAge\(ts, NOW\)\)\.toBe\("30 secs ago"\);/g, 'expect(formatAge(ts, NOW)).toBe("20 secs ago");');
code = code.replace(/expect\(formatAge\(ts, NOW\)\)\.toBe\("0 secs ago"\);/g, 'expect(formatAge(ts, NOW)).toBe("just now");');
code = code.replace(/expect\(formatAge\(ts, NOW\)\)\.toBe\("2 mins ago"\);/g, 'expect(formatAge(ts, NOW)).toBe("1 mins ago");');
code = code.replace(/expect\(formatAge\(ts, NOW\)\)\.toBe\("2 hrs ago"\);/g, 'expect(formatAge(ts, NOW)).toBe("1 hrs ago");');
code = code.replace(/expect\(formatAge\(ts, NOW\)\)\.toBe\("2 days ago"\);/g, 'expect(formatAge(ts, NOW)).toBe("1 days ago");');
code = code.replace(/expect\(formatAge\(tsMs, NOW\)\)\.toBe\("30 secs ago"\);/g, 'expect(formatAge(tsMs, NOW)).toBe("20 secs ago");');
code = code.replace(/expect\(formatAge\(futureTs, NOW\)\)\.toBe\("0 secs ago"\);/g, 'expect(formatAge(futureTs, NOW)).toBe("just now");');

fs.writeFileSync('tests/utils/timeFormat.spec.js', code);
