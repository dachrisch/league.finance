// src/client/lib/offerGenerateLines.ts

/**
 * Whether "Aus Ligen erzeugen" should actually call `generateLines`.
 *
 * When the offer already has lines, replacing them is destructive, so the admin is asked to
 * confirm first. If they cancel, the caller must NOT call `generateLines` at all: calling it
 * with `overwrite: false` (because the confirm returned false) still hits the server, which
 * replies with a CONFLICT since lines already exist — a pointless error alert for a plain
 * "no thanks".
 */
export function shouldGenerateLines(hasExistingLines: boolean, confirmReplace: () => boolean = confirm): boolean {
  return !hasExistingLines || confirmReplace();
}
