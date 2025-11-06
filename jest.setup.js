// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Set NODE_ENV to test for Prisma and other libraries
process.env.NODE_ENV = 'test'

// Polyfill TextEncoder for Node.js test environment
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
