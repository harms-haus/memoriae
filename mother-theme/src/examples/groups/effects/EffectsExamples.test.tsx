import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EffectsExamples } from './EffectsExamples';

describe('EffectsExamples', () => {
  describe('Rendering', () => {
    it('should render header with title and description', () => {
      render(<EffectsExamples />);

      expect(screen.getByText('Effects')).toBeInTheDocument();
      expect(screen.getByText('Animations and visual effects')).toBeInTheDocument();
    });

    it('should render examples-container', () => {
      const { container } = render(<EffectsExamples />);
      const containerEl = container.querySelector('.examples-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('should render examples-header', () => {
      const { container } = render(<EffectsExamples />);
      const header = container.querySelector('.examples-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Animations Section', () => {
    it('should render animations section', () => {
      render(<EffectsExamples />);

      expect(screen.getByText('Animations')).toBeInTheDocument();
    });

    it('should render beat animations section', () => {
      render(<EffectsExamples />);

      expect(screen.getByText('Beat Animations')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Gentle animations that repeat with 1 beat animation (1000ms) followed by 3 beats pause (3000ms).'
        )
      ).toBeInTheDocument();
    });

    it('should render beat animation demos', () => {
      const { container } = render(<EffectsExamples />);

      const shakeDemo = container.querySelector('.animation-demo.shake');
      const bounceDemo = container.querySelector('.animation-demo.bounce-subtle');
      const growDemo = container.querySelector('.animation-demo.grow');
      const pulseDemo = container.querySelector('.animation-demo.pulse-glow');

      expect(shakeDemo).toBeInTheDocument();
      expect(bounceDemo).toBeInTheDocument();
      expect(growDemo).toBeInTheDocument();
      expect(pulseDemo).toBeInTheDocument();
    });

    it('should render beat animation labels', () => {
      render(<EffectsExamples />);

      // Multiple instances of these labels exist (beat and continuous), so use getAllByText
      const shakeLabels = screen.getAllByText('Shake');
      expect(shakeLabels.length).toBeGreaterThan(0);
      const bounceLabels = screen.getAllByText('Bounce');
      expect(bounceLabels.length).toBeGreaterThan(0);
      const growLabels = screen.getAllByText('Grow');
      expect(growLabels.length).toBeGreaterThan(0);
      const pulseLabels = screen.getAllByText('Pulse Glow');
      expect(pulseLabels.length).toBeGreaterThan(0);
    });

    it('should render continuous animations section', () => {
      render(<EffectsExamples />);

      expect(screen.getByText('Continuous Animations')).toBeInTheDocument();
      expect(
        screen.getByText('Animations that repeat continuously without pause.')
      ).toBeInTheDocument();
    });

    it('should render continuous animation demos', () => {
      const { container } = render(<EffectsExamples />);

      const shakeContinuous = container.querySelector('.animation-demo.shake-continuous');
      const bounceContinuous = container.querySelector('.animation-demo.bounce-subtle-continuous');
      const growContinuous = container.querySelector('.animation-demo.grow-continuous');
      const pulseContinuous = container.querySelector('.animation-demo.pulse-glow-continuous');

      expect(shakeContinuous).toBeInTheDocument();
      expect(bounceContinuous).toBeInTheDocument();
      expect(growContinuous).toBeInTheDocument();
      expect(pulseContinuous).toBeInTheDocument();
    });

    it('should render hover animations section', () => {
      render(<EffectsExamples />);

      expect(screen.getByText('Hover Animations')).toBeInTheDocument();
      expect(screen.getByText('Animations that activate on hover.')).toBeInTheDocument();
    });

    it('should render hover animation demos', () => {
      const { container } = render(<EffectsExamples />);

      const raiseHover = container.querySelector('.animation-demo.raise-hover');
      const growHover = container.querySelector('.animation-demo.grow-hover');

      expect(raiseHover).toBeInTheDocument();
      expect(growHover).toBeInTheDocument();
    });

    it('should render hover animation labels', () => {
      render(<EffectsExamples />);

      expect(screen.getByText('Raise (hover)')).toBeInTheDocument();
      expect(screen.getByText('Grow (hover)')).toBeInTheDocument();
    });
  });

  describe('Animation Demo Structure', () => {
    it('should render animation-demo class for all demos', () => {
      const { container } = render(<EffectsExamples />);
      const demos = container.querySelectorAll('.animation-demo');
      expect(demos.length).toBeGreaterThan(0);
    });

    it('should render demo-box inside animation demos', () => {
      const { container } = render(<EffectsExamples />);
      const demoBoxes = container.querySelectorAll('.demo-box');
      expect(demoBoxes.length).toBeGreaterThan(0);
    });

    it('should have correct animation classes', () => {
      const { container } = render(<EffectsExamples />);

      // Beat animations
      expect(container.querySelector('.shake')).toBeInTheDocument();
      expect(container.querySelector('.bounce-subtle')).toBeInTheDocument();
      expect(container.querySelector('.grow')).toBeInTheDocument();
      expect(container.querySelector('.pulse-glow')).toBeInTheDocument();

      // Continuous animations
      expect(container.querySelector('.shake-continuous')).toBeInTheDocument();
      expect(container.querySelector('.bounce-subtle-continuous')).toBeInTheDocument();
      expect(container.querySelector('.grow-continuous')).toBeInTheDocument();
      expect(container.querySelector('.pulse-glow-continuous')).toBeInTheDocument();

      // Hover animations
      expect(container.querySelector('.raise-hover')).toBeInTheDocument();
      expect(container.querySelector('.grow-hover')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render panels with correct structure', () => {
      const { container } = render(<EffectsExamples />);
      const panels = container.querySelectorAll('.panel');
      expect(panels.length).toBeGreaterThan(0);
    });

    it('should use flex layout for animation demos', () => {
      const { container } = render(<EffectsExamples />);
      const flexContainers = container.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering with all animations', () => {
      const { container } = render(<EffectsExamples />);
      expect(container.querySelector('.examples-container')).toBeInTheDocument();
    });

    it('should render all section headings', () => {
      render(<EffectsExamples />);

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});

