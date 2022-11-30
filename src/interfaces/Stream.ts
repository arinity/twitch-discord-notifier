export interface Stream {
    user_id: number;
    stream_id: number;
    started_at: Date;
    message_id: string;
    ended_at: Date | null;
    video_id: number | null;
    title: string;
}