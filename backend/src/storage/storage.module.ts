import { Global, Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { CloudinaryStorageService } from "./cloudinary-storage.service";

@Global()
@Module({
  providers: [StorageService, CloudinaryStorageService],
  exports: [StorageService, CloudinaryStorageService],
})
export class StorageModule {}

