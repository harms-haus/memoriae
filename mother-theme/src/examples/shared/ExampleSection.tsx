import React from 'react';

interface ExampleSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function ExampleSection({ id, title, children }: ExampleSectionProps) {
  return (
    <section id={id} className="showcase-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

