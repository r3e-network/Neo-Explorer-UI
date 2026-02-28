const fs = require('fs');
let code = fs.readFileSync('tests/components/HashLink.spec.js', 'utf8');

code = code.replace(/const \{ resolveAddressToNNS \} = vi\.hoisted\(\(\) => \(\{\n  resolveAddressToNNS: vi\.fn\(async \(\) => null\),\n\}\)\);/, `const { resolveAddressToNNS, getByHash } = vi.hoisted(() => ({
  resolveAddressToNNS: vi.fn(async () => null),
  getByHash: vi.fn(async () => null),
}));`);

code = code.replace(/vi\.mock\("@\/services\/nnsService", \(\) => \(\{\n  default: \{\n    resolveAddressToNNS,\n  \},\n\}\)\);/, `vi.mock("@/services/nnsService", () => ({
  default: {
    resolveAddressToNNS,
  },
}));\n\nvi.mock("@/services", () => ({
  contractService: {
    getByHash,
  }
}));`);

const extension = `
  it("dynamically resolves missing contract names and falls back to reverse-endian", async () => {
    // Return null for normal endian, return mock for reverse-endian
    getByHash.mockImplementationOnce(async (hash) => {
      if (hash === "0x11223344") return null;
      if (hash === "0x44332211") return { name: "ReverseEndianContract" };
      return null;
    });

    const wrapper = mountHashLink({
      hash: "0x11223344",
      type: "contract",
    });

    await flushPromises();
    expect(getByHash).toHaveBeenCalledTimes(2);
    expect(getByHash).toHaveBeenNthCalledWith(1, "0x11223344");
    expect(getByHash).toHaveBeenNthCalledWith(2, "0x44332211");
    expect(wrapper.text()).toContain("ReverseEndianContract");
  });
});`;

code = code.substring(0, code.lastIndexOf('});')) + extension;
fs.writeFileSync('tests/components/HashLink.spec.js', code);
