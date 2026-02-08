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
    'border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-500 cursor-pointer '
  let icon = null

  if (hasSelectedAnswer) {
    if (isCorrect) {
      btnClass =
        'border-transparent bg-green-50 dark:bg-green-600 text-green-700 dark:text-black font-bold ring-4 ring-green-200 dark:ring-green-500'
      icon = <Icons.Check className="w-5 h-5" />
    } else if (isSelected) {
      btnClass =
        'border-transparent bg-red-50 dark:bg-red-700 text-red-700 dark:text-white! ring-4 ring-red-500 opacity-50'
      icon = <Icons.X className="w-5 h-5" />
    } else {
      btnClass = 'border-gray-200 opacity-50 dark:opacity-20 dark:bg-gray-700 dark:text-white'
    }
  } else if (isSelectedOption) {
    btnClass =
      'border-indigo-500 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-500 text-indigo-700 dark:text-white font-medium ring-2 ring-indigo-200 dark:ring-indigo-800'
  } else if (disabled) {
    btnClass =
      'border-gray-200 opacity-50 dark:opacity-20 bg-gray-200 dark:bg-gray-700 dark:text-white'
  }

  return (
    <button
      key={option}
      onClick={() => handleAnswer(option)}
      disabled={!!selectedAnswer || disabled}
      className={clsx(
        'relative p-4 rounded-xl border-2 transition-all font-medium text-xl! w-full',
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
