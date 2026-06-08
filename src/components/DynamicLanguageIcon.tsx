export const DynamicLanguageIcon = ({
  japanese = false,
  size = 24,
  color = 'currentColor',
  ...props
}) => {
  // Styles for the emphasized part
  const activeStyle = {
    strokeWidth: 2.5,
    opacity: 1,
    transition: 'all 0.3s ease-in-out',
  }

  // Styles for the dimmed/smaller part
  const inactiveStyle = {
    strokeWidth: 1.25,
    opacity: 0.4,
    transition: 'all 0.3s ease-in-out',
  }

  const japaneseStyle = japanese ? activeStyle : inactiveStyle
  const latinStyle = japanese ? inactiveStyle : activeStyle

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Structural bounding box */}
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />

      {/* PART A: Japanese / Asian Character (Left Side) */}
      <g style={japaneseStyle}>
        <path d="M4 5h7" />
        <path d="M9 3v2c0 4.418 -2.239 8 -5 8" />
        <path d="M5 9c0 2.144 2.952 3.908 6.7 4" />
        <path d="M6.694 3l.793 .582" />
      </g>

      {/* PART B: Latin "A" Character (Right Side) */}
      <g style={latinStyle}>
        <path d="M12 20l4 -9l4 9" />
        <path d="M19.1 18h-6.2" />
      </g>
    </svg>
  )
}
