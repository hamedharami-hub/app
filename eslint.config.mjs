// Workspace wrapper so linting from /app uses the ARSHNAZ frontend's own ESLint config.
import frontendConfig from "./frontend/eslint.config.js";

export default [
  { ignores: ["frontend/dist/**", "frontend/android/**", "frontend/node_modules/**", "backend/**", "tests/**", "test_reports/**"] },
  ...frontendConfig,
];
