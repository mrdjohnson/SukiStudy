import { useRef } from 'react'

/**
 * Custom hook that detects double mousedown events within a specified time window
 * @param onDoubleMouseDown - Callback function to execute when double mousedown is detected
 * @param threshold - Time window in milliseconds (default: 300ms)
 * @returns Mouse event handler function
 */
export const useDoubleMouseDown = (
  onDoubleMouseDown: (e: React.MouseEvent) => void,
  threshold: number = 300,
) => {
  const lastMouseDownRef = useRef<number>(0)

  const handleDoubleMouseDown = (e: React.MouseEvent) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastMouseDownRef.current

    if (timeSinceLastClick < threshold) {
      e.stopPropagation()
      onDoubleMouseDown(e)
    }

    lastMouseDownRef.current = now
  }

  return handleDoubleMouseDown
}
