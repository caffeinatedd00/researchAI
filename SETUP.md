# Running ResearchAI

1. Install Node.js, then run `npm install`.
2. Create your key file, using ONE of:
   - `python setup_env.py`  (Mac/Linux may need `python3`)
   - `node setup-env.mjs`
   - `bash setup-env.sh`
   - or copy `.env.example` to `.env` and paste the key after `VITE_GEMINI_API_KEY=`
3. Run `npm run dev` and open http://localhost:8080
4. Run `git status` and check `.env` is not listed.

Restart `npm run dev` whenever you change `.env`.

## Important
Vite puts `VITE_` variables into the browser code, so anyone who can open the
running app can read the key. That is fine on your own computer. Before putting
the app on the internet, move the Gemini call behind a small server and keep the
key there.

## Other people / other computers
Each computer makes its own `.env`. Share the key through a password manager,
never by email or chat, and never commit it.
