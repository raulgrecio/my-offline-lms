/**
 * A thin wrapper around fetch for common API operations.
 */
export const apiClient = {
  async request(url: string, options?: RequestInit): Promise<Response> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.statusText} (${response.status})`);
    }

    return response;
  },

  async get<T>(url: string): Promise<T> {
    const res = await this.request(url);
    return await res.json();
  },

  async getText(url: string): Promise<string> {
    const res = await this.request(url);
    return await res.text();
  },

  async post<T>(url: string, body?: any): Promise<T> {
    const res = await this.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json() as Promise<T>;
  },

  async delete<T>(url: string, body?: any): Promise<T> {
    const res = await this.request(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json() as Promise<T>;  
  },
};
