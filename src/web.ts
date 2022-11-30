import axios from 'axios';
import express, { Express, Request, Response } from 'express';
import type { TokenResponse, TokenStorage } from 'interfaces/Token';
import { promises as fs } from 'fs';

export default class Web {
    private app: Express;

    constructor() {
        this.app = express();
        this.app.get('/', async (req: Request, res: Response) => {
            try {
                const { data } = await axios.post<TokenResponse>(
                    'https://id.twitch.tv/oauth2/token',
                    {
                        client_id: process.env.TWITCH_CLIENT_ID,
                        client_secret: process.env.TWITCH_CLIENT_SECRET,
                        code: req.query.code,
                        grant_type: 'authorization_code',
                        redirect_uri: 'http://localhost:3000'
                    }
                );
                const tokenData: TokenStorage = {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresIn: 0,
                    obtainmentTimestamp: Math.floor(new Date().getTime()) / 1000
                };
                await fs.writeFile('./token.json', JSON.stringify(tokenData, null, 4));
                console.log(data);
            } catch (error) {
                console.error(error);
            }
            res.send('Authorized.');
        })
        this.app.get('/auth', (_: Request, res: Response) => {
            return res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&response_type=code&scope&redirect_uri=http://localhost:3000`)
        });
        this.app.listen(3000, () => {
            console.log('[WEB] Listening on http://127.0.0.1:3000');
        });
    }
};