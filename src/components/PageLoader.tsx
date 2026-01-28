import logo from '@/src/assets/apple-touch-icon.png'

export const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div className="bg-white p-2 rounded-full shadow-lg mb-4">
      <div className="rounded-full shadow-md shadow-red-400">
        <img src={logo} alt="Loading..." className="size-16 animate-pulse" />
      </div>
    </div>
    <p className="text-gray-500 font-medium">Loading...</p>
  </div>
)
