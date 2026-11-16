import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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

    /** The viewer's age in years, for the age breakdown. Optional; only its group (e.g. 25-34) is stored. */
    @IsOptional()
    age?: number | string | null;

    /** The viewer's gender (male/female, any case, or M/F). Optional; anything else counts as unknown. */
    @IsOptional()
    @IsString()
    @MaxLength(20)
    gender?: string | null;
}
