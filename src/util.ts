import { EmbedBuilder } from '@discordjs/builders';
import type { HelixUser, HelixStream, HelixVideo } from '@twurple/api';
import prettyMilliseconds from 'pretty-ms';

export class DiscordUtils {
    static generateTwitchEmbedBase(broadcaster: HelixUser): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(7419530)
            .setAuthor({
                name: broadcaster.displayName,
                iconURL: broadcaster.profilePictureUrl
            })
            .setThumbnail(broadcaster.profilePictureUrl)
            .setURL(`https://twitch.tv/${broadcaster.name}`)
    }

    static generateTwitchEmbedForStream(broadcaster: HelixUser, stream: HelixStream): EmbedBuilder {
        const embed: EmbedBuilder = DiscordUtils.generateTwitchEmbedBase(broadcaster)
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
        return embed;
    }

    static generateTwitchEmbedForVOD(broadcaster: HelixUser, video: HelixVideo): EmbedBuilder {
        const embed: EmbedBuilder = DiscordUtils.generateTwitchEmbedBase(broadcaster)
            .setTitle(video.title)
            .setDescription(`Started: <t:${Math.floor(new Date(video.creationDate).getTime()) / 1000}:F>`)
            .setImage(`${video.getThumbnailUrl(1280,720)}?${Math.floor(new Date().getTime())}`)
            .setURL(video.url)
            .addFields(
                {name: 'Status', value: '🔵 Ended', inline: true},
                {name: 'VOD', value: `[Watch Here](${video.url})`, inline: true},
                {name: 'Duration', value: prettyMilliseconds(video.durationInSeconds * 1000, { verbose: true }), inline: true},
            );
        return embed;
    }
}