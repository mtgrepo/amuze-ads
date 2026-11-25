import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/** Why an ad or extension was rejected. Sent to the advertiser and kept in the history. */
export class RejectDto {
    @IsString()
    @IsNotEmpty({ message: 'Give a reason for rejecting' })
    @MaxLength(500)
    reason: string;
}
