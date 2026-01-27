import clsx from 'clsx'
import { Icons } from './Icons'

type MultiChoiceGameItemProps = {
  option: string
  answer?: string
  selectedAnswer?: { value: string; correct: boolean } | null
  isSelectedOption?: boolean
  feedbackStatus?: 'correct' | 'incorrect' | null
  handleAnswer: (value: string) => void
  disabled?: boolean
}

export const MultiChoiceSelectionItem = ({
  option,
  selectedAnswer,
  isSelectedOption,
  feedbackStatus,
  handleAnswer,
  answer,
  disabled,
}: MultiChoiceGameItemProps) => {
  const hasSelectedAnswer = !!selectedAnswer || !!feedbackStatus
  const isSelected = feedbackStatus === 'incorrect' || selectedAnswer?.value === option
  const isCorrect = feedbackStatus === 'correct' || option === answer

  if (selectedAnswer && !isSelected) {
    disabled = true
  }

  let btnClass =
    'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700 cursor-pointer '
  let icon = null

  if (hasSelectedAnswer) {
    if (isCorrect) {
      btnClass = 'border-green-500 bg-green-50 text-green-700 font-bold ring-2 ring-green-200'
      icon = <Icons.Check className="w-5 h-5" />
    } else if (isSelected) {
      btnClass = 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200 opacity-50'
      icon = <Icons.X className="w-5 h-5" />
    } else {
      btnClass = 'border-gray-200 opacity-50'
    }
  } else if (isSelectedOption) {
    btnClass = 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium ring-2 ring-indigo-200'
  } else if (disabled) {
    btnClass = 'border-gray-200 opacity-50 bg-gray-200'
  }

  return (
    <button
      key={option}
      onClick={() => handleAnswer(option)}
      disabled={!!selectedAnswer || disabled}
      className={clsx(
        'relative p-4 rounded-xl border-2 transition-all font-medium text-lg w-full',
        btnClass,
      )}
    >
      <span className="relative inline-block">
        {option}

        {icon && (
          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 pointer-events-none">
            {icon}
          </span>
        )}
      </span>
    </button>
  )
}
