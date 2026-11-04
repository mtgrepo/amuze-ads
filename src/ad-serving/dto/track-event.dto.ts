import { IsIn, IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

/** view = shown, click = tapped, watch = video playback started, complete = video reached the end. */
export const TRACK_EVENTS = ['view', 'click', 'watch', 'complete'] as const;
export type TrackEvent = typeof TRACK_EVENTS[number];

export class TrackEventDto {
    @IsUUID()
    adId: string;

    @IsIn(TRACK_EVENTS, { message: `event must be one of: ${TRACK_EVENTS.join(', ')}` })
    event: TrackEvent;

    /** The app's user id, or a stable device id for guests; needed for reach. */
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    userId: string;
}
