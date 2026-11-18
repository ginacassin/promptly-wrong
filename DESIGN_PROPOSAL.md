# Promptly Wrong — visual redesign proposal

This proposal brings the existing game UI closer to the approved **A. Glitchy Playful** board. It keeps the current static HTML/CSS/JavaScript frontend, WebSocket game flow, and backend architecture. The wordmark and visual treatment use the existing typefaces and CSS; the former decorative SVG mark and favicon link have been removed.

## Visual direction

- Near-black violet stage with layered purple surfaces, soft neon edge light, and restrained pixel grain.
- TV host screens add pink/lime and cyan paint splashes at the edges, with the center kept dark for readable content.
- Hot pink, acid lime, and cyan carry the brand; warning, success, and error colors retain their existing meaning.
- Existing Rubik Glitch, Rubik, and Inter font files remain self-hosted. Rubik is used for expressive display; Inter remains the functional UI face. Glitch stays occasional and logo-led so long Spanish copy remains readable.
- TV layouts use wide stage composition and large reveal cards. Phone layouts remain a single-column controller with safe-area spacing and a persistent primary action.

## Interaction decisions

- Landing centers the game premise and host/join actions. The tagline is the main explanatory line; there is no extra kicker or flow strip competing with it.
- Setup keeps the existing player, round, and timer controls, with larger stepper targets and clearer grouping.
- Lobby emphasizes the room code, QR join path, connected players, and host controls.
- Round status uses high-contrast progress, timer states, and distinct completed/working player chips.
- Reveal retains the existing step-by-step controls and typewriter; new text/image entrance motion gives each step a short drumroll. Keyboard navigation remains available on the host screen.
- Player tasks are grouped into a focused panel. Image upload keeps camera, gallery, paste, and drag/drop paths with visible hover feedback.
- Buttons and inputs show clear hover/focus states. Reduced-motion preferences disable decorative motion.

## Board component checklist

- **Buttons:** lime primary action, outlined violet secondary action, quiet text action, disabled state, hover lift, pressed response, and keyboard focus ring.
- **Inputs:** light high-contrast text fields, dark labels, oversized four-character room code, visible character count and warning threshold.
- **Player chips:** generated face avatars, names, joined/offline state, and a separate completed state during a round.
- **Timer and progress:** bright warning-yellow timer, red low-time state, accessible lime progress bar, and live completed count.
- **Milestones:** a solid glowing green all-set check, oversized trophy finish, podium treatment, and cyan drift-stat panel.
- **Feedback:** success and error toasts with dismiss controls; upload drop area responds to drag-over and keyboard focus.
- **Language:** persistent EN/ES switch with selected-state semantics; all new labels and hints have both translations.
- **Reveal:** chain indicator, author and step type, previous/next controls, text type-in, image pop/glow, mobile swipe carousel, and host keyboard controls.
- **Screen set:** landing, setup, room lobby, in-progress host view, chain reveal, results, phone join, waiting room, prompt entry, image upload, image guess, submitted/waiting, reveal-wait, and end screen.

## Localization and responsive behavior

All added interface copy is in the existing EN/ES dictionary. New layouts use flexible widths, wrapping, and content-driven heights so Spanish strings can expand without clipping. The landing action stack and step cue wrap on narrow screens; reveal cards remain swipeable; player actions keep a 48px-class touch target. Host views use wide stage layouts above tablet breakpoints and stack below them. Phone task controls respect device safe areas.

## Scope

The implementation changes presentation and adds small explanatory text only. Room creation, player joining, settings, submissions, upload processing, reveal controls, scoring, and session persistence continue through their existing handlers and message protocol.
