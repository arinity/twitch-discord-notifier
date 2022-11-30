import dotenv from 'dotenv';
import Web from './web';
import { AuthProvider, RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import type { TokenStorage } from 'interfaces/Token';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import type { EventSubChannelUpdateEvent, EventSubListener, EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { APIMessage, EmbedBuilder, WebhookClient } from 'discord.js';
import type { HelixStream, HelixUser, HelixVideo } from '@twurple/api';
import { ApiClient } from '@twurple/api';
import Database from './database';
import type { Stream } from 'interfaces/Stream';
import { Config, checkConfiguration } from './config';
import { DiscordUtils } from './util';

// Helper function for async file existence
const fileExists = async (path: string) => !!(await fs.stat(path).catch(_ => false));

// Load environmental variables from .env
dotenv.config();

// Bail if config is incorrect
if (! checkConfiguration()) process.exit(1);

// Initialize config
const config: Config = new Config();

let webhook: WebhookClient;
let apiClient: ApiClient;
let authProvider: AuthProvider;
const userMap: Map<string, string> = new Map();

// Start the application
boot();

async function boot() {
    // Initialize web server
    const webServer: Web = new Web();
    // Create Webhook Client
    webhook = new WebhookClient({
        url: config.webhookURL,
    });
    // Check if we have a token file
    if (!await fileExists('./token.json')) {
        console.log('ALERT! Twitch authenticated needed! Visit http://localhost:3000/auth to link your Twitch account.')
        // Hook onto the recievedToken event and write the token & connect to twitch.
        webServer.once('recievedToken', async (tokenData: TokenStorage) => {
            await fs.writeFile('./token.json', JSON.stringify(tokenData, null, 4));
            connectToTwitch();
        })
    } else {
        connectToTwitch();
    }
}

async function connectToTwitch() {
    // Read token data
    const tokenData: TokenStorage = JSON.parse(await fs.readFile('./token.json', 'utf-8'));

    // Create provider
    authProvider = new RefreshingAuthProvider(
        {
            clientId: config.twitchApplication.clientId,
            clientSecret: config.twitchApplication.clientSecret,
            onRefresh: async newTokenData => await fs.writeFile('./token.json', JSON.stringify(newTokenData, null, 4))
        },
        tokenData
    );

    // Create Twitch API client
    apiClient = new ApiClient({
        authProvider: authProvider
    });

    // Do an initial check for any VODs that were posted
    await checkForVODs();

    // Start a timer to check for VODs moving forward (check every minute)
    setInterval(checkForVODs, 60 * 1000);

    // Resolve provided usernames to IDs
    for (const username of config.twitchChannels) {
        const user: HelixUser | null = await apiClient.users.getUserByName(username);
        if (user === null) {
            console.log(`Unable to resolve '${username}' to a Twitch user ID. Skipping...`)
            continue;
        }
        userMap.set(username, user.id);
    }

    // Create Twitch WebSocket client
    const listener: EventSubListener = new EventSubWsListener({
        apiClient: apiClient
    });

    // ... and go!
    await listener.start();

    // Subscribe to events
    for (const [username, twitchId] of userMap) {
        console.log(`Subscribing to alerts for ${username} (${twitchId})...`)
        listener.subscribeToStreamOnlineEvents(twitchId, handleLive);
        listener.subscribeToChannelUpdateEvents(twitchId, handleUpdate);
        listener.subscribeToStreamOfflineEvents(twitchId, handleOffline);
    }
}

// Helper function for retrieving the live notification announcement text
function retrieveLiveAnnouncement(username: string) {
    return config.liveAnnouncementTemplate
        .replace('%username%', username);
}

async function handleLive(event: EventSubStreamOnlineEvent) {
    const broadcaster: HelixUser = await event.getBroadcaster();
    const stream: HelixStream = await event.getStream();
    const discordMessage: APIMessage = await webhook.send({
        content: retrieveLiveAnnouncement(event.broadcasterDisplayName),
        embeds: [
            DiscordUtils.generateTwitchEmbedForStream(broadcaster, stream)
        ],
    });
    await Database('streams').insert({
        user_id: broadcaster.id,
        stream_id: stream.id,
        started_at: new Date(),
        message_id: discordMessage.id,
        title: stream.title
    })
}

async function handleOffline(event: EventSubStreamOfflineEvent) {
    const stream = await Database<Stream>('streams')
        .select('*')
        .where('user_id', event.broadcasterId)
        .andWhere('ended_at', null)
        .orderBy('started_at', 'desc')
        .first()
    if (typeof stream === 'undefined') return;
    const broadcaster: HelixUser = await event.getBroadcaster();
    const embed: EmbedBuilder = DiscordUtils.generateTwitchEmbedBase(broadcaster)
        .setTitle(stream.title)
        .addFields(
            {name: 'Status', value: '⏱️ Awaiting VOD', inline: true},
        );
    await webhook.editMessage(stream.message_id, {
        content: null,
        embeds: [embed]
    });
    await Database('streams').update({
        ended_at: new Date()
    }).where('stream_id', stream.stream_id);
}

async function handleUpdate(event: EventSubChannelUpdateEvent) {
    const stream = await Database<Stream>('streams')
        .select('*')
        .where('user_id', event.broadcasterId)
        .andWhere('ended_at', null)
        .orderBy('started_at', 'desc')
        .first();
    if (typeof stream === 'undefined') return;
    const broadcaster: HelixUser = await event.getBroadcaster();
    const twitchStream: HelixStream | null = await apiClient.streams.getStreamByUserId(event.broadcasterId);
    if (twitchStream == null) return;
    await webhook.editMessage(stream.message_id, {
        content: retrieveLiveAnnouncement(event.broadcasterDisplayName),
        embeds: [
            DiscordUtils.generateTwitchEmbedForStream(broadcaster, twitchStream)
        ]
    });
}


async function checkForVODs() {
    // Find all videos without published VODs
    const streams: Stream[] = await Database<Stream>('streams')
        .select('*')
        .whereNot('ended_at', null)
        .andWhere('video_id', null);
    // Bail if no streams are found
    if (streams.length === 0) return;
    // Map users -> array of streams
    const videoMap = new Map();
    for (const stream of streams) {
        if (!videoMap.has(stream.user_id)) videoMap.set(stream.user_id, []);
        videoMap.get(stream.user_id).push(stream.stream_id);
    }
    // Attempt to find matching VODs
    let matchedResults: Array<HelixVideo> = [];
    for (const [userId, streamIds] of videoMap) {
        const results = await apiClient.videos.getVideosByUser(userId, {type: 'archive'});
        matchedResults = matchedResults.concat(results.data.filter(video => streamIds.includes(Number(video.streamId))));
    }

    // Iterate through matches
    for (const video of matchedResults) {
        // Get matching stream
        const streamFilter: Array<Stream> = streams.filter(stream => stream.stream_id === Number(video.streamId));
        const stream = streamFilter.length != 0 ? streamFilter.shift() : undefined;
        if (typeof stream === 'undefined') continue;
        // Update database with video id so we don't check again
        await Database('streams').update({
            video_id: video.id
        }).where('stream_id', stream.stream_id);
        // Update message
        const broadcaster: HelixUser = await video.getUser();
        await webhook.editMessage(stream.message_id, {
            content: null,
            embeds: [
                DiscordUtils.generateTwitchEmbedForVOD(broadcaster, video)
            ]
        });
    }
}