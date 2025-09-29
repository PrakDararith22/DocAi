// Mock ora module
const ora = (text) => ({
  start: () => ({
    stop: () => {},
    succeed: () => {},
    fail: () => {},
    warn: () => {},
    info: () => {},
    text: text
  }),
  stop: () => {},
  succeed: () => {},
  fail: () => {},
  warn: () => {},
  info: () => {},
  text: text
});

ora.default = ora;

module.exports = ora;
