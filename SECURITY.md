# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or include sensitive
details in screenshots, logs, or pull requests.

Use GitHub's private vulnerability reporting feature for this repository. If
private reporting is unavailable, contact the repository owner privately
through their GitHub profile before sharing technical details.

Include the affected area, reproduction steps, potential impact, and any known
workaround. Please allow time for the report to be investigated before public
disclosure.

## Supported version

This project is under active development. Security fixes are applied to the
latest version of the default branch.

## Sensitive configuration

- Never commit `.env.local` or service-role credentials.
- Only variables prefixed with `NEXT_PUBLIC_` may be exposed to the browser.
- Treat local development credentials as secrets outside the local stack.
- Rotate any credential immediately if it is accidentally published.
