const fs = require('fs');

let testCode = fs.readFileSync('tests/utils/gasFormat.spec.js', 'utf8');
testCode = testCode.replace(/it\("formats a decimal GAS value \(no division\)", \(\) => \{[\s\S]*?\}\);/, `it("formats a raw GAS value and divides by GAS_DIVISOR", () => {
    // 9.977 is extremely small raw amount (9 units out of 10^8), so it formats to 0.0000
    expect(formatGasDecimal(100000000)).toBe("1.0000");
    expect(formatGasDecimal("150000000")).toBe("1.5000");
  });`);

testCode = testCode.replace(/expect\(formatGasDecimal\(9\.977, 2\)\)\.toBe\("9\.98"\);/, 'expect(formatGasDecimal(150000000, 2)).toBe("1.50");');

fs.writeFileSync('tests/utils/gasFormat.spec.js', testCode);
