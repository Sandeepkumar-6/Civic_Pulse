# Report Page Overrides

> **PROJECT:** CivicPulse
> **Generated:** 2026-09-18
> **Page Type:** Citizen reporting workflow

> **IMPORTANT:** These rules override the project design foundation only for the report journey.

## Page-Specific Rules

### Layout

- Use a calm, single-task container with a readable maximum width.
- Show five explicit input steps: category, details, photographs, location, and review.
- Keep primary navigation controls in a predictable footer inside the report card.

### Interaction and Feedback

- Use primary teal for active and completed steps and neutral borders for future steps.
- Show validation near the relevant step and a focusable summary above the form.
- Preserve user-entered values when moving backwards.
- Photographs are optional; location permission is optional and manual entry remains available.
- Show clear submission loading, success, error, confirmation, and tracking states.

### Accessibility and Motion

- Use programmatic labels for every input and announce validation errors.
- Maintain 44px minimum interaction targets and visible focus indicators.
- Use only short progress and feedback transitions; honour reduced-motion preferences.
