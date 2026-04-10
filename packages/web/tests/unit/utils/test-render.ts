import { experimental_AstroContainer as MyAstroContainer } from 'astro/container';
// @ts-ignore
import reactRenderer from '@astrojs/react/server.js';

export async function createTestContainer() {
    const container = await MyAstroContainer.create();
    container.addServerRenderer({ name: '@astrojs/react', renderer: reactRenderer });
    return container;
}
