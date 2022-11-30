# Twitch Notifier

Twitch Notifier uses Twitch's EventSub API to provide near real-time go-live notifications. In addition, as a stream progresses, Twitch Notifier will update the embed it sent to keep up with the current state of the stream.

This project is still a work in progress.

## Getting Started

* Use your favorite NodeJS package manager to install the required dependencies to run Twitch Notifier.
  * NPM: `npm install`
  * Yarn: `yarn install`

* Create your Database by running: `npx knex migrate:latest`

* Using your preferred text editor, copy `.env.dist` to `.env` and configure your instance of Twitch Notifier.

| Variable | Info |
| --- | --- |
| TWITCH_CLIENT_ID | Your Twitch Application Client ID. You can obtain this from the [Twitch Developer Console.](https://dev.twitch.tv/console/) |
| TWITCH_CLIENT_SECRET | Your Twitch Application Client Secret. You can obtain this from the [Twitch Developer Console.](https://dev.twitch.tv/console/) |
| WEBHOOK_URL | A Discord Webhook URL used to send notfiications. You can learn more about creating Webhooks in Discord [here.](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) |
| TWITCH_CHANNELS | A comma separated list of Twitch usernames to monitor and make go-live announcements for. |
| LIVE_TEXT_ANNOUNCEMENT | The text that is sent when a monitored channel goes live. |

* Using your favorite NodeJS package manager, run the provided 'start' script.
  * NPM: `npm run start`
  * Yarn: `yarn run start`

NOTE: The first time you run Twitch Notifier, you will be asked to authenticate with Twitch using a provided URL.
