"use client";

// Frictionless identity: no login. A vote/entry/reaction is tied to a
// stable, client-generated device id stored in localStorage. This is the
// deliberate "keep it frictionless" choice — convenient, with light
// server-side hardening (one ballot per device, self-vote block, phase
// gating, BotID later). It is NOT a security boundary.

const KEY = "hw26_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
