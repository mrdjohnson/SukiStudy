import { useEffect, useState } from 'react'
import { ActionIcon, Image, Modal } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { SubjectType } from '../core/types'
import { Icons } from './Icons'
import { ARTWORK_URLS } from '../utils/artworkUrls'

// Cache failed image URLs to avoid re-checking / flicker within a session.
const failedImages = new Set<string>()

export const MnemonicImage = ({
  id,
  type,
  url: initialUrl = null,
}: {
  id: string
  type: SubjectType
  url?: string | null
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl)
  const [error, setError] = useState(false)
  const [opened, { open, close }] = useDisclosure(false)

  useEffect(() => {
    if (initialUrl) {
      return
    }

    if (type === SubjectType.VOCABULARY) {
      setError(true)
      return
    }

    const url = ARTWORK_URLS[Number(id)]
    if (url) {
      if (failedImages.has(url)) {
        setError(true)
      } else {
        setImageUrl(url)
        setError(false)
      }
    } else {
      setError(true)
    }
  }, [id, type])

  const handleError = () => {
    if (imageUrl) failedImages.add(imageUrl)
    setError(true)
  }

  if (error || !imageUrl) return null

  return (
    <>
      <div
        className="mt-4 mb-4 relative group cursor-zoom-in inline-block"
        onClick={e => {
          e.stopPropagation()
          open()
        }}
      >
        <img
          src={imageUrl}
          alt={`${id} mnemonic visualization`}
          className="rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 max-h-64 mx-auto object-contain transition-transform group-hover:scale-[1.02] backdrop-blur-sm! w-full bg-linear-to-br from-white/20 to-transparent"
          onError={handleError}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg pointer-events-none">
          <Icons.Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
        {!initialUrl && (
          <p className="text-xs text-center text-gray-400 mt-1">
            Community Mnemonic Artwork (Tap to expand)
          </p>
        )}
      </div>

      <Modal
        opened={opened}
        onClose={close}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{ body: { backgroundColor: 'black' } }}
        zIndex={300}
      >
        <div
          className="relative w-full h-svh flex items-center justify-center bg-linear-to-br from-white/20 to-transparent backdrop-blur-sm!"
          onClick={e => {
            e.stopPropagation()
            close()
          }}
        >
          <ActionIcon
            variant="filled"
            color="gray"
            size="lg"
            radius="xl"
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
          >
            <Icons.X size={20} />
          </ActionIcon>
          <Image
            src={imageUrl}
            fit="contain"
            h="90vh"
            w="auto"
            className="backdrop-blur-sm! rounded-xl!"
          />
        </div>
      </Modal>
    </>
  )
}
