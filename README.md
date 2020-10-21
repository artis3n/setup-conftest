# setup-conftest

The `artis3n/setup-conftest` action is a JavaScript action that sets up [Conftest](https://conftest.dev) in your GitHub Actions workflow by:
- Downloading a specific version of Conftest and adding it to the `PATH`
- Installing a wrapper script to wrap subsequent calls of the `conftest` binary and expose its STDOUT, STDERR, and exit code as outputs named `stdout`, `stderr`, and `exitcode` respectively (This can be optionally skipped if subsequent steps in the same job do not need to access the results of Conftest commands)

After you've used the action, subsequent steps in the same job can run arbitrary Conftest commands using [the GitHub Actions `run` syntax](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsrun).
This allows most Conftest commands to work exactly like they do on your local command line.

This action was inspired by and is derived from Hashicorp's [`setup-terraform`](https://github.com/hashicorp/setup-terraform) GitHub Action.

# Usage

This action can be run on `ubuntu-latest` GitHub Action runners.
Future plans will add support for `windows-latest` and `macos-latest` runners as well.
When running on `windows-latest`, the shell should be set to Bash.

The default configuration installs the latest version of Conftest and installs the wrapper script to wrap subsequent calls to the `conftest` binary.

```yaml
steps:
  - uses: artis3n/setup-conftest@v1
```

A specific version of Conftest can be installed:

```yaml
steps:
  - uses: artis3n/setup-conftest@v1
    with:
      conftest_version: 0.21.0
```

The wrapper script installation can be skipped:

```yaml
steps:
  - uses: artis3n/setup-conftest@v1
    with:
      conftest_wrapper: false
```

Subsequent steps can access outputs when the wrapper script is installed:

```yaml
steps:
  - uses: artis3n/setup-conftest@v1

  - id: verify
    run: conftest verify ./

  - run: echo ${{ steps.verify.outputs.stdout }}
  - run: echo ${{ steps.verify.outputs.stderr }}
  - run: echo ${{ steps.verify.outputs.exitcode }}
```

# Inputs

The action supports the following inputs:

#### `conftest_version`

(Optional)

The version of Conftest to install.
Must be a valid semver string matching [Conftest's Releases](https://github.com/open-policy-agent/conftest/releases).
The special value of `latest` installs the latest version of Conftest.
Defaults to `latest`.

#### `conftest_wrapper`

(Optional)

Whether to install a wrapper to wrap subsequent calls of the `conftest` binary and expose its STDOUT, STDERR, and exit code as outputs named `stdout`, `stderr`, and `exitcode`, respectively.
Defaults to `true`.

# Outputs

This action does not configure any outputs directly.
However, when you set the `conftest_wrapper` input to `true`, the following outputs are available for subsequent steps that call the `conftest` binary.

#### `stdout`

The STDOUT stream of the call to the `conftest` binary.

#### `stderr`

The STDERR stream of the call to the `conftest` binary.

#### `exitcode`

The exit code of the call to the `conftest` binary.
