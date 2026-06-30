import { Injectable } from "@nestjs/common";
import type { SessionUser } from "./types/auth-types";

@Injectable()
export class CurrentUserService {
  getAnonymousSession(): SessionUser | null {
    return null;
  }
}
