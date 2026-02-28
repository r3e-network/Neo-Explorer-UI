const fs = require('fs');

let code = fs.readFileSync('tests/views/HomeStats.spec.js', 'utf8');

code = code.replace(/it\("emits fetch-latest once per overdue latestBlockTimestamp", async \(\) => \{[\s\S]*?wrapper\.unmount\(\);\n  \}\);/, `it("emits fetch-latest continuously when overdue (HomePage handles throttling)", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const overdueTimestamp = Math.floor((Date.now() - 45_000) / 1000);
    const wrapper = mount(HomeStats, {
      props: {
        latestBlockTimestamp: overdueTimestamp,
      },
      global: {
        stubs: {
          "router-link": true,
        },
      },
    });

    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(1);

    vi.advanceTimersByTime(4_000);
    await vi.dynamicImportSettled();

    // Emits once on mount + 4 times from interval
    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(5);
    wrapper.unmount();
  });`);

fs.writeFileSync('tests/views/HomeStats.spec.js', code);
