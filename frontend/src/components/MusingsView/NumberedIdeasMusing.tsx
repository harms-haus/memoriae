import { useState } from 'react'
import type { IdeaMusing, NumberedIdeasContent } from '../../types'
import { ApplyIdeaModal } from './ApplyIdeaModal'
import { PromptLLMModal } from './PromptLLMModal'
import './NumberedIdeasMusing.css'

interface NumberedIdeasMusingProps {
  musing: IdeaMusing
  onUpdate: () => void
}

export function NumberedIdeasMusing({ musing, onUpdate }: NumberedIdeasMusingProps) {
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null)

  const content = musing.content as NumberedIdeasContent
  const ideas = content.ideas || []

  const handleIdeaClick = (index: number) => {
    // Check if it's the last item (custom prompt)
    if (index === ideas.length - 1) {
      setPromptModalOpen(true)
    } else {
      setSelectedIdeaIndex(index)
      setApplyModalOpen(true)
    }
  }

  const handleApplyComplete = () => {
    setApplyModalOpen(false)
    setSelectedIdeaIndex(null)
    onUpdate()
  }

  const handlePromptComplete = () => {
    setPromptModalOpen(false)
    onUpdate()
  }

  return (
    <>
      <div className="numbered-ideas-musing">
        <ol className="numbered-ideas-list">
          {ideas.map((idea, index) => {
            const isCustomPrompt = index === ideas.length - 1
            return (
              <li
                key={index}
                className={`numbered-idea-item ${isCustomPrompt ? 'numbered-idea-custom' : ''}`}
                onClick={() => handleIdeaClick(index)}
              >
                {isCustomPrompt ? (
                  <div className="numbered-idea-custom-prompt">
                    <textarea
                      readOnly
                      value={idea}
                      className="numbered-idea-textarea"
                      placeholder="Click to add a custom prompt..."
                    />
                  </div>
                ) : (
                  <span className="numbered-idea-text">{idea}</span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {applyModalOpen && selectedIdeaIndex !== null && (
        <ApplyIdeaModal
          open={applyModalOpen}
          onOpenChange={setApplyModalOpen}
          musing={musing}
          ideaIndex={selectedIdeaIndex}
          onApplied={handleApplyComplete}
        />
      )}

      {promptModalOpen && (
        <PromptLLMModal
          open={promptModalOpen}
          onOpenChange={setPromptModalOpen}
          musing={musing}
          onApplied={handlePromptComplete}
        />
      )}
    </>
  )
}

