# Setting up on a new computer

The API key is never stored in this repo. Each computer makes its own `.env`.

1. Clone the repo.
2. From the repo root, run ONE of these (pick whatever you have installed):
   - Python:  `python setup_env.py`  (on Mac/Linux you may need `python3`)
   - Node:    `node setup-env.mjs`
   - Bash:    `bash setup-env.sh`  (macOS, Linux, or Git Bash on Windows)
3. Paste the key when asked. Typing is hidden.
4. Run `git status` and check `.env` is not listed.

No script? Copy `.env.example` to `.env` and put the key in by hand.

## Getting the key to other people
Share it through a password manager or have each person create their own key.
Never send it by email or chat, and never commit it.

## Servers and automated builds
`.env` is not uploaded anywhere. Add `API_KEY` in your host's environment
variable / secrets settings (Vercel, Netlify, Render, GitHub Actions secrets, etc.).
