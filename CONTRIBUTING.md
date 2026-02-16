# Contributing to Berta AI Scribe

Thank you for your interest in contributing to Berta AI Scribe. This document provides guidelines for contributing to the project.

## Reporting Issues

If you encounter a bug or have a feature request, please open an issue on [GitHub Issues](https://github.com/phairlab/berta-ai-scribe/issues). Include:

- A clear description of the problem or suggestion
- Steps to reproduce (for bugs)
- Expected vs actual behaviour
- Your environment (OS, Python version, Node version, browser)

## Getting Started

1. Fork the repository
2. Clone your fork and create a new branch from `main`
3. Set up the development environment following the [README](README.md)

## Making Changes

- Keep changes focused — one fix or feature per pull request
- Follow existing code style and conventions
- Add tests for new functionality when possible
- Make sure all existing tests pass before submitting:
  ```bash
  cd web-api && python -m pytest tests/ -v
  cd ai-scribe-app && npx vitest run
  ```

## Submitting a Pull Request

1. Push your branch to your fork
2. Open a pull request against `main`
3. Describe what the PR does and link any related issues
4. Wait for CI checks to pass and a maintainer to review

## Code of Conduct

Be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive environment for everyone.

## Questions

For general questions about the project, open a [GitHub Discussion](https://github.com/phairlab/berta-ai-scribe/discussions) or contact the maintainers at svaid@ualberta.ca.
