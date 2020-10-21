// Node.js core
const os = require('os');
const path = require('path');

// External
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const axios = require('axios');
const semver = require('semver');

// Find latest version given list of all available
function findLatest (allVersions) {
  core.debug('Parsing version list for latest version');

  let latest = '0.0.0';

  allVersions.forEach(version => {
    // Ignore pre-release
    if (semver.prerelease(version) === null) {
      // is "version" greater than "latest"
      latest = semver.gt(version, latest) ? version : latest;
    }
  });

  core.info(`Latest version is ${latest}`);

  return latest;
}

// Find specific version given list of all available
function findSpecific (allVersions, version) {
  core.debug(`Parsing version list for version ${version}`);
  // Tag is either semver version or is semver version prepended with 'v'
  return allVersions.find(elem => elem === version || elem.substring(1) === version);
}

// Find specific version given list of all available
function findLatestMatchingSpecification (allVersions, version) {
  core.debug(`Parsing version list for latest matching specification ${version}`);
  const versionList = [];
  for (const _version in allVersions) {
    versionList.push(_version);
  }
  const bestMatchVersion = semver.maxSatisfying(versionList, version);
  if (!bestMatchVersion) {
    throw new Error(`Could not find Conftest version matching ${version} in version list`);
  }
  core.info(`Latest version satisfying ${version} is ${bestMatchVersion}`);

  return bestMatchVersion;
}

async function downloadMetadata () {
  core.debug('Downloading version metadata');

  return axios.get('https://api.github.com/repos/open-policy-agent/conftest/releases', {
    headers: { Accept: 'application/vnd.github.v3+json' }
  })
    .then(response => response.data.map(versionData => versionData.tag_name))
    .catch(err => core.setFailed(`Failed to get Conftest releases: ${err}`));
}

async function downloadCLI (url) {
  core.debug(`Downloading Conftest from ${url}`);
  const pathToCLITar = await tc.downloadTool(url);

  core.debug('Extracting Conftest zip file');
  const pathToCLI = await tc.extractTar(pathToCLITar);
  core.debug(`Conftest path is ${pathToCLI}.`);

  if (!pathToCLITar || !pathToCLI) {
    throw new Error(`Unable to download Conftest from ${url}`);
  }

  return pathToCLI;
}

// // arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// // return value in [amd64, 386, arm]
// function mapArch (arch) {
//   const mappings = {
//     x32: '386',
//     x64: 'amd64'
//   };
//   return mappings[arch] || arch;
// }
//
// // os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// // return value in [darwin, linux, windows]
// function mapOS (os) {
//   const mappings = {
//     win32: 'windows'
//   };
//   return mappings[os] || os;
// }

async function installWrapper (pathToCLI) {
  let source, target;

  // If we're on Windows, then the executable ends with .exe
  const exeSuffix = os.platform().startsWith('win') ? '.exe' : '';

  // Rename conftest(.exe) to conftest-bin(.exe)
  try {
    source = [pathToCLI, `conftest${exeSuffix}`].join(path.sep);
    target = [pathToCLI, `conftest-bin${exeSuffix}`].join(path.sep);
    core.debug(`Moving ${source} to ${target}.`);
    await io.mv(source, target);
  } catch (e) {
    core.error(`Unable to move ${source} to ${target}.`);
    throw e;
  }

  // Install our wrapper as conftest
  try {
    source = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));
    target = [pathToCLI, 'conftest'].join(path.sep);
    core.debug(`Copying ${source} to ${target}.`);
    await io.cp(source, target);
  } catch (e) {
    core.error(`Unable to copy ${source} to ${target}.`);
    throw e;
  }

  // Export a new environment variable, so our wrapper can locate the binary
  core.exportVariable('CONFTEST_CLI_PATH', pathToCLI);
}

async function run () {
  try {
    // Gather GitHub Actions inputs
    const version = core.getInput('conftest_version');
    const wrapper = core.getInput('conftest_wrapper') === 'true';

    // Gather OS details
    // const osPlat = os.platform();
    // const osArch = os.arch();

    // Download metadata about all versions of Terraform CLI
    const versionMetadata = await downloadMetadata();

    const specificMatch = findSpecific(versionMetadata, version);
    // Find latest or a specific version like 0.1.0
    const versionString = version.toLowerCase() === 'latest'
      ? findLatest(versionMetadata) : specificMatch || findLatestMatchingSpecification(versionMetadata, version);

    if (versionString) {
      // Download requested version
      const pathToCLI = await downloadCLI(`https://github.com/open-policy-agent/conftest/releases/download/${versionString}/conftest_${versionString.substr(1)}_Linux_x86_64.tar.gz`);

      // Install our wrapper
      if (wrapper) {
        await installWrapper(pathToCLI);
      }

      // Add to path
      core.addPath(pathToCLI);

      return versionString;
    } else {
      core.setFailed(`Could not find Conftest version ${version} in version list`);
    }
  } catch (error) {
    core.error(error);
    throw error;
  }
}

module.exports = run;
