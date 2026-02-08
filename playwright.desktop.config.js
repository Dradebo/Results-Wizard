const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/desktop",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
});
