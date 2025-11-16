# Task Completion Checklist

When completing a task, follow these steps to ensure code quality and consistency:

## Before Committing

### 1. Build and Test
```bash
# Run build and test with coverage for all packages
npm run bt

# Or for individual packages:
cd backend && npm run bt
cd frontend && npm run bt
cd mother-theme && npm run bt
```

### 2. Type Checking
```bash
# Check TypeScript compilation
cd backend && npm run type-check
cd frontend && npm run type-check
cd mother-theme && npm run type-check
```

### 3. Linting (if configured)
- Run ESLint to check for code style issues
- Fix any linting errors before committing

### 4. Test Coverage
- Ensure new code has test coverage
- Check that coverage hasn't decreased significantly
- Aim for high coverage on critical paths

### 5. Code Review Checklist
- [ ] Code follows project conventions (see `code_style.md`)
- [ ] TypeScript types are correct (no `any` unless necessary)
- [ ] Error handling is appropriate
- [ ] Database queries use parameterized queries
- [ ] Frontend components use theme.css classes
- [ ] Tests are written and passing
- [ ] No console.log statements left in code
- [ ] No commented-out code
- [ ] Imports are organized correctly

## Database Changes

If you modified the database schema:

1. **Create Migration**
   ```bash
   cd backend
   npm run migrate:make <migration_name>
   ```

2. **Test Migration**
   ```bash
   npm run migrate        # Apply
   npm run migrate:rollback  # Rollback
   npm run migrate        # Apply again
   ```

3. **Update TypeScript Types**
   - Update database model types if needed
   - Update service types if schema changed

## Frontend Changes

If you modified frontend components:

1. **Check Styling**
   - Use CSS classes from `theme.css`
   - Follow mobile-first responsive design
   - Test on different screen sizes

2. **Test Components**
   ```bash
   cd frontend
   npm run test:watch
   ```

3. **Visual Testing** (if applicable)
   ```bash
   npm run test:visual
   ```

## Backend Changes

If you modified backend code:

1. **Test API Endpoints**
   - Use integration tests
   - Test error cases
   - Test authentication/authorization

2. **Check Database Queries**
   - Ensure parameterized queries
   - Add indexes if needed
   - Test query performance

3. **Test Automations** (if modified)
   - Test automation processing
   - Test pressure calculations
   - Test queue processing

## Documentation

If you added new features:

1. **Update README.md** (if user-facing)
2. **Update API Documentation** (if API changed)
3. **Add JSDoc Comments** (for public functions)
4. **Update AGENTS.md** (if architecture changed)

## Git Workflow

1. **Review Changes**
   ```bash
   git status
   git diff
   ```

2. **Stage Changes**
   ```bash
   git add <files>
   ```

3. **Commit**
   ```bash
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve bug"
   # or
   git commit -m "refactor: improve code structure"
   ```

4. **Push**
   ```bash
   git push origin <branch>
   ```

## CI/CD

The project uses GitHub Actions for CI/CD:

- **CI** runs on every push/PR: Tests with coverage
- **Build** runs on main/version tags: Builds all packages
- **Publish** runs on version tags: Publishes to NPM/Docker

Ensure your changes don't break CI/CD pipelines.

## Common Issues to Avoid

1. **Don't commit `.env` files** - They contain secrets
2. **Don't commit `node_modules/`** - Already in `.gitignore`
3. **Don't commit build artifacts** - `dist/` folders are gitignored
4. **Don't use `any` types** - Use proper TypeScript types
5. **Don't skip tests** - Write tests for new functionality
6. **Don't ignore errors** - Handle errors appropriately
7. **Don't hardcode values** - Use environment variables or config

## Final Checklist

Before marking a task as complete:

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Type checking passes
- [ ] Code follows style guide
- [ ] Documentation updated (if needed)
- [ ] No linting errors
- [ ] Changes reviewed
- [ ] Ready for commit
