import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { IdeaMusing, MarkdownContent } from '../../types'
import './MarkdownMusing.css'

interface MarkdownMusingProps {
  musing: IdeaMusing
}

export function MarkdownMusing({ musing }: MarkdownMusingProps) {
  const content = musing.content as MarkdownContent
  const markdown = content.markdown || ''

  return (
    <div className="markdown-musing">
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-content">
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

