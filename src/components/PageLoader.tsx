import logo from '@/src/assets/apple-touch-icon.png'

export const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center absolute top-0 left-0 right-0">
    <div className="shadow-secondary/50 rounded-full shadow-lg mb-4">
      <div className="rounded-full shadow-md shadow-secondary/60 ">
        <img src={logo} alt="SukiStudy Logo" className="size-16 animate-pulse" />
      </div>
    </div>

    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading SukiStudy...</p>
  </div>
)
