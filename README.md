# Notes — a private AI workspace that never leaves your machine

An AI writing assistant that lives *inside* your notes, not in a chat box you visit.
It can read your document, edit it, and remember what matters to you — and it asks
permission every single time. Because everything runs locally, you can finally share
personal context with an AI without it leaving your computer.

## Why it's different

- **Private by design.** The model runs on your own machine. No cloud, no telemetry,
  no third party who could store, sell, or leak your words.
- **An ambient collaborator, not a chatbot.** The agent sees what you're working on and
  helps in place — reading and rewriting your document alongside you.
- **You're always in control.** Every read and every edit is gated by an explicit
  permission prompt. Nothing happens to your document without your yes.
- **It learns you.** The assistant remembers durable facts and preferences you share,
  so it gets more useful the more you use it — and you can see and manage everything it
  knows in the Memory panel.

## What you get

A single workspace with four panels working together:

- **Document** — a plain-text editor where your writing lives.
- **Chat** — talk to the assistant; ask it to draft, revise, summarize, or look things up.
- **Permissions** — approve or deny each action the assistant wants to take.
- **Memory** — everything the assistant has chosen to remember, in plain view.

## Get started

You'll need [Node.js](https://nodejs.org) and a local model server
([llama.cpp](https://github.com/ggml-org/llama.cpp)'s `llama-server`).

1. **Start your local model.** Launch `llama-server` with your model of choice.
2. **Install and run the app:**

   ```bash
   npm install
   npm run dev
   ```

3. Open the URL Vite prints (usually http://localhost:5173) and start writing.

That's it — your assistant is ready, and nothing you type goes anywhere but your own machine.
