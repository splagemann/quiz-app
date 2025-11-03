/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/app/components/AdminHeader';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'back': 'Back',
    };
    return translations[key] || key;
  },
  useLocale: () => 'en',
}));

// Mock DarkModeToggle component
jest.mock('@/app/components/DarkModeToggle', () => ({
  DarkModeToggle: () => <div data-testid="dark-mode-toggle">Dark Mode Toggle</div>,
}));

// Mock LanguageSelector component
jest.mock('@/app/components/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector">Language Selector</div>,
}));

describe('AdminHeader', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: mockBack,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should render title correctly', () => {
    render(<AdminHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render dark mode toggle', () => {
    render(<AdminHeader title="Test Title" />);
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  it('should render language selector', () => {
    render(<AdminHeader title="Test Title" />);
    expect(screen.getByTestId('language-selector')).toBeInTheDocument();
  });

  it('should not render button row when no back button and no children', () => {
    const { container } = render(<AdminHeader title="Test Title" />);
    const buttonRows = container.querySelectorAll('.flex.flex-col.sm\\:flex-row.gap-3');
    expect(buttonRows.length).toBe(0);
  });

  it('should not render back button by default', () => {
    render(<AdminHeader title="Test Title" />);
    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('should render back button when showBackButton is true', () => {
    render(<AdminHeader title="Test Title" showBackButton={true} />);
    const backButton = screen.getByText('Back');
    expect(backButton).toBeInTheDocument();
  });

  it('should call router.back() when back button is clicked without backButtonHref', () => {
    render(<AdminHeader title="Test Title" showBackButton={true} />);
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should call router.push with backButtonHref when provided', () => {
    render(
      <AdminHeader
        title="Test Title"
        showBackButton={true}
        backButtonHref="/admin"
      />
    );
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    expect(mockPush).toHaveBeenCalledWith('/admin');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('should render children in button row', () => {
    render(
      <AdminHeader title="Test Title">
        <button>Custom Button</button>
      </AdminHeader>
    );
    expect(screen.getByText('Custom Button')).toBeInTheDocument();
  });

  it('should render both back button and children in same row', () => {
    render(
      <AdminHeader title="Test Title" showBackButton={true}>
        <button>Custom Button</button>
      </AdminHeader>
    );
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Custom Button')).toBeInTheDocument();
  });

  it('should render multiple children in button row', () => {
    render(
      <AdminHeader title="Test Title">
        <button>Button 1</button>
        <button>Button 2</button>
        <button>Button 3</button>
      </AdminHeader>
    );
    expect(screen.getByText('Button 1')).toBeInTheDocument();
    expect(screen.getByText('Button 2')).toBeInTheDocument();
    expect(screen.getByText('Button 3')).toBeInTheDocument();
  });

  it('should have correct button styling for back button', () => {
    render(<AdminHeader title="Test Title" showBackButton={true} />);
    const backButton = screen.getByText('Back').closest('button');
    expect(backButton).toHaveClass('bg-gray-200');
    expect(backButton).toHaveClass('dark:bg-gray-700');
    expect(backButton).toHaveClass('hover:bg-gray-300');
    expect(backButton).toHaveClass('dark:hover:bg-gray-600');
  });

  it('should have correct aria-label for back button', () => {
    render(<AdminHeader title="Test Title" showBackButton={true} />);
    const backButton = screen.getByLabelText('Go back');
    expect(backButton).toBeInTheDocument();
  });

  it('should display back arrow icon in button', () => {
    render(<AdminHeader title="Test Title" showBackButton={true} />);
    const backButton = screen.getByLabelText('Go back');
    const svg = backButton.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('should apply responsive classes to title', () => {
    render(<AdminHeader title="Test Title" />);
    const title = screen.getByText('Test Title');
    expect(title).toHaveClass('text-xl');
    expect(title).toHaveClass('md:text-3xl');
    expect(title).toHaveClass('truncate');
  });

  it('should apply responsive classes to button row', () => {
    const { container } = render(
      <AdminHeader title="Test Title" showBackButton={true} />
    );
    const buttonRow = container.querySelector('.flex.flex-col.sm\\:flex-row.gap-3');
    expect(buttonRow).toBeInTheDocument();
  });

  it('should support complex children structure', () => {
    render(
      <AdminHeader title="Test Title" showBackButton={true}>
        <div>
          <button>Link 1</button>
          <button>Link 2</button>
        </div>
      </AdminHeader>
    );
    expect(screen.getByText('Link 1')).toBeInTheDocument();
    expect(screen.getByText('Link 2')).toBeInTheDocument();
  });

  it('should handle empty string title', () => {
    render(<AdminHeader title="" />);
    const header = screen.getByRole('heading');
    expect(header.textContent).toBe('');
  });

  it('should handle long title with truncation', () => {
    const longTitle = 'This is a very long title that should be truncated on smaller screens';
    render(<AdminHeader title={longTitle} />);
    const title = screen.getByText(longTitle);
    expect(title).toHaveClass('truncate');
  });

  it('should maintain consistent spacing with mb-6 md:mb-8', () => {
    const { container } = render(<AdminHeader title="Test Title" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('mb-6');
    expect(wrapper).toHaveClass('md:mb-8');
  });

  it('should render button row only when showBackButton or children provided', () => {
    const { rerender } = render(<AdminHeader title="Test Title" />);
    expect(screen.queryByText('Back')).not.toBeInTheDocument();

    rerender(<AdminHeader title="Test Title" showBackButton={true} />);
    expect(screen.getByText('Back')).toBeInTheDocument();

    rerender(
      <AdminHeader title="Test Title" showBackButton={false}>
        <button>Child</button>
      </AdminHeader>
    );
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});
