import '../../styles/theme.css';
import { componentCatalogue } from './catalogueData';
import './Catalogue.css';

export function Catalogue() {
  return (
    <div className="catalogue-container">
      <header className="catalogue-header">
        <h1>AI-Friendly Component Catalogue</h1>
        <p className="lead">Structured component information for AI systems. Each component includes props, examples, and usage patterns.</p>
      </header>

      <div className="catalogue-content">
        {componentCatalogue.map((component) => (
          <section key={component.name} className="catalogue-component" id={component.name.toLowerCase()}>
            <h2>{component.name}</h2>
            <p className="component-description">{component.description}</p>

            <div className="catalogue-section">
              <h3>Import</h3>
              <pre className="code-block"><code>{component.importPath}</code></pre>
            </div>

            <div className="catalogue-section">
              <h3>Props</h3>
              <table className="props-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {component.props.map((prop) => (
                    <tr key={prop.name}>
                      <td><code>{prop.name}</code></td>
                      <td><code>{prop.type}</code></td>
                      <td>{prop.required ? 'Yes' : 'No'}</td>
                      <td>{prop.default || '-'}</td>
                      <td>{prop.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {component.examples.length > 0 && (
              <div className="catalogue-section">
                <h3>Examples</h3>
                {component.examples.map((example, idx) => (
                  <div key={idx} className="example-item">
                    <h4>{example.title}</h4>
                    <p className="text-sm">{example.description}</p>
                    <pre className="code-block"><code>{example.code}</code></pre>
                  </div>
                ))}
              </div>
            )}

            {component.relatedComponents && component.relatedComponents.length > 0 && (
              <div className="catalogue-section">
                <h3>Related Components</h3>
                <ul className="related-components">
                  {component.relatedComponents.map((related) => (
                    <li key={related}>
                      <a href={`#${related.toLowerCase()}`}>{related}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {component.cssClasses && component.cssClasses.length > 0 && (
              <div className="catalogue-section">
                <h3>CSS Classes</h3>
                <div className="css-classes">
                  {component.cssClasses.map((cssClass) => (
                    <code key={cssClass} className="css-class-tag">{cssClass}</code>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

