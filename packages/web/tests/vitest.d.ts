import 'vitest'
import type { Assertion, AsymmetricMatcherInterface } from 'vitest'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = any> extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatcherInterface extends TestingLibraryMatchers<typeof expect.stringContaining, any> {}
}
