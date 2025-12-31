# Contributing to HawkOps

Thank you for your interest in contributing to HawkOps! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/HawkOps.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add your descriptive commit message"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

Follow the instructions in the [README.md](README.md) to set up your development environment.

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Use enums or const objects for constants

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript for prop types

### Naming Conventions

- **Files**: PascalCase for components (`GameBoard.tsx`), camelCase for utilities (`formatTime.ts`)
- **Components**: PascalCase (`GameLobby`, `TeamDashboard`)
- **Functions/Variables**: camelCase (`handleSubmit`, `gameState`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TEAMS`, `GAME_DURATION`)
- **Interfaces/Types**: PascalCase with descriptive names (`GameState`, `PlayerAction`)

### Code Organization

- Keep files under 300 lines when possible
- Group related functionality
- Use barrel exports (`index.ts`) for cleaner imports
- Separate concerns (business logic vs. UI)

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add team chat functionality
fix: resolve socket connection issue on page reload
docs: update installation instructions
```

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Include both unit and integration tests where appropriate

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=packages/backend
npm run test --workspace=packages/frontend
```

## Pull Request Process

1. **Update Documentation**: If your changes affect user-facing functionality, update the README and relevant docs
2. **Add Tests**: Include tests for new features or bug fixes
3. **Check Linting**: Run `npm run lint` and fix any issues
4. **Build Successfully**: Ensure `npm run build` completes without errors
5. **Write Clear Description**: Explain what your PR does and why
6. **Link Issues**: Reference any related issues (e.g., "Fixes #123")
7. **Request Review**: Tag maintainers for review

## Code Review Guidelines

When reviewing PRs:
- Be constructive and respectful
- Focus on code quality, not personal preferences
- Test the changes locally
- Check for security issues
- Verify documentation is updated

## Project Structure

Understanding the project structure helps maintain consistency:

```
packages/
├── frontend/       # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page-level components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API/Socket services
│   │   ├── store/       # State management
│   │   └── utils/       # Utility functions
│
├── backend/        # Node.js server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── controllers/ # Request handlers
│   │   ├── services/    # Business logic
│   │   ├── models/      # Database models
│   │   ├── socket/      # WebSocket handlers
│   │   └── middleware/  # Express middleware
│
└── shared/         # Shared code
    └── src/
        ├── types.ts     # Shared TypeScript types
        └── constants.ts # Shared constants
```

## Feature Development Workflow

1. **Plan**: Discuss major features in an issue first
2. **Branch**: Create a feature branch from `main`
3. **Develop**: Write code following our guidelines
4. **Test**: Add and run tests
5. **Document**: Update relevant documentation
6. **Review**: Submit PR and address feedback
7. **Merge**: Maintainer merges after approval

## Reporting Bugs

When reporting bugs, include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots/logs if applicable

## Feature Requests

For feature requests:
- Check if it already exists in issues
- Clearly describe the feature and its benefits
- Explain the use case
- Consider implementation complexity

## Questions?

- Open an issue for general questions
- Check existing documentation first
- Reach out to maintainers if needed

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

Thank you for contributing to HawkOps! 🚀
