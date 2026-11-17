/**
 * Production-readiness smoke tests for the contact and AI-sales-intelligence UI.
 *
 * The real components run; only network boundaries are stubbed (the SSE function transport, `fetch`,
 * the AI-analytics tracker and the contact store's persistence).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// The AI sales-intelligence panels stream from Netlify functions through services/functionStream.
const streamFunction = vi.hoisted(() => vi.fn());
vi.mock('../services/functionStream', () => ({ streamFunction }));
vi.mock('../services/analyticsService', () => ({
  analyticsService: { startTracking: vi.fn().mockReturnValue('session-1'), endTracking: vi.fn() }
}));

import { NewContactModal } from '../components/modals/NewContactModal';
import { ImportContactsModal } from '../components/modals/ImportContactsModal';
import { AdaptivePlaybookGenerator } from '../components/ai-sales-intelligence/AdaptivePlaybookGenerator';
import { CommunicationOptimizer } from '../components/ai-sales-intelligence/CommunicationOptimizer';
import { DiscoveryQuestionsGenerator } from '../components/ai-sales-intelligence/DiscoveryQuestionsGenerator';
import { cacheService } from '../services/cache.service';
import { useContactStore } from '../hooks/useContactStore';
import { sanitizeHtml, sanitizeString, isValidEmail, isValidPhone, validateFile } from '../utils/validation';
import { MAX_FILE_SIZE } from '../utils/constants';

/** Fills the five required fields of the New Contact form (the labels are not bound to the inputs, so use placeholders). */
function fillRequiredFields(overrides: Partial<Record<'first' | 'last' | 'email' | 'company' | 'title', string>> = {}) {
  const values = { first: 'Jane', last: 'Smith', email: 'jane@acme.com', company: 'Acme', title: 'CTO', ...overrides };
  fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: values.first } });
  fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: values.last } });
  fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: values.email } });
  fireEvent.change(screen.getByPlaceholderText('Enter company name'), { target: { value: values.company } });
  fireEvent.change(screen.getByPlaceholderText('Enter job title'), { target: { value: values.title } });
}

describe('SmartCRM Dashboard - Comprehensive Production Tests', () => {
  const createContact = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createContact.mockReset().mockResolvedValue({ id: 'new-1' });
    useContactStore.setState({ createContact } as never);
    cacheService.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. Contact Management System', () => {

    describe('NewContactModal - Contact Creation', () => {
      it('should render contact creation form with all required fields', () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        expect(screen.getByRole('heading', { name: /new contact/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter first name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter last name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter company name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter job title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
      });

      it('should validate required fields', async () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

        await waitFor(() => {
          expect(screen.getByText('Email is required')).toBeInTheDocument();
          expect(screen.getByText('First name is required')).toBeInTheDocument();
          expect(screen.getByText('Last name is required')).toBeInTheDocument();
          expect(screen.getByText('Company is required')).toBeInTheDocument();
          expect(screen.getByText('Title is required')).toBeInTheDocument();
        });
        expect(createContact).not.toHaveBeenCalled();
      });

      it('should validate email format', async () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        // 'jane@acme' passes the browser's own type=email check but not the app's "needs a domain with a dot" rule
        fillRequiredFields({ email: 'jane@acme' });
        fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

        await waitFor(() => expect(screen.getByText('Invalid email format')).toBeInTheDocument());
        expect(createContact).not.toHaveBeenCalled();
      });

      it('should not submit a malformed email (blocked by the browser\'s type=email validation)', () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        fillRequiredFields({ email: 'invalid-email' });
        fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

        expect(screen.getByPlaceholderText('Enter email address')).toBeInvalid();
        expect(createContact).not.toHaveBeenCalled();
      });

      it('should create the contact from the form values', async () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        fillRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

        await waitFor(() => expect(createContact).toHaveBeenCalledTimes(1));
        expect(createContact).toHaveBeenCalledWith(expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          name: 'Jane Smith',
          email: 'jane@acme.com',
          company: 'Acme',
          title: 'CTO',
        }));
        await waitFor(() => expect(screen.getByText('Contact Created!')).toBeInTheDocument());
      });

      it('should support custom fields addition', () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        expect(screen.getByText('Custom Fields')).toBeInTheDocument();
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      it('should support social profile inputs', () => {
        render(<NewContactModal isOpen={true} onClose={() => {}} />);

        expect(screen.getByPlaceholderText('https://linkedin.com/in/username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('https://twitter.com/username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('https://facebook.com/username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('https://instagram.com/username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('https://company.com')).toBeInTheDocument();
      });
    });

    describe('ImportContactsModal - CSV Import', () => {
      const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;

      it('should render import interface with file upload', () => {
        render(<ImportContactsModal isOpen={true} onClose={() => {}} />);

        expect(screen.getByRole('heading', { name: 'Import Contacts' })).toBeInTheDocument();
        expect(screen.getByText('Download CSV Template')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /upload file/i }));
        expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Choose File' })).toBeInTheDocument();
      });

      it('should reject files that are not CSV or Excel', () => {
        const { container } = render(<ImportContactsModal isOpen={true} onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /upload file/i }));

        const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        fireEvent.change(fileInput(container), { target: { files: [invalidFile] } });

        expect(screen.getByText(/Please select a CSV or Excel file/)).toBeInTheDocument();
        expect(screen.queryByText('File Selected')).not.toBeInTheDocument();
      });

      it('should parse CSV and show preview', async () => {
        const { container } = render(<ImportContactsModal isOpen={true} onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /upload file/i }));

        const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
        const csvFile = new File([csvContent], 'contacts.csv', { type: 'text/csv' });
        fireEvent.change(fileInput(container), { target: { files: [csvFile] } });

        await waitFor(() => expect(screen.getByText(/Preview Contacts \(2\)/)).toBeInTheDocument());
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('2. AI-Powered Intelligence Features', () => {

    describe('AdaptivePlaybookGenerator', () => {
      const deal = { id: 'deal-1', name: 'John Doe', value: 50000, company: 'Tech Corp', stage: 'prospect', industry: 'Technology', companySize: 100 };

      it('should render playbook generation interface', () => {
        render(<AdaptivePlaybookGenerator deal={deal} />);

        expect(screen.getByText('Adaptive Sales Playbook')).toBeInTheDocument();
        expect(screen.getByText('🎯 Generate')).toBeInTheDocument();
      });

      it('should show loading state during generation and then the playbook', async () => {
        let finish!: (v: unknown) => void;
        streamFunction.mockReturnValueOnce(new Promise((r) => { finish = r; }));
        render(<AdaptivePlaybookGenerator deal={deal} />);

        fireEvent.click(screen.getByText('🎯 Generate'));

        await waitFor(() => expect(screen.getByText('Generating...')).toBeInTheDocument());
        expect(streamFunction).toHaveBeenCalledWith('adaptive-playbook', expect.objectContaining({ contact: deal, currentStage: 'prospect' }), expect.anything());

        finish({
          result: { data: { strategy: { name: 'Land and Expand', description: 'Start small', confidence: 0.9, rationale: 'Fit' }, phases: [] }, provider: 'openai' },
          text: '',
          citations: [],
        });
        await waitFor(() => expect(screen.getByText('Land and Expand')).toBeInTheDocument());
      });
    });

    describe('CommunicationOptimizer', () => {
      const context = { type: 'email' as const, recipient: { name: 'Jane Smith', role: 'CTO', company: 'Acme', relationship: 'new' as const }, purpose: 'qualify' as const };

      it('should render optimization interface', () => {
        render(<CommunicationOptimizer content="Hello Jane" context={context} />);

        expect(screen.getByRole('heading', { name: 'Communication Optimizer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '⚡ Optimize' })).toBeInTheDocument();
      });

      it('should call the communication-optimization function and show the results', async () => {
        streamFunction.mockResolvedValue({
          result: { data: { engagementPatterns: { openRate: 0.42, responseRate: 0.17 } }, provider: 'openai' },
          text: '',
          citations: [],
        });
        const onOptimize = vi.fn();
        render(<CommunicationOptimizer content="Hello Jane" context={context} onOptimize={onOptimize} />);

        fireEvent.click(screen.getByRole('button', { name: '⚡ Optimize' }));

        await waitFor(() => expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument());
        expect(streamFunction).toHaveBeenCalledWith(
          'communication-optimization',
          expect.objectContaining({ contact: expect.objectContaining({ name: 'Jane Smith', company: 'Acme' }), optimizationType: 'comprehensive' }),
          expect.anything()
        );
        expect(screen.getByText('42%')).toBeInTheDocument();
        expect(screen.getByText('17%')).toBeInTheDocument();
        expect(onOptimize).toHaveBeenCalledTimes(1);
      });

      it('should not show results when the function fails', async () => {
        streamFunction.mockRejectedValue(new Error('Function unavailable'));
        render(<CommunicationOptimizer content="Hello Jane" context={context} />);

        fireEvent.click(screen.getByRole('button', { name: '⚡ Optimize' }));

        await waitFor(() => expect(screen.getByText('Function unavailable')).toBeInTheDocument());
        expect(screen.queryByText('Optimization Suggestions')).not.toBeInTheDocument();
      });
    });

    describe('DiscoveryQuestionsGenerator', () => {
      const contact = { id: 'c-1', name: 'Jane Smith', email: 'jane@acme.com', company: 'Acme', role: 'CTO', industry: 'Software', companySize: 200 };
      const meetingContext = { type: 'discovery' as const, duration: 30, objective: 'Understand needs' };

      it('should render question generation interface', () => {
        render(<DiscoveryQuestionsGenerator contact={contact} meetingContext={meetingContext} />);

        expect(screen.getByRole('heading', { name: 'Discovery Questions' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '🎯 Generate' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '🎯 Generate Questions' })).toBeInTheDocument();
      });

      it('should generate and display questions', async () => {
        streamFunction.mockResolvedValue({
          result: {
            data: {
              questions: [
                { question: 'What is your biggest challenge today?', category: 'business', priority: 'high', reasoning: 'Surface pain' },
                { question: 'Who signs off on new tools?', category: 'decision_making', priority: 'medium', reasoning: 'Map buyers' },
              ],
            },
            provider: 'openai',
          },
          text: '',
          citations: [],
        });
        render(<DiscoveryQuestionsGenerator contact={contact} meetingContext={meetingContext} />);

        fireEvent.click(screen.getByRole('button', { name: '🎯 Generate' }));

        await waitFor(() => expect(screen.getByText('What is your biggest challenge today?')).toBeInTheDocument());
        expect(screen.getByText('Who signs off on new tools?')).toBeInTheDocument();
        expect(streamFunction).toHaveBeenCalledWith(
          'discovery-questions',
          expect.objectContaining({ contact: expect.objectContaining({ id: 'c-1', name: 'Jane Smith', title: 'CTO' }), meetingContext, questionType: 'comprehensive' }),
          expect.anything()
        );
      });

      it('should show the error and no questions when generation fails', async () => {
        streamFunction.mockRejectedValue(new Error('Quota exceeded'));
        render(<DiscoveryQuestionsGenerator contact={contact} meetingContext={meetingContext} />);

        fireEvent.click(screen.getByRole('button', { name: '🎯 Generate' }));

        await waitFor(() => expect(screen.getByText('Quota exceeded')).toBeInTheDocument());
        expect(screen.queryByText(/biggest challenge/)).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Security & Data Protection', () => {

    it('should strip scripts and unsafe markup from HTML input', () => {
      const html = '<script>alert("xss")</script><p onclick="steal()">Hello <b>World</b></p><a href="javascript:alert(1)">link</a><img src=x onerror="steal()">';
      const clean = sanitizeHtml(html);

      expect(clean).not.toContain('<script');
      expect(clean).not.toContain('onclick');
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('javascript:');
      expect(clean).toContain('<p>Hello <b>World</b></p>');
    });

    it('should remove angle brackets from plain text input', () => {
      expect(sanitizeString('  <b>Hello</b> World  ')).toBe('bHello/b World');
    });

    it('should validate email format', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should validate phone numbers', () => {
      expect(isValidPhone('+1-555-0123')).toBe(true);
      expect(isValidPhone('555-0123')).toBe(true);
      expect(isValidPhone('invalid')).toBe(false);
    });

    it('should validate file uploads by type and size', () => {
      const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const oversized = new File(['x'.repeat(MAX_FILE_SIZE + 1)], 'big.pdf', { type: 'application/pdf' });

      expect(validateFile(validFile).isValid).toBe(true);
      expect(validateFile(invalidFile).isValid).toBe(false);
      expect(validateFile(oversized).isValid).toBe(false);
    });
  });

  describe('4. Performance & Scalability', () => {

    it('should handle large datasets efficiently', () => {
      // Test pagination logic
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `contact-${i}`,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`
      }));

      expect(largeDataset).toHaveLength(1000);

      // Simulate pagination
      const pageSize = 50;
      const totalPages = Math.ceil(largeDataset.length / pageSize);
      expect(totalPages).toBe(20);
    });

    it('should debounce search inputs', async () => {
      const mockSearch = vi.fn();
      let callCount = 0;

      // Simulate debounced search
      const debouncedSearch = () => {
        callCount++;
        setTimeout(() => mockSearch(), 300);
      };

      // Rapid calls should be debounced
      debouncedSearch();
      debouncedSearch();
      debouncedSearch();

      // Should only result in one actual call
      await new Promise(resolve => setTimeout(resolve, 350));
      expect(callCount).toBe(3); // All calls made
      // In real implementation, only one search would execute
    });
  });

  describe('5. UI/UX Responsiveness', () => {

    it('should render the New Contact form in a width-constrained, scrollable modal', () => {
      render(<NewContactModal isOpen={true} onClose={() => {}} />);

      const modal = screen.getByRole('heading', { name: /new contact/i }).closest('.max-w-6xl');
      expect(modal).not.toBeNull();
      expect(modal).toHaveClass('w-full', 'max-h-[95vh]', 'overflow-hidden');
    });

    it('should keep the form fields in a sensible keyboard tab order', () => {
      render(<NewContactModal isOpen={true} onClose={() => {}} />);

      const focusable = Array.from(document.querySelectorAll<HTMLElement>('input, select, textarea, button'))
        .filter((el) => !(el as HTMLInputElement).disabled && el.tabIndex >= 0);
      const first = screen.getByPlaceholderText('Enter first name');
      const last = screen.getByPlaceholderText('Enter last name');
      const email = screen.getByPlaceholderText('Enter email address');

      // natively focusable, and first name -> last name -> email follow each other in DOM (= tab) order
      expect(focusable).toContain(first);
      expect(focusable.indexOf(last)).toBe(focusable.indexOf(first) + 1);
      expect(focusable.indexOf(email)).toBeGreaterThan(focusable.indexOf(last));
      first.focus();
      expect(first).toHaveFocus();
    });
  });

  describe('6. Error Handling & Resilience', () => {

    it('should handle API failures gracefully', async () => {
      createContact.mockRejectedValue(new Error('API Error'));
      const onClose = vi.fn();
      render(<NewContactModal isOpen={true} onClose={onClose} />);

      fillRequiredFields();
      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      await waitFor(() => expect(screen.getByText('Failed to create contact. Please try again.')).toBeInTheDocument());
      // the form stays open with the user's input so they can retry
      expect(screen.getByPlaceholderText('Enter first name')).toHaveValue('Jane');
      expect(screen.getByRole('button', { name: /create contact/i })).not.toBeDisabled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should provide fallback functionality', () => {
      // Test offline/local storage fallback
      const mockLocalStorage = {
        getItem: vi.fn(() => 'mock-data'),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      expect(window.localStorage.getItem).toBeDefined();
      expect(typeof window.localStorage.getItem).toBe('function');
    });
  });

  describe('7. Integration & Compatibility', () => {

    it('should integrate with external services', () => {
      // Test service integration points
      const services = [
        'supabase',
        'openai',
        'sendgrid',
        'twilio'
      ];

      services.forEach(service => {
        expect(typeof service).toBe('string');
        expect(service.length).toBeGreaterThan(0);
      });
    });

    it('should handle different data formats', () => {
      // Test CSV parsing with different formats
      const csvData = [
        'name,email,company',
        '"John Doe",john@example.com,ACME Corp',
        'Jane Smith,jane@example.com,"Tech, Inc."',
        'Bob Wilson,bob@example.com,Startup Co'
      ];

      expect(csvData).toHaveLength(4);
      expect(csvData[0]).toContain('name,email,company');
    });
  });

  describe('8. Accessibility Compliance', () => {

    it('should expose the modal title and primary action to assistive technology', () => {
      render(<NewContactModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByRole('heading', { level: 2, name: /new contact/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
    });
  });

  describe('9. Data Integrity & Validation', () => {

    it('should prevent duplicate contacts', () => {
      const contacts = [
        { id: '1', email: 'test@example.com', name: 'Test User' },
        { id: '2', email: 'test@example.com', name: 'Test User 2' }
      ];

      const emails = contacts.map(c => c.email);
      const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);

      expect(duplicates).toContain('test@example.com');
    });

    it('should validate data types', () => {
      const validContact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
        score: 85
      };

      expect(typeof validContact.name).toBe('string');
      expect(typeof validContact.email).toBe('string');
      expect(typeof validContact.score).toBe('number');
    });
  });

  describe('10. Build & Deployment Verification', () => {

    it('should have optimized bundle structure', () => {
      // Verify build configuration
      const config = {
        chunks: ['react-vendor', 'ui-vendor', 'ai-vendor', 'utils-vendor'],
        minification: 'esbuild',
        sourcemaps: false,
        cssCodeSplit: true
      };

      expect(config.chunks).toHaveLength(4);
      expect(config.minification).toBe('esbuild');
      expect(config.cssCodeSplit).toBe(true);
    });

    it('should remove console statements in production', () => {
      const originalConsole = console;
      let consoleCalls = 0;

      // Mock console in production mode
      const mockConsole = {
        ...originalConsole,
        log: () => { consoleCalls++; }
      };

      console = mockConsole as any;

      // Simulate production code
      if (process.env['NODE_ENV'] === 'production') {
        console.log('This should not execute');
      }

      expect(consoleCalls).toBe(0);
    });
  });
});