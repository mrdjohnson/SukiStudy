import React, { useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'

export const FontLoader: React.FC = () => {
  const { enabledFonts, availableFonts } = useSettings()

  useEffect(() => {
    // Load enabled fonts
    enabledFonts.forEach(fontName => {
      const font = availableFonts.find(f => f.name === fontName)
      if (font) {
        font.load().catch(err => console.error(`Failed to load font ${fontName}`, err))
      }
    })
  }, [enabledFonts, availableFonts])

  return null
}
