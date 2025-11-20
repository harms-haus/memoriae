# fix-build-and-tests

- run `cd /user/blake/Documents/software/memoriae; npm run a --b` and resolve any build errors. Continue resolving build errors until the build succeeds
- run `cd /user/blake/Documents/software/memoriae; npm run a --u` and resolve any test failures. Use the design or plan as the ground-truth, not the code or tests. Continue resolving test failures and build errors until the build errors and tests failures are completely resolved.
- evaluate if additional testing is needed and provide RECOMMENDATIONS in the context (do not create files) for improving the coverage and calculate an estimated coverage gain
