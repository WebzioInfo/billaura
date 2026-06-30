import { useSessionStore } from "../stores/sessionStore";

export function useCurrentUser() {
  return useSessionStore((state) => state.user);
}
