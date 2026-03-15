# Cursor Project Rules

## Always Follow DRY (Do not repeat yourself) Principle, this is the most important point.

## 1. Do NOT break existing features

- All current functionality must remain intact.
- Maintain backward compatibility with all existing code.
- If a change might alter existing behavior, explain the risk before modifying anything.

## 2. Keep changes minimal & localized

- Only modify the specific files and code regions required for the new feature.
- Avoid unnecessary refactoring or restructuring unrelated code.
- Never alter global architecture unless specifically requested.

## 3. Minimize database and API calls

- Always optimize for the least number of DB/API calls.
- Reuse existing loaded data whenever possible.
- Prefer batching, caching, memoization, or combining queries instead of multiple calls.
- Avoid performing data fetching inside loops or deeply nested calls.
- Do not introduce new endpoints or queries unless absolutely required by the new feature.
- If adding a new DB/API call, justify why it is necessary and confirm no existing route satisfies the requirement.

## 4. Respect existing architecture & patterns

- Preserve the current project structure, naming conventions, and coding style.
- Do not introduce new libraries, frameworks, or patterns unless explicitly requested.

## 5. Write safe and additive code

- Add new functions/components rather than rewriting older ones unless required for correctness.
- If modifying existing logic, ensure prior behavior remains unchanged.

## 6. Perform an impact analysis BEFORE coding

- Explain how the new feature interacts with existing logic, components, and data flows.
- Identify any potential conflicts or performance implications.

## 7. Validate stability AFTER coding

- Confirm that existing features still conceptually function.
- Double-check that no previously stable behavior is altered.
- Verify DB/API calls remain as minimal as possible.

## 8. When unsure, ask for clarification

- If requirements are ambiguous or conflict with existing logic, ask before making assumptions.

Keep Everything Simple

Always choose the simplest possible solution.

Avoid over-engineering or writing clever/complex logic.

Prefer readable, boring code over fancy code.

2. Follow Existing Patterns

Reuse patterns that already exist in the project.

Match the current folder structure, naming conventions, and flow.

If a similar feature already exists, copy its style/approach.

3. Small, Clear Functions

Functions should do one thing only.

Break down complex logic into small, understandable pieces.

4. Consistent API Flow

Follow the same request → service → controller → response (or whatever the project uses).

Do not introduce new patterns without team approval.

5. Maintainability First

Always write code that future you can understand easily.

Avoid deep nesting, large files, and complicated state logic.

Use comments only when the logic itself cannot be simplified.

6. Avoid Unnecessary Dependencies

Only add libraries/frameworks when absolutely required.

Prefer built-in features over external packages.

7. Readability Over Performance (Unless Needed)

Write code that explains itself.

Use clear variable names, consistent formatting, and predictable structure.

8. Test the Flow Manually

After writing something, walk through the logic step-by-step.

Ask yourself:
“Can someone else understand this within 10 seconds?”
If not → simplify.

9. Match UI/UX Theme

Follow existing design patterns, styling approach, and UI behavior.

Do not invent new UI components unless necessary.

10. Don’t Break the Rhythm

The whole project should feel like it was written by one developer.

Maintain a consistent “coding voice” across all files.

11. Do not add comments , only add a comment before a function definition

12. Always remove unused code from the coddebase.
