import { Module } from "@nestjs/common";
import { SequenceModule } from "./sequence/sequence.module";

@Module({
  imports: [SequenceModule],
  exports: [SequenceModule]
})
export class SharedModule {}
