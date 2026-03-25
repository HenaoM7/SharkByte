import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Pipeline, PipelineSchema } from './schemas/pipeline.schema';
import { Deal, DealSchema } from './schemas/deal.schema';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pipeline.name, schema: PipelineSchema },
      { name: Deal.name, schema: DealSchema },
    ]),
  ],
  providers: [PipelineService],
  controllers: [PipelineController],
  exports: [PipelineService],
})
export class PipelineModule {}
