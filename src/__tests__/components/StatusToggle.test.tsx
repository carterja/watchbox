import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusToggle } from '@/components/StatusToggle';
import type { MediaStatus } from '@/types/media';

describe('StatusToggle', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render all three status options', () => {
    render(<StatusToggle value="yet_to_start" onChange={mockOnChange} />);

    expect(screen.getByText('Yet to start')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('should highlight the current value', () => {
    const { rerender } = render(
      <StatusToggle value="in_progress" onChange={mockOnChange} />
    );

    const inProgressButton = screen.getByText('In progress');
    expect(inProgressButton).toHaveClass('bg-shelf-accent');

    rerender(<StatusToggle value="finished" onChange={mockOnChange} />);
    const finishedButton = screen.getByText('Finished');
    expect(finishedButton).toHaveClass('bg-shelf-accent');
  });

  it('should call onChange when a status is clicked', async () => {
    const user = userEvent.setup();
    render(<StatusToggle value="yet_to_start" onChange={mockOnChange} />);

    const inProgressButton = screen.getByText('In progress');
    await user.click(inProgressButton);

    expect(mockOnChange).toHaveBeenCalledWith('in_progress');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should call onChange even when clicking current value', async () => {
    const user = userEvent.setup();
    render(<StatusToggle value="yet_to_start" onChange={mockOnChange} />);

    const yetToStartButton = screen.getByText('Yet to start');
    await user.click(yetToStartButton);

    expect(mockOnChange).toHaveBeenCalledWith('yet_to_start');
  });

  it('should handle rapid clicks', async () => {
    const user = userEvent.setup();
    render(<StatusToggle value="yet_to_start" onChange={mockOnChange} />);

    await user.click(screen.getByText('In progress'));
    await user.click(screen.getByText('Finished'));
    await user.click(screen.getByText('Yet to start'));

    expect(mockOnChange).toHaveBeenCalledTimes(3);
    expect(mockOnChange).toHaveBeenNthCalledWith(1, 'in_progress');
    expect(mockOnChange).toHaveBeenNthCalledWith(2, 'finished');
    expect(mockOnChange).toHaveBeenNthCalledWith(3, 'yet_to_start');
  });
});
