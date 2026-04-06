# AlzheimerMRI Frontend

This directory contains the web frontend for the project. It is built with React 19, Vite, and Tailwind CSS, and it provides the UI for clinical risk assessment, MRI image upload analysis, and chatbot access.

## Features

- Multi-step clinical metric input
- Clinical classification result display
- MRI image upload and result visualization
- MRI heatmap and overlay display
- Result card screenshot export
- Integrated Alzheimer’s disease chatbot panel

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- lucide-react
- motion
- gsap
- three
- ogl

## Directory Guide

- `src/App.jsx`: Main page and primary interaction flow
- `src/api.js`: API request helpers for the FastAPI backend
- `src/ChatbotPanel.jsx`: Chatbot panel component
- `src/assets/`: Example MRI images and static assets
- `public/`: Public asset directory

## Install

```bash
npm install
```

## Local Development

```bash
npm run dev
```

The development app is usually available at:

- `http://localhost:5173`

## Build and Lint

```bash
npm run build
npm run lint
```

## Backend Integration

By default, the frontend calls the backend through relative paths:

- `/predict/clinical`
- `/predict/MRIImage`
- `/chatbot`

In production mode, `src/api.js` reads `REACT_APP_API_URL` as the backend base URL.

If you want to set the backend URL explicitly, you can start the app with an environment variable, for example:

```bash
REACT_APP_API_URL=http://127.0.0.1:8000 npm run dev
```

## Development Notes

- Make sure `FastAPIServer/` is running before testing the UI.
- MRI upload depends on the backend `POST /predict/MRIImage` endpoint.
- The chatbot panel depends on the backend `POST /chatbot` endpoint.
- If the frontend builds correctly but requests fail, check backend startup location and port first.
