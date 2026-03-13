import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as raycastApi from "@raycast/api";

import { copyImageToClipboard, saveImageToDownloads } from "../src/utils";

const clipboardCacheDir = path.join(os.tmpdir(), "emoji-kitchen-clipboard");

describe("clipboard and download flows", () => {
  const createdDirs: string[] = [];
  let clipboardCopyMock: ReturnType<typeof vi.spyOn>;
  let showHUDMock: ReturnType<typeof vi.spyOn>;
  let showToastMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clipboardCopyMock = vi
      .spyOn(raycastApi.Clipboard, "copy")
      .mockResolvedValue(undefined);
    showHUDMock = vi.spyOn(raycastApi, "showHUD").mockResolvedValue(undefined);
    showToastMock = vi.spyOn(raycastApi, "showToast").mockResolvedValue({
      title: "",
      message: "",
      style: "Animated",
      hide: vi.fn(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      }),
    );

    fs.rmSync(clipboardCacheDir, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fs.rmSync(clipboardCacheDir, { recursive: true, force: true });
    for (const dir of createdDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    createdDirs.length = 0;
  });

  it("copies an image to clipboard from a persistent cache file", async () => {
    await copyImageToClipboard("https://example.com/mashup.png", "hello_world");

    expect(clipboardCopyMock).toHaveBeenCalledTimes(1);
    const copiedContent = clipboardCopyMock.mock.calls[0][0] as {
      file: string;
    };
    expect(copiedContent.file.startsWith(clipboardCacheDir)).toBe(true);
    expect(fs.existsSync(copiedContent.file)).toBe(true);
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showHUDMock).toHaveBeenCalledWith("Image copied to clipboard");
  });

  it("does not fail copy if clipboard-cache pruning throws", async () => {
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.spyOn(fs, "readdirSync").mockImplementation((dirPath) => {
      if (String(dirPath) === clipboardCacheDir) {
        throw new Error("simulated prune failure");
      }
      return [];
    });

    await expect(
      copyImageToClipboard("https://example.com/mashup.png", "safe_copy"),
    ).resolves.toBeUndefined();

    expect(clipboardCopyMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock).toHaveBeenCalled();
  });

  it("saves image to Downloads with a sanitized filename", async () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "emoji-kitchen-"));
    createdDirs.push(fakeHome);
    const downloadsDir = path.join(fakeHome, "Downloads");
    fs.mkdirSync(downloadsDir, { recursive: true });

    vi.spyOn(os, "homedir").mockReturnValue(fakeHome);

    await saveImageToDownloads("https://example.com/mashup.png", "party mix#1");

    const expectedPath = path.join(downloadsDir, "party_mix_1.png");
    expect(fs.existsSync(expectedPath)).toBe(true);
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showHUDMock).toHaveBeenCalledWith(
      "Saved to Downloads: party_mix_1.png",
    );
  });
});
