import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

type VendorChunkName =
  | 'vendor-react'
  | 'vendor-state'
  | 'vendor-ui'
  | 'vendor-charts'
  | 'vendor-animations'
  | 'vendor-i18n'
  | 'vendor-misc'

const VENDOR_CHUNK_BY_PACKAGE = new Map<string, VendorChunkName>([
  ['react', 'vendor-react'],
  ['react-dom', 'vendor-react'],
  ['react-router', 'vendor-react'],
  ['react-router-dom', 'vendor-react'],
  ['scheduler', 'vendor-react'],

  ['@tanstack/react-query', 'vendor-state'],
  ['@tanstack/query-core', 'vendor-state'],
  ['@tanstack/react-query-devtools', 'vendor-state'],
  ['@tanstack/query-devtools', 'vendor-state'],

  ['@radix-ui/react-alert-dialog', 'vendor-ui'],
  ['@radix-ui/react-dialog', 'vendor-ui'],
  ['@radix-ui/react-label', 'vendor-ui'],
  ['@radix-ui/react-select', 'vendor-ui'],
  ['@radix-ui/react-slot', 'vendor-ui'],
  ['@radix-ui/react-tabs', 'vendor-ui'],
  ['clsx', 'vendor-ui'],
  ['class-variance-authority', 'vendor-ui'],
  ['tailwind-merge', 'vendor-ui'],
  ['lucide-react', 'vendor-ui'],

  ['recharts', 'vendor-charts'],
  ['d3-array', 'vendor-charts'],
  ['d3-color', 'vendor-charts'],
  ['d3-format', 'vendor-charts'],
  ['d3-interpolate', 'vendor-charts'],
  ['d3-path', 'vendor-charts'],
  ['d3-scale', 'vendor-charts'],
  ['d3-shape', 'vendor-charts'],
  ['d3-time', 'vendor-charts'],
  ['d3-time-format', 'vendor-charts'],
  ['internmap', 'vendor-charts'],
  ['victory-vendor', 'vendor-charts'],

  ['framer-motion', 'vendor-animations'],
  ['motion-dom', 'vendor-animations'],
  ['motion-utils', 'vendor-animations'],

  ['i18next', 'vendor-i18n'],
  ['react-i18next', 'vendor-i18n'],
])

const getModulePathAfterNodeModules = (id: string): string | null => {
  const normalized = id.replace(/\\/g, '/')
  const marker = 'node_modules/'
  const markerIndex = normalized.lastIndexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  let modulePath = normalized.slice(markerIndex + marker.length)

  // Support pnpm virtual store paths like:
  // node_modules/.pnpm/pkg@x/node_modules/pkg/...
  if (modulePath.startsWith('.pnpm/')) {
    const nestedMarker = '/node_modules/'
    const nestedIndex = modulePath.indexOf(nestedMarker)
    if (nestedIndex === -1) {
      return null
    }
    modulePath = modulePath.slice(nestedIndex + nestedMarker.length)
  }

  return modulePath
}

const getNodeModulePackageName = (id: string): string | null => {
  const modulePath = getModulePathAfterNodeModules(id)
  if (!modulePath) {
    return null
  }

  const parts = modulePath.split('/')
  if (parts[0].startsWith('@') && parts[1]) {
    return `${parts[0]}/${parts[1]}`
  }

  return parts[0] || null
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const packageName = getNodeModulePackageName(id)
          if (!packageName) {
            return undefined
          }

          return VENDOR_CHUNK_BY_PACKAGE.get(packageName) ?? 'vendor-misc'
        },
      },
    },
  },
})
