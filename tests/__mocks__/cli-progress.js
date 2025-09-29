// Mock cli-progress module
const cliProgress = {
  SingleBar: class {
    constructor(options, preset) {
      this.options = options;
      this.preset = preset;
      this.value = 0;
      this.total = 100;
    }
    
    start(total, startValue) {
      this.total = total;
      this.value = startValue || 0;
    }
    
    update(current, payload) {
      this.value = current;
    }
    
    setTotal(total) {
      this.total = total;
    }
    
    stop() {
      this.value = this.total;
    }
    
    render() {
      // Mock render
    }
  },
  Presets: {
    rect: 'rect'
  }
};

module.exports = cliProgress;
