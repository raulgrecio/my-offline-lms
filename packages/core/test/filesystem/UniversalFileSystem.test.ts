import { describe, it, expect, vi } from "vitest";

import { UniversalFileSystem } from "@core/filesystem/UniversalFileSystem";
import { UniversalPath } from "@core/filesystem/UniversalPath";
import { type IFileSystem } from "@core/filesystem/IFileSystem";
import { type IPath } from "@core/filesystem/IPath";
import { NodePath } from "@core/filesystem/NodePath";

describe("UniversalFileSystem & UniversalPath", () => {
  const mockLocalFs: IFileSystem = {
    exists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn(),
    stat: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
  } as any;

  const mockLocalPath: IPath = {
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    isAbsolute: vi.fn(),
    sep: "/",
  } as any;

  const mockHttpFs: IFileSystem = {
    exists: vi.fn(),
  } as any;

  const mockHttpPath: IPath = {
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    isAbsolute: vi.fn(),
    sep: "/",
  } as any;

  describe("UniversalPath Protocol & Path Identification", () => {
    it("should correctly identify absolute Windows paths", () => {
      const up = new UniversalPath(new NodePath());
      expect(up.isAbsolute("C:\\Windows")).toBe(true);
      expect(up.isAbsolute("D:/Games")).toBe(true);
      expect(up.isAbsolute("\\\\nas\\share")).toBe(true);
      expect(up.isAbsolute("//server/share")).toBe(true); // UNC with forward slashes
      expect(up.isAbsolute("C:relative")).toBe(false); // Drive relative is NOT absolute
    });

    it("should correctly identify absolute Posix paths", () => {
      const up = new UniversalPath(new NodePath());
      expect(up.isAbsolute("/etc/hosts")).toBe(true);
    });

    it("should identify remote URIs as absolute", () => {
      const up = new UniversalPath(new NodePath());
      expect(up.isAbsolute("http://example.com/file")).toBe(true);
      expect(up.isAbsolute("https://example.com/file")).toBe(true);
      expect(up.isAbsolute("tcp://1.2.3.4/resource")).toBe(true);
      expect(up.isAbsolute("s3://bucket/key")).toBe(true);
      expect(up.isAbsolute("blob://account/container")).toBe(true);
    });
  });

  describe("Routing & Backend Selection", () => {
    it("should route to HttpFileSystem for URLs", async () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      ufs.registerRemote("http", mockHttpFs);

      await ufs.exists("http://foo.com/bar");
      expect(mockHttpFs.exists).toHaveBeenCalledWith("http://foo.com/bar");
      expect(mockLocalFs.exists).not.toHaveBeenCalled();
    });

    it("should route to LocalFileSystem for normal paths", async () => {
      const ufs = new UniversalFileSystem(mockLocalFs);

      await ufs.exists("/tmp/file");
      expect(mockLocalFs.exists).toHaveBeenCalledWith("/tmp/file");
    });
  });

  describe("Operation Delegation", () => {
    it("should delegate all operations to the correct backend", async () => {
      const ufs = new UniversalFileSystem(mockLocalFs);

      // readFile
      vi.mocked(mockLocalFs.readFile).mockResolvedValue("data" as any);
      expect(await ufs.readFile("/file", "utf-8" as any)).toBe("data");
      expect(await ufs.readFile("/file")).toBe("data");

      // writeFile
      await ufs.writeFile("/file", "data");
      expect(mockLocalFs.writeFile).toHaveBeenCalledWith("/file", "data");

      // readdir & mkdir
      vi.mocked(mockLocalFs.readdir).mockResolvedValue(["a"]);
      expect(await ufs.readdir("/dir")).toEqual(["a"]);
      await ufs.mkdir("/dir", { recursive: true });
      expect(mockLocalFs.mkdir).toHaveBeenCalledWith("/dir", { recursive: true });

      // rm & stat
      const mockRm = vi.fn().mockResolvedValue(undefined);
      mockLocalFs.rm = mockRm;
      await ufs.rm("/dir", { force: true } as any);
      expect(mockRm).toHaveBeenCalledWith("/dir", { force: true });

      vi.mocked(mockLocalFs.stat).mockResolvedValue({ size: 10 } as any);
      expect((await ufs.stat("/file")).size).toBe(10);

      // Protocol fallback (supported protocol but not registered)
      await ufs.readdir("s3://foo");
      expect(mockLocalFs.readdir).toHaveBeenCalledWith("s3://foo");

      // Unsupported protocol should throw
      await expect(ufs.readdir("unknown://foo")).rejects.toThrow("Unsupported protocol: unknown");

      // https redirects to http
      ufs.registerRemote("http", mockHttpFs);
      await ufs.exists("https://foo.com");
      expect(mockHttpFs.exists).toHaveBeenCalledWith("https://foo.com");

      // unlink
      const mockUnlink = vi.fn().mockResolvedValue(undefined);
      mockLocalFs.unlink = mockUnlink;
      await ufs.unlink("foo");
      expect(mockUnlink).toHaveBeenCalledWith("foo");

      // rename
      const mockRename = vi.fn().mockResolvedValue(undefined);
      mockLocalFs.rename = mockRename;
      await ufs.rename("foo", "bar");
      expect(mockRename).toHaveBeenCalledWith("foo", "bar");

      // streams
      const mockReadStream = {};
      const mockWriteStream = {};
      mockLocalFs.createReadStream = vi.fn().mockReturnValue(mockReadStream);
      mockLocalFs.createWriteStream = vi.fn().mockReturnValue(mockWriteStream);

      expect(ufs.createReadStream("/file")).toBe(mockReadStream);
      expect(ufs.createWriteStream("/file")).toBe(mockWriteStream);
    });

    it("should handle missing optional operations on backends", async () => {
      const ufsNoOpt = new UniversalFileSystem({
        exists: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn()
      } as any);
      await expect(ufsNoOpt.rm!("/foo")).resolves.toBeUndefined();
      expect(ufsNoOpt.createReadStream!("/foo")).toBeNull();
      expect(ufsNoOpt.createWriteStream!("/foo")).toBeNull();
    });
  });

  describe("UniversalPath Resolution", () => {
    it("should route path operations to the correct backend", () => {
      const remotes = new Map<any, IPath>([["http", mockHttpPath]]);
      const up = new UniversalPath(mockLocalPath, remotes);

      vi.mocked(mockHttpPath.join).mockReturnValue("http://join");
      expect(up.join("http://a", "b")).toBe("http://join");

      vi.mocked(mockLocalPath.join).mockReturnValue("/join");
      expect(up.join("/a", "b")).toBe("/join");
    });
  });
});
