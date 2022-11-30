export interface TokenStorage {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    obtainmentTimestamp: number;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}