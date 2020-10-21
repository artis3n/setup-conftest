#!/usr/bin/env node
const io = require('@actions/io');
const core = require('@actions/core');
const { exec } = require('@actions/exec');

const OutputListener = require('./lib/output-listener');
const pathToCLI = require('./lib/conftest-bin');

async function checkConftest () {
  // Setting check to `true` will cause `which` to throw if conftest isn't found
  const check = true;
  return io.which(pathToCLI, check);
}

(async () => {
  // This will fail if Conftest isn't found, which is what we want
  await checkConftest();

  // Create listeners to receive output (in memory) as well
  const stdout = new OutputListener();
  const stderr = new OutputListener();
  const listeners = {
    stdout: stdout.listener,
    stderr: stderr.listener
  };

  // Execute conftest and capture output
  const args = process.argv.slice(2);
  const options = {
    listeners,
    ignoreReturnCode: true
  };
  const exitCode = await exec(pathToCLI, args, options);
  core.debug(`Conftest exited with code ${exitCode}.`);
  core.debug(`stdout: ${stdout.contents}`);
  core.debug(`stderr: ${stderr.contents}`);
  core.debug(`exitcode: ${exitCode}`);

  // Set outputs, result, exitcode, and stderr
  core.setOutput('stdout', stdout.contents);
  core.setOutput('stderr', stderr.contents);
  core.setOutput('exitcode', exitCode.toString(10));

  // A non-zero exitCode is likely fine, conftest just found policy violations
})();
