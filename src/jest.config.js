module.exports = {
  testTimeout: 50000,
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleDirectories: ["node_modules", "src"],
  coverageDirectory: "./coverage",
  reporters: ["default"],
  testPathIgnorePatterns: ["/node_modules/", ".pact.spec.ts", "/tests/"],
};
