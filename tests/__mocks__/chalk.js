// Mock chalk module with proper chaining support
const mockFunction = (text) => text || '';

// Create a proxy that returns itself for any property access
const createChalkMock = () => {
  const mock = function(text) {
    return text || '';
  };
  
  return new Proxy(mock, {
    get(target, prop) {
      if (prop === 'default') return createChalkMock();
      if (typeof prop === 'string') {
        return createChalkMock();
      }
      return target[prop];
    }
  });
};

const chalk = createChalkMock();
chalk.default = chalk;

module.exports = chalk;
