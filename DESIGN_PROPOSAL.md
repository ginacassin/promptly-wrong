# Promptly Wrong — visual redesign proposal

This proposal brings the existing game UI closer to the approved **A. Glitchy Playful** board. It keeps the current static HTML/CSS/JavaScript frontend, WebSocket game flow, and backend architecture. The visual treatment is drawn with CSS and the existing inline SVG logo mark; no new bitmap artwork is required.

## Visual direction

- Near-black violet stage with layered purple surfaces, soft neon edge light, and restrained pixel grain.
- Hot pink, acid lime, and cyan carry the brand; warning, success, and error colors retain their existing meaning.
- Existing Rubik Glitch, Rubik, and Inter font files remain self-hosted. Rubik is used for expressive display; Inter remains the functional UI face. Glitch stays occasional and logo-led so long Spanish copy remains readable.
- TV layouts use wide stage composition and large reveal cards. Phone layouts remain a single-column controller with safe-area spacing and a persistent primary action.

## Interaction decisions

- Landing presents the game premise, host and join actions, plus a small prompt → image → guess flow cue.
- Setup keeps the existing player, round, and timer controls, with larger stepper targets and clearer grouping.
- Lobby emphasizes the room code, QR join path, connected players, and host controls.
- Round status uses high-contrast progress, timer states, and distinct completed/working player chips.
- Reveal retains the existing step-by-step controls and typewriter; new text/image entrance motion gives each step a short drumroll. Keyboard navigation remains available on the host screen.
- Player tasks are grouped into a focused panel. Image upload keeps camera, gallery, paste, and drag/drop paths with visible hover feedback.
- Buttons and inputs show clear hover/focus states. Reduced-motion preferences disable decorative motion.

## Localization and responsive behavior

All added interface copy is in the existing EN/ES dictionary. New layouts use flexible widths, wrapping, and content-driven heights so Spanish strings can expand without clipping. The landing action stack and step cue wrap on narrow screens; reveal cards remain swipeable; player actions keep a 48px-class touch target.

## Scope

The implementation changes presentation and adds small explanatory text only. Room creation, player joining, settings, submissions, upload processing, reveal controls, scoring, and session persistence continue through their existing handlers and message protocol.
