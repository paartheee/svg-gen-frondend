# SVG Mint 🎨

**AI-Powered Semantic Vector Editor**

SVG Mint is a cutting-edge web application that leverages Google's Gemini AI to generate and edit SVG graphics through natural language prompts. Create stunning vector graphics with semantic structure optimized for intelligent editing.

## Features

- 🤖 **AI-Powered Generation**: Create SVG graphics from text descriptions
- ✏️ **Intelligent Editing**: Edit specific elements or entire compositions using natural language
- 🎯 **Semantic Structure**: All generated SVGs have meaningful IDs for precise control
- 🎨 **Manual Controls**: Fine-tune colors, scale, position, and layers
- 📦 **Layer Management**: Visual layer tree with drag-and-drop reordering
- 💾 **Multiple Export Formats**: Download as SVG, PNG, JPG, or PDF
- 🔄 **Undo/Redo**: Full history support for all changes
- 🖼️ **Image-to-SVG**: Generate SVGs from reference images

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI (Python)
- **AI**: Google Gemini 2.0 Flash & Gemini 1.5 Pro
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Google Gemini API Key

### Installation

1. Clone the repository
2. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Add your GEMINI_API_KEY to .env
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

### Running Locally

1. Start the backend:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

## License

MIT

---

Built with ❤️ using Google Gemini AI
