import { describe, it, expect, vi } from "vitest";
import { UniversalFileSystem } from "@filesystem/UniversalFileSystem";
import { IFileSystem } from "@filesystem/IFileSystem";

describe("UniversalFileSystem", () => {
  const mockLocalFs: IFileSystem = {
    existsSync: vi.fn(),
    isAbsolute: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
  } as any;

  const mockHttpFs: IFileSystem = {
    existsSync: vi.fn(),
    isAbsolute: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
  } as any;

  it("should correctly identify absolute Windows paths", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    
    expect(ufs.isAbsolute("C:\\Windows")).toBe(true);
    expect(ufs.isAbsolute("D:/Games")).toBe(true);
    expect(ufs.isAbsolute("\\\\nas\\share")).toBe(true);
  });

  it("should correctly identify absolute Posix paths", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    // path.isAbsolute will be used here, but we can verify our regex-based ones first
    expect(ufs.isAbsolute("/etc/hosts")).toBe(true);
  });

  it("should identify HTTP URLs as absolute", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    expect(ufs.isAbsolute("http://example.com/file")).toBe(true);
    expect(ufs.isAbsolute("https://example.com/file")).toBe(true);
  });

  it("should identify TCP URIs as absolute", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    expect(ufs.isAbsolute("tcp://1.2.3.4/resource")).toBe(true);
  });

  it("should route to HttpFileSystem for URLs", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    ufs.registerRemote("http", mockHttpFs);
    
    ufs.existsSync("http://foo.com/bar");
    expect(mockHttpFs.existsSync).toHaveBeenCalledWith("http://foo.com/bar");
    expect(mockLocalFs.existsSync).not.toHaveBeenCalled();
  });

  it("should route to LocalFileSystem for normal paths", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    ufs.registerRemote("http", mockHttpFs);
    
    ufs.existsSync("/tmp/file");
    expect(mockLocalFs.existsSync).toHaveBeenCalledWith("/tmp/file");
  });

  it("should delegate all operations to correct backend", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    ufs.registerRemote("http", mockHttpFs);

    // readFileSync
    vi.mocked(mockLocalFs.readFileSync).mockReturnValue("data");
    expect(ufs.readFileSync("/file", "utf-8")).toBe("data");
    expect(ufs.readFileSync("/file")).toBe("data");

    // writeFileSync
    ufs.writeFileSync("/file", "data");
    expect(mockLocalFs.writeFileSync).toHaveBeenCalledWith("/file", "data");

    // resolve & join
    vi.mocked(mockLocalFs.resolve).mockReturnValue("/abs");
    expect(ufs.resolve("/rel")).toBe("/abs");
    vi.mocked(mockLocalFs.join).mockReturnValue("/join");
    expect(ufs.join("/a", "b")).toBe("/join");

    // dir & readdir & mkdir
    vi.mocked(mockLocalFs.dirname).mockReturnValue("/dir");
    expect(ufs.dirname("/file")).toBe("/dir");
    vi.mocked(mockLocalFs.readdirSync).mockReturnValue(["a"]);
    expect(ufs.readdirSync("/dir")).toEqual(["a"]);
    ufs.mkdirSync("/dir", { recursive: true });
    expect(mockLocalFs.mkdirSync).toHaveBeenCalledWith("/dir", { recursive: true });

    // rm & stat
    const mockRm = vi.fn();
    mockLocalFs.rmSync = mockRm;
    ufs.rmSync("/dir", { force: true });
    expect(mockRm).toHaveBeenCalledWith("/dir", { force: true });

    vi.mocked(mockLocalFs.statSync).mockReturnValue({ size: 10 } as any);
    expect(ufs.statSync("/file").size).toBe(10);

    // streams
    const mockReadStream = {};
    const mockWriteStream = {};
    mockLocalFs.createReadStream = vi.fn().mockReturnValue(mockReadStream);
    mockLocalFs.createWriteStream = vi.fn().mockReturnValue(mockWriteStream);
    
    expect(ufs.createReadStream("/file")).toBe(mockReadStream);
    expect(ufs.createWriteStream("/file")).toBe(mockWriteStream);

    // registerRemote and sep
    const s = ufs.sep;
    // Let's use real path if preferred but the code uses path.sep.
  });

  it("should handle specialized backends (Http/Tcp)", () => {
    const ufs = new UniversalFileSystem(mockLocalFs);
    ufs.registerRemote("http", mockHttpFs);
    
    // Test writeFileSync on http should use http backend (which will throw in its own implementation but ufs should delegate)
    vi.mocked(mockHttpFs.writeFileSync).mockImplementation(() => { throw new Error("Unauthorized"); });
    // Test http/tcp when NOT registered should hit localFs
    const ufsNoRemotes = new UniversalFileSystem(mockLocalFs);
    ufsNoRemotes.existsSync("http://site");
    expect(mockLocalFs.existsSync).toHaveBeenCalledWith("http://site");
    ufsNoRemotes.existsSync("tcp://site");
    expect(mockLocalFs.existsSync).toHaveBeenCalledWith("tcp://site");
    ufsNoRemotes.existsSync("s3://site");
    ufsNoRemotes.existsSync("blob://site");
    
    // Test s3 and blob when registered
    const mockS3Fs: IFileSystem = { existsSync: vi.fn() } as any;
    const mockBlobFs: IFileSystem = { existsSync: vi.fn() } as any;
    ufs.registerRemote("s3", mockS3Fs);
    ufs.registerRemote("blob", mockBlobFs);
    
    ufs.existsSync("blob://site");
    expect(mockBlobFs.existsSync).toHaveBeenCalled();

    // Verify s3 and blob are registered
    ufs.registerRemote("s3", mockS3Fs);
    ufs.registerRemote("blob", mockBlobFs);
    ufs.existsSync("s3://test");
    expect(mockS3Fs.existsSync).toHaveBeenCalled();
    ufs.existsSync("blob://test");
    expect(mockBlobFs.existsSync).toHaveBeenCalled();

    // Test empty paths in resolve/join
    ufs.resolve();
    expect(mockLocalFs.resolve).toHaveBeenCalled();
    ufs.join();
    expect(mockLocalFs.join).toHaveBeenCalled();

    // Test tcp
    const mockTcpFs: IFileSystem = { existsSync: vi.fn() } as any;
    ufs.registerRemote("tcp", mockTcpFs);
    ufs.existsSync("tcp://site");
    expect(mockTcpFs.existsSync).toHaveBeenCalled();

    // Test unsupported operations on local (force them to null for test)
    const localNoOpt: any = { ...mockLocalFs, rmSync: null, createReadStream: null, createWriteStream: null };
    const ufsNoOpt = new UniversalFileSystem(localNoOpt);
    expect(() => ufsNoOpt.rmSync("/foo")).not.toThrow();
    expect(ufsNoOpt.createReadStream("/foo")).toBeNull();
    expect(ufsNoOpt.createWriteStream("/foo")).toBeNull();
  });
});
