import { useState } from 'react';
import '../../../styles/theme.css';
import {
  Button,
  Badge,
  Tag,
  Input,
  Textarea,
  Checkbox,
  RadioGroup,
  Radio,
  Toggle,
  Slider,
  Progress,
  Tabs,
  Tab,
  TabPanel,
} from '../../../components';
import { CheckCircle, X, Settings, Search } from 'lucide-react';
import { ExampleSection } from '../../shared/ExampleSection';
import './ComponentExamples.css';

export function ComponentExamples() {
  const [sliderValue, setSliderValue] = useState(50);
  const [radioValue, setRadioValue] = useState('option1');
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);

  return (
    <div className="examples-container">
      <header className="examples-header">
        <h1>Components</h1>
        <p className="lead">Interactive UI components: buttons, forms, progress, tabs, tags, and badges</p>
      </header>

      {/* Buttons Section */}
      <ExampleSection id="buttons" title="Buttons">
        <div className="panel">
          <h3>Button Variants</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
        </div>

        <div className="panel">
          <h3>Button States</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary">Normal</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="secondary">Normal</Button>
            <Button variant="secondary" disabled>Disabled</Button>
            <Button variant="ghost">Normal</Button>
            <Button variant="ghost" disabled>Disabled</Button>
          </div>
        </div>

        <div className="panel">
          <h3>Buttons with Icons</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary" icon={CheckCircle}>Save</Button>
            <Button variant="secondary" icon={X} iconPosition="right">Cancel</Button>
            <Button variant="ghost" icon={Settings}>Settings</Button>
          </div>
        </div>

        <div className="panel">
          <h3>Loading Buttons</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary" loading>Loading...</Button>
            <Button variant="secondary" loading>Processing</Button>
          </div>
        </div>
      </ExampleSection>

      {/* Form Controls Section */}
      <ExampleSection id="forms" title="Form Controls">
        <div className="panel">
          <h3>Input Fields</h3>
          <div className="flex flex-col gap-4">
            <Input label="Text Input" placeholder="Enter text here..." />
            <Input label="Input with Icon" icon={Search} placeholder="Search..." />
            <Input label="Disabled Input" placeholder="Disabled input" disabled />
            <Input label="Input with Error" placeholder="Invalid input" error="This field is required" />
            <Input label="Input with Helper Text" helperText="Helper text goes here" placeholder="Enter value" />
            <Input label="Input with Character Count" maxLength={100} showCount placeholder="Type here..." />
            <Textarea label="Textarea" placeholder="Enter multiple lines of text..." />
            <Textarea label="Disabled Textarea" placeholder="Disabled textarea" disabled />
          </div>
        </div>

        <div className="panel">
          <h3>Select Dropdown</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Select Option</label>
              <select className="select">
                <option>Choose an option...</option>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <label className="label">Disabled Select</label>
              <select className="select" disabled>
                <option>Disabled select</option>
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Checkboxes</h3>
          <div className="flex flex-col gap-3">
            <Checkbox checked={checkbox1} onCheckedChange={setCheckbox1}>
              Checked checkbox
            </Checkbox>
            <Checkbox checked={checkbox2} onCheckedChange={setCheckbox2}>
              Unchecked checkbox
            </Checkbox>
            <Checkbox checked={false} disabled>
              Disabled checkbox
            </Checkbox>
          </div>
        </div>

        <div className="panel">
          <h3>Radio Buttons</h3>
          <RadioGroup value={radioValue} onValueChange={setRadioValue}>
            <Radio value="option1">Selected radio</Radio>
            <Radio value="option2">Unselected radio</Radio>
            <Radio value="option3" disabled>Disabled radio</Radio>
          </RadioGroup>
        </div>

        <div className="panel">
          <h3>Toggle Switches</h3>
          <div className="flex flex-col gap-3">
            <Toggle checked={toggle1} onCheckedChange={setToggle1}>Toggle ON</Toggle>
            <Toggle checked={toggle2} onCheckedChange={setToggle2}>Toggle OFF</Toggle>
            <Toggle checked={false} disabled>Disabled Toggle</Toggle>
          </div>
        </div>

        <div className="panel">
          <h3>Sliders</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Range Slider ({sliderValue})</label>
              <Slider value={sliderValue} onValueChange={setSliderValue} min={0} max={100} />
            </div>
            <div>
              <label className="label">Slider at 75%</label>
              <Slider value={75} min={0} max={100} disabled />
            </div>
          </div>
        </div>
      </ExampleSection>

      {/* Progress Bars Section */}
      <ExampleSection id="progress" title="Progress Bars">
        <div className="panel">
          <h3>Progress Bar Variants</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Progress 25%</label>
              <Progress value={25} />
            </div>
            <div>
              <label className="label">Progress 50%</label>
              <Progress value={50} />
            </div>
            <div>
              <label className="label">Progress 75%</label>
              <Progress value={75} />
            </div>
            <div>
              <label className="label">Progress 100%</label>
              <Progress value={100} />
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Colored Progress Bars</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Success (Green)</label>
              <Progress value={60} variant="success" />
            </div>
            <div>
              <label className="label">Warning (Orange)</label>
              <Progress value={40} variant="warning" />
            </div>
            <div>
              <label className="label">Error (Red)</label>
              <Progress value={30} variant="error" />
            </div>
          </div>
        </div>
      </ExampleSection>

      {/* Tabs Section */}
      <ExampleSection id="tabs" title="Tabs">
        <div className="panel">
          <h3>Tab Navigation</h3>
          <Tabs defaultValue="tab1">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
            <Tab value="tab3">Tab 3</Tab>
            <Tab value="tab4" disabled>Tab 4 (Disabled)</Tab>
            <TabPanel value="tab1">
              <p>Content for Tab 1. Click tabs to see the underline smoothly animate.</p>
            </TabPanel>
            <TabPanel value="tab2">
              <p>Content for Tab 2. This demonstrates the tab switching functionality.</p>
            </TabPanel>
            <TabPanel value="tab3">
              <p>Content for Tab 3. The tabs are fully keyboard accessible.</p>
            </TabPanel>
            <TabPanel value="tab4">
              <p>This tab is disabled.</p>
            </TabPanel>
          </Tabs>
        </div>
      </ExampleSection>

      {/* Tags Section */}
      <ExampleSection id="tags" title="Tags">
        <div className="panel">
          <h3>Tag Colors</h3>
          <div className="tag-list">
            <Tag>Default Tag</Tag>
            <Tag color="var(--accent-blue)">Blue Tag</Tag>
            <Tag color="var(--accent-green)">Green Tag</Tag>
            <Tag color="var(--accent-purple)">Purple Tag</Tag>
            <Tag color="var(--accent-pink)">Pink Tag</Tag>
            <Tag active>Active Tag</Tag>
          </div>
        </div>

        <div className="panel">
          <h3>Interactive Tags</h3>
          <div className="tag-list">
            <Tag onRemove={() => alert('Tag removed')}>Removable Tag</Tag>
            <Tag color="var(--accent-blue)" onRemove={() => alert('Blue tag removed')}>Removable Blue</Tag>
          </div>
        </div>
      </ExampleSection>

      {/* Badges Section */}
      <ExampleSection id="badges" title="Badges">
        <div className="panel">
          <h3>Badge Variants</h3>
          <div className="flex gap-4 flex-wrap items-center">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </div>
      </ExampleSection>
    </div>
  );
}

