import dotenv from "dotenv";
import Web from './web';
import { RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import type { TokenStorage } from 'interfaces/Token';
import type { AuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import type { EventSubChannelUpdateEvent, EventSubListener, EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { APIMessage, EmbedBuilder, WebhookClient } from "discord.js";
import type { HelixUser } from "@twurple/api/lib";
import type { HelixStream } from "@twurple/api";
import Database from './database';
import type { Stream } from "interfaces/Stream";

// Initialize config
dotenv.config();

// Initialize web server (for twitch auth mainly)
new Web();

// Create Webhook Client
const webhook: WebhookClient = new WebhookClient({
    url: process.env.WEBHOOK_URL!
});

let apiClient: ApiClient;
let authProvider: AuthProvider;

async function connectToTwitch() {
    // Read token data
    const tokenData: TokenStorage = JSON.parse(await fs.readFile('./token.json', 'utf-8'));

    // Create provider
    authProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            onRefresh: async newTokenData => await fs.writeFile('./token.json', JSON.stringify(newTokenData, null, 4))
        },
        tokenData
    );

    // Create Twitch API client
    apiClient = new ApiClient({
        authProvider: authProvider
    });

    // Resolve provided usernames to IDs
    const resolvedTwitchIds: Array<string> = [];
    for (const username of process.env.TWITCH_CHANNELS!.split(',')) {
        const user: HelixUser | null = await apiClient.users.getUserByName(username);
        if (user === null) continue;
        resolvedTwitchIds.push(user.id);
    }

    // Create Twitch WebSocket client
    const listener: EventSubListener = new EventSubWsListener({
        apiClient: apiClient
    });

    // ... and go!
    await listener.start();

    // Subscribe to events
    for (const twitchId of resolvedTwitchIds) {
        listener.subscribeToStreamOnlineEvents(twitchId, handleLive);
        listener.subscribeToChannelUpdateEvents(twitchId, handleUpdate);
        listener.subscribeToStreamOfflineEvents(twitchId, handleOffline);
    }
};

async function handleLive(event: EventSubStreamOnlineEvent) {
    const announcementText: string = process.env.LIVE_TEXT_ANNOUNCEMENT!.replace('%username%', event.broadcasterDisplayName);
    const broadcaster: HelixUser = await event.getBroadcaster();
    const stream: HelixStream = await event.getStream();
    const embed: EmbedBuilder = new EmbedBuilder()
        .setColor(7419530)
        .setAuthor({
            name: broadcaster.displayName,
            iconURL: broadcaster.profilePictureUrl
        })
        .setThumbnail(broadcaster.profilePictureUrl)
        .setURL(`https://twitch.tv/${broadcaster.name}`)
        .setTitle(stream.title)
        .setImage(`${stream.getThumbnailUrl(1280,720)}?${Math.floor(new Date().getTime())}`)
        .addFields(
            {name: 'Status', value: '🔴 Live', inline: true},
            {name: 'Viewers', value: stream.viewers.toString(), inline: true},
        );
    if (stream.gameName.length > 0) {
        embed.addFields({
            name: 'Playing',
            value: stream.gameName,
            inline: true
        });
    }
    const discordMessage: APIMessage = await webhook.send({
        content: announcementText,
        embeds: [embed],
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
    await Database('streams').update({
        ended_at: new Date()
    }).where('stream_id', stream.stream_id);
    const broadcaster: HelixUser = await event.getBroadcaster();
    const embed: EmbedBuilder = new EmbedBuilder()
        .setColor(7419530)
        .setAuthor({
            name: broadcaster.displayName,
            iconURL: broadcaster.profilePictureUrl
        })
        .setTitle(stream.title)
        .setThumbnail(broadcaster.profilePictureUrl)
        .setURL(`https://twitch.tv/${broadcaster.name}`)
        .addFields(
            {name: 'Status', value: '⏱️ Awaiting VOD', inline: true},
        );
    await webhook.editMessage(stream.message_id, {
        content: null,
        embeds: [embed]
    });
}

async function handleUpdate(event: EventSubChannelUpdateEvent) {
    const announcementText: string = process.env.LIVE_TEXT_ANNOUNCEMENT!.replace('%username%', event.broadcasterDisplayName);
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
    const embed: EmbedBuilder = new EmbedBuilder()
        .setColor(7419530)
        .setAuthor({
            name: broadcaster.displayName,
            iconURL: broadcaster.profilePictureUrl
        })
        .setThumbnail(broadcaster.profilePictureUrl)
        .setURL(`https://twitch.tv/${broadcaster.name}`)
        .setTitle(event.streamTitle)
        .setImage(`${twitchStream.getThumbnailUrl(1280,720)}?${Math.floor(new Date().getTime())}`)
        .addFields(
            {name: 'Status', value: '🔴 Live', inline: true},
            {name: 'Viewers', value: twitchStream.viewers.toString(), inline: true},
        );
    if (event.categoryName.length > 0) {
        embed.addFields({
            name: 'Playing',
            value: event.categoryName,
            inline: true
        });
    }
    await webhook.editMessage(stream.message_id, {
        content: announcementText,
        embeds: [embed]
    });
}

connectToTwitch();


