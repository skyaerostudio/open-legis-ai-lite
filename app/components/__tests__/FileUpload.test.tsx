import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import FileUpload from '../upload/FileUpload';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('FileUpload', () => {
  it('renders upload interface correctly', () => {
    render(<FileUpload />);
    
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    expect(screen.getByText(/select files/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF.*HTML/i)).toBeInTheDocument();
  });

  it('shows file size limit information', () => {
    render(<FileUpload />);
    
    expect(screen.getByText(/50MB/i)).toBeInTheDocument();
  });

  it('accepts PDF and HTML file types', () => {
    render(<FileUpload />);
    
    const fileInput = screen.getByLabelText(/upload/i);
    expect(fileInput).toHaveAttribute('accept', '.pdf,.html');
  });
});