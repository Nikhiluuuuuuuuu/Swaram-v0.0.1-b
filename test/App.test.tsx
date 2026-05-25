import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import App from '../src/App';

describe('App', () => {
  it('renders the sidebar with the correct application name', () => {
    const { getByText } = render(() => <App />);
    expect(getByText('Swaram')).toBeInTheDocument();
  });
});
