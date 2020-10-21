const core = require('@actions/core');

const setup = require('./lib/setup-conftest');

(async () => {
  try {
    await setup();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
