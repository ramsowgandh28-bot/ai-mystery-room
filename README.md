# AI Mystery Room 🔍🕵️

An AI-powered murder mystery web application where players investigate crimes dynamically synthesized using Gemini 3.8 Flash. Players interrogate suspects, discover forensic clues, request hints, and submit formal accusations to bring culprits to justice.

---

## 🌟 Key Features

- **Dynamic AI Mysteries:** Powered by `gemini-3.8-flash` via `@google/genai` with bounded retries and multi-stage logical consistency validation.
- **3 Difficulty Levels:**
  - **Easy:** 3 suspects, 5 clues, 2 hints (Base Score: 100)
  - **Medium:** 4 suspects, 7 clues, 3 hints (Base Score: 150)
  - **Hard:** 5 suspects, 9 clues, 3 hints (Base Score: 200)
- **Sequential Investigation:** Forensic clues must be discovered in order; hints carry point penalties (-10 pts).
- **Session Security:** Anonymous play secured by SHA-256 session tokens. Zero solution leakage prior to case completion.
- **Production Hardening:** Helmet CSP defensive headers, endpoint-specific rate limiting, atomic MongoDB aggregation pipeline updates, and automatic 24-hour TTL case cleanup.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, React Router v6, Tailwind CSS v3, Axios, Vite
- **Backend:** Node.js, Express, Mongoose, Zod, Helmet, Express-Rate-Limit
- **AI Engine:** Google Gemini API (`gemini-3.8-flash`) via `@google/genai`
- **Database:** MongoDB Atlas (Mongoose)

---

## 🚀 Deployment Architecture

- **Frontend Host:** Vercel (configured in `client/vercel.json` with SPA routing and strict CSP)
- **Backend Host:** Render / Railway (configured in `render.yaml` with `/health` check and `trust proxy: 1`)
- **Database:** MongoDB Atlas

---

## 📜 License

ISC
