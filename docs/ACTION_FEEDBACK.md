# Action feedback

The shared `feedback.js` and `feedback.css` provide dismissible notifications without a dependency or CDN. Each page loads them before its action scripts.

- Successful user actions show their actual result after completion. Success/info messages close after eight seconds, pausing while hovered or focused.
- Errors and validation warnings remain until dismissed. New success messages cannot evict them. The stack scrolls if necessary.
- Slow user actions show a loading notice after 400 milliseconds. Completion removes that notice and clears the initiating control's busy state.
- Background page loads stay quiet unless they fail. Navigation, sidebar and theme controls retain their normal visual state feedback.
- Native form validation names the invalid field. Sign-in, sign-out, registration and password-change redirects carry an allowlisted success message to the next page.
- Profile photo preparation is explicitly unsaved until the profile save succeeds. File rejection is an error, not a success or neutral update.
- Only page controls are disabled during page operations; navigation and notification dismissal remain available.

The component uses text nodes, live status/alert roles, reduced-motion styles and the existing theme tokens. Notifications are hidden in print. These are immediate action messages, not persisted complaint notifications or email delivery.

Run `node scripts/verify-feedback.cjs` for six deterministic lifecycle checks: event capture across microtasks, delayed loading, completion, background suppression, persistent errors, dismissal, duplicate suppression, focus/hover expiry and validation warnings. These checks use a minimal DOM and clock; they do not certify real-browser rendering or screen-reader behavior.
