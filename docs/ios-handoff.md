# iOS Handoff

## Build configuration

1. Copy `.env.production.example` to `.env.production`.
2. Set `VITE_API_BASE_URL` to the HTTPS Vercel deployment that serves `/api`, `/deepseek`, and `/openai` server-side proxies.
3. Keep all provider keys in Vercel environment variables. Do not add provider keys to any `VITE_*` variable or to the iOS project.
4. Run `npm run ios:sync`, then `npm run ios:open` on a Mac.

## Xcode checklist

- Bundle ID: `app.lifekitchen.zhongzhong`
- Microphone permission text: configured in `ios/App/App/Info.plist`
- Test the todo, mix, reveal, login, and cellar flows on a physical device.
- Replace the current Capacitor placeholder App Icon and splash image with the approved production artwork before Archive/TestFlight.

## Backend contract

The iOS bundle prefixes its requests with `VITE_API_BASE_URL`:

- `/api/*` for application data and authentication
- `/deepseek/*` for the DeepSeek-compatible LLM proxy
- `/openai/*` for the OpenAI proxy used by planning, transcription, and image generation

All three proxy paths must permit the Capacitor iOS origin and must keep provider credentials server-side.
