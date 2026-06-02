import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import App from '../src/App';

describe('App', () => {
  it('renders the sidebar with the correct application name', () => {
    const { getByText } = render(() => (
      <MemoryRouter>
        <Route path="/*" component={App} />
      </MemoryRouter>
    ));
    expect(getByText('Swaram')).toBeInTheDocument();
  });
});
