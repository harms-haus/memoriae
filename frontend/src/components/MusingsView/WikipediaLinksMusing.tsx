import type { IdeaMusing, WikipediaLinksContent } from '../../types'
import './WikipediaLinksMusing.css'

interface WikipediaLinksMusingProps {
  musing: IdeaMusing
}

export function WikipediaLinksMusing({ musing }: WikipediaLinksMusingProps) {
  const content = musing.content as WikipediaLinksContent
  const links = content.links || []

  return (
    <div className="wikipedia-links-musing">
      <ul className="wikipedia-links-list">
        {links.map((link, index) => (
          <li key={index} className="wikipedia-link-item">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="wikipedia-link"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

