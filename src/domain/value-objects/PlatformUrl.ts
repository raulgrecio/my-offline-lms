export class PlatformUrl {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }

  public static create(input: string): PlatformUrl {
    if (!input) {
      return new PlatformUrl("");
    }
    
    // Replace double slashes with a single slash, but ignore the protocol part (e.g., https://)
    const sanitizedUrl = input.replace(/(?<!:)\/+/g, "/");
    return new PlatformUrl(sanitizedUrl);
  }
}
