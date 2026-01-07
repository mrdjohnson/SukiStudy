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
      const distDir = path.resolve(root, 'dist')

      if (!fs.existsSync(distDir)) {
        return
      }

      let destDir

      if (fs.existsSync(devDestDir)) {
        destDir = devDestDir
      } else if (fs.existsSync(prodDestDir)) {
        destDir = prodDestDir
      } else {
        return
      }

      const files = fs.readdirSync(distDir)
      const pwaFiles = files.filter(file => file === 'sw.js' || file.startsWith('workbox-'))

      for (const file of pwaFiles) {
        fs.copyFileSync(path.join(distDir, file), path.join(destDir, file))
        console.log(`[vite-plugin-vercel-pwa-adapter] Copied ${file} to ${destDir}`)
      }
    },
  }
}
