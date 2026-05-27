import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

export default function vercelPwaLink(): Plugin {
  return {
    name: 'vite-plugin-vercel-pwa-adapter',
    enforce: 'post',
    closeBundle() {
      const root = process.cwd()

      const devDestDir = path.resolve(root, `.vercel/output/static`)
      const prodDestDir = path.resolve(root, 'vercel/output/static')
      const nitroDestDir = path.resolve(root, '.output/public')
      const distDir = path.resolve(root, 'dist')

      if (!fs.existsSync(distDir)) {
        return
      }

      const destDirs: string[] = []

      if (fs.existsSync(devDestDir)) {
        destDirs.push(devDestDir)
      } else if (fs.existsSync(prodDestDir)) {
        destDirs.push(prodDestDir)
      }

      if (fs.existsSync(nitroDestDir)) {
        destDirs.push(nitroDestDir)
      }

      if (destDirs.length === 0) {
        return
      }

      const files = fs.readdirSync(distDir)
      const pwaFiles = files.filter(file => file === 'sw.js' || file.startsWith('workbox-'))

      for (const destDir of destDirs) {
        for (const file of pwaFiles) {
          fs.copyFileSync(path.join(distDir, file), path.join(destDir, file))
          console.log(`[vite-plugin-vercel-pwa-adapter] Copied ${file} to ${destDir}`)
        }
      }
    },
  }
}
