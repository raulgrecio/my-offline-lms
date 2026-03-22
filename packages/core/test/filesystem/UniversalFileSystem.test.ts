import path from "path";
import { describe, it, expect, vi } from "vitest";
import { UniversalFileSystem } from "@filesystem/UniversalFileSystem";
import { IFileSystem } from "@filesystem/IFileSystem";

describe("UniversalFileSystem", () => {
  const mockLocalFs: IFileSystem = {
    exists: vi.fn(),
    isAbsolute: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn(),
    stat: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
  } as any;

  const mockHttpFs: IFileSystem = {
    exists: vi.fn(),
    isAbsolute: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn(),
    stat: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
  } as any;

  describe("Protocol & Path Identification", () => {
    it("should correctly identify absolute Windows paths", () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      expect(ufs.isAbsolute("C:\\Windows")).toBe(true);
      expect(ufs.isAbsolute("D:/Games")).toBe(true);
      expect(ufs.isAbsolute("\\\\nas\\share")).toBe(true);
      expect(ufs.isAbsolute("//server/share")).toBe(true); // UNC with forward slashes
      expect(ufs.isAbsolute("C:relative")).toBe(false); // Drive relative is NOT absolute
    });

    it("should correctly identify absolute Posix paths", () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      expect(ufs.isAbsolute("/etc/hosts")).toBe(true);
    });

    it("should identify remote URIs as absolute", () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      expect(ufs.isAbsolute("http://example.com/file")).toBe(true);
      expect(ufs.isAbsolute("https://example.com/file")).toBe(true);
      expect(ufs.isAbsolute("tcp://1.2.3.4/resource")).toBe(true);
      expect(ufs.isAbsolute("s3://bucket/key")).toBe(true);
      expect(ufs.isAbsolute("blob://account/container")).toBe(true);
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
      ufs.registerRemote("http", mockHttpFs);
      
      await ufs.exists("/tmp/file");
      expect(mockLocalFs.exists).toHaveBeenCalledWith("/tmp/file");
    });

    it("should handle specialized backends (Http/Tcp/S3/Blob)", async () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      
      // Test http/tcp when NOT registered should hit localFs
      await ufs.exists("http://site");
      expect(mockLocalFs.exists).toHaveBeenCalledWith("http://site");
      await ufs.exists("tcp://site");
      expect(mockLocalFs.exists).toHaveBeenCalledWith("tcp://site");
      
      // Test s3 and blob when registered
      const mockS3Fs: IFileSystem = { exists: vi.fn() } as any;
      const mockBlobFs: IFileSystem = { exists: vi.fn() } as any;
      ufs.registerRemote("s3", mockS3Fs);
      ufs.registerRemote("blob", mockBlobFs);
      
      await ufs.exists("s3://test");
      expect(mockS3Fs.exists).toHaveBeenCalled();
      await ufs.exists("blob://test");
      expect(mockBlobFs.exists).toHaveBeenCalled();

      // Test tcp registered
      const mockTcpFs: IFileSystem = { exists: vi.fn() } as any;
      ufs.registerRemote("tcp", mockTcpFs);
      await ufs.exists("tcp://site");
      expect(mockTcpFs.exists).toHaveBeenCalled();
    });
  });

  describe("Operation Delegation", () => {
    it("should delegate all operations to the correct backend", async () => {
      const ufs = new UniversalFileSystem(mockLocalFs);

      // readFile
      vi.mocked(mockLocalFs.readFile).mockResolvedValue("data");
      expect(await ufs.readFile("/file", "utf-8")).toBe("data");
      expect(await ufs.readFile("/file")).toBe("data");

      // writeFile
      await ufs.writeFile("/file", "data");
      expect(mockLocalFs.writeFile).toHaveBeenCalledWith("/file", "data");

      // resolve & join
      vi.mocked(mockLocalFs.resolve).mockReturnValue("/abs");
      expect(ufs.resolve("/rel")).toBe("/abs");
      vi.mocked(mockLocalFs.join).mockReturnValue("/join");
      expect(ufs.join("/a", "b")).toBe("/join");

      // dir & readdir & mkdir
      vi.mocked(mockLocalFs.dirname).mockReturnValue("/dir");
      expect(ufs.dirname("/file")).toBe("/dir");
      vi.mocked(mockLocalFs.readdir).mockResolvedValue(["a"]);
      expect(await ufs.readdir("/dir")).toEqual(["a"]);
      await ufs.mkdir("/dir", { recursive: true });
      expect(mockLocalFs.mkdir).toHaveBeenCalledWith("/dir", { recursive: true });

      // rm & stat
      const mockRm = vi.fn().mockResolvedValue(undefined);
      mockLocalFs.rm = mockRm;
      await ufs.rm("/dir", { force: true });
      expect(mockRm).toHaveBeenCalledWith("/dir", { force: true });

      vi.mocked(mockLocalFs.stat).mockResolvedValue({ size: 10 } as any);
      expect((await ufs.stat("/file")).size).toBe(10);

      // streams
      const mockReadStream = {};
      const mockWriteStream = {};
      mockLocalFs.createReadStream = vi.fn().mockReturnValue(mockReadStream);
      mockLocalFs.createWriteStream = vi.fn().mockReturnValue(mockWriteStream);
      
      expect(ufs.createReadStream("/file")).toBe(mockReadStream);
      expect(ufs.createWriteStream("/file")).toBe(mockWriteStream);
    });

    it("should handle missing optional operations on backends", async () => {
      const localNoOpt: any = { ...mockLocalFs, rm: null, createReadStream: null, createWriteStream: null };
      const ufsNoOpt = new UniversalFileSystem(localNoOpt);
      await expect(ufsNoOpt.rm("/foo")).resolves.toBeUndefined();
      expect(ufsNoOpt.createReadStream("/foo")).toBeNull();
      expect(ufsNoOpt.createWriteStream("/foo")).toBeNull();
    });

    it("should handle empty paths in resolve/join", () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      ufs.resolve();
      expect(mockLocalFs.resolve).toHaveBeenCalled();
      ufs.join();
      expect(mockLocalFs.join).toHaveBeenCalled();
    });

    it("should provide platform-specific path separator", () => {
      const ufs = new UniversalFileSystem(mockLocalFs);
      expect(ufs.sep).toBe(path.sep);
    });
  });
});
