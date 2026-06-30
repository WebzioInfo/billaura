import { Injectable } from "@nestjs/common";
import type { SessionUser } from "@billaura/shared-types";

@Injectable()
export class CurrentUserService {
  getAnonymousSession(): SessionUser | null {
    return null;
  }
}
