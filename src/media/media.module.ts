import { Global, Module } from '@nestjs/common';
import { VideoOptimizerService } from './video-optimizer.service';

@Global()
@Module({
    providers: [VideoOptimizerService],
    exports: [VideoOptimizerService],
})
export class MediaModule {}
