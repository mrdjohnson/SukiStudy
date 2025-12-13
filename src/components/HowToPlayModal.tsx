import React, { useState } from 'react'
import { Modal, Button, ThemeIcon, Group, Text, Stepper, Stack } from '@mantine/core'
import { Icons } from './Icons'

interface Step {
  title: string
  description: string
  icon: React.ElementType
}

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  steps: Step[]
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  title,
  steps,
}) => {
  const [active, setActive] = useState(0)

  const handleNext = () => {
    if (active < steps.length - 1) {
      setActive(prev => prev + 1)
    } else {
      onClose()
      setActive(0)
    }
  }

  const handlePrev = () => {
    if (active > 0) {
      setActive(prev => prev - 1)
    }
  }

  const currentStep = steps[active]
  const StepIcon = currentStep.icon

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          {title}
        </Text>
      }
      centered
      size="md"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Stack align="center" py="md">
        <ThemeIcon size={80} radius="xl" variant="light" color="indigo">
          <StepIcon style={{ width: 40, height: 40 }} />
        </ThemeIcon>

        <Text size="xl" fw={700} mt="md">
          {currentStep.title}
        </Text>
        <Text ta="center" c="dimmed" style={{ minHeight: 60 }}>
          {currentStep.description}
        </Text>

        <Group mt="xl">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === active ? 'w-8 bg-indigo-600' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </Group>

        <Group justify="space-between" w="100%" mt="xl">
          <Button variant="subtle" onClick={handlePrev} disabled={active === 0}>
            Back
          </Button>
          <Button onClick={handleNext}>
            {active === steps.length - 1 ? "Let's Play!" : 'Next'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
