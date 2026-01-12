import { Icons } from './Icons'

type MultiChoiceGameItemProps = {
  option: string
  answer: string
  selectedAnswer: { value: string; correct: boolean } | null
  handleAnswer: (value: string) => void
}

export const MultiChoiceSelectionItem = ({
  option,
  selectedAnswer,
  handleAnswer,
  answer,
}: MultiChoiceGameItemProps) => {
  const isSelected = selectedAnswer?.value === option
  const isCorrect = option === answer

  let btnClass = 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700'

  if (selectedAnswer) {
    if (isCorrect) {
      btnClass = 'border-green-500 bg-green-50 text-green-700 font-bold ring-2 ring-green-200'
    } else if (isSelected) {
      btnClass = 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200 opacity-50'
    } else {
      btnClass = 'border-gray-200 opacity-50'
    }
  }

  return (
    <button
      key={option}
      onClick={() => handleAnswer(option)}
      disabled={!!selectedAnswer}
      className={`p-4 rounded-xl border-2 transition-all font-medium text-lg ${btnClass}`}
    >
      {option}
      {selectedAnswer && isCorrect && <Icons.Check className="inline-block ml-2 w-5 h-5" />}
      {isSelected && !isCorrect && <Icons.X className="inline-block ml-2 w-5 h-5" />}
    </button>
  )
}
