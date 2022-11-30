export {};

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TWITCH_CLIENT_ID: string;
            TWITCH_CLIENT_SECRET: string;
            WEBHOOK_URL: string;
            LIVE_TEXT_ANNOUNCEMENT: string;
            TWITCH_CHANNELS: string;
        }
    }
}