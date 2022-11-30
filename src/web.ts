import axios from 'axios';
import { Config } from './config';
import express, { Express, Request, Response } from 'express';
import type { TokenResponse, TokenStorage } from 'interfaces/Token';
import EventEmitter from 'node:events';

export default class Web extends EventEmitter {
    private app: Express;
    private config: Config;

    constructor() {
        super();
        this.config = new Config();
        this.app = express();
        this.app.get('/', async (req: Request, res: Response) => {
            try {
                const { data } = await axios.post<TokenResponse>(
                    'https://id.twitch.tv/oauth2/token',
                    {
                        client_id: this.config.twitchApplication.clientId,
                        client_secret: this.config.twitchApplication.clientSecret,
                        code: req.query.code,
                        grant_type: 'authorization_code',
                        redirect_uri: 'http://localhost:3000',
                    }
                );
                const tokenData: TokenStorage = {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresIn: 0,
                    obtainmentTimestamp: Math.floor(new Date().getTime()) / 1000,
                };
                this.emit('recievedToken', tokenData);
            } catch (error) {
                console.error(error);
            }
            res.send('Authorized. You may close this page.');
        })
        this.app.get('/auth', (_: Request, res: Response) => {
            return res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${this.config.twitchApplication.clientId}&response_type=code&scope&redirect_uri=http://localhost:3000`);
        });
        this.app.listen(3000, () => {
            console.log('[WEB] Listening on http://127.0.0.1:3000');
        });
    }
};