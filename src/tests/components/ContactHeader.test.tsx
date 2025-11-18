import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContactHeader } from '../../components/contacts/ContactHeader';
import { Contact } from '../../types/contact';

// Mock contact data
const mockContact: Contact = {
  id: '1',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  title: 'CEO',
  company: 'Example Corp',
  industry: 'Technology',
  status: 'active',
  sources: ['LinkedIn'],
  socialProfiles: {},
  customFields: {},
  aiScore: 85,
  interestLevel: 'hot',
  isFavorite: false,
  avatarSrc: '',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('ContactHeader', () => {
  const defaultProps = {
    activeTab: 'overview',
    onTabChange: jest.fn(),
    contact: mockContact,
    isEditing: false,
    isSaving: false,
    onEdit: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onToggleFavorite: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders contact name and company', () => {
    render(<ContactHeader {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('at Example Corp')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<ContactHeader {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Journey')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('calls onTabChange when tab is clicked', () => {
    render(<ContactHeader {...defaultProps} />);
    const journeyTab = screen.getByText('Journey');
    fireEvent.click(journeyTab);
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('journey');
  });

  it('shows edit button when not editing', () => {
    render(<ContactHeader {...defaultProps} />);
    expect(screen.getByText('Edit Contact')).toBeInTheDocument();
  });

  it('shows save and cancel buttons when editing', () => {
    render(<ContactHeader {...defaultProps} isEditing={true} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onToggleFavorite when favorite button is clicked', () => {
    render(<ContactHeader {...defaultProps} />);
    const favoriteButton = screen.getByText('Add to Favorites');
    fireEvent.click(favoriteButton);
    expect(defaultProps.onToggleFavorite).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ContactHeader {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows loading state when saving', () => {
    render(<ContactHeader {...defaultProps} isEditing={true} isSaving={true} />);
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('displays favorite status correctly', () => {
    render(<ContactHeader {...defaultProps} contact={{ ...mockContact, isFavorite: true }} />);
    expect(screen.getByText('Favorited')).toBeInTheDocument();
  });
});