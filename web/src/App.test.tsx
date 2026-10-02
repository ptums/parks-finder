import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { App } from './App';

describe('App shell', () => {
  it('has header, main and footer landmarks and one h1', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(screen.getByRole('banner')).getByRole('heading', { level: 1 })).toHaveTextContent(
      'Find a Park',
    );
  });

  it('has both skip links pointing at real targets', () => {
    render(<App />);
    const results = screen.getByRole('link', { name: 'Skip to results' });
    const map = screen.getByRole('link', { name: 'Skip map' });
    expect(document.querySelector(results.getAttribute('href')!)).not.toBeNull();
    expect(document.querySelector(map.getAttribute('href')!)).not.toBeNull();
  });

  it('has one polite status region and no AI controls', () => {
    render(<App />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText(/ai search/i)).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
