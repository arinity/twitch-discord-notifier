import * as env from 'env-var';
import * as fs from 'fs';

interface TwitchApplicationCredentials {
    clientId: string;
    clientSecret: string;
}

export function checkConfiguration(): boolean {
    // Check if the .env file exists
    if (!fs.existsSync('./.env')) {
        console.error('ALERT! You are missing your .env file. Copy .env.dist to .env and edit accordingly to continue.');
        return false;
    }

    // Twitch Application Credentials
    try {
        env.get('TWITCH_CLIENT_ID').required().asString();
        env.get('TWITCH_CLIENT_SECRET').required().asString();
    } catch (_) {
        console.error('ALERT! Missing or invalid TWITCH_CLIENT_ID and/or TWITCH_CLIENT_SECRET. You can obtain these from the Twitch Developer Console.');
        return false;
    }

    // Twitch Channels
    try {
        env.get('TWITCH_CHANNELS').required().asArray();
    } catch (_) {
        console.error('ALERT! Missing or invalid TWITCH_CHANNELS. This should be a comma separated list of Twitch usernames to send live alerts for.');
        return false;
    }

    // Webhook URL
    try {
        env.get('WEBHOOK_URL').required().asUrlString();
    } catch(_) {
        console.error('ALERT! Missing or invalid WEBHOOK_URL. This should be a Webhook URL obtained from Discord.');
        return false;
    }
    
    return true;
}

export class Config {

    public twitchApplication: TwitchApplicationCredentials;
    public twitchChannels: Array<string>;
    public webhookURL: string;
    public liveAnnouncementTemplate: string;

    constructor() {
        // Load config variables
        this.twitchApplication = {
            clientId: env.get('TWITCH_CLIENT_ID').required().asString(),
            clientSecret: env.get('TWITCH_CLIENT_SECRET').required().asString(),
        };
        this.twitchChannels = env.get('TWITCH_CHANNELS').required().asArray();
        this.webhookURL = env.get('WEBHOOK_URL').required().asUrlString();
        this.liveAnnouncementTemplate = env.get('LIVE_TEXT_ANNOUNCEMENT')
            .default('@everyone %username% is live!')
            .asString();
    }
}