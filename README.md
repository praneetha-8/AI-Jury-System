⚖️ AI Jury System

A full-stack web application that evaluates AI-generated responses using a panel of simulated “AI Judges” along with human feedback. The system analyzes responses across multiple dimensions such as reasoning, clarity, and usefulness to produce a final verdict.

🚀 Features
🧠 Multi-agent evaluation (Logic, Clarity, Strict, Helpful judges)
👤 Human-in-the-loop scoring
📊 Response comparison dashboard
⚡ Prompt-based response generation (AI or simulated)
🏆 Final verdict based on aggregated scores
🏗️ Tech Stack
Frontend: React
Backend: Node.js, Express
Database: MongoDB
Deployment: Vercel (Frontend), Render (Backend)
⚙️ How It Works
Enter a prompt
Generate multiple responses
AI Judges evaluate each response
User adds ratings
System computes final scores and selects the best response
🛠️ Setup
git clone <repo-link>
cd client && npm install
cd ../server && npm install
npm run dev
🌐 Deployment
Frontend: Vercel
Backend: Render
🎯 Purpose

This project demonstrates a multi-perspective evaluation system inspired by real-world AI model assessment workflows, combining structured scoring with human feedback.

🔮 Future Scope
Integration with real LLM APIs
Advanced analytics & visualizations
Custom evaluation metrics
📌 Note

Built within a 24-hour timeframe as part of a full-stack engineering assignment.
