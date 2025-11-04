import '../../../styles/theme.css';
import { ExampleSection } from '../../shared/ExampleSection';
import './EffectsExamples.css';

export function EffectsExamples() {
  return (
    <div className="examples-container">
      <header className="examples-header">
        <h1>Effects</h1>
        <p className="lead">Animations and visual effects</p>
      </header>

      {/* Animations Section */}
      <ExampleSection id="animations" title="Animations">
        <div className="panel">
          <h3>Beat Animations</h3>
          <p className="text-sm">Gentle animations that repeat with 1 beat animation (1000ms) followed by 3 beats pause (3000ms).</p>
          <div className="flex gap-4 flex-wrap">
            <div className="animation-demo shake">
              <div className="demo-box">Shake</div>
            </div>
            <div className="animation-demo bounce-subtle">
              <div className="demo-box">Bounce</div>
            </div>
            <div className="animation-demo grow">
              <div className="demo-box">Grow</div>
            </div>
            <div className="animation-demo pulse-glow">
              <div className="demo-box">Pulse Glow</div>
            </div>
          </div>

          <h3>Continuous Animations</h3>
          <p className="text-sm">Animations that repeat continuously without pause.</p>
          <div className="flex gap-4 flex-wrap">
            <div className="animation-demo shake-continuous">
              <div className="demo-box">Shake</div>
            </div>
            <div className="animation-demo bounce-subtle-continuous">
              <div className="demo-box">Bounce</div>
            </div>
            <div className="animation-demo grow-continuous">
              <div className="demo-box">Grow</div>
            </div>
            <div className="animation-demo pulse-glow-continuous">
              <div className="demo-box">Pulse Glow</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Hover Animations</h3>
          <p className="text-sm">Animations that activate on hover.</p>
          <div className="flex gap-4 flex-wrap">
            <div className="animation-demo raise-hover">
              <div className="demo-box">Raise (hover)</div>
            </div>
            <div className="animation-demo grow-hover">
              <div className="demo-box">Grow (hover)</div>
            </div>
          </div>
        </div>
      </ExampleSection>
    </div>
  );
}

