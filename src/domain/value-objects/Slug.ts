export class Slug {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }

  public static create(input: string): Slug {
    if (!input) {
      throw new Error("Cannot create a Slug from an empty string.");
    }
    
    const slugValue = input
      .normalize("NFD") // quita acentos
      .replace(/[\u0300-\u036f]/g, "") // quita acentos diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
      
    return new Slug(slugValue);
  }
}
