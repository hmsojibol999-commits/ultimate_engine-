import { describe, it, expect } from 'vitest';
import { contactLinks } from './contact';

const empty = { EMAIL: '', GITHUB_URL: '', REPO_URL: '', WHATSAPP: '', TELEGRAM: '' };

describe('contactLinks', () => {
  it('returns nothing for placeholders and empty values', () => {
    expect(contactLinks(empty)).toEqual({});
    expect(contactLinks({ ...empty, EMAIL: 'TODO you@example.com', GITHUB_URL: 'TODO' })).toEqual({});
  });
  it('rejects malformed values', () => {
    expect(contactLinks({ ...empty, EMAIL: 'not-an-email', GITHUB_URL: 'http://insecure.example', REPO_URL: 'javascript:alert(1)' })).toEqual({});
  });
  it('builds a mailto link with an encoded subject and uses it for feedback', () => {
    const l = contactLinks({ ...empty, EMAIL: 'me@example.com' }, 'Hi there');
    expect(l.email).toBe('mailto:me@example.com?subject=Hi%20there');
    expect(l.feedback).toBe(l.email);
  });
  it('prefers the repo issue form for feedback', () => {
    const l = contactLinks({ ...empty, EMAIL: 'me@example.com', REPO_URL: 'https://github.com/a/b/' });
    expect(l.feedback).toBe('https://github.com/a/b/issues/new');
    expect(l.repo).toBe('https://github.com/a/b/');
  });
  it('passes through https social links', () => {
    const l = contactLinks({ ...empty, WHATSAPP: 'https://wa.me/8801000000000', TELEGRAM: 'https://t.me/x', GITHUB_URL: 'https://github.com/x' });
    expect(l.whatsapp).toBe('https://wa.me/8801000000000');
    expect(l.telegram).toBe('https://t.me/x');
    expect(l.github).toBe('https://github.com/x');
  });
});
